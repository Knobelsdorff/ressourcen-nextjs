"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import AngelIconFinal from "@/components/AngelIconFinal";
import { T, useTextFn } from "@/components/site-text/T";
import type { TextDef } from "@/lib/site-texts/define";
import { firstStory } from "@/content/texts/firstStory";
import { useAuth } from "@/components/providers/auth-provider";
import { FIRST_STORY_DRAFT_STORAGE_KEY, FirstStoryPhase } from "@/lib/first-story/config";
import { getAnalyticsId, track } from "@/lib/product-analytics/client";

const RESEND_WAIT_SECONDS = 60;
const POLL_INTERVAL_MS = 4000;
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

interface StoredDraft {
  draftId: string;
  key: string;
  email: string;
  savedAt: number;
}

function readStoredDraft(): StoredDraft | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FIRST_STORY_DRAFT_STORAGE_KEY) || "null");
    if (!parsed?.draftId || !parsed?.key || Date.now() - parsed.savedAt > DRAFT_TTL_MS) return null;
    return parsed as StoredDraft;
  } catch {
    return null;
  }
}

function writeStoredDraft(draft: StoredDraft | null) {
  try {
    if (draft) window.localStorage.setItem(FIRST_STORY_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    else window.localStorage.removeItem(FIRST_STORY_DRAFT_STORAGE_KEY);
  } catch { /* Nur eine Komfortfunktion für "Link erneut senden". */ }
}

const phaseCopy: Record<FirstStoryPhase, TextDef> = {
  none: firstStory["server.phase.none"],
  text: firstStory["server.phase.text"],
  audio: firstStory["server.phase.audio"],
  ready: firstStory["server.phase.ready"],
  claimed: firstStory["server.phase.claimed"],
  failed: firstStory["server.phase.failed"],
};

interface FirstStoryServerGateProps {
  questionAnswers: unknown[];
  /** Aus dem Namens-Schritt (optional). Der Server erzeugt die Story damit und übernimmt ihn ins Profil. */
  userName?: string | null;
  pronunciationHint?: string | null;
  linkError?: boolean;
  /** Wird aufgerufen, sobald die Story einem Account gehört (Entwurf im Browser aufräumen). */
  onComplete?: () => void;
}

/**
 * Konto-Schritt des Erststory-Flows, wenn die Story serverseitig erzeugt wird.
 * Der Link in der E-Mail führt direkt ins Dashboard – egal in welchem Tab
 * oder auf welchem Gerät er geöffnet wird.
 */
export default function FirstStoryServerGate({ questionAnswers, userName, pronunciationHint, linkError = false, onComplete }: FirstStoryServerGateProps) {
  // Gehört zu jedem NEUEN Entwurf. Bestehende Entwürfe (Link erneut senden,
  // Übernahme nach Login) tragen den Namen schon vom ersten Absenden.
  const nameFields = useMemo(
    () => (userName ? { userName, pronunciationHint: pronunciationHint || undefined } : {}),
    [userName, pronunciationHint]
  );
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const tx = useTextFn();
  const [draft, setDraft] = useState<StoredDraft | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [phase, setPhase] = useState<FirstStoryPhase | null>(null);
  const [error, setError] = useState(linkError ? tx(firstStory["server.linkInvalid"]) : "");
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);
  const [signedInAttempt, setSignedInAttempt] = useState(0);
  const signedInStarted = useRef(false);

  // Entwurf aus diesem Browser wiederherstellen (z.B. nach Neuladen).
  useEffect(() => {
    const stored = readStoredDraft();
    if (stored) {
      setDraft(stored);
      setEmail(stored.email);
      setSent(true);
    }
  }, []);

  // Funnel: Konto-Schritt (E-Mail) wird angezeigt – nur ohne Login.
  useEffect(() => {
    if (authLoading || user) return;
    track("signup_viewed", { flow: "angel", gate: "angel_email" });
  }, [authLoading, user]);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const timer = window.setTimeout(() => setSecondsUntilResend((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsUntilResend]);

  // Bereits eingeloggt: keine E-Mail nötig, Story direkt dem Account zuordnen.
  // Hat dieser Browser schon einen Link angefordert, wird genau dieser Entwurf
  // übernommen – nie ein zweiter erzeugt.
  useEffect(() => {
    if (authLoading || !user || signedInStarted.current) return;
    signedInStarted.current = true;
    (async () => {
      try {
        const stored = readStoredDraft();
        const response = await fetch("/api/first-story/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stored ? { draftId: stored.draftId, key: stored.key, adopt: true } : { questionAnswers, analyticsId: getAnalyticsId(), ...nameFields }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error);
        writeStoredDraft(null);
        onComplete?.();
        // Account mit vorhandenen Storys: normales Dashboard, kein zweites Willkommen.
        router.replace(result.existingAccount ? "/dashboard" : "/dashboard?welcome=1");
      } catch (startError) {
        // Kein automatischer Neuversuch – nur über den Button.
        setError(startError instanceof Error && startError.message ? startError.message : tx(firstStory["server.startFailed"]));
      }
    })();
  }, [authLoading, user, questionAnswers, nameFields, onComplete, router, signedInAttempt, tx]);

  // Fortschritt anzeigen. Jede Abfrage schiebt die Erzeugung bei Bedarf wieder an.
  useEffect(() => {
    if (!draft || user) return;
    let stopped = false;
    let timer: number | undefined;
    const startedAt = Date.now();

    const poll = async () => {
      try {
        const params = new URLSearchParams({ draftId: draft.draftId, key: draft.key });
        const response = await fetch(`/api/first-story/status?${params}`, { cache: "no-store" });
        if (response.status === 404) {
          writeStoredDraft(null);
          setDraft(null);
          setSent(false);
          return;
        }
        const result = await response.json();
        if (stopped) return;
        setPhase(result.phase);
        if (result.phase === "claimed") {
          writeStoredDraft(null);
          onComplete?.();
          return;
        }
        if (result.phase === "failed") return;
      } catch { /* Beim nächsten Durchlauf erneut versuchen. */ }
      // Nach 15 Minuten aufhören – die E-Mail und das Dashboard funktionieren trotzdem.
      if (!stopped && Date.now() - startedAt < 15 * 60 * 1000) {
        timer = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    void poll();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [draft, user, onComplete]);

  const sendLink = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (sending || secondsUntilResend > 0) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError(tx(firstStory["gate.invalidEmail"]));
      return;
    }

    setSending(true);
    setError("");

    try {
      const existing = draft ?? readStoredDraft();
      const response = await fetch("/api/first-story/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          existing
            ? { draftId: existing.draftId, key: existing.key, email: normalizedEmail }
            : { email: normalizedEmail, questionAnswers, analyticsId: getAnalyticsId(), ...nameFields }
        ),
      });
      const result = await response.json().catch(() => ({}));

      if (response.status === 429 && typeof result.retryAfter === "number") {
        setSecondsUntilResend(result.retryAfter);
      }
      if (existing && result.code === "draft_not_found") {
        // Entwurf abgelaufen: beim nächsten Klick einen neuen anlegen.
        writeStoredDraft(null);
        setDraft(null);
      }
      if (!response.ok) throw new Error(result.error);

      // Bestehender Account: Der Server hat einen normalen Anmeldelink geschickt
      // und keinen Entwurf angelegt – nichts merken, nichts abfragen.
      if (!result.draftId) {
        writeStoredDraft(null);
        setDraft(null);
        setPhase(null);
        setEmail(normalizedEmail);
        setSent(true);
        setSecondsUntilResend(RESEND_WAIT_SECONDS);
        return;
      }

      const nextDraft: StoredDraft = existing
        ? { ...existing, email: normalizedEmail }
        : { draftId: result.draftId, key: result.key, email: normalizedEmail, savedAt: Date.now() };
      writeStoredDraft(nextDraft);
      setDraft(nextDraft);
      setEmail(normalizedEmail);
      setSent(true);
      setSecondsUntilResend(RESEND_WAIT_SECONDS);
    } catch (sendError) {
      setError(sendError instanceof Error && sendError.message ? sendError.message : tx(firstStory["gate.sendFailed"]));
    } finally {
      setSending(false);
    }
  }, [sending, secondsUntilResend, email, draft, questionAnswers, nameFields, tx]);

  const retry = useCallback(async () => {
    if (!draft) return;
    setPhase(null);
    try {
      const response = await fetch("/api/first-story/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.draftId, key: draft.key }),
      });
      const result = await response.json();
      setPhase(result.phase ?? "failed");
      // Polling neu starten.
      setDraft({ ...draft });
    } catch {
      setPhase("failed");
    }
  }, [draft]);

  if (user) {
    return (
      <div className="story-first-handoff" role={error ? "alert" : "status"}>
        <h1><T t={firstStory["server.signedInTitle"]} /></h1>
        <p>{error || <T t={firstStory["server.signedInText"]} />}</p>
        {error && <button type="button" onClick={() => { setError(""); signedInStarted.current = false; setSignedInAttempt((n) => n + 1); }}><T t={firstStory["gate.retry"]} /></button>}
      </div>
    );
  }

  return (
    <section className="story-first-email-gate" aria-labelledby="story-email-heading">
      <div className="story-first-email-intro">
        <div className="story-first-email-angel" aria-hidden="true">
          <AngelIconFinal size={76} className="story-first-email-angel-image" />
        </div>
        <p className="story-first-email-kicker"><T t={firstStory["gate.kicker"]} /></p>
        <h1 id="story-email-heading"><T t={firstStory["gate.title"]} /></h1>
        <p><T t={firstStory["server.intro"]} /></p>
        <div className="story-first-email-note"><Check size={17} aria-hidden="true" /> <T t={firstStory["gate.note"]} /></div>
        {sent && phase && (
          <p className="story-first-preparation" role="status"><T t={phaseCopy[phase]} /></p>
        )}
        {sent && phase === "failed" && (
          <div className="story-first-preparation-error">
            <span><T t={firstStory["server.failedNote"]} /></span>
            <button type="button" onClick={() => void retry()}><T t={firstStory["gate.retry"]} /></button>
          </div>
        )}
      </div>

      <div className="story-first-email-form-area">
        {sent ? (
          <div className="story-first-email-sent" role="status">
            <span className="story-first-email-mail-icon"><Mail size={24} aria-hidden="true" /></span>
            {phase === "claimed" ? (
              <>
                <h2><T t={firstStory["server.claimedTitle"]} /></h2>
                <p><T t={firstStory["server.claimedText"]} /></p>
                <div className="story-first-email-sent-actions">
                  <button type="button" onClick={() => router.push("/dashboard?welcome=1")}><T t={firstStory["server.claimedCta"]} /></button>
                </div>
              </>
            ) : (
              <>
                <h2><T t={firstStory["gate.sentTitle"]} /></h2>
                <p><T t={firstStory["server.sentText"]} vars={{ email }} /></p>
                <p className="story-first-email-hint"><T t={firstStory["server.sentHint"]} /></p>
                <div className="story-first-email-sent-actions">
                  <button type="button" onClick={() => { setSent(false); setError(""); setSecondsUntilResend(0); }}><T t={firstStory["gate.otherEmail"]} /></button>
                  <button type="button" onClick={() => void sendLink()} disabled={sending || secondsUntilResend > 0}>
                    {secondsUntilResend > 0 ? <T t={firstStory["gate.resendIn"]} vars={{ seconds: secondsUntilResend }} /> : <T t={firstStory["gate.resend"]} />}
                  </button>
                </div>
              </>
            )}
            {error && <p className="story-first-email-error" role="alert">{error}</p>}
          </div>
        ) : (
          <form onSubmit={sendLink} noValidate>
            <h2><T t={firstStory["gate.formTitle"]} /></h2>
            <p><T t={firstStory["server.formText"]} /></p>
            <label htmlFor="first-story-email"><T t={firstStory["gate.emailLabel"]} /></label>
            <input
              id="first-story-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={tx(firstStory["gate.emailPlaceholder"])}
              value={email}
              onChange={(event) => { setEmail(event.target.value); if (error) setError(""); }}
              disabled={sending}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "first-story-email-error" : undefined}
              required
            />
            {error && <p id="first-story-email-error" className="story-first-email-error" role="alert">{error}</p>}
            <button type="submit" disabled={sending || secondsUntilResend > 0}>
              {sending ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> <T t={firstStory["gate.sending"]} /></> : <><span><T t={firstStory["gate.send"]} /></span><ArrowRight size={18} aria-hidden="true" /></>}
            </button>
            <p className="story-first-email-fineprint"><T t={firstStory["gate.fineprint"]} /></p>
          </form>
        )}
      </div>
    </section>
  );
}
