import { realFigures, fictionalFigures } from './figures';
import { supabase } from '@/lib/supabase';

// Kombiniere alle Figuren für die Suche
const allFigures = [...realFigures, ...fictionalFigures];

// Legacy Mapping: Fallback für Migration (wird später entfernt)
// Musik-Tracks werden jetzt primär aus der Datenbank geladen
const backgroundMusicMap: Record<string, string> = {
  'lilith': 'https://wfnvjmockhcualjgymyl.supabase.co/storage/v1/object/public/background-music/430_full_outcome_0164_preview.mp3',
  'Lilith': 'https://wfnvjmockhcualjgymyl.supabase.co/storage/v1/object/public/background-music/430_full_outcome_0164_preview.mp3',
};

// Standard-Lautstärke für Hintergrundmusik (20% = 0.20)
export const DEFAULT_MUSIC_VOLUME = 0.20;

/**
 * Hole den Standard-Musik-Track für eine Figur aus der Datenbank
 * @param figureIdOrName - ID oder Name der Figur
 * @returns URL des Standard-Tracks oder null
 */
export async function getBackgroundMusicUrl(figureIdOrName: string | undefined): Promise<string | null> {
  if (!figureIdOrName) {
    console.log('[getBackgroundMusicUrl] No figureIdOrName provided');
    return null;
  }

  try {
    const normalizedId = figureIdOrName.toLowerCase();
    console.log('[getBackgroundMusicUrl] ===== SEARCHING FOR MUSIC =====');
    console.log('[getBackgroundMusicUrl] Input:', { figureIdOrName, normalizedId });

    // Versuche zuerst aus Datenbank zu laden (nach figure_id)
    // Verwende ILIKE für case-insensitive Suche als Fallback
    const { data: dataById, error: errorById } = await (supabase as any)
      .from('background_music_tracks')
      .select('track_url, figure_id, figure_name, is_default')
      .eq('figure_id', normalizedId)
      .eq('is_default', true)
      .maybeSingle(); // maybeSingle() statt single() - gibt null statt Fehler wenn nicht gefunden

    console.log('[getBackgroundMusicUrl] Query by figure_id result:', {
      found: !!dataById,
      track_url: dataById?.track_url,
      error: errorById?.message,
      figure_id: dataById?.figure_id,
      is_default: dataById?.is_default
    });

    if (!errorById && dataById?.track_url) {
      console.log('[getBackgroundMusicUrl] Found track by figure_id:', dataById.track_url);
      return dataById.track_url;
    }

    // Fallback: Suche nach figure_name
    const { data: dataByName, error: errorByName } = await (supabase as any)
      .from('background_music_tracks')
      .select('track_url, figure_id, figure_name, is_default')
      .eq('figure_name', figureIdOrName)
      .eq('is_default', true)
      .maybeSingle();

    console.log('[getBackgroundMusicUrl] Query by figure_name result:', {
      found: !!dataByName,
      track_url: dataByName?.track_url,
      error: errorByName?.message,
      figure_name: dataByName?.figure_name,
      is_default: dataByName?.is_default
    });

    if (!errorByName && dataByName?.track_url) {
      console.log('[getBackgroundMusicUrl] Found track by figure_name:', dataByName.track_url);
      return dataByName.track_url;
    }

    // Fallback: Suche in allen Figuren nach Name oder ID
    const figure = allFigures.find(f => 
      f.id.toLowerCase() === normalizedId || 
      f.name.toLowerCase() === normalizedId
    );

    if (figure) {
      console.log('[getBackgroundMusicUrl] Found figure in allFigures:', { id: figure.id, name: figure.name });
      
      // Versuche mit figure.id
      const { data: dataByFigureId, error: errorByFigureId } = await (supabase as any)
        .from('background_music_tracks')
        .select('track_url, figure_id, is_default')
        .eq('figure_id', figure.id.toLowerCase())
        .eq('is_default', true)
        .maybeSingle();

      console.log('[getBackgroundMusicUrl] Query by figure.id result:', {
        found: !!dataByFigureId,
        track_url: dataByFigureId?.track_url,
        error: errorByFigureId?.message
      });

      if (!errorByFigureId && dataByFigureId?.track_url) {
        console.log('[getBackgroundMusicUrl] Found track by figure.id:', dataByFigureId.track_url);
        return dataByFigureId.track_url;
      }

      // Versuche mit figure.name
      const { data: dataByFigureName, error: errorByFigureName } = await (supabase as any)
        .from('background_music_tracks')
        .select('track_url, figure_name, is_default')
        .eq('figure_name', figure.name)
        .eq('is_default', true)
        .maybeSingle();

      console.log('[getBackgroundMusicUrl] Query by figure.name result:', {
        found: !!dataByFigureName,
        track_url: dataByFigureName?.track_url,
        error: errorByFigureName?.message
      });

      if (!errorByFigureName && dataByFigureName?.track_url) {
        console.log('[getBackgroundMusicUrl] Found track by figure.name:', dataByFigureName.track_url);
        return dataByFigureName.track_url;
      }
    } else {
      console.log('[getBackgroundMusicUrl] Figure not found in allFigures:', normalizedId);
    }

    // Legacy Fallback: Alte Code-basierte Lösung (für Migration)
    if (backgroundMusicMap[figureIdOrName]) {
      console.log('[getBackgroundMusicUrl] Using legacy mapping for:', figureIdOrName);
      return backgroundMusicMap[figureIdOrName];
    }

    if (figure) {
      if (backgroundMusicMap[figure.id]) {
        console.log('[getBackgroundMusicUrl] Using legacy mapping for figure.id:', figure.id);
        return backgroundMusicMap[figure.id];
      }
      if (backgroundMusicMap[figure.name]) {
        console.log('[getBackgroundMusicUrl] Using legacy mapping for figure.name:', figure.name);
        return backgroundMusicMap[figure.name];
      }
    }

    console.warn('[getBackgroundMusicUrl] No music track found for:', figureIdOrName);
    return null;
  } catch (error) {
    console.error('[getBackgroundMusicUrl] Error loading from database:', error);
    
    // Fallback auf Legacy-Mapping bei Fehler
    if (backgroundMusicMap[figureIdOrName]) {
      console.log('[getBackgroundMusicUrl] Using legacy mapping after error for:', figureIdOrName);
      return backgroundMusicMap[figureIdOrName];
    }
    
    return null;
  }
}

