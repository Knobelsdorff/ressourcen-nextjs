import { NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

const CONFIG_KEYS = [
  'homepage_sample_url',
  'homepage_sample_title',
  'homepage_sample_path',
] as const;

/**
 * Öffentliche API für die Startseiten-Kostprobe.
 * Keine Authentifizierung – für alle Besucher verfügbar.
 */
export async function GET() {
  try {
    const supabaseAdmin = await createServerAdminClient();

    const { data: rows, error } = await (supabaseAdmin as any)
      .from('app_config')
      .select('key, value')
      .in('key', [...CONFIG_KEYS]);

    if (error) {
      console.error('[homepage-sample] Config error:', error);
      return NextResponse.json(
        { error: 'Kostprobe nicht konfiguriert' },
        { status: 404 }
      );
    }

    const config = Object.fromEntries((rows || []).map((r: { key: string; value: string }) => [r.key, r.value]));
    const audioUrl = config.homepage_sample_url?.trim();

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Keine Startseiten-Kostprobe hinterlegt' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sample: {
        title: config.homepage_sample_title?.trim() || 'Wohlwollende Präsenz',
        audio_url: audioUrl,
        path: config.homepage_sample_path || null,
      },
    });
  } catch (error: unknown) {
    console.error('[homepage-sample] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Kostprobe' },
      { status: 500 }
    );
  }
}
