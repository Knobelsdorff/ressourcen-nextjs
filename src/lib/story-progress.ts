/**
 * Fortschritt der Power-Story-Erstellung (/create-story, Schritt 5).
 *
 * Zwei Abschnitte, beide mit echten Signalen:
 *  1. Geschichte – /api/generate-story streamt, wie viele Zeichen GPT schon
 *     geschrieben hat. Der Balken folgt den echten Zeichen, die Restzeit dem
 *     gemessenen Schreibtempo.
 *  2. Stimme – die Edge Function meldet keinen Zwischenstand. Die Dauer hängt
 *     aber fast linear an der Textlänge, die jetzt bekannt ist:
 *     Grundzeit + ms pro Zeichen.
 *
 * Die Werte für Tempo und ms pro Zeichen lernt jedes Gerät aus seinen eigenen
 * Läufen (localStorage). Die Startwerte sind bewusst eher vorsichtig – lieber
 * früher fertig als später als angekündigt.
 *
 * Regeln für die Anzeige: Prozent steigt nur und bleibt bis "fertig" unter 100,
 * die Restzeit sinkt nur und wird am Ende zu "Gleich fertig" statt negativ.
 */

/**
 * Typische Länge einer Story. Gemessen (GPT-4o, Oktober 2026): 1.260–1.580
 * Zeichen, erstes Zeichen nach ~1,5 s, dann ~600 Zeichen/s.
 */
export const EXPECTED_STORY_CHARS = 1500;

export interface StoryTiming {
  /** Geschriebene Zeichen pro Sekunde, sobald GPT schreibt. */
  textCharsPerSec: number;
  /** Zeit bis zum ersten Zeichen (Prompt, Netzwerk). */
  textLatencyMs: number;
  /** Feste Zeit der Stimme (Aufruf, Upload). */
  audioBaseMs: number;
  /** Zusätzliche Zeit der Stimme pro Zeichen Text. */
  audioMsPerChar: number;
}

// Gemessen im Oktober 2026 (lokal, eleven_flash_v2): ein einzelner Satz ~7 s
// (Grundzeit aus Aufruf und Upload), eine volle Story ~8 ms pro Zeichen dazu.
// Etwas vorsichtiger angesetzt, bis das Gerät seinen eigenen Wert kennt.
// Im Browser kamen die ersten Zeichen später als per curl (~2,5 s statt ~1,5 s).
const DEFAULT_TIMING: StoryTiming = {
  textCharsPerSec: 550,
  textLatencyMs: 2500,
  audioBaseMs: 6000,
  audioMsPerChar: 10,
};

const TIMING_KEY = 'ps_story_timing_v1';

export function readTiming(): StoryTiming {
  try {
    const saved = JSON.parse(window.localStorage.getItem(TIMING_KEY) || 'null');
    if (saved && typeof saved === 'object') return { ...DEFAULT_TIMING, ...saved };
  } catch { /* Ohne Speicher gelten die Startwerte. */ }
  return DEFAULT_TIMING;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
// Neuer Messwert zählt zur Hälfte – reagiert schnell, ein Ausreißer kippt nichts.
const blend = (old: number, next: number) => old * 0.5 + next * 0.5;

function writeTiming(update: (timing: StoryTiming) => StoryTiming) {
  try {
    window.localStorage.setItem(TIMING_KEY, JSON.stringify(update(readTiming())));
  } catch { /* Kalibrierung ist optional. */ }
}

/* ---------- Ablauf einer Erstellung (ein Lauf pro Tab) ---------- */

export interface StoryTimeline {
  textStartedAt: number | null;
  firstCharAt: number | null;
  /** Bisher geschriebene Zeichen (aus dem Stream). */
  textChars: number;
  textDoneAt: number | null;
  /** Länge der fertigen Story. */
  storyChars: number | null;
  audioStartedAt: number | null;
  audioDoneAt: number | null;
}

const EMPTY: StoryTimeline = {
  textStartedAt: null,
  firstCharAt: null,
  textChars: 0,
  textDoneAt: null,
  storyChars: null,
  audioStartedAt: null,
  audioDoneAt: null,
};

let timeline: StoryTimeline = EMPTY;
const listeners = new Set<() => void>();

function emit(next: StoryTimeline) {
  timeline = next;
  listeners.forEach((listener) => listener());
}

/** Für useSyncExternalStore – nur der Loader rendert bei jedem Update neu. */
export const storyTimeline = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  get: () => timeline,
  getServer: () => EMPTY,
  /** Nur für die Vorschau in /test/loaders: Ablauf direkt setzen, ohne zu kalibrieren. */
  preview(next: Partial<StoryTimeline>) {
    emit({ ...EMPTY, ...next });
  },

  textStarted() {
    emit({ ...EMPTY, textStartedAt: Date.now() });
  },
  textProgress(chars: number) {
    if (chars <= timeline.textChars) return;
    emit({ ...timeline, textChars: chars, firstCharAt: timeline.firstCharAt ?? Date.now() });
  },
  textDone(story: string) {
    const now = Date.now();
    const { textStartedAt, firstCharAt } = timeline;
    // Nur echte, gestreamte Läufe kalibrieren (nicht die Vorlage ohne OpenAI).
    if (textStartedAt && firstCharAt && story.length > 400 && now - firstCharAt > 500) {
      const rate = story.length / ((now - firstCharAt) / 1000);
      const latency = firstCharAt - textStartedAt;
      writeTiming((t) => ({
        ...t,
        textCharsPerSec: clamp(blend(t.textCharsPerSec, rate), 40, 600),
        textLatencyMs: clamp(blend(t.textLatencyMs, latency), 300, 15000),
      }));
    }
    emit({ ...timeline, textChars: story.length, textDoneAt: now, storyChars: story.length });
  },
  /** Die Story war schon da (z. B. neue Stimme): Text gilt als fertig. */
  storyKnown(story: string) {
    if (timeline.storyChars === story.length && timeline.textDoneAt) return;
    const now = Date.now();
    emit({ ...timeline, textStartedAt: timeline.textStartedAt ?? now, textDoneAt: timeline.textDoneAt ?? now, storyChars: story.length, textChars: story.length });
  },
  audioStarted(chars: number) {
    const now = Date.now();
    emit({ ...timeline, storyChars: chars, textDoneAt: timeline.textDoneAt ?? now, textStartedAt: timeline.textStartedAt ?? now, audioStartedAt: now, audioDoneAt: null });
  },
  audioDone(chars: number, adminPreview: boolean) {
    const now = Date.now();
    const { audioStartedAt } = timeline;
    // Sparmodus spricht nur den ersten Satz – nicht repräsentativ.
    if (audioStartedAt && !adminPreview && chars > 400) {
      const measured = now - audioStartedAt;
      writeTiming((t) => ({
        ...t,
        audioMsPerChar: clamp(blend(t.audioMsPerChar, (measured - t.audioBaseMs) / chars), 2, 80),
      }));
    }
    emit({ ...timeline, audioDoneAt: now });
  },
};

