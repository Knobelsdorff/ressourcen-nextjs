import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { extractFilenameFromUrl } from '@/lib/audio-token';
import { tmpdir } from 'os';
import { join, basename } from 'path';
import { writeFile, readFile, unlink } from 'fs/promises';
import { ensureFfmpegAvailable, transcodeToMp3 } from '@/lib/ffmpeg';
const inFlightMigrations = new Map<string, Promise<{ migratedUrl: string; migrated: boolean }>>();
const LOCK_BUCKET = 'audio-files';
const LOCK_WAIT_MS = 30_000;
const LOCK_POLL_MS = 1500;

function isSafariCompatibleUrl(audioUrl: string): boolean {
  const lower = audioUrl.toLowerCase();
  return lower.includes('.mp3') || lower.includes('.m4a') || lower.includes('.mp4');
}

function needsMigration(audioUrl: string): boolean {
  const lower = audioUrl.toLowerCase();
  return lower.includes('.webm') || lower.includes('.ogg');
}

function buildMigratedFilename(filename: string): string {
  const clean = filename.replace(/\.(webm|ogg)$/i, '');
  return `${clean}_safari.mp3`;
}

async function waitForMigratedFile(
  supabaseAdmin: Awaited<ReturnType<typeof createServerAdminClient>>,
  migratedFilename: string,
  timeoutMs = LOCK_WAIT_MS
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await supabaseAdmin.storage.from('audio-files').download(migratedFilename);
    if (data) return true;
    await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
  }
  return false;
}

async function verifyAccessAndLoadStory(
  request: NextRequest,
  storyId: string
): Promise<
  | { ok: true; userId: string; userEmail: string | null; story: any; supabaseAdmin: Awaited<ReturnType<typeof createServerAdminClient>> }
  | { ok: false; response: NextResponse }
> {
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
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const supabaseAdmin = await createServerAdminClient();
  const { data: story, error: storyError } = await (supabaseAdmin as any)
    .from('saved_stories')
    .select('id, user_id, client_email, title, audio_url')
    .eq('id', storyId)
    .single();

  if (storyError || !story) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Story nicht gefunden' }, { status: 404 }),
    };
  }

  const userEmail = user.email?.toLowerCase() || null;
  const hasAccess =
    story.user_id === user.id ||
    (userEmail && story.client_email && story.client_email.toLowerCase() === userEmail);

  if (!hasAccess) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id, userEmail, story, supabaseAdmin };
}

