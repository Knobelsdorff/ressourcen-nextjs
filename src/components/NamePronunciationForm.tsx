"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft } from "lucide-react";
import { ResourceFigure } from "@/app/page";
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

  // Load existing data on mount
  useEffect(() => {
    const loadData = async () => {
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

    if (!user) {
      setError('Sie müssen eingeloggt sein');
      return;
    }

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
    <div className="min-h-screen bg-amber-50">
      <div className="flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-[851px]">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="bg-white rounded-[20px] shadow-[0px_5px_10px_0px_rgba(0,0,0,0.25)] p-8"
          >
            {/* Header with Emoji and Figure Name */}
            <div className="flex items-center justify-center gap-3 mb-8">
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
            <div className="text-center mb-8">
              <h2 className="text-2xl text-gray-800 font-normal mb-2">
                Personalisiere deine Geschichte
              </h2>
              <p className="text-sm text-gray-600">
                Optional: Gib deinen Namen ein, damit er in der Geschichte verwendet wird
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold text-blue-900 mb-2">
                    Vorname/Spitzname
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 border border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    placeholder="z.B. Andy, Maria, Tom"
                  />
                  <p className="text-blue-600 text-xs mt-1.5">
                    Wird in deinen Geschichten verwendet
                  </p>
                </div>

                <div>
                  <label htmlFor="pronunciationHint" className="block text-sm font-semibold text-blue-900 mb-2">
                    Aussprache-Hinweis
                    <span className="text-blue-500 text-xs font-normal ml-1">(optional)</span>
                  </label>
                  <input
                    type="text"
                    id="pronunciationHint"
                    value={pronunciationHint}
                    onChange={(e) => setPronunciationHint(e.target.value)}
                    className="w-full px-3 py-2.5 border border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                    placeholder="z.B. Andi (statt Andy)"
                  />
                  <p className="mt-1 text-xs text-blue-600">
                    Gib hier einfach den Namen ein, wie er ausgesprochen werden soll.
                    <span className="font-semibold"> Beispiel: Wenn dein Name "Andy" ist, aber als "Andi" ausgesprochen werden soll, gib hier "Andi" ein.</span>
                  </p>
                  <p className="text-blue-600 text-xs mt-1">
                    Der Name wird dann automatisch in der Geschichte durch diese Schreibweise ersetzt.
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

              {/* Mobile Back Button */}
              <div className="lg:hidden mt-4">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onBack}
                  className="w-full px-4 py-3 text-gray-700 border border-gray-300 rounded-lg transition-all text-base font-medium flex items-center justify-center gap-2 hover:bg-gray-50 active:bg-gray-100"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Zurück
                </motion.button>
              </div>

              {/* Navigation - Desktop */}
              <div className="hidden lg:flex justify-between items-center">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onBack}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Zurück
                </motion.button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-7 py-3 bg-[#f0fdf4] text-black border border-[#22c55e] rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-base font-normal shadow-sm"
                >
                  {loading ? 'Speichern...' : 'Weiter'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Continue Button */}
              <div className="lg:hidden mt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-[#f0fdf4] text-black border border-[#22c55e] rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base font-medium"
                >
                  {loading ? 'Speichern...' : 'Weiter'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
