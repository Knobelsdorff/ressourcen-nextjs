/**
 * Welche KI-Modelle die App nutzt – eine Stelle zum Wechseln oder Zurückdrehen.
 *
 * Ausnahme: supabase/functions/generate-audio/index.ts läuft getrennt von dieser
 * App und braucht eine eigene Kopie von SPEECH_MODEL (plus eigenes Deployment).
 *
 * Neue Story-Modelle: Bei gpt-6.* heißt das Limit max_completion_tokens, und
 * temperature wird abgelehnt (nur der Standardwert ist erlaubt).
 */

/** Story-Text und Bearbeitungen. */
export const STORY_TEXT_MODEL = 'gpt-6.1-terra';

/**
 * Stimme für Storys, Stimmproben und Namens-Hörprobe. Kann Deutsch und kostet so
 * viel wie das frühere eleven_flash_v2, das nur Englisch unterstützt.
 */
export const SPEECH_MODEL = 'eleven_v4_turbo';