/* ---------- Was zeigt der Loader? ---------- */

export type StoryPhase = 'text' | 'audio' | 'ready';

export interface StoryProgress {
  phase: StoryPhase;
  /** 0–99 während des Wartens, 100 erst wenn fertig. */
  percent: number;
  /** Geschätzte Sekunden bis fertig. */
  remaining: number;
  /** Füllstand des laufenden Abschnitts (0–1). */
  stepFill: number;
  /** Deutlich länger als erwartet. */
  overdue: boolean;
}

// 90 % der Strecke bei der erwarteten Dauer, danach nur noch langsam – steht nie still.
const easeOut = (x: number) => 1 - Math.exp(-2.3 * Math.max(0, x));

export const expectedAudioMs = (chars: number, t: StoryTiming) => t.audioBaseMs + chars * t.audioMsPerChar;
const expectedTextMs = (t: StoryTiming) => t.textLatencyMs + (EXPECTED_STORY_CHARS / t.textCharsPerSec) * 1000;

export function computeProgress(tl: StoryTimeline, now: number, t: StoryTiming, ready: boolean): StoryProgress {
  if (ready) return { phase: 'ready', percent: 100, remaining: 0, stepFill: 1, overdue: false };

  // Anteil der Geschichte am Ring – aus den erwarteten Dauern, pro Lauf fest.
  const textShare = expectedTextMs(t) / (expectedTextMs(t) + expectedAudioMs(EXPECTED_STORY_CHARS, t));

  if (!tl.textDoneAt) {
    const started = tl.textStartedAt ?? now;
    let fill: number;
    let textLeftMs: number;
    if (tl.firstCharAt && tl.textChars > 0) {
      const writingMs = Math.max(1, now - tl.firstCharAt);
          // In der ersten Sekunde ist das gemessene Tempo zu unruhig – Startwert mischen.
      const measured = tl.textChars / (writingMs / 1000);
      const rate = writingMs < 1000 ? blend(t.textCharsPerSec, measured) : measured;
      fill = Math.min(0.97, Math.max(0.08, tl.textChars / EXPECTED_STORY_CHARS));
      textLeftMs = (Math.max(0, EXPECTED_STORY_CHARS - tl.textChars) / Math.max(rate, 20)) * 1000;
    } else {
      // Noch kein Zeichen: langsam bis 8 %, dann wartet der Ring auf GPT.
      fill = 0.08 * easeOut((now - started) / t.textLatencyMs);
      textLeftMs = Math.max(0, t.textLatencyMs - (now - started)) + (EXPECTED_STORY_CHARS / t.textCharsPerSec) * 1000;
    }
    const chars = Math.max(EXPECTED_STORY_CHARS, tl.textChars);
    return {
      phase: 'text',
      percent: Math.floor(textShare * fill * 100),
      remaining: (textLeftMs + expectedAudioMs(chars, t)) / 1000,
      stepFill: fill,
      overdue: now - started > expectedTextMs(t) * 2 + 10000,
    };
  }

  const chars = tl.storyChars ?? EXPECTED_STORY_CHARS;
  const expected = expectedAudioMs(chars, t);
  const audioMs = now - (tl.audioStartedAt ?? tl.textDoneAt);
  const fill = easeOut(audioMs / expected);
  return {
    phase: 'audio',
    percent: Math.min(99, Math.floor((textShare + (1 - textShare) * fill) * 100)),
    remaining: Math.max(0, expected - audioMs) / 1000,
    stepFill: fill,
    overdue: audioMs > expected * 1.3 + 8000,
  };
}

export function formatRemaining(seconds: number): string {
  if (seconds <= 8) return 'Gleich fertig';
  if (seconds < 55) return `Noch etwa ${Math.ceil(seconds / 5) * 5} Sekunden`;
  if (seconds < 90) return 'Noch etwa 1 Minute';
  return `Noch etwa ${Math.round(seconds / 60)} Minuten`;
}
