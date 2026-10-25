"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import AngelIconFinal from "@/components/AngelIconFinal";
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

const phaseCopy: Record<FirstStoryPhase, string> = {
  none: "Deine Antworten sind gespeichert.",
  text: "Deine persönliche Geschichte entsteht gerade …",
  audio: "Dein Text ist fertig. Kerstins Stimme wird gerade aufgenommen …",
  ready: "Deine Power Story ist fertig und wartet auf dich.",
  claimed: "Deine Power Story ist in deinem Bereich gespeichert.",
  failed: "Beim Erstellen deiner Story ist etwas schiefgelaufen.",
};

interface FirstStoryServerGateProps {
  questionAnswers: unknown[];
  linkError?: boolean;
  /** Wird aufgerufen, sobald die Story einem Account gehört (Entwurf im Browser aufräumen). */
  onComplete?: () => void;
}

/**
 * Konto-Schritt des Erststory-Flows, wenn die Story serverseitig erzeugt wird.
 * Der Link in der E-Mail führt direkt ins Dashboard – egal in welchem Tab
 * oder auf welchem Gerät er geöffnet wird.
 */
export default function FirstStoryServerGate({ questionAnswers, linkError = false, onComplete }: FirstStoryServerGateProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [draft, setDraft] = useState<StoredDraft | null>(null);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [phase, setPhase] = useState<FirstStoryPhase | null>(null);
  const [error, setError] = useState(linkError ? "Dieser Link ist nicht mehr gültig. Gib deine E-Mail-Adresse ein, dann senden wir dir einen neuen." : "");
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
          body: JSON.stringify(stored ? { draftId: stored.draftId, key: stored.key, adopt: true } : { questionAnswers, analyticsId: getAnalyticsId() }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error);
        writeStoredDraft(null);
        onComplete?.();
        // Account mit vorhandenen Storys: normales Dashboard, kein zweites Willkommen.
        router.replace(result.existingAccount ? "/dashboard" : "/dashboard?welcome=1");
      } catch (startError) {
        // Kein automatischer Neuversuch – nur über den Button.
        setError(startError instanceof Error && startError.message ? startError.message : "Deine Story konnte nicht gestartet werden. Bitte versuche es erneut.");
      }
    })();
  }, [authLoading, user, questionAnswers, onComplete, router, signedInAttempt]);

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
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
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
            : { email: normalizedEmail, questionAnswers, analyticsId: getAnalyticsId() }
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
      setError(sendError instanceof Error && sendError.message ? sendError.message : "Der Link konnte nicht gesendet werden. Bitte versuche es erneut.");
    } finally {
      setSending(false);
    }
  }, [sending, secondsUntilResend, email, draft, questionAnswers]);

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
        <h1>Deine Power Story wird vorbereitet.</h1>
        <p>{error || "Einen Moment – wir bringen dich gleich in deinen Bereich. Dort erscheint deine Story, sobald sie fertig ist."}</p>
        {error && <button type="button" onClick={() => { setError(""); signedInStarted.current = false; setSignedInAttempt((n) => n + 1); }}>Erneut versuchen</button>}
      </div>
    );
  }

  return (
    <section className="story-first-email-gate" aria-labelledby="story-email-heading">
      <div className="story-first-email-intro">
        <div className="story-first-email-angel" aria-hidden="true">
          <AngelIconFinal size={76} className="story-first-email-angel-image" />
        </div>
        <p className="story-first-email-kicker">DEINE ERSTE POWER STORY</p>
        <h1 id="story-email-heading">Dein Engel ist bereit.</h1>
        <p>Deine Antworten sind gespeichert. Gib deine E-Mail-Adresse ein – wir erstellen deine persönliche Power Story und schicken dir einen Link direkt in deinen Bereich.</p>
        <div className="story-first-email-note"><Check size={17} aria-hidden="true" /> Kostenlos und ohne Passwort</div>
        {sent && phase && (
          <p className="story-first-preparation" role="status">{phaseCopy[phase]}</p>
        )}
        {sent && phase === "failed" && (
          <div className="story-first-preparation-error">
            <span>Deine Antworten sind weiterhin gespeichert.</span>
            <button type="button" onClick={() => void retry()}>Erneut versuchen</button>
          </div>
        )}
      </div>

      <div className="story-first-email-form-area">
        {sent ? (
          <div className="story-first-email-sent" role="status">
            <span className="story-first-email-mail-icon"><Mail size={24} aria-hidden="true" /></span>
            {phase === "claimed" ? (
              <>
                <h2>Deine Story wartet auf dich.</h2>
                <p>Du bist über den Link angemeldet. Deine Power Story ist in deinem Bereich gespeichert.</p>
                <div className="story-first-email-sent-actions">
                  <button type="button" onClick={() => router.push("/dashboard?welcome=1")}>Zu meiner Power Story</button>
                </div>
              </>
            ) : (
              <>
                <h2>Schau in dein Postfach.</h2>
                <p>Wir haben einen Link an <strong>{email}</strong> geschickt.</p>
                <p className="story-first-email-hint">Ein Klick darauf bringt dich direkt in deinen Bereich – in jedem Browser und auf jedem Gerät. Dieses Fenster kannst du danach schließen. Prüfe auch deinen Spam-Ordner.</p>
                <div className="story-first-email-sent-actions">
                  <button type="button" onClick={() => { setSent(false); setError(""); setSecondsUntilResend(0); }}>Andere E-Mail verwenden</button>
                  <button type="button" onClick={() => void sendLink()} disabled={sending || secondsUntilResend > 0}>
                    {secondsUntilResend > 0 ? `Erneut senden in ${secondsUntilResend} s` : "Link erneut senden"}
                  </button>
                </div>
              </>
            )}
            {error && <p className="story-first-email-error" role="alert">{error}</p>}
          </div>
        ) : (
          <form onSubmit={sendLink} noValidate>
            <h2>Mit E-Mail fortfahren</h2>
            <p>Wir schicken dir einen Link. Ein Klick darauf – und du bist direkt in deinem Bereich, wo deine Story auf dich wartet.</p>
            <label htmlFor="first-story-email">Deine E-Mail-Adresse</label>
            <input
              id="first-story-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="du@beispiel.de"
              value={email}
              onChange={(event) => { setEmail(event.target.value); if (error) setError(""); }}
              disabled={sending}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "first-story-email-error" : undefined}
              required
            />
            {error && <p id="first-story-email-error" className="story-first-email-error" role="alert">{error}</p>}
            <button type="submit" disabled={sending || secondsUntilResend > 0}>
              {sending ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Link wird gesendet …</> : <><span>Zugangslink senden</span><ArrowRight size={18} aria-hidden="true" /></>}
            </button>
            <p className="story-first-email-fineprint">Für neue und bestehende Accounts.</p>
          </form>
        )}
      </div>
    </section>
  );
}