/**
 * Hole alle verfügbaren Tracks für eine Figur
 * @param figureIdOrName - ID oder Name der Figur
 * @returns Array von Track-Objekten oder leeres Array
 */
export async function getBackgroundMusicTracks(figureIdOrName: string | undefined): Promise<Array<{
  id: string;
  track_id: string;
  track_url: string;
  track_title: string | null;
  track_artist: string | null;
  is_default: boolean;
}>> {
  if (!figureIdOrName) return [];

  try {
    const normalizedId = figureIdOrName.toLowerCase();
    
        // Suche nach figure_id
        const { data: dataById, error: errorById } = await (supabase as any)
          .from('background_music_tracks')
          .select('id, track_id, track_url, track_title, track_artist, is_default')
          .eq('figure_id', normalizedId)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

        if (!errorById && dataById && dataById.length > 0) {
          return dataById;
        }

        // Fallback: Suche nach figure_name
        const { data: dataByName, error: errorByName } = await (supabase as any)
          .from('background_music_tracks')
          .select('id, track_id, track_url, track_title, track_artist, is_default')
          .eq('figure_name', figureIdOrName)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false });

    if (!errorByName && dataByName && dataByName.length > 0) {
      return dataByName;
    }

    return [];
  } catch (error) {
    console.error('[getBackgroundMusicTracks] Error loading from database:', error);
    return [];
  }
}

