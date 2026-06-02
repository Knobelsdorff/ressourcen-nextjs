import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { extractFilenameFromUrl } from '@/lib/audio-token';
import { tmpdir } from 'os';
import { join, basename } from 'path';
import { writeFile, readFile, unlink, access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { ensureFfmpegAvailable, transcodeToMp3 } from '@/lib/ffmpeg';

function isAdminUser(email: string | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

function needsMigration(audioUrl: string | null): boolean {
  if (!audioUrl) return false;
  const lower = audioUrl.toLowerCase();
  return lower.includes('.webm') || lower.includes('.ogg');
}

function buildMigratedFilename(filename: string): string {
  const clean = filename.replace(/\.(webm|ogg)$/i, '');
  return `${clean}_safari.mp3`;
}

async function getAdminSupabase(request: NextRequest) {
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

  if (!isAdminUser(user.email)) {
    return {
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
    };
  }

  return { supabaseAdmin: await createServerAdminClient() };
}

/**
 * GET: Dry-run/Inventar für geplante Migration
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getAdminSupabase(request);
    if ('error' in ctx) return ctx.error;
    const { supabaseAdmin } = ctx;

    const limit = Math.min(
      Math.max(parseInt(new URL(request.url).searchParams.get('limit') || '200', 10), 1),
      2000
    );

    const { data, error } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, title, client_email, audio_url, created_at')
      .not('audio_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Fehler beim Laden der Ressourcen', details: error.message },
        { status: 500 }
      );
    }

    const rows = (data || []).map((row: any) => {
      const filename = extractFilenameFromUrl(row.audio_url || '') || null;
      return {
        ...row,
        filename,
        needsMigration: needsMigration(row.audio_url || null),
        migratedFilename: filename ? buildMigratedFilename(filename) : null,
      };
    });

    const candidates = rows.filter((r: any) => r.needsMigration);
    return NextResponse.json({
      success: true,
      total: rows.length,
      migrationCandidates: candidates.length,
      candidates,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Führt Migration WebM/OGG -> MP3 aus
 * Body: { limit?: number, dryRun?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getAdminSupabase(request);
    if ('error' in ctx) return ctx.error;
    const { supabaseAdmin } = ctx;

    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun !== false;
    const limit = Math.min(Math.max(parseInt(String(body?.limit || '50'), 10), 1), 500);

    const { data, error } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, title, client_email, audio_url')
      .not('audio_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit * 4);

    if (error) {
      return NextResponse.json(
        { error: 'Fehler beim Laden der Ressourcen', details: error.message },
        { status: 500 }
      );
    }

    const candidates = (data || []).filter((r: any) => needsMigration(r.audio_url)).slice(0, limit);

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        candidates: candidates.map((r: any) => ({
          id: r.id,
          title: r.title,
          client_email: r.client_email,
          audio_url: r.audio_url,
          filename: extractFilenameFromUrl(r.audio_url || ''),
        })),
      });
    }

    try {
      await ensureFfmpegAvailable();
    } catch {
      return NextResponse.json(
        {
          error:
            'ffmpeg ist nicht verfügbar (bundled Binary fehlt oder nicht ausführbar). dryRun verwenden oder Deployment prüfen.',
        },
        { status: 500 }
      );
    }

    const results: Array<{
      id: string;
      status: 'migrated' | 'skipped' | 'error';
      oldUrl?: string;
      newUrl?: string;
      reason?: string;
    }> = [];

    for (const row of candidates) {
      const oldUrl = row.audio_url as string;
      const filename = extractFilenameFromUrl(oldUrl || '');
      if (!filename) {
        results.push({ id: row.id, status: 'error', oldUrl, reason: 'filename_not_parseable' });
        continue;
      }

      const migratedFilename = buildMigratedFilename(filename);
      const migratedPublicUrl = supabaseAdmin.storage.from('audio-files').getPublicUrl(migratedFilename)
        .data.publicUrl;

      // idempotent: wenn bereits migriert, nur DB anpassen falls nötig
      try {
        const { data: existing } = await supabaseAdmin.storage.from('audio-files').download(migratedFilename);
        if (existing) {
          if (row.audio_url !== migratedPublicUrl) {
            await (supabaseAdmin as any)
              .from('saved_stories')
              .update({ audio_url: migratedPublicUrl })
              .eq('id', row.id);
          }
          results.push({
            id: row.id,
            status: 'skipped',
            oldUrl,
            newUrl: migratedPublicUrl,
            reason: 'already_migrated_file_exists',
          });
          continue;
        }
      } catch {
        // ignore download errors and continue with transcode
      }

      const inputPath = join(tmpdir(), `audio_in_${row.id}_${basename(filename)}`);
      const outputPath = join(tmpdir(), `audio_out_${row.id}_${basename(migratedFilename)}`);

      try {
        const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
          .from('audio-files')
          .download(filename);

        if (downloadError || !fileBlob) {
          results.push({
            id: row.id,
            status: 'error',
            oldUrl,
            reason: `download_failed:${downloadError?.message || 'unknown'}`,
          });
          continue;
        }

        const inputBuffer = Buffer.from(await fileBlob.arrayBuffer());
        await writeFile(inputPath, inputBuffer);

        await transcodeToMp3(inputPath, outputPath);

        await access(outputPath, fsConstants.R_OK);
        const outputBuffer = await readFile(outputPath);

        const { error: uploadError } = await supabaseAdmin.storage
          .from('audio-files')
          .upload(migratedFilename, outputBuffer, {
            contentType: 'audio/mpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          results.push({
            id: row.id,
            status: 'error',
            oldUrl,
            reason: `upload_failed:${uploadError.message}`,
          });
          continue;
        }

        const { error: updateError } = await (supabaseAdmin as any)
          .from('saved_stories')
          .update({ audio_url: migratedPublicUrl })
          .eq('id', row.id);

        if (updateError) {
          results.push({
            id: row.id,
            status: 'error',
            oldUrl,
            newUrl: migratedPublicUrl,
            reason: `db_update_failed:${updateError.message}`,
          });
          continue;
        }

        results.push({ id: row.id, status: 'migrated', oldUrl, newUrl: migratedPublicUrl });
      } catch (e: any) {
        results.push({
          id: row.id,
          status: 'error',
          oldUrl,
          reason: e?.message || 'transcode_failed',
        });
      } finally {
        await unlink(inputPath).catch(() => {});
        await unlink(outputPath).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      dryRun: false,
      totalCandidates: candidates.length,
      migrated: results.filter((r) => r.status === 'migrated').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      errors: results.filter((r) => r.status === 'error').length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Interner Serverfehler', details: error.message },
      { status: 500 }
    );
  }
}
