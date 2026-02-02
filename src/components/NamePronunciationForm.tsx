"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { ResourceFigure } from "@/lib/types/story";
import { supabase } from "@/lib/supabase";
import IdealFamilyIconFinal from './IdealFamilyIconFinal';
import JesusIconFinal from './JesusIconFinal';
import ArchangelMichaelIconFinal from './ArchangelMichaelIconFinal';
import AngelIconFinal from './AngelIconFinal';
import SuperheroIconFinal from './SuperheroIconFinal';

interface NamePronunciationFormProps {
  onNext: () => void;
  onBack: () => void;
  selectedFigure: ResourceFigure;
  userFullName: string | null;
  userPronunciationHint: string | null;
  onUserDataUpdate: (fullName: string, pronunciationHint: string | null) => void;
}

export default function NamePronunciationForm({
  onNext,
  onBack,
  selectedFigure,
  userFullName,
  userPronunciationHint,
  onUserDataUpdate
}: NamePronunciationFormProps) {
  const { user } = useAuth();

  const [fullName, setFullName] = useState(userFullName || '');
  const [pronunciationHint, setPronunciationHint] = useState(userPronunciationHint || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        setSuccess('Erfolgreich gespeichert!');
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

  return (
    <div className="bg-amber-50">
      <div className="flex items-start justify-center p-4 sm:pt-8 pt-5">
        <div className="w-full max-w-[851px]">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-[20px] shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)] sm:p-8 max-sm:px-4 max-sm:py-4"
          >
            {/* Header with Emoji and Figure Name */}
            <div className="flex items-center justify-center gap-3 sm:mb-10 mb-6">
              <div className="text-4xl">
                {selectedFigure.id === 'ideal-family' ? (
                  <IdealFamilyIconFinal size={48} className="w-12 h-12" />
                ) : selectedFigure.id === 'jesus' ? (
                  <JesusIconFinal size={48} className="w-12 h-12" />
                ) : selectedFigure.id === 'archangel-michael' ? (
                  <ArchangelMichaelIconFinal size={48} className="w-12 h-12" />
                ) : selectedFigure.id === 'angel' ? (
                  <AngelIconFinal size={48} className="w-12 h-12" />
                ) : selectedFigure.id === 'superhero' ? (
                  <SuperheroIconFinal size={48} className="w-12 h-12" />
                ) : (
                  <span className="text-4xl">{selectedFigure.emoji}</span>
                )}
              </div>
              <div className="text-2xl text-gray-900 font-normal">{selectedFigure.name}</div>
            </div>

            {/* Title */}
            <div className="text-center sm:mb-8 mb-5">
              <h2 className="sm:text-2xl text-xl text-gray-800 font-normal mb-2">
                Deine Power Story – ganz in deinem Tempo
              </h2>
              <p className="text-sm text-gray-600">
                Wenn du magst, kann die Geschichte dich persönlich ansprechen.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 sm:gap-4 gap-3">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-blue-900 mb-2">
                    Vorname oder Spitzname (optional)
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    placeholder="z.B. Andy, Maria, Tom"
                  />
                  <p className="text-gray-600/75 text-xs mt-1.5">
                    Nur wenn es sich stimmig anfühlt.
                  </p>
                </div>

                <div>
                  <label htmlFor="pronunciationHint" className="block text-sm font-semibold text-blue-900 mb-2">
                    Aussprache (optional)
                  </label>
                  <input
                    type="text"
                    id="pronunciationHint"
                    value={pronunciationHint}
                    onChange={(e) => setPronunciationHint(e.target.value)}
                    className="w-full px-3 py-2.5 border border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    placeholder="z.B. Andi (statt Andy)"
                  />
                  <p className="text-gray-600/75 text-xs mt-1.5">
                    Nur nötig, wenn dein Name oft falsch ausgesprochen wird.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {/* Navigation */}
              <div className="flex max-sm:flex-col max-sm:gap-3 justify-between">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBack}
                  className="sm:px-6 px-4 sm:py-3 py-2 border text-black border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 max-sm:w-full max-sm:justify-center"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </motion.button>

                <button
                  type="submit"
                  disabled={loading}
                  className="sm:px-6 px-4 sm:py-3 py-2 bg-[#f0fdf4] text-black border border-[#22c55e] rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base font-normal shadow-sm max-sm:w-full max-sm:justify-center"
                >
                  {loading ? 'Speichern...' : 'Weiter'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