async function migrateStoryAudio(
  supabaseAdmin: Awaited<ReturnType<typeof createServerAdminClient>>,
  story: any
): Promise<{ migratedUrl: string; migrated: boolean }> {
  const startedAt = Date.now();
  const oldUrl = story.audio_url as string;
  const filename = extractFilenameFromUrl(oldUrl || '');
  if (!filename) {
    throw new Error('filename_not_parseable');
  }

  const migratedFilename = buildMigratedFilename(filename);
  const migratedPublicUrl = supabaseAdmin.storage.from('audio-files').getPublicUrl(migratedFilename)
    .data.publicUrl;

  // idempotent: migrated file exists already
  const { data: existing } = await supabaseAdmin.storage.from('audio-files').download(migratedFilename);
  if (existing) {
    if (story.audio_url !== migratedPublicUrl) {
      const { error: updateError } = await (supabaseAdmin as any)
        .from('saved_stories')
        .update({ audio_url: migratedPublicUrl })
        .eq('id', story.id)
        .eq('audio_url', oldUrl);
      if (updateError) {
        throw new Error(`db_update_failed:${updateError.message}`);
      }
    }
    console.log('[audio/migrate-on-demand] reused existing migrated file', {
      storyId: story.id,
      oldUrl,
      migratedUrl: migratedPublicUrl,
      durationMs: Date.now() - startedAt,
    });
    return { migratedUrl: migratedPublicUrl, migrated: false };
  }

  // distributed lock via storage object (works across instances)
  const lockName = `__migration_locks/${story.id}.lock`;
  const lockBody = Buffer.from(
    JSON.stringify({ storyId: story.id, createdAt: new Date().toISOString() }),
    'utf-8'
  );

  const { error: lockError } = await supabaseAdmin.storage.from(LOCK_BUCKET).upload(lockName, lockBody, {
    contentType: 'application/json',
    upsert: false,
  });

  if (lockError) {
    const ready = await waitForMigratedFile(supabaseAdmin, migratedFilename);
    if (!ready) {
      throw new Error('lock_timeout');
    }
    if (story.audio_url !== migratedPublicUrl) {
      await (supabaseAdmin as any)
        .from('saved_stories')
        .update({ audio_url: migratedPublicUrl })
        .eq('id', story.id)
        .eq('audio_url', oldUrl);
    }
    console.log('[audio/migrate-on-demand] waited for concurrent migration', {
      storyId: story.id,
      migratedUrl: migratedPublicUrl,
      durationMs: Date.now() - startedAt,
    });
    return { migratedUrl: migratedPublicUrl, migrated: false };
  }

  const inputPath = join(tmpdir(), `ondemand_in_${story.id}_${basename(filename)}`);
  const outputPath = join(tmpdir(), `ondemand_out_${story.id}_${basename(migratedFilename)}`);

  try {
    await ensureFfmpegAvailable();
    const { data: sourceBlob, error: downloadError } = await supabaseAdmin.storage
      .from('audio-files')
      .download(filename);
    if (downloadError || !sourceBlob) {
      throw new Error(`download_failed:${downloadError?.message || 'missing_blob'}`);
    }

    await writeFile(inputPath, Buffer.from(await sourceBlob.arrayBuffer()));
    await transcodeToMp3(inputPath, outputPath);
    const outputBuffer = await readFile(outputPath);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('audio-files')
      .upload(migratedFilename, outputBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: true,
      });
    if (uploadError) {
      throw new Error(`upload_failed:${uploadError.message}`);
    }

    const { error: updateError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .update({ audio_url: migratedPublicUrl })
      .eq('id', story.id)
      .eq('audio_url', oldUrl);
    if (updateError) {
      throw new Error(`db_update_failed:${updateError.message}`);
    }

    console.log('[audio/migrate-on-demand] migrated story for safari', {
      storyId: story.id,
      oldUrl,
      migratedUrl: migratedPublicUrl,
      durationMs: Date.now() - startedAt,
      result: 'migrated',
    });
    return { migratedUrl: migratedPublicUrl, migrated: true };
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    await supabaseAdmin.storage.from(LOCK_BUCKET).remove([lockName]).catch(() => {});
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const storyId = String(body?.storyId || '').trim();
    if (!storyId) {
      return NextResponse.json({ error: 'storyId ist erforderlich' }, { status: 400 });
    }

    const access = await verifyAccessAndLoadStory(request, storyId);
    if (!access.ok) return access.response;
    const { story, supabaseAdmin } = access;

    if (!story.audio_url) {
      return NextResponse.json({ error: 'Story hat keine Audio-URL' }, { status: 400 });
    }

    if (isSafariCompatibleUrl(story.audio_url)) {
      return NextResponse.json({
        success: true,
        migrated: false,
        reason: 'already_compatible',
        audioUrl: story.audio_url,
      });
    }

    if (!needsMigration(story.audio_url)) {
      return NextResponse.json(
        {
          success: false,
          migrated: false,
          reason: 'unsupported_source_format',
          error: 'Nur WebM/OGG kann on-demand konvertiert werden',
        },
        { status: 400 }
      );
    }

    if (!inFlightMigrations.has(story.id)) {
      const promise = migrateStoryAudio(supabaseAdmin, story).finally(() => {
        inFlightMigrations.delete(story.id);
      });
      inFlightMigrations.set(story.id, promise);
    }

    const result = await inFlightMigrations.get(story.id)!;
    return NextResponse.json({
      success: true,
      migrated: result.migrated,
      audioUrl: result.migratedUrl,
    });
  } catch (error: any) {
    const message = error?.message || 'unknown_error';
    const status =
      message.includes('ffmpeg') || message.includes('download_failed') || message.includes('upload_failed')
        ? 500
        : message.includes('db_update_failed')
          ? 500
          : message === 'lock_timeout'
            ? 409
            : 500;

    console.error('[audio/migrate-on-demand] failed', { error: message });
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }
}

