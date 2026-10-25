/**
 * Funnel-Events für PostHog – die einzige Liste, was gesendet werden darf.
 * Wird von Browser und Server gleichermaßen benutzt.
 *
 * Datenschutz: Es geht nur um Verhalten, nie um Inhalte. Keine Antworten,
 * keine Freitexte, keine Story-Texte, keine Namen oder E-Mail-Adressen, kein
 * Audio. Durchgesetzt wird das zweifach:
 *   1. Jedes Event hat eine Positivliste an Eigenschaften – alles andere fällt weg.
 *   2. Texte müssen wie Kennungen aussehen (Buchstaben, Ziffern, - _ . :, max. 64
 *      Zeichen, keine Leerzeichen). Ein versehentlich übergebener Satz wird so
 *      nie gesendet, selbst wenn er in einer erlaubten Eigenschaft steckt.
 */

export type StoryFlow = 'angel' | 'regular';

/** Zugang der Story beim Abspielen. 'unsaved' = noch nicht gespeichert (Erstellung ohne Account). */
export type StoryPlayAccess = 'trial' | 'subscription' | 'always' | 'unsaved';

export interface StoryPlayProps {
  story_id: string;
  access: StoryPlayAccess;
  location: 'dashboard' | 'create_story';
  /** Ganze Tage seit dem Speichern der Story (0 = am selben Tag). */
  days_since_created?: number;
  /** Wie oft die Story auf diesem Gerät gestartet wurde (inkl. dieses Mal). */
  play_number?: number;
  is_replay?: boolean;
}

interface FigureProps {
  figure_category: string;
  /** Kennung der Figur aus der festen Liste; eigene Figuren immer 'custom'. */
  figure_id: string;
}

export interface FunnelEventProps {
  creation_cta_clicked: { location: string };
  story_creation_started: FigureProps & { flow: StoryFlow; question_count: number };
  personalization_question_completed: { flow: StoryFlow; question_number: number; question_count: number };
  personalization_completed: FigureProps & {
    flow: StoryFlow;
    personalization_completed: true;
    question_count: number;
    /** Anzahl eigener Antwort-Bausteine – nur die Zahl, nie der Text. */
    custom_answer_count: number;
    duration_seconds?: number;
  };
  signup_viewed: { flow: StoryFlow; gate: 'angel_email' | 'save_story' };
  signup_completed: { method: string; flow?: StoryFlow };
  story_generation_started: FigureProps & { flow: StoryFlow; economy_mode?: boolean };
  story_generated: FigureProps & { flow: StoryFlow; duration_seconds?: number };
  story_play_started: StoryPlayProps;
  story_play_completed: StoryPlayProps;
  story_replayed: StoryPlayProps;
  soft_paywall_viewed: { variant: string; location: string };
  subscription_cta_clicked: { variant: string; location: string };
  checkout_started: { plan: string };
  subscription_started: { plan: string };
  free_access_expired: { access: StoryPlayAccess; trial_days: number };
}

export type FunnelEvent = keyof FunnelEventProps;

const FIGURE_KEYS = ['figure_category', 'figure_id'] as const;
const PLAY_KEYS = ['story_id', 'access', 'location', 'days_since_created', 'play_number', 'is_replay'] as const;

/** Positivliste – muss zu FunnelEventProps passen (der Typ unten prüft das). */
const ALLOWED: { [E in FunnelEvent]: readonly (keyof FunnelEventProps[E])[] } = {
  creation_cta_clicked: ['location'],
  story_creation_started: [...FIGURE_KEYS, 'flow', 'question_count'],
  personalization_question_completed: ['flow', 'question_number', 'question_count'],
  personalization_completed: [...FIGURE_KEYS, 'flow', 'personalization_completed', 'question_count', 'custom_answer_count', 'duration_seconds'],
  signup_viewed: ['flow', 'gate'],
  signup_completed: ['method', 'flow'],
  story_generation_started: [...FIGURE_KEYS, 'flow', 'economy_mode'],
  story_generated: [...FIGURE_KEYS, 'flow', 'duration_seconds'],
  story_play_started: PLAY_KEYS,
  story_play_completed: PLAY_KEYS,
  story_replayed: PLAY_KEYS,
  soft_paywall_viewed: ['variant', 'location'],
  subscription_cta_clicked: ['variant', 'location'],
  checkout_started: ['plan'],
  subscription_started: ['plan'],
  free_access_expired: ['access', 'trial_days'],
};

export const FUNNEL_EVENTS = Object.keys(ALLOWED) as FunnelEvent[];

export function isFunnelEvent(name: string): name is FunnelEvent {
  return Object.prototype.hasOwnProperty.call(ALLOWED, name);
}

const SAFE_STRING = /^[A-Za-z0-9_.:-]{1,64}$/;

/** Ein einzelner Wert, wie er gesendet werden darf – sonst undefined. */
export function safeValue(value: unknown): string | number | boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) / 100 : undefined;
  if (typeof value === 'string') return SAFE_STRING.test(value) ? value : undefined;
  return undefined;
}

/** Entfernt alles, was nicht auf der Positivliste steht oder kein sicherer Wert ist. */
export function sanitizeEventProps<E extends FunnelEvent>(event: E, props: FunnelEventProps[E]): Record<string, string | number | boolean> {
  const clean: Record<string, string | number | boolean> = {};
  for (const key of ALLOWED[event] as readonly string[]) {
    const value = safeValue((props as Record<string, unknown>)[key]);
    if (value !== undefined) clean[key] = value;
  }
  return clean;
}

/* ---------- Figuren ---------- */

/** Figur ohne Inhalte: Kategorie und – nur bei festen Figuren – die Kennung. */
export function figureProps(figure: { id?: string; category?: string; isCustom?: boolean } | null | undefined): FigureProps {
  const id = figure?.id ?? '';
  const custom = !!figure?.isCustom || figure?.category === 'custom' || id.startsWith('custom');
  return {
    figure_category: figure?.category ?? 'unknown',
    figure_id: custom ? 'custom' : SAFE_STRING.test(id) ? id : 'unknown',
  };
}
