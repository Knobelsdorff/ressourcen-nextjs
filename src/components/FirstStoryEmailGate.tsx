"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import AngelIconFinal from "@/components/AngelIconFinal";
import { supabase } from "@/lib/supabase";

const RESEND_WAIT_SECONDS = 60;

interface FirstStoryEmailGateProps {
  linkError?: boolean;
  onEmailSent?: (email: string) => void;
  preparationStatus?: 'idle' | 'text' | 'audio' | 'ready' | 'error';
  preparationError?: string | null;
  onRetryPreparation?: () => void;
}

export default function FirstStoryEmailGate({ linkError = false, onEmailSent, preparationStatus = 'idle', preparationError, onRetryPreparation }: FirstStoryEmailGateProps) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(linkError ? "Dieser Zugangslink ist nicht mehr gültig. Gib deine E-Mail-Adresse ein, dann senden wir dir einen neuen." : "");
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const timer = window.setTimeout(() => setSecondsUntilResend((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [secondsUntilResend]);

  async function sendLink(event?: FormEvent<HTMLFormElement>) {
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
      const next = encodeURIComponent("/create-story?first=true");
      const emailRedirectTo = `${window.location.origin}/api/auth/callback?next=${next}`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: { shouldCreateUser: true, emailRedirectTo },
      });

      if (signInError) throw signInError;
      onEmailSent?.(normalizedEmail);
      setEmail(normalizedEmail);
      setSent(true);
      setSecondsUntilResend(RESEND_WAIT_SECONDS);
    } catch (sendError) {
      const rateLimited = sendError instanceof Error && /rate limit|too many requests/i.test(sendError.message);
      setError(rateLimited
        ? "Bitte warte kurz, bevor du einen neuen Link anforderst."
        : "Der Link konnte nicht gesendet werden. Bitte versuche es erneut.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="story-first-email-gate" aria-labelledby="story-email-heading">
      <div className="story-first-email-intro">
        <div className="story-first-email-angel" aria-hidden="true">
          <AngelIconFinal size={76} className="story-first-email-angel-image" />
        </div>
        <p className="story-first-email-kicker">DEINE ERSTE POWER STORY</p>
        <h1 id="story-email-heading">Dein Engel ist bereit.</h1>
        <p>Deine Antworten warten auf dich. Melde dich mit deiner E-Mail an, damit wir deine persönliche Power Story erstellen und für dich speichern können.</p>
        <div className="story-first-email-note"><Check size={17} aria-hidden="true" /> Kostenlos und ohne Passwort</div>
        <p className="story-first-preparation" role="status">
          {preparationStatus === 'ready' ? 'Deine Power Story ist bereits fertig. Nach dem Login speichern wir sie in deinem Account.' :
            preparationStatus === 'audio' ? 'Dein Text ist fertig. Kerstins Stimme wird gerade vorbereitet …' :
            preparationStatus === 'text' ? 'Deine persönliche Geschichte entsteht schon, während du dich anmeldest …' :
            preparationStatus === 'error' ? 'Die Vorbereitung wurde unterbrochen. Deine Antworten sind weiterhin gespeichert.' :
            'Deine Geschichte wird im Hintergrund vorbereitet.'}
        </p>
        {preparationStatus === 'error' && <div className="story-first-preparation-error"><span>{preparationError}</span><button type="button" onClick={onRetryPreparation}>Erneut versuchen</button></div>}
      </div>

      <div className="story-first-email-form-area">
        {sent ? (
          <div className="story-first-email-sent" role="status">
            <span className="story-first-email-mail-icon"><Mail size={24} aria-hidden="true" /></span>
            <h2>Schau in dein Postfach.</h2>
            <p>Wir haben einen Zugangslink an <strong>{email}</strong> geschickt.</p>
            <p className="story-first-email-hint">Öffne den Link am besten in diesem Browser, damit deine Antworten direkt weiterverwendet werden. Prüfe auch deinen Spam-Ordner.</p>
            <div className="story-first-email-sent-actions">
              <button type="button" onClick={() => { setSent(false); setError(""); setSecondsUntilResend(0); }}>Andere E-Mail verwenden</button>
              <button type="button" onClick={() => void sendLink()} disabled={sending || secondsUntilResend > 0}>
                {secondsUntilResend > 0 ? `Erneut senden in ${secondsUntilResend} s` : "Link erneut senden"}
              </button>
            </div>
            {error && <p className="story-first-email-error" role="alert">{error}</p>}
          </div>
        ) : (
          <form onSubmit={sendLink} noValidate>
            <h2>Mit E-Mail fortfahren</h2>
            <p>Wir schicken dir einen Link. Deine Story wird bereits vorbereitet und nach dem Login in deinem Account gespeichert.</p>
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
