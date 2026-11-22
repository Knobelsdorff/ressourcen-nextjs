"use client";

/**
 * Einstellungen als Dialog direkt im Dashboard (statt eigener Seite):
 * Name + Aussprache (mit Hörprobe), E-Mail, Passwort, Hintergrundmusik,
 * Abo, Feedback. Ersetzt /dashboard/profil und /dashboard/user-settings
 * (die Seiten bestehen weiter, sind aber nicht mehr verlinkt).
 *
 * Abschnitte tragen data-tour-Anker für die Einführung; der scrollbare
 * Bereich trägt data-tour-scroll, damit die Tour darin scrollen kann.
 */

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { usablePronunciationHint } from "@/lib/spoken-name";
import NamePreviewPlayer from "@/components/NamePreviewPlayer";
import { TOUR_ANCHORS } from "@/components/onboarding/firstStoryTour";
import MusicVolumeControl from "@/components/audio/MusicVolumeControl";
import { T, useTextFn } from "@/components/site-text/T";
import { dashboard } from "@/content/texts/dashboard";

type Status = { kind: "ok" | "error"; text: string } | null;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p className={`settings-status ${status.kind === "ok" ? "is-ok" : "is-error"}`} role={status.kind === "ok" ? "status" : "alert"}>
      {status.text}
    </p>
  );
}

function Section({ title, description, tour, children }: { title: ReactNode; description?: ReactNode; tour?: string; children: ReactNode }) {
  return (
    <section className="settings-section" data-tour={tour}>
      <h3>{title}</h3>
      {description && <p className="settings-section-description">{description}</p>}
      {children}
    </section>
  );
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Nach dem Speichern des Namens, damit das Dashboard ihn übernehmen kann. */
  onNameSaved?: (fullName: string, pronunciationHint: string | null) => void;
}

