/**
 * Namensvorschau (Einstellungen und Namens-Schritt in /create-story): spricht
 * den Namen so, wie er in Storys klingt – gleiches Modell und gleiche
 * Einstellungen wie supabase/functions/generate-audio, und dieselbe Regel für
 * den Aussprache-Hinweis (spokenStoryName). Stimme: die im Flow gewählte
 * (voiceId), sonst Kerstin.
 *
 * Nur für eingeloggte Accounts. Versuche werden nicht gezählt; die Bremse
 * unten verhindert nur automatisierten Missbrauch (jeder Aufruf kostet).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/first-story/server';
import { FIRST_STORY_VOICE_ID } from '@/lib/first-story/config';
import { spokenStoryName } from '@/lib/spoken-name';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export const dynamic = 'force-dynamic';

const MAX_PER_WINDOW = 60;
const WINDOW_MS = 10 * 60 * 1000;
/** ElevenLabs-Stimmen-IDs: nur Buchstaben und Ziffern. */
const VOICE_ID_RE = /^[A-Za-z0-9]{10,40}$/;
const recentCalls = new Map<string, number[]>();

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const calls = (recentCalls.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  calls.push(now);
  recentCalls.set(userId, calls);
  return calls.length > MAX_PER_WINDOW;
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Bitte melde dich an.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const pronunciation = typeof body.pronunciation === 'string' ? body.pronunciation : '';
  const voiceId = typeof body.voiceId === 'string' && VOICE_ID_RE.test(body.voiceId) ? body.voiceId : FIRST_STORY_VOICE_ID;
  if (!name || name.length > 60) {
    return NextResponse.json({ error: 'Bitte gib einen Namen ein.' }, { status: 400 });
  }
  if (rateLimited(user.id)) {
    return NextResponse.json({ error: 'Bitte warte einen Moment, bevor du es erneut versuchst.' }, { status: 429 });
  }

  const spoken = spokenStoryName(name, pronunciation);
  const text = `${spoken}. Schön, dass du da bist, ${spoken}.`;
  try {
    const audio = (await viaElevenLabs(text, voiceId)) ?? (await viaStoryAudioFunction(text, voiceId));
    return NextResponse.json({ audio: `data:audio/mpeg;base64,${audio.toString('base64')}`, spoken });
  } catch (e) {
    console.error('[NamePreview] Fehler:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Die Vorschau konnte nicht erstellt werden.' }, { status: 502 });
  }
}

/** Direkt bei ElevenLabs. null = Schlüssel fehlt/ungültig → Rückfall nutzen. */
async function viaElevenLabs(text: string, voiceId: string): Promise<Buffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return null;
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { Accept: 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': apiKey },
    body: JSON.stringify({
      text,
      model_id: 'eleven_flash_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0, use_speaker_boost: true },
      output_format: 'mp3_44100_128',
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (response.ok) return Buffer.from(await response.arrayBuffer());
  const details = (await response.text().catch(() => '')).slice(0, 200);
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    console.warn('[NamePreview] ELEVENLABS_API_KEY abgelehnt, nutze Story-Audio-Funktion:', response.status, details);
    return null;
  }
  throw new Error(`ElevenLabs ${response.status}: ${details}`);
}

/**
 * Rückfall: dieselbe Edge-Funktion wie für Story-Audio (eigener Schlüssel in
 * Supabase). Die dabei gespeicherte Datei wird sofort wieder gelöscht.
 */
async function viaStoryAudioFunction(text: string, voiceId: string): Promise<Buffer> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error('Supabase ist nicht konfiguriert');

  const response = await fetch(`${supabaseUrl}/functions/v1/generate-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}`, apikey: anonKey },
    body: JSON.stringify({ text, voiceId, adminPreview: false }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`generate-audio ${response.status}`);
  const { audioUrl, filename } = await response.json();
  if (typeof audioUrl !== 'string') throw new Error('generate-audio lieferte keine audioUrl');

  try {
    const file = await fetch(audioUrl, { signal: AbortSignal.timeout(15_000) });
    if (!file.ok) throw new Error(`Audio-Download ${file.status}`);
    return Buffer.from(await file.arrayBuffer());
  } finally {
    if (typeof filename === 'string') {
      const admin = await createServerAdminClient();
      await admin.storage.from('audio-files').remove([filename]).catch(() => undefined);
    }
  }
}
