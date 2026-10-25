"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { ArrowRight, ChevronLeft, Loader2, Volume2 } from "lucide-react";
import { ResourceFigure } from "@/lib/types/story";
import { supabase } from "@/lib/supabase";
import { usablePronunciationHint } from "@/lib/spoken-name";
import { useNamePreview } from "@/hooks/useNamePreview";
import FigureIcon from './story-flow/FigureIcon';

interface NamePronunciationFormProps {
  onNext: () => void;
  onBack: () => void;
  selectedFigure: ResourceFigure;
  userFullName: string | null;
  userPronunciationHint: string | null;
  onUserDataUpdate: (fullName: string, pronunciationHint: string | null) => void;
  /** Im Flow gewählte Stimme – die Hörprobe klingt wie die spätere Story. */
  voiceId?: string | null;
}

export default function NamePronunciationForm({
  onNext,
  onBack,
  selectedFigure,
  userFullName,
  userPronunciationHint,
  onUserDataUpdate,
  voiceId
}: NamePronunciationFormProps) {
  const { user } = useAuth();

  const [fullName, setFullName] = useState(userFullName || '');
  const [pronunciationHint, setPronunciationHint] = useState(userPronunciationHint || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // "Anhören" wie in den Einstellungen (nur angemeldet – die Vorschau kostet).
  const { playPreview, previewing, spokenAs } = useNamePreview();
  const hintIgnored = pronunciationHint.trim().length > 0 && !usablePronunciationHint(pronunciationHint);

  const handlePreview = async () => {
    setError('');
    const previewError = await playPreview(fullName, pronunciationHint, voiceId);
    if (previewError) setError(previewError);
  };

  // Load existing data on mount (only for logged-in users)
  useEffect(() => {
    const loadData = async () => {
      // Only load from database for logged-in users
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, pronunciation_hint')
        .eq('id', user.id)
        .single();

      if (data) {
        const profileData = data as { full_name?: string | null; pronunciation_hint?: string | null };
        setFullName(profileData.full_name || '');
        // Parse pronunciation hint to extract just the simple text (format: "hint|stress|stressLetter|shortVowel")
        const rawHint = profileData.pronunciation_hint || '';
        const parsedHint = rawHint ? rawHint.split('|')[0] : '';
        setPronunciationHint(parsedHint);
      }
    };

    loadData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Allow skipping if both fields are empty
    if (!fullName.trim() && !pronunciationHint.trim()) {
      onNext();
      return;
    }

    // For anonymous users: just pass the data to parent and proceed
    if (!user) {
      onUserDataUpdate(fullName.trim(), pronunciationHint.trim() || null);
      onNext();
      return;
    }

    // For logged-in users: save to database
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          pronunciation_hint: pronunciationHint.trim() || null
        })
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess('Gespeichert.');
        // Update parent state
        onUserDataUpdate(fullName.trim(), pronunciationHint.trim() || null);
        // Auto-proceed after short delay
        setTimeout(() => {
          onNext();
        }, 500);
      }
    } catch (err) {
      setError('Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const empty = !fullName.trim() && !pronunciationHint.trim();

  return (
    <section className="story-first-stage story-name-stage" aria-label="Dein Name">
      <div className="story-first-intro">
        <div className="story-first-character">
          <span className="story-first-avatar" aria-hidden="true">
            <FigureIcon figure={selectedFigure} size={52} className="story-first-avatar-image" />
          </span>
          <span>{selectedFigure.name}</span>
        </div>
        <p className="story-stage-kicker">Dein Name</p>
        <h1>Wie darf deine Power Story dich nennen?</h1>
        <p className="story-first-guidance">
          Ganz freiwillig. Deine Geschichte spricht dich ab und zu mit Namen an – nur wenn es sich stimmig anfühlt.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="story-first-response story-name-form">
        <div className="story-first-response-heading">
          <span>Beides optional</span>
        </div>

        <div className="story-name-fields">
          <label className="story-field">
            <span>Dein Vorname</span>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="z. B. Julia"
              autoComplete="given-name"
              maxLength={60}
            />
          </label>

          <label className="story-field">
            <span>So soll er klingen</span>
            <input
              type="text"
              id="pronunciationHint"
              value={pronunciationHint}
              onChange={(e) => setPronunciationHint(e.target.value)}
              placeholder="z. B. Juh-lia"
              aria-describedby="pronunciationHint-help"
              maxLength={60}
            />
            <small id="pronunciationHint-help" data-tone={hintIgnored ? 'warn' : undefined}>
              {hintIgnored
                ? 'Bitte nur ein Wort, so geschrieben, wie es klingen soll – z. B. „Juh-lia“. Sonst verwenden wir deinen Namen.'
                : 'Schreib deinen Namen so, wie er klingen soll – als ein Wort, gern mit Bindestrichen.'}
            </small>
          </label>

          {user && (
            <div className="story-name-preview-row">
              <button
                type="button"
                className="story-name-preview"
                onClick={() => void handlePreview()}
                disabled={!fullName.trim() || previewing}
              >
                {previewing ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Volume2 className="w-4 h-4" aria-hidden="true" />}
                {/* Text im eigenen Element: Browser-Übersetzer ersetzen nackte Textknoten. */}
                <span>{previewing ? 'Wird erstellt …' : 'Anhören'}</span>
              </button>
              <p aria-live="polite">
                {spokenAs ? <>Gesprochen als „{spokenAs}“.</> : 'Hör dir an, wie dein Name in deiner Power Story klingt.'}
              </p>
            </div>
          )}

          {error && <p className="story-form-message" data-tone="error" role="alert">{error}</p>}
          {success && <p className="story-form-message" role="status">{success}</p>}
        </div>

        <div className="story-first-actions">
          <button type="button" className="story-first-previous" onClick={onBack}>
            <ChevronLeft size={17} aria-hidden="true" /> <span>Zurück</span>
          </button>
          <button type="submit" className="story-first-next" disabled={loading}>
            <span>{loading ? 'Speichern …' : empty ? 'Ohne Namen weiter' : 'Weiter'}</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </form>
    </section>
  );
}
