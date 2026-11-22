"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Check, Loader2, Mail } from "lucide-react";
import AngelIconFinal from "@/components/AngelIconFinal";
import { supabase } from "@/lib/supabase";
import { T, useTextFn } from "@/components/site-text/T";
import type { TextDef } from "@/lib/site-texts/define";
import { firstStory } from "@/content/texts/firstStory";

const RESEND_WAIT_SECONDS = 60;

interface FirstStoryEmailGateProps {
  linkError?: boolean;
  onEmailSent?: (email: string) => void;
  preparationStatus?: 'idle' | 'text' | 'audio' | 'ready' | 'error';
  preparationError?: string | null;
  onRetryPreparation?: () => void;
}

export default function FirstStoryEmailGate({ linkError = false, onEmailSent, preparationStatus = 'idle', preparationError, onRetryPreparation }: FirstStoryEmailGateProps) {
  const tx = useTextFn();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(linkError ? tx(firstStory["email.linkInvalid"]) : "");
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
      setError(tx(firstStory["gate.invalidEmail"]));
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
      setError(tx(rateLimited ? firstStory["email.rateLimited"] : firstStory["gate.sendFailed"]));
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
        <p className="story-first-email-kicker"><T t={firstStory["gate.kicker"]} /></p>
        <h1 id="story-email-heading"><T t={firstStory["gate.title"]} /></h1>
        <p><T t={firstStory["email.intro"]} /></p>
        <div className="story-first-email-note"><Check size={17} aria-hidden="true" /> <T t={firstStory["gate.note"]} /></div>
        <p className="story-first-preparation" role="status">
          <T t={preparationStatus === 'ready' ? firstStory["email.prep.ready"] :
            preparationStatus === 'audio' ? firstStory["email.prep.audio"] :
            preparationStatus === 'text' ? firstStory["email.prep.text"] :
            preparationStatus === 'error' ? firstStory["email.prep.error"] :
            firstStory["email.prep.idle"]} />
        </p>
        {preparationStatus === 'error' && <div className="story-first-preparation-error"><span>{preparationError}</span><button type="button" onClick={onRetryPreparation}><T t={firstStory["gate.retry"]} /></button></div>}
      </div>

      <div className="story-first-email-form-area">
        {sent ? (
          <div className="story-first-email-sent" role="status">
            <span className="story-first-email-mail-icon"><Mail size={24} aria-hidden="true" /></span>
            <h2><T t={firstStory["gate.sentTitle"]} /></h2>
            <p><T t={firstStory["email.sentText"]} vars={{ email }} /></p>
            <p className="story-first-email-hint"><T t={firstStory["email.sentHint"]} /></p>
            <div className="story-first-email-sent-actions">
              <button type="button" onClick={() => { setSent(false); setError(""); setSecondsUntilResend(0); }}><T t={firstStory["gate.otherEmail"]} /></button>
              <button type="button" onClick={() => void sendLink()} disabled={sending || secondsUntilResend > 0}>
                {secondsUntilResend > 0 ? <T t={firstStory["gate.resendIn"]} vars={{ seconds: secondsUntilResend }} /> : <T t={firstStory["gate.resend"]} />}
              </button>
            </div>
            {error && <p className="story-first-email-error" role="alert">{error}</p>}
          </div>
        ) : (
          <form onSubmit={sendLink} noValidate>
            <h2><T t={firstStory["gate.formTitle"]} /></h2>
            <p><T t={firstStory["email.formText"]} /></p>
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
