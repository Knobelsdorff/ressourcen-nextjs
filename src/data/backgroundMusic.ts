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

// Standard-Lautstärke für Hintergrundmusik (12% = 0.12)
export const DEFAULT_MUSIC_VOLUME = 0.12;

/**
 * Hole den Standard-Musik-Track für eine Figur aus der Datenbank (inkl. Lautstärke)
 * @param figureIdOrName - ID oder Name der Figur
 * @returns Objekt mit track_url und volume, oder null
 */
export async function getBackgroundMusicTrack(figureIdOrName: string | undefined): Promise<{ track_url: string; volume: number } | null> {
  if (!figureIdOrName) {
    console.log('[getBackgroundMusicTrack] No figureIdOrName provided');
    return null;
  }

  try {
    const normalizedId = figureIdOrName.toLowerCase();
    console.log('[getBackgroundMusicTrack] ===== SEARCHING FOR MUSIC =====');
    console.log('[getBackgroundMusicTrack] Input:', { figureIdOrName, normalizedId });

    // Versuche zuerst aus Datenbank zu laden (nach figure_id)
    const { data: dataById, error: errorById } = await (supabase as any)
      .from('background_music_tracks')
      .select('track_url, figure_id, figure_name, is_default, volume')
      .eq('figure_id', normalizedId)
      .eq('is_default', true)
      .maybeSingle();

    console.log('[getBackgroundMusicTrack] Query by figure_id result:', {
      found: !!dataById,
      track_url: dataById?.track_url,
      volume: dataById?.volume,
      error: errorById?.message,
    });

    if (!errorById && dataById?.track_url) {
      const volume = dataById.volume != null ? parseFloat(dataById.volume) : DEFAULT_MUSIC_VOLUME;
      console.log('[getBackgroundMusicTrack] Found track by figure_id:', { track_url: dataById.track_url, volume });
      return { track_url: dataById.track_url, volume };
    }

    // Fallback: Suche nach figure_name
    const { data: dataByName, error: errorByName } = await (supabase as any)
      .from('background_music_tracks')
      .select('track_url, figure_id, figure_name, is_default, volume')
      .eq('figure_name', figureIdOrName)
      .eq('is_default', true)
      .maybeSingle();

    console.log('[getBackgroundMusicTrack] Query by figure_name result:', {
      found: !!dataByName,
      track_url: dataByName?.track_url,
      volume: dataByName?.volume,
      error: errorByName?.message,
    });

    if (!errorByName && dataByName?.track_url) {
      const volume = dataByName.volume != null ? parseFloat(dataByName.volume) : DEFAULT_MUSIC_VOLUME;
      console.log('[getBackgroundMusicTrack] Found track by figure_name:', { track_url: dataByName.track_url, volume });
      return { track_url: dataByName.track_url, volume };
    }

    // Fallback: Suche in allen Figuren nach Name oder ID
    const figure = allFigures.find(f => 
      f.id.toLowerCase() === normalizedId || 
      f.name.toLowerCase() === normalizedId
    );

    if (figure) {
      console.log('[getBackgroundMusicTrack] Found figure in allFigures:', { id: figure.id, name: figure.name });
      
      // Versuche mit figure.id
      const { data: dataByFigureId, error: errorByFigureId } = await (supabase as any)
        .from('background_music_tracks')
        .select('track_url, figure_id, is_default, volume')
        .eq('figure_id', figure.id.toLowerCase())
        .eq('is_default', true)
        .maybeSingle();

      if (!errorByFigureId && dataByFigureId?.track_url) {
        const volume = dataByFigureId.volume != null ? parseFloat(dataByFigureId.volume) : DEFAULT_MUSIC_VOLUME;
        console.log('[getBackgroundMusicTrack] Found track by figure.id:', { track_url: dataByFigureId.track_url, volume });
        return { track_url: dataByFigureId.track_url, volume };
      }

      // Versuche mit figure.name
      const { data: dataByFigureName, error: errorByFigureName } = await (supabase as any)
        .from('background_music_tracks')
        .select('track_url, figure_name, is_default, volume')
        .eq('figure_name', figure.name)
        .eq('is_default', true)
        .maybeSingle();

      if (!errorByFigureName && dataByFigureName?.track_url) {
        const volume = dataByFigureName.volume != null ? parseFloat(dataByFigureName.volume) : DEFAULT_MUSIC_VOLUME;
        console.log('[getBackgroundMusicTrack] Found track by figure.name:', { track_url: dataByFigureName.track_url, volume });
        return { track_url: dataByFigureName.track_url, volume };
      }
    }

    // Legacy Fallback: Alte Code-basierte Lösung (für Migration)
    if (backgroundMusicMap[figureIdOrName]) {
      console.log('[getBackgroundMusicTrack] Using legacy mapping for:', figureIdOrName);
      return { track_url: backgroundMusicMap[figureIdOrName], volume: DEFAULT_MUSIC_VOLUME };
    }

    if (figure) {
      if (backgroundMusicMap[figure.id]) {
        console.log('[getBackgroundMusicTrack] Using legacy mapping for figure.id:', figure.id);
        return { track_url: backgroundMusicMap[figure.id], volume: DEFAULT_MUSIC_VOLUME };
      }
      if (backgroundMusicMap[figure.name]) {
        console.log('[getBackgroundMusicTrack] Using legacy mapping for figure.name:', figure.name);
        return { track_url: backgroundMusicMap[figure.name], volume: DEFAULT_MUSIC_VOLUME };
      }
    }

    console.warn('[getBackgroundMusicTrack] No music track found for:', figureIdOrName);
    return null;
  } catch (error) {
    console.error('[getBackgroundMusicTrack] Error loading from database:', error);
    
    // Fallback auf Legacy-Mapping bei Fehler
    if (backgroundMusicMap[figureIdOrName]) {
      console.log('[getBackgroundMusicTrack] Using legacy mapping after error for:', figureIdOrName);
      return { track_url: backgroundMusicMap[figureIdOrName], volume: DEFAULT_MUSIC_VOLUME };
    }
    
    return null;
  }
}

