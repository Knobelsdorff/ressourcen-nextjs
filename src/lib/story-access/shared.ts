/**
 * Story-Zugang – Typen für Server und Browser.
 *
 * Entschieden wird ausschließlich auf dem Server (./server.ts). Der Browser
 * bekommt nur das Ergebnis und eine abspielbare URL – oder keine.
 */

/** Spalte saved_stories.access_policy (Migration 20261018120000). */
export type StoryAccessPolicy = 'always' | 'trial' | 'subscription';

export type StoryLockReason =
  /** Kostenlose 7 Tage der Erststory sind vorbei. */
  | 'trial_ended'
  /** Abo beendet oder pausiert. */
  | 'subscription_inactive'
  /** Letzte Zahlung fehlgeschlagen – Zahlungsmethode aktualisieren statt neu abschließen. */
  | 'payment_failed';

export interface StoryAccess {
  policy: StoryAccessPolicy;
  playable: boolean;
  lockReason: StoryLockReason | null;
  /** Nur bei policy = 'trial'. */
  trialEndsAt: string | null;
  /** Abspielbar NUR wegen der laufenden Testphase (kein aktiver Zugang). */
  trialActive: boolean;
}

/** Ganze Tage, die von der Testphase noch übrig sind (aufgerundet, mindestens 0). */
export function trialDaysLeft(trialEndsAt: string | null, now = Date.now()): number {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - now) / (24 * 60 * 60 * 1000)));
}
