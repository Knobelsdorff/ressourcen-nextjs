import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BUCKET = 'audio-files';
const FOLDER = 'homepage-sample';
const DEFAULT_TITLE = 'Wohlwollende Präsenz';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

const CONFIG_KEYS = {
  url: 'homepage_sample_url',
  title: 'homepage_sample_title',
  path: 'homepage_sample_path',
} as const;

/** Nur volle Admins (NEXT_PUBLIC_ADMIN_EMAILS) – keine Music-Admins. */
function isFullAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

async function requireFullAdmin(request: NextRequest) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isFullAdminUser(user.email)) {
    return {
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
    };
  }

  return { user };
}

async function loadSampleConfig(supabaseAdmin: Awaited<ReturnType<typeof createServerAdminClient>>) {
  const { data: rows, error } = await (supabaseAdmin as any)
    .from('app_config')
    .select('key, value')
    .in('key', [CONFIG_KEYS.url, CONFIG_KEYS.title, CONFIG_KEYS.path]);

  if (error) throw error;

  const config = Object.fromEntries((rows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
  const audioUrl = config[CONFIG_KEYS.url]?.trim() || null;
  if (!audioUrl) return null;

  return {
    title: config[CONFIG_KEYS.title]?.trim() || DEFAULT_TITLE,
    audio_url: audioUrl,
    path: config[CONFIG_KEYS.path] || null,
  };
}

async function upsertConfig(
  supabaseAdmin: Awaited<ReturnType<typeof createServerAdminClient>>,
  entries: Record<string, string>
) {
  const updatedAt = new Date().toISOString();
  const rows = Object.entries(entries).map(([key, value]) => ({
    key,
    value,
    updated_at: updatedAt,
  }));

  const { error } = await (supabaseAdmin as any).from('app_config').upsert(rows);
  if (error) throw error;
}

async function clearConfig(supabaseAdmin: Awaited<ReturnType<typeof createServerAdminClient>>) {
  const { error } = await (supabaseAdmin as any)
    .from('app_config')
    .delete()
    .in('key', [CONFIG_KEYS.url, CONFIG_KEYS.title, CONFIG_KEYS.path]);
  if (error) throw error;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFullAdmin(request);
    if (auth.error) return auth.error;

    const supabaseAdmin = await createServerAdminClient();
    const sample = await loadSampleConfig(supabaseAdmin);

    return NextResponse.json({ success: true, sample });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin/homepage-sample] GET error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kostprobe', details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[admin/homepage-sample] POST request received');

  try {
    const auth = await requireFullAdmin(request);
    if (auth.error) return auth.error;

    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const sizeMB = (parseInt(contentLength, 10) / 1024 / 1024).toFixed(2);
      console.log(`[admin/homepage-sample] Request body size: ${sizeMB} MB`);
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError: unknown) {
      const message = parseError instanceof Error ? parseError.message : '';
      if (message.includes('body') || message.includes('size') || message.includes('limit')) {
        return NextResponse.json(
          {
            error:
              'Die Datei ist zu groß für den Standard-Upload. Bitte verwende eine kleinere Datei oder kontaktiere den Administrator.',
            details: message,
          },
          { status: 413 }
        );
      }
      throw parseError;
    }

    const file = formData.get('file') as File | null;
    const titleRaw = (formData.get('title') as string | null)?.trim();
    const title = titleRaw || DEFAULT_TITLE;

    const supabaseAdmin = await createServerAdminClient();
    const existing = await loadSampleConfig(supabaseAdmin);

    if (!file && !existing) {
      return NextResponse.json(
        { error: 'Bitte eine MP3-Datei auswählen' },
        { status: 400 }
      );
    }

    if (!file && existing) {
      await upsertConfig(supabaseAdmin, {
        [CONFIG_KEYS.url]: existing.audio_url,
        [CONFIG_KEYS.title]: title,
        [CONFIG_KEYS.path]: existing.path || '',
      });
      return NextResponse.json({
        success: true,
        sample: { ...existing, title },
      });
    }

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith('.mp3')) {
      return NextResponse.json({ error: 'Only MP3 files are allowed' }, { status: 400 });
    }

    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`[admin/homepage-sample] File size check: ${fileSizeMB} MB (max: 50 MB)`);

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `Die Datei ist zu groß (${fileSizeMB} MB). Maximale Dateigröße: 50 MB.`,
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE,
        },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2, 11);
    const storagePath = `${FOLDER}/homepage-sample_${timestamp}_${randomId}.mp3`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('[admin/homepage-sample] Storage upload error:', uploadError);
      let errorMessage = 'Fehler beim Hochladen der Datei';
      if (uploadError.message?.includes('File size exceeds') || uploadError.message?.includes('too large')) {
        errorMessage = `Die Datei ist zu groß (${fileSizeMB} MB). Bitte komprimiere die Datei oder verwende eine kleinere Version.`;
      } else if (uploadError.message?.includes('quota') || uploadError.message?.includes('limit')) {
        errorMessage = 'Speicherplatz-Limit erreicht. Bitte kontaktiere den Administrator.';
      } else if (uploadError.message?.includes('permission') || uploadError.message?.includes('access')) {
        errorMessage = 'Zugriff verweigert. Bitte stelle sicher, dass du als Admin eingeloggt bist.';
      } else {
        errorMessage = `Fehler beim Hochladen: ${uploadError.message || 'Unbekannter Fehler'}`;
      }
      return NextResponse.json(
        { error: errorMessage, details: uploadError.message, fileSize: file.size, fileName: file.name },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

    try {
      await upsertConfig(supabaseAdmin, {
        [CONFIG_KEYS.url]: publicUrl,
        [CONFIG_KEYS.title]: title,
        [CONFIG_KEYS.path]: storagePath,
      });
    } catch (dbError: unknown) {
      console.error('[admin/homepage-sample] Config save error:', dbError);
      try {
        await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
      } catch (cleanupError) {
        console.error('[admin/homepage-sample] Failed to cleanup uploaded file:', cleanupError);
      }
      const message = dbError instanceof Error ? dbError.message : 'Unknown error';
      return NextResponse.json(
        { error: 'Fehler beim Speichern der Konfiguration', details: message },
        { status: 500 }
      );
    }

    // Alte Datei entfernen (nach erfolgreichem Speichern)
    if (existing?.path && existing.path !== storagePath) {
      try {
        await supabaseAdmin.storage.from(BUCKET).remove([existing.path]);
      } catch (cleanupError) {
        console.warn('[admin/homepage-sample] Could not delete previous file:', cleanupError);
      }
    }

    console.log('[admin/homepage-sample] Upload successful:', { storagePath, title });

    return NextResponse.json({
      success: true,
      sample: {
        title,
        audio_url: publicUrl,
        path: storagePath,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin/homepage-sample] POST error:', error);

    if (
      message.includes('body') ||
      message.includes('size') ||
      message.includes('limit') ||
      message.includes('413')
    ) {
      return NextResponse.json(
        {
          error:
            'Die Datei ist zu groß für den Standard-Upload. Bitte verwende eine kleinere Datei oder kontaktiere den Administrator.',
          details: message,
        },
        { status: 413 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireFullAdmin(request);
    if (auth.error) return auth.error;

    const supabaseAdmin = await createServerAdminClient();
    const existing = await loadSampleConfig(supabaseAdmin);

    if (!existing) {
      return NextResponse.json({ success: true, message: 'Keine Kostprobe vorhanden' });
    }

    if (existing.path) {
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from(BUCKET)
          .remove([existing.path]);
        if (storageError) {
          console.warn('[admin/homepage-sample] Storage delete warning:', storageError);
        }
      } catch (storageError) {
        console.warn('[admin/homepage-sample] Storage delete error (non-critical):', storageError);
      }
    }

    await clearConfig(supabaseAdmin);

    return NextResponse.json({ success: true, message: 'Kostprobe gelöscht' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin/homepage-sample] DELETE error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Löschen der Kostprobe', details: message },
      { status: 500 }
    );
  }
}