/**
 * Hole nur die URL des Standard-Musik-Tracks (für Rückwärtskompatibilität)
 * @param figureIdOrName - ID oder Name der Figur
 * @returns URL des Standard-Tracks oder null
 */
export async function getBackgroundMusicUrl(figureIdOrName: string | undefined): Promise<string | null> {
  const track = await getBackgroundMusicTrack(figureIdOrName);
  return track?.track_url || null;
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
  volume: number;
}>> {
  if (!figureIdOrName) return [];

  try {
    const normalizedId = figureIdOrName.toLowerCase();
    
    // Suche nach figure_id
    const { data: dataById, error: errorById } = await (supabase as any)
      .from('background_music_tracks')
      .select('id, track_id, track_url, track_title, track_artist, is_default, volume')
      .eq('figure_id', normalizedId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!errorById && dataById && dataById.length > 0) {
      return dataById.map((track: any) => ({
        ...track,
        volume: track.volume != null ? parseFloat(track.volume) : DEFAULT_MUSIC_VOLUME
      }));
    }

    // Fallback: Suche nach figure_name
    const { data: dataByName, error: errorByName } = await (supabase as any)
      .from('background_music_tracks')
      .select('id, track_id, track_url, track_title, track_artist, is_default, volume')
      .eq('figure_name', figureIdOrName)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!errorByName && dataByName && dataByName.length > 0) {
      return dataByName.map((track: any) => ({
        ...track,
        volume: track.volume != null ? parseFloat(track.volume) : DEFAULT_MUSIC_VOLUME
      }));
    }

    return [];
  } catch (error) {
    console.error('[getBackgroundMusicTracks] Error loading from database:', error);
    return [];
  }
}