export default function SettingsDialog({ open, onClose, onNameSaved }: SettingsDialogProps) {
  const { user } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const tx = useTextFn();

  // Name & Aussprache
  const [fullName, setFullName] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [savingName, setSavingName] = useState(false);
  const pronunciationRef = useRef<HTMLInputElement>(null);

  // E-Mail
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<Status>(null);
  const [savingEmail, setSavingEmail] = useState(false);

  // Passwort
  const hasPassword = user?.user_metadata?.password_set === true;
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Abo
  const [subscription, setSubscription] = useState<{ amount: string } | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [portalStatus, setPortalStatus] = useState<Status>(null);

  // Feedback
  const [feedback, setFeedback] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<Status>(null);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Beim Öffnen: Profil und Abo laden, Meldungen zurücksetzen. Nur von der
  // User-ID abhängig: Auth-Ereignisse (z.B. SIGNED_IN beim Zurückkehren in den
  // Tab) liefern ein neues user-Objekt und würden sonst Eingaben überschreiben.
  const userId = user?.id;
  useEffect(() => {
    if (!open || !userId) return;
    setNameStatus(null);
    setEmailStatus(null);
    setPasswordStatus(null);
    setFeedbackStatus(null);
    closeRef.current?.focus({ preventScroll: true });

    void (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("full_name, pronunciation_hint")
        .eq("id", userId)
        .maybeSingle();
      setFullName(data?.full_name ?? "");
      setPronunciation((data?.pronunciation_hint ?? "").split("|")[0] ?? "");
    })();

    void (async () => {
      try {
        const response = await fetch("/api/subscription/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = response.ok ? await response.json() : null;
        setSubscription(data?.hasSubscription && data.subscription?.status === "active" ? { amount: data.formatted?.amount || "15 €" } : null);
      } catch {
        setSubscription(null);
      }
    })();
  }, [open, userId]);

  // Esc schließt – außer eine Einführung läuft gerade (die behandelt Esc selbst).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.querySelector(".spotlight-tour")) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const hintIgnored = pronunciation.trim().length > 0 && !usablePronunciationHint(pronunciation);

  const saveName = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSavingName(true);
    setNameStatus(null);
    const hint = pronunciation.trim() || null;
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ full_name: fullName.trim() || null, pronunciation_hint: hint })
      .eq("id", user.id);
    setSavingName(false);
    if (error) {
      setNameStatus({ kind: "error", text: tx(dashboard["settings.name.error"]) });
      return;
    }
    setNameStatus({ kind: "ok", text: tx(dashboard["settings.name.saved"]) });
    onNameSaved?.(fullName.trim(), hint);
  };

  const saveEmail = async (event: FormEvent) => {
    event.preventDefault();
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    setEmailStatus(null);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    if (error) {
      setEmailStatus({ kind: "error", text: error.message || tx(dashboard["settings.email.error"]) });
      return;
    }
    setEmailStatus({ kind: "ok", text: tx(dashboard["settings.email.sent"]) });
    setEditingEmail(false);
    setNewEmail("");
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.email) return;
    setPasswordStatus(null);
    if (newPassword.length < 8) {
      setPasswordStatus({ kind: "error", text: tx(dashboard["settings.password.tooShort"]) });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ kind: "error", text: tx(dashboard["settings.password.mismatch"]) });
      return;
    }
    setSavingPassword(true);
    try {
      if (hasPassword) {
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (error) throw new Error(tx(dashboard["settings.password.wrongCurrent"]));
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message || tx(dashboard["settings.password.error"]));
      // Merkt sich, dass ein Passwort existiert (und beendet Zugangslinks).
      await fetch("/api/auth/complete-password-setup", { method: "POST", credentials: "include" }).catch(() => {});
      setPasswordStatus({ kind: "ok", text: tx(hasPassword ? dashboard["settings.password.changed"] : dashboard["settings.password.set"]) });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordStatus({ kind: "error", text: e instanceof Error ? e.message : tx(dashboard["settings.password.error"]) });
    } finally {
      setSavingPassword(false);
    }
  };

  // Kommt der Nutzer per Zurück-Geste aus dem Stripe-Portal (Safari bfcache),
  // darf der Button nicht in „Wird geöffnet …“ hängen bleiben.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setOpeningPortal(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  // Gleicher Tab statt window.open: Nach dem await ist die Nutzer-Geste
  // verbraucht, iOS Safari/Chrome blockieren dann neue Tabs kommentarlos.
  // Stripe schickt über return_url zurück auf /dashboard?tab=profile.
  const openPortal = async () => {
    setOpeningPortal(true);
    setPortalStatus(null);
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.url) throw new Error();
      window.location.assign(data.url);
    } catch {
      setOpeningPortal(false);
      setPortalStatus({ kind: "error", text: tx(dashboard["settings.access.error"]) });
    }
  };

  const sendFeedback = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.email || !feedback.trim()) return;
    setSendingFeedback(true);
    setFeedbackStatus(null);
    try {
      const formData = new FormData();
      formData.append("name", fullName.trim() || user.email.split("@")[0]);
      formData.append("message", feedback.trim());
      formData.append("rating", "5");
      formData.append("userEmail", user.email);
      const response = await fetch("/api/feedback", { method: "POST", body: formData });
      if (!response.ok) throw new Error();
      setFeedback("");
      setFeedbackStatus({ kind: "ok", text: tx(dashboard["settings.feedback.sent"]) });
    } catch {
      setFeedbackStatus({ kind: "error", text: tx(dashboard["settings.feedback.error"]) });
    } finally {
      setSendingFeedback(false);
    }
  };

  if (!open || !user) return null;

  return (
    <div className="settings-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="settings-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title"><T t={dashboard["settings.title"]} /></h2>
          <button ref={closeRef} type="button" className="settings-close" onClick={onClose} aria-label={tx(dashboard["settings.close"])}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="settings-body" data-tour-scroll>
          <Section
            title={<T t={dashboard["settings.name.title"]} />}
            description={<T t={dashboard["settings.name.description"]} />}
          >
            <form onSubmit={saveName} className="settings-form" data-tour={TOUR_ANCHORS.settingsName}>
              <label htmlFor="settings-name"><T t={dashboard["settings.name.label"]} /></label>
              <input id="settings-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={tx(dashboard["settings.name.placeholder"])} autoComplete="given-name" maxLength={60} />

              <label htmlFor="settings-pronunciation">
                <T t={dashboard["settings.pronunciation.label"]} /> <span className="settings-optional"><T t={dashboard["settings.pronunciation.optional"]} /></span>
              </label>
              <input
                ref={pronunciationRef}
                id="settings-pronunciation"
                value={pronunciation}
                onChange={(e) => setPronunciation(e.target.value)}
                placeholder={tx(dashboard["settings.pronunciation.placeholder"])}
                aria-describedby="settings-pronunciation-help"
                maxLength={60}
              />
              <p id="settings-pronunciation-help" className="settings-help">
                <T t={hintIgnored ? dashboard["settings.pronunciation.ignored"] : dashboard["settings.pronunciation.help"]} />
              </p>

              <NamePreviewPlayer
                name={fullName}
                pronunciation={pronunciation}
                onAdjust={() => {
                  pronunciationRef.current?.focus();
                  pronunciationRef.current?.select();
                }}
              />

              <div className="settings-actions">
                <button type="submit" className="dashboard-primary-button" disabled={savingName}>
                  <T t={savingName ? dashboard["settings.saving"] : dashboard["settings.name.save"]} />
                </button>
              </div>
              <StatusLine status={nameStatus} />
            </form>
          </Section>

          <Section title={<T t={dashboard["settings.email.title"]} />} description={<T t={dashboard["settings.email.description"]} />}>
            <p className="settings-value">{user.email}</p>
            {editingEmail ? (
              <form onSubmit={saveEmail} className="settings-form">
                <label htmlFor="settings-email"><T t={dashboard["settings.email.newLabel"]} /></label>
                <input id="settings-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" required />
                <div className="settings-actions">
                  <button type="button" className="settings-link" onClick={() => setEditingEmail(false)}><T t={dashboard["settings.email.cancel"]} /></button>
                  <button type="submit" className="dashboard-primary-button" disabled={savingEmail || !newEmail.trim()}>
                    <T t={savingEmail ? dashboard["settings.email.sending"] : dashboard["settings.email.send"]} />
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" className="settings-link" onClick={() => setEditingEmail(true)}><T t={dashboard["settings.email.change"]} /></button>
            )}
            <StatusLine status={emailStatus} />
          </Section>

          <Section
            tour={TOUR_ANCHORS.settingsPassword}
            title={<T t={hasPassword ? dashboard["settings.password.titleChange"] : dashboard["settings.password.titleSet"]} />}
            description={hasPassword ? undefined : <T t={dashboard["settings.password.descriptionSet"]} />}
          >
            <form onSubmit={savePassword} className="settings-form">
              {hasPassword && (
                <>
                  <label htmlFor="settings-current-password"><T t={dashboard["settings.password.current"]} /></label>
                  <input id="settings-current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
                </>
              )}
              <label htmlFor="settings-new-password"><T t={dashboard["settings.password.new"]} /></label>
              <input id="settings-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
              <label htmlFor="settings-confirm-password"><T t={dashboard["settings.password.repeat"]} /></label>
              <input id="settings-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
              <div className="settings-actions">
                <button type="submit" className="dashboard-primary-button" disabled={savingPassword}>
                  <T t={savingPassword ? dashboard["settings.saving"] : dashboard["settings.password.save"]} />
                </button>
              </div>
              <StatusLine status={passwordStatus} />
            </form>
          </Section>

          <Section title={<T t={dashboard["settings.music.title"]} />} description={<T t={dashboard["settings.music.description"]} />}>
            <MusicVolumeControl />
          </Section>

          {subscription && (
            <Section title={<T t={dashboard["settings.access.title"]} />} description={<T t={dashboard["settings.access.description"]} vars={{ amount: subscription.amount }} />}>
              <button type="button" className="settings-link" onClick={() => void openPortal()} disabled={openingPortal}>
                <T t={openingPortal ? dashboard["settings.access.opening"] : dashboard["settings.access.manage"]} /> <ExternalLink size={14} aria-hidden="true" />
              </button>
              <StatusLine status={portalStatus} />
            </Section>
          )}

          <Section
            tour={TOUR_ANCHORS.settingsFeedback}
            title={<T t={dashboard["settings.feedback.title"]} />}
            description={<T t={dashboard["settings.feedback.description"]} />}
          >
            <form onSubmit={sendFeedback} className="settings-form">
              <label htmlFor="settings-feedback" className="sr-only"><T t={dashboard["settings.feedback.label"]} /></label>
              <textarea id="settings-feedback" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={tx(dashboard["settings.feedback.placeholder"])} />
              <div className="settings-actions">
                <button type="submit" className="dashboard-primary-button" disabled={sendingFeedback || !feedback.trim()}>
                  <T t={sendingFeedback ? dashboard["settings.feedback.sending"] : dashboard["settings.feedback.send"]} />
                </button>
              </div>
              <StatusLine status={feedbackStatus} />
            </form>
          </Section>
        </div>
      </section>
    </div>
  );
}
