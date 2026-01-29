import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

/**
 * Öffentliche API-Route zum Abrufen der Beispiel-Ressourcenfigur
 * Keine Authentifizierung erforderlich - für alle User (auch nicht eingeloggte) verfügbar
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = await createServerAdminClient();

    // Lade die Beispiel-Ressourcenfigur-ID aus app_config
    const { data: config, error: configError } = await (supabaseAdmin as any)
      .from('app_config')
      .select('value')
      .eq('key', 'example_resource_id')
      .single();

    if (configError || !config?.value) {
      console.error('[example-resource] Config error:', configError);
      return NextResponse.json(
        { error: 'Beispiel-Ressourcenfigur nicht konfiguriert' },
        { status: 404 }
      );
    }

    const exampleResourceId = config.value;

    // Lade die Ressourcenfigur aus saved_stories
    const { data: resource, error: resourceError } = await (supabaseAdmin as any)
      .from('saved_stories')
      .select('id, title, content, audio_url, resource_figure, voice_id, created_at')
      .eq('id', exampleResourceId)
      .single();

    if (resourceError || !resource) {
      console.error('[example-resource] Resource error:', resourceError);
      return NextResponse.json(
        { error: 'Beispiel-Ressourcenfigur nicht gefunden' },
        { status: 404 }
      );
    }

    // Prüfe ob audio_url vorhanden ist
    if (!resource.audio_url || resource.audio_url.trim() === '') {
      return NextResponse.json(
        { error: 'Beispiel-Ressourcenfigur hat keine Audio-Datei' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      resource: {
        id: resource.id,
        title: resource.title,
        content: resource.content,
        resource_figure: resource.resource_figure,
        audio_url: resource.audio_url,
        voice_id: resource.voice_id,
        created_at: resource.created_at,
      },
    });
  } catch (error: any) {
    console.error('[example-resource] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Laden der Beispiel-Ressourcenfigur' },
      { status: 500 }
    );
  }
}

