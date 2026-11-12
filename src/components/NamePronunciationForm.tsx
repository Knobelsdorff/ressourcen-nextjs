"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { ResourceFigure } from "@/lib/types/story";
import { supabase } from "@/lib/supabase";
import { usablePronunciationHint } from "@/lib/spoken-name";
import NamePreviewPlayer from "./NamePreviewPlayer";
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
  const pronunciationRef = useRef<HTMLInputElement>(null);
  const hintIgnored = pronunciationHint.trim().length > 0 && !usablePronunciationHint(pronunciationHint);

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

  /**
   * Übernimmt die Eingabe in den Flow und – eingeloggt – ins Profil.
   * Ohne Login landet der Name erst beim Link-Klick im Profil (Server, siehe
   * copyDraftNameToProfile). Gibt false zurück, wenn das Speichern scheiterte.
   */
  const persist = async (): Promise<boolean> => {
    const name = fullName.trim();
    const hint = pronunciationHint.trim() || null;

    // Leer = diese Story ohne Namen. Auch einen früher eingegebenen Namen
    // verwerfen, sonst spräche die Story ihn trotzdem. Das Profil bleibt.
    if (!name && !hint) {
      onUserDataUpdate('', null);
      return true;
    }

    if (!user) {
      onUserDataUpdate(name, hint);
      return true;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ full_name: name || null, pronunciation_hint: hint })
        .eq('id', user.id);
      if (updateError) {
        setError(updateError.message);
        return false;
      }
      onUserDataUpdate(name, hint);
      return true;
    } catch {
      setError('Fehler beim Speichern');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const empty = !fullName.trim() && !pronunciationHint.trim();
    if (!(await persist())) return;
    if (user && !empty) {
      setSuccess('Gespeichert.');
      setTimeout(onNext, 500);
      return;
    }
    onNext();
  };

  // Auch beim Zurückgehen übernehmen – sonst ist die Eingabe nach
  // "Zurück → Weiter" weg und muss neu getippt werden.
  const handleBack = async () => {
    await persist();
    onBack();
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
              ref={pronunciationRef}
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

          {/* Auch ohne Login (Erststory): Der Server bremst pro IP und spricht dann nur mit Kerstin. */}
          <NamePreviewPlayer
            name={fullName}
            pronunciation={pronunciationHint}
            voiceId={voiceId}
            onAdjust={() => {
              pronunciationRef.current?.focus();
              pronunciationRef.current?.select();
            }}
          />


          {error && <p className="story-form-message" data-tone="error" role="alert">{error}</p>}
          {success && <p className="story-form-message" role="status">{success}</p>}
        </div>

        <div className="story-first-actions">
          <button type="button" className="story-first-previous" onClick={handleBack} disabled={loading}>
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
