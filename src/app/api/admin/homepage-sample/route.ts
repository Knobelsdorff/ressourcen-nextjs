import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export const runtime = 'nodejs';
export const maxDuration = 120;

const BUCKET = 'audio-files';
const FOLDER = 'homepage-sample';
const DEFAULT_TITLE = 'Wohlwollende Präsenz';

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

function isValidHomepageSamplePath(path: string): boolean {
  return (
    path.startsWith(`${FOLDER}/`) &&
    path.toLowerCase().endsWith('.mp3') &&
    !path.includes('..') &&
    !path.includes('\\')
  );
}

function isValidHomepageSampleUrl(url: string, storagePath: string): boolean {
  try {
    const parsed = new URL(url);
    const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : null;
    if (supabaseHost && parsed.host !== supabaseHost) return false;
    return parsed.pathname.includes(`/storage/v1/object/public/${BUCKET}/`) &&
      parsed.pathname.endsWith(`/${storagePath}`);
  } catch {
    return false;
  }
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

/**
 * Speichert Metadaten nach Direkt-Upload zu Supabase Storage (JSON),
 * oder aktualisiert nur den Titel.
 *
 * Body:
 * - { title, audioUrl, storagePath } nach Client-Upload
 * - { title } Titel-Update bei bestehender Kostprobe
 */
export async function POST(request: NextRequest) {
  console.log('[admin/homepage-sample] POST request received');

  try {
    const auth = await requireFullAdmin(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const title = (typeof body.title === 'string' ? body.title.trim() : '') || DEFAULT_TITLE;
    const audioUrl = typeof body.audioUrl === 'string' ? body.audioUrl.trim() : '';
    const storagePath = typeof body.storagePath === 'string' ? body.storagePath.trim() : '';

    const supabaseAdmin = await createServerAdminClient();
    const existing = await loadSampleConfig(supabaseAdmin);

    // Nur Titel aktualisieren
    if (!audioUrl && !storagePath) {
      if (!existing) {
        return NextResponse.json(
          { error: 'Bitte eine MP3-Datei auswählen' },
          { status: 400 }
        );
      }

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

    if (!audioUrl || !storagePath) {
      return NextResponse.json(
        { error: 'audioUrl und storagePath sind erforderlich' },
        { status: 400 }
      );
    }

    if (!isValidHomepageSamplePath(storagePath)) {
      return NextResponse.json(
        { error: 'Ungültiger Speicherpfad' },
        { status: 400 }
      );
    }

    if (!isValidHomepageSampleUrl(audioUrl, storagePath)) {
      return NextResponse.json(
        { error: 'Ungültige Audio-URL' },
        { status: 400 }
      );
    }

    // Prüfe, ob die Datei im Storage existiert
    const folder = storagePath.includes('/') ? storagePath.slice(0, storagePath.lastIndexOf('/')) : '';
    const fileName = storagePath.includes('/')
      ? storagePath.slice(storagePath.lastIndexOf('/') + 1)
      : storagePath;
    const { data: listed, error: listError } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(folder || undefined, { search: fileName, limit: 20 });

    if (listError) {
      console.warn('[admin/homepage-sample] Storage list warning:', listError);
    } else {
      const found = (listed || []).some((item) => item.name === fileName);
      if (!found) {
        return NextResponse.json(
          { error: 'Hochgeladene Datei wurde im Storage nicht gefunden' },
          { status: 400 }
        );
      }
    }

    try {
      await upsertConfig(supabaseAdmin, {
        [CONFIG_KEYS.url]: audioUrl,
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

    if (existing?.path && existing.path !== storagePath) {
      try {
        await supabaseAdmin.storage.from(BUCKET).remove([existing.path]);
      } catch (cleanupError) {
        console.warn('[admin/homepage-sample] Could not delete previous file:', cleanupError);
      }
    }

    console.log('[admin/homepage-sample] Metadata saved:', { storagePath, title });

    return NextResponse.json({
      success: true,
      sample: {
        title,
        audio_url: audioUrl,
        path: storagePath,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin/homepage-sample] POST error:', error);
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
