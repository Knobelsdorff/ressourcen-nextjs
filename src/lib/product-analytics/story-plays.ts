/**
 * Wiedergabe-Events für die Funnel- und 7-Tage-Auswertung.
 *
 *   story_play_started   – Beginn einer Hör-Sitzung (nicht jedes Fortsetzen nach Pause)
 *   story_play_completed – Ende der Stimme erreicht (einmal pro Sitzung)
 *   story_replayed       – die Story wird zu einem späteren Zeitpunkt erneut gehört
 *
 * "Später" heißt: mindestens 30 Minuten nach dem letzten Start auf diesem
 * Gerät – oder, wenn das Gerät die Story noch nicht kennt, nach dem ersten
 * vollständigen Hören laut Server (saved_stories.first_completed_at).
 * Die Historie liegt nur mit Einwilligung im Browser (localStorage).
 */

import { analyticsStorageAllowed, track } from './client';
import type { StoryPlayAccess, StoryPlayProps } from './events';

export interface StoryPlayContext {
  storyId: string;
  access: StoryPlayAccess;
  location: StoryPlayProps['location'];
  createdAt?: string | null;
  /** Erstes vollständiges Anhören laut Server, falls bekannt. */
  firstCompletedAt?: string | null;
}

interface PlayHistoryEntry {
  first: number;
  last: number;
  count: number;
}

const HISTORY_KEY = 'ps_story_plays_v1';
const NEW_SESSION_GAP_MS = 30 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Pro Seitenaufruf: welche Storys schon gestartet/beendet wurden, mit den Eigenschaften der Sitzung. */
const sessions = new Map<string, { props: StoryPlayProps; completed: boolean }>();

function readHistory(): Record<string, PlayHistoryEntry> {
  try {
    return JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '{}') ?? {};
  } catch {
    return {};
  }
}

function writeHistory(history: Record<string, PlayHistoryEntry>) {
  if (!analyticsStorageAllowed()) return;
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch { /* nur Komfort für die Auswertung */ }
}

function baseProps(ctx: StoryPlayContext, now: number): StoryPlayProps {
  const created = ctx.createdAt ? new Date(ctx.createdAt).getTime() : NaN;
  return {
    story_id: ctx.storyId,
    access: ctx.access,
    location: ctx.location,
    ...(Number.isFinite(created) ? { days_since_created: Math.max(0, Math.floor((now - created) / DAY_MS)) } : {}),
  };
}

export function storyPlayStarted(ctx: StoryPlayContext) {
  if (sessions.has(ctx.storyId)) return;
  const now = Date.now();
  const history = readHistory();
  const entry = history[ctx.storyId];

  // Neu geladen mitten im Hören: dieselbe Sitzung, kein neuer Start.
  if (entry && now - entry.last < NEW_SESSION_GAP_MS) {
    sessions.set(ctx.storyId, { props: { ...baseProps(ctx, now), play_number: entry.count, is_replay: entry.count > 1 }, completed: false });
    history[ctx.storyId] = { ...entry, last: now };
    writeHistory(history);
    return;
  }

  const completedBefore = ctx.firstCompletedAt ? new Date(ctx.firstCompletedAt).getTime() : NaN;
  const isReplay = entry ? true : Number.isFinite(completedBefore) && now - completedBefore >= NEW_SESSION_GAP_MS;
  const playNumber = (entry?.count ?? (isReplay ? 1 : 0)) + 1;
  const props: StoryPlayProps = { ...baseProps(ctx, now), play_number: playNumber, is_replay: isReplay };

  sessions.set(ctx.storyId, { props, completed: false });
  history[ctx.storyId] = { first: entry?.first ?? now, last: now, count: playNumber };
  writeHistory(history);

  track('story_play_started', props);
  if (isReplay) track('story_replayed', props, { $set: { has_replayed_story: true } });
}

export function storyPlayCompleted(ctx: StoryPlayContext) {
  const session = sessions.get(ctx.storyId);
  if (session?.completed) return;
  const props = session?.props ?? baseProps(ctx, Date.now());
  sessions.set(ctx.storyId, { props, completed: true });
  track('story_play_completed', props);
}
