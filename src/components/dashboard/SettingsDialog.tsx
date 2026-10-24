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
import { ExternalLink, Loader2, Volume2, X } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { usablePronunciationHint } from "@/lib/spoken-name";
import { useNamePreview } from "@/hooks/useNamePreview";
import { TOUR_ANCHORS } from "@/components/onboarding/firstStoryTour";
import MusicVolumeControl from "@/components/audio/MusicVolumeControl";

type Status = { kind: "ok" | "error"; text: string } | null;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p className={`settings-status ${status.kind === "ok" ? "is-ok" : "is-error"}`} role={status.kind === "ok" ? "status" : "alert"}>
      {status.text}
    </p>
  );
}

function Section({ title, description, tour, children }: { title: string; description?: string; tour?: string; children: ReactNode }) {
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

  // Name & Aussprache
  const [fullName, setFullName] = useState("");
  const [pronunciation, setPronunciation] = useState("");
  const [nameStatus, setNameStatus] = useState<Status>(null);
  const [savingName, setSavingName] = useState(false);
  const { playPreview: playNamePreview, previewing, spokenAs, resetPreview } = useNamePreview();

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
    resetPreview();
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
  }, [open, userId, resetPreview]);

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

  const playPreview = async () => {
    setNameStatus(null);
    const previewError = await playNamePreview(fullName, pronunciation);
    if (previewError) setNameStatus({ kind: "error", text: previewError });
  };

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
      setNameStatus({ kind: "error", text: "Speichern hat nicht geklappt. Bitte versuche es erneut." });
      return;
    }
    setNameStatus({ kind: "ok", text: "Gespeichert. Neue Power Storys verwenden ab jetzt diesen Namen." });
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
      setEmailStatus({ kind: "error", text: error.message || "Die E-Mail-Adresse konnte nicht geändert werden." });
      return;
    }
    setEmailStatus({ kind: "ok", text: "Wir haben dir eine Bestätigung an die neue Adresse geschickt." });
    setEditingEmail(false);
    setNewEmail("");
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.email) return;
    setPasswordStatus(null);
    if (newPassword.length < 8) {
      setPasswordStatus({ kind: "error", text: "Das Passwort braucht mindestens 8 Zeichen." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ kind: "error", text: "Die beiden Passwörter stimmen nicht überein." });
      return;
    }
    setSavingPassword(true);
    try {
      if (hasPassword) {
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (error) throw new Error("Das aktuelle Passwort stimmt nicht.");
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message || "Das Passwort konnte nicht gespeichert werden.");
      // Merkt sich, dass ein Passwort existiert (und beendet Zugangslinks).
      await fetch("/api/auth/complete-password-setup", { method: "POST", credentials: "include" }).catch(() => {});
      setPasswordStatus({ kind: "ok", text: hasPassword ? "Dein Passwort wurde geändert." : "Dein Passwort ist gespeichert. Du kannst dich jetzt auch damit anmelden." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordStatus({ kind: "error", text: e instanceof Error ? e.message : "Das Passwort konnte nicht gespeichert werden." });
    } finally {
      setSavingPassword(false);
    }
  };

  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      });
      const { url } = await response.json();
      if (url) window.open(url, "_blank", "noopener");
    } finally {
      setOpeningPortal(false);
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
      setFeedbackStatus({ kind: "ok", text: "Danke! Deine Nachricht ist bei uns angekommen." });
    } catch {
      setFeedbackStatus({ kind: "error", text: "Senden hat nicht geklappt. Bitte versuche es erneut." });
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
          <h2 id="settings-title">Einstellungen</h2>
          <button ref={closeRef} type="button" className="settings-close" onClick={onClose} aria-label="Einstellungen schließen">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="settings-body" data-tour-scroll>
          <Section
            title="Dein Name in den Geschichten"
            description="Deine Power Storys sprechen dich ab und zu mit Namen an. Hör dir an, wie er klingt – so oft du magst."
          >
            <form onSubmit={saveName} className="settings-form" data-tour={TOUR_ANCHORS.settingsName}>
              <label htmlFor="settings-name">Wie dürfen wir dich nennen?</label>
              <input id="settings-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="z. B. Julia" autoComplete="given-name" maxLength={60} />

              <label htmlFor="settings-pronunciation">
                So soll er klingen <span className="settings-optional">(optional)</span>
              </label>
              <input
                id="settings-pronunciation"
                value={pronunciation}
                onChange={(e) => setPronunciation(e.target.value)}
                placeholder="z. B. Juh-lia"
                aria-describedby="settings-pronunciation-help"
                maxLength={60}
              />
              <p id="settings-pronunciation-help" className="settings-help">
                {hintIgnored
                  ? "Bitte nur ein Wort, so geschrieben, wie es klingen soll – z. B. „Juh-lia“. Sonst verwenden wir deinen Namen."
                  : "Schreib deinen Namen so, wie er klingen soll – als ein Wort, gern mit Bindestrichen."}
              </p>

              <div className="settings-actions">
                <button type="button" className="dashboard-secondary-button" onClick={() => void playPreview()} disabled={!fullName.trim() || previewing}>
                  {previewing ? <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
                  {previewing ? "Wird erstellt …" : "Anhören"}
                </button>
                <button type="submit" className="dashboard-primary-button" disabled={savingName}>
                  {savingName ? "Speichern …" : "Name speichern"}
                </button>
              </div>
              {spokenAs && <p className="settings-help" aria-live="polite">Gesprochen als „{spokenAs}“.</p>}
              <StatusLine status={nameStatus} />
            </form>
          </Section>

          <Section title="E-Mail-Adresse" description="Für die Anmeldung und wichtige Hinweise.">
            <p className="settings-value">{user.email}</p>
            {editingEmail ? (
              <form onSubmit={saveEmail} className="settings-form">
                <label htmlFor="settings-email">Neue E-Mail-Adresse</label>
                <input id="settings-email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" required />
                <div className="settings-actions">
                  <button type="button" className="settings-link" onClick={() => setEditingEmail(false)}>Abbrechen</button>
                  <button type="submit" className="dashboard-primary-button" disabled={savingEmail || !newEmail.trim()}>
                    {savingEmail ? "Wird gesendet …" : "Bestätigung senden"}
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" className="settings-link" onClick={() => setEditingEmail(true)}>E-Mail-Adresse ändern</button>
            )}
            <StatusLine status={emailStatus} />
          </Section>

          <Section
            tour={TOUR_ANCHORS.settingsPassword}
            title={hasPassword ? "Passwort ändern" : "Passwort festlegen"}
            description={hasPassword ? undefined : "Optional – damit kannst du dich auch ohne Link aus der E-Mail anmelden."}
          >
            <form onSubmit={savePassword} className="settings-form">
              {hasPassword && (
                <>
                  <label htmlFor="settings-current-password">Aktuelles Passwort</label>
                  <input id="settings-current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required />
                </>
              )}
              <label htmlFor="settings-new-password">Neues Passwort</label>
              <input id="settings-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
              <label htmlFor="settings-confirm-password">Passwort wiederholen</label>
              <input id="settings-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
              <div className="settings-actions">
                <button type="submit" className="dashboard-primary-button" disabled={savingPassword}>
                  {savingPassword ? "Speichern …" : "Passwort speichern"}
                </button>
              </div>
              <StatusLine status={passwordStatus} />
            </form>
          </Section>

          <Section title="Hintergrundmusik" description="Wie laut die Musik unter der Stimme liegt – gilt für alle deine Power Storys.">
            <MusicVolumeControl />
          </Section>

          {subscription && (
            <Section title="Dein Zugang" description={`Power Storys – ${subscription.amount} / Monat. Jederzeit kündbar.`}>
              <button type="button" className="settings-link" onClick={() => void openPortal()} disabled={openingPortal}>
                {openingPortal ? "Wird geöffnet …" : "Abo verwalten"} <ExternalLink size={14} aria-hidden="true" />
              </button>
            </Section>
          )}

          <Section
            tour={TOUR_ANCHORS.settingsFeedback}
            title="Feedback & Wünsche"
            description="Was wünschst du dir für Power Storys? Wir lesen jede Nachricht."
          >
            <form onSubmit={sendFeedback} className="settings-form">
              <label htmlFor="settings-feedback" className="sr-only">Deine Nachricht</label>
              <textarea id="settings-feedback" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Eine Figur, ein Thema, eine Idee …" />
              <div className="settings-actions">
                <button type="submit" className="dashboard-primary-button" disabled={sendingFeedback || !feedback.trim()}>
                  {sendingFeedback ? "Wird gesendet …" : "Nachricht senden"}
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
