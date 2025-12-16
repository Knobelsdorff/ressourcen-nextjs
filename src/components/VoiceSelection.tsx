'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Play, Pause, Volume2, ChevronRight, ChevronLeft, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface Voice {
  id: string;
  name: string;
  description: string;
  category: string;
  voiceType: string;
  gender: string;
  characteristics: string[];
  previewUrl: string;
  demoText: string;
  isPremium?: boolean;
  isFromCollection?: boolean;
}

interface VoiceSelectionProps {
  onVoiceSelect: (voiceId: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  selectedVoiceId?: string;
  resourceFigure?: {
    name: string;
    category?: string;
    pronouns: string;
  };
  onSparModusChange?: (enabled: boolean) => void;
}

export default function VoiceSelection({ onVoiceSelect, onNext, onPrevious, selectedVoiceId, resourceFigure, onSparModusChange }: VoiceSelectionProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [mounted, setMounted] = useState(false);
  const [sparModus, setSparModus] = useState(false);
  const [showAllVoices, setShowAllVoices] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchVoices();
  }, []);

  // Filtere Stimmen basierend auf der Ressourcenfigur
  useEffect(() => {
    if (voices.length === 0 || !resourceFigure) {
      setFilteredVoices(voices);
      return;
    }

    const figureName = resourceFigure.name.toLowerCase();
    const figureCategory = resourceFigure.category;
    
    // Bestimme das Geschlecht vorrangig über Pronomen, fallback: Name
    const pronouns = (resourceFigure.pronouns || '').toLowerCase();
    const primaryPronoun = pronouns.split('/')?.[0]?.trim();
    
    // Für Tiere: zeige sowohl männliche als auch weibliche Stimmen
    const isAnimal = figureCategory === 'real' && (
      figureName.includes('hund') || figureName.includes('katze') || figureName.includes('hund') ||
      figureName.includes('hamster') || figureName.includes('vogel') || figureName.includes('fisch') ||
      figureName.includes('maus') || figureName.includes('kaninchen') || figureName.includes('meerschweinchen') ||
      figureName.includes('dog') || figureName.includes('cat') || figureName.includes('hamster') ||
      figureName.includes('bird') || figureName.includes('fish') || figureName.includes('mouse') ||
      figureName.includes('rabbit') || figureName.includes('guinea pig')
    );
    
    const isFemaleFigure = !isAnimal && (
      primaryPronoun?.startsWith('sie') ||
      figureName.includes('oma') || figureName.includes('grandma') || figureName.includes('großmutter') ||
      figureName.includes('mutter') || figureName.includes('mama') || figureName.includes('mother') ||
      figureName.includes('tante') || figureName.includes('aunt') || figureName.includes('schwester') ||
      figureName.includes('sister') || figureName.includes('lehrerin') || figureName.includes('partnerin')
    );
    const isMaleFigure = !isAnimal && (
      primaryPronoun?.startsWith('er') ||
      figureName.includes('opa') || figureName.includes('grandpa') || figureName.includes('großvater') ||
      figureName.includes('vater') || figureName.includes('papa') || figureName.includes('father') ||
      figureName.includes('onkel') || figureName.includes('uncle') || figureName.includes('bruder') ||
      figureName.includes('brother') || figureName.includes('lehrer') || figureName.includes('partner')
    );
    
    // Scoring-basierte Sortierung: berücksichtigt Typ, Geschlecht und Figur-Spezifika
    const preferredVoiceTypes: string[] = (() => {
      if (isAnimal) return ['friendly', 'neutral', 'maternal', 'paternal'];
      if (figureName.includes('lilith')) return ['neutral', 'friendly']; // Lilith: neutral/friendly bevorzugen, nicht maternal
      if (figureName.includes('oma') || figureName.includes('grandma') || figureName.includes('großmutter')) return ['elderly', 'maternal', 'neutral', 'friendly'];
      if (figureName.includes('opa') || figureName.includes('grandpa') || figureName.includes('großvater')) return ['elderly', 'paternal', 'neutral', 'friendly'];
      if (figureName.includes('mutter') || figureName.includes('mama') || figureName.includes('mother')) return ['maternal', 'elderly', 'neutral', 'friendly'];
      if (figureName.includes('vater') || figureName.includes('papa') || figureName.includes('father')) return ['paternal', 'elderly', 'neutral', 'friendly'];
      if (figureName.includes('freund') || figureName.includes('friend')) return ['friendly', 'neutral'];
      return ['maternal', 'paternal', 'elderly', 'friendly', 'neutral'];
    })();

    const computeVoiceScore = (voice: Voice): number => {
      let score = 0;
      const vg = (voice.gender || '').toLowerCase();
      const vt = (voice.voiceType || '').toLowerCase();
      const vn = (voice.name || '').toLowerCase();

      // 1) Typ-Priorität (höhere Priorität = mehr Punkte)
      const typeIndex = preferredVoiceTypes.indexOf(vt);
      if (typeIndex >= 0) {
        score += (preferredVoiceTypes.length - typeIndex) * 10; // 10, 9, 8 ...
      }

      // 2) Geschlecht passend zur Figur (Tiere: beide okay)
      if (!isAnimal) {
        if (isFemaleFigure && vg === 'female') score += 8;
        if (isMaleFigure && vg === 'male') score += 8;
      } else {
        // leichte Bevorzugung freundlicher/neutraler Tiere
        if (vt === 'friendly' || vt === 'neutral') score += 3;
      }

      // 3) Figur-spezifische Boosts
      if (figureName.includes('oma') || figureName.includes('grandma') || figureName.includes('großmutter')) {
        if (vt === 'elderly') score += 6;
        if (vt === 'maternal') score += 4;
      }
      if (figureName.includes('opa') || figureName.includes('grandpa') || figureName.includes('großvater')) {
        if (vt === 'elderly') score += 6;
        if (vt === 'paternal') score += 4;
      }
      if (figureName.includes('mutter') || figureName.includes('mama') || figureName.includes('mother')) {
        if (vt === 'maternal') score += 6;
        if (vt === 'elderly') score += 2;
        // Feintuning: Stimmen wie "Nicole" sind oft klar/hart → für Mama-Figur leicht abwerten
        if (vn.includes('nicole')) score -= 10;
      }
      // Engel: weich, sanft, liebevoll bevorzugen; klare/harte Stimmen leicht abwerten
      if (figureName.includes('engel') || figureName.includes('angel')) {
        if (vt === 'maternal') score += 6;
        if (vt === 'friendly') score += 4;
        if (vt === 'neutral') score += 2;
        const vdesc = (voice.description || '').toLowerCase();
        if (vdesc.includes('klar')) score -= 6; // klare/kühle Tönung für Engel weniger passend
        if (vn.includes('nicole')) score -= 8;  // spezifisch: Nicole etwas abwerten für Engel
        const chars = JSON.stringify(voice.characteristics || []).toLowerCase();
        if (chars.includes('soft') || chars.includes('gentle') || chars.includes('warm') || chars.includes('airy')) {
          score += 3;
        }
      }
      if (figureName.includes('vater') || figureName.includes('papa') || figureName.includes('father')) {
        if (vt === 'paternal') score += 6;
        if (vt === 'elderly') score += 2;
      }
      if (figureName.includes('freund') || figureName.includes('friend')) {
        if (vt === 'friendly' || vt === 'neutral') score += 5;
      }
      // Lilith: Mila - selbstbewusst & einfühlsam bevorzugen
      if (figureName.includes('lilith')) {
        if (vn.includes('mila')) {
          score += 25; // Sehr hoher Boost für Mila bei Lilith (höchste Priorität)
        }
        // Tanja explizit für Lilith abwerten (ist zu therapeutisch/mütterlich)
        if (vn.includes('tanja')) {
          score -= 10; // Tanja abwerten für Lilith
        }
        // Auch selbstbewusste/einfühlsame Stimmen bevorzugen (aber nicht so stark wie Mila)
        const vdesc = (voice.description || '').toLowerCase();
        if (vdesc.includes('selbstbewusst') || vdesc.includes('einfühlsam') || 
            vdesc.includes('confident') || vdesc.includes('empathetic')) {
          // Aber nicht für Tanja, die bereits abgewertet wurde
          if (!vn.includes('tanja')) {
            score += 3;
          }
        }
        // Therapeutische/mütterliche Stimmen für Lilith weniger passend
        if (vt === 'maternal' || vdesc.includes('therapeutisch') || vdesc.includes('therapeutic')) {
          score -= 5;
        }
      }

      // 4) Sammlung/Qualitäts-Heuristik: Collections bevorzugen
      if (voice.isFromCollection) score += 2;

      return score;
    };

    const ranked = voices
      .filter(voice => {
        // Lasse grundsätzlich alle zu, aber mit starker Gewichtung – optional harte Filter bei Nulltreffern
        // Optionaler harter Geschlechterfilter nur wenn Figur-Geschlecht klar ist
        if (!isAnimal) {
          const vg = (voice.gender || '').toLowerCase();
          if (isFemaleFigure && vg !== 'female') return false;
          if (isMaleFigure && vg !== 'male') return false;
        }
        return true;
      })
      .map(v => ({ voice: v, score: computeVoiceScore(v) }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Tie-break: Typ-Priorität
        const aIdx = preferredVoiceTypes.indexOf(a.voice.voiceType);
        const bIdx = preferredVoiceTypes.indexOf(b.voice.voiceType);
        return (aIdx - bIdx);
      })
      .map(x => x.voice);

    setFilteredVoices(ranked);
  }, [voices, resourceFigure]);

  // Empfohlene Vorauswahl: wenn keine Stimme gewählt ist, setze die erste gefilterte als Standard
  useEffect(() => {
    if (filteredVoices.length > 0 && !selectedVoiceId) {
      onVoiceSelect(filteredVoices[0].id);
    }
  }, [filteredVoices, selectedVoiceId, onVoiceSelect]);

  const fetchVoices = async () => {
    try {
      // Lade nur Collection-Stimmen
      const response = await fetch('/api/voices?collections_only=true');
      const data = await response.json();
      
      if (data.voices.length > 0) {
        console.log(`Loaded ${data.voices.length} voices from collections`);
        setVoices(data.voices);
      } else {
        console.log('No voices in collections, loading all voices as fallback');
        const fallbackResponse = await fetch('/api/voices');
        const fallbackData = await fallbackResponse.json();
        setVoices(fallbackData.voices || []);
      }
    } catch (error) {
      console.error('Error fetching voices:', error);
    } finally {
      setLoading(false);
    }
  };

  const playVoicePreview = async (voice: Voice) => {
    try {
      // Stoppe aktuell spielende Stimme
      if (playingVoiceId && audioElements[playingVoiceId]) {
        audioElements[playingVoiceId].pause();
        audioElements[playingVoiceId].currentTime = 0;
      }

      setPlayingVoiceId(voice.id);

      // 1) Wenn eine fertige Preview-URL vorhanden ist, nutze diese (verbraucht keine Credits)
      if (voice.previewUrl && voice.previewUrl.trim().length > 0) {
        const audio = new Audio(voice.previewUrl);
        audio.onended = () => setPlayingVoiceId(null);
        audio.onerror = () => setPlayingVoiceId(null);
        setAudioElements(prev => ({ ...prev, [voice.id]: audio }));
        await audio.play();
        return;
      }

      // Generiere Demo-Audio
      const demoText = voice.demoText && voice.demoText.trim().length > 0
        ? voice.demoText
        : 'Das ist ein kurzer Test. Hörst du meine Stimme klar und angenehm?';
      const response = await fetch('/api/voice-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId: voice.id,
          text: demoText,
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('Voice preview request failed', { status: response.status, statusText: response.statusText, body: errText });
        throw new Error(`Failed to generate preview (${response.status})`);
      }

      const { audioData, mimeType } = await response.json();
      
      // Erstelle Audio-Element
      const audio = new Audio(`data:${mimeType};base64,${audioData}`);
      audio.onended = () => setPlayingVoiceId(null);
      audio.onerror = () => setPlayingVoiceId(null);
      
      setAudioElements(prev => ({ ...prev, [voice.id]: audio }));
      await audio.play();
    } catch (error) {
      console.error('Error playing voice preview:', error);
      const msg = (error as Error)?.message || '';
      if (msg.includes('(401)')) {
        try { alert('Vorschau fehlgeschlagen: Keine gültigen ElevenLabs‑Credits/API‑Zugriff. Wenn möglich, nutze eine Stimme mit eingebauter Vorschau oder lade Credits nach.'); } catch {}
      } else {
        try { alert('Vorschau konnte nicht erzeugt werden. Bitte später erneut versuchen.'); } catch {}
      }
      setPlayingVoiceId(null);
    }
  };

  const stopVoicePreview = () => {
    if (playingVoiceId && audioElements[playingVoiceId]) {
      audioElements[playingVoiceId].pause();
      audioElements[playingVoiceId].currentTime = 0;
    }
    setPlayingVoiceId(null);
  };

  if (!mounted || loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-amber-600 max-sm:text-sm">Lade verfügbare Stimmen...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto sm:pt-8 pt-5 px-4 pb-10">
      <div className="text-center">
        <h2 className="sm:text-2xl text-xl font-bold text-amber-900 mb-2">Stimme auswählen</h2>
        <p className="text-amber-700 max-sm:text-sm">
          {resourceFigure ? 
            `Höre dir die passenden Stimmen für ${resourceFigure.name} an und wähle die, die am besten zu deiner Ressourcenfigur passt.` :
            'Höre dir die verschiedenen Stimmen an und wähle die passende für deine Ressourcenfigur.'
          }
        </p>
        {resourceFigure && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>Passende Stimmen für {resourceFigure.name}</strong>
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(showAllVoices ? filteredVoices : filteredVoices.slice(0, 3)).map((voice, idx) => (
          <Card
            key={voice.id}
            className={`relative cursor-pointer transition-all duration-200 ${
              selectedVoiceId === voice.id
                ? 'ring-2 ring-green-500 bg-[#f0fdf4]'
                : 'hover:shadow-md hover:bg-amber-50'
            }`}
            onClick={() => onVoiceSelect(voice.id)}
          >
            {/* Ausgewählt-Badge oben rechts */}
            {selectedVoiceId === voice.id && (
              <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-green-600 text-white flex items-center justify-center shadow">
                <Check className="w-4 h-4" />
              </div>
            )}

            {/* Empfohlen-Label auf der ersten Karte, wenn nicht showAll */}
            {!showAllVoices && idx === 0 && (
              <div className="absolute -top-2 left-2 text-[11px] bg-green-100 text-green-800 border border-green-200 rounded px-2 py-0.5">
                Empfohlen
              </div>
            )}

            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="sm:text-lg text-base text-amber-900">
                  {(() => {
                    // Extrahiere nur den Vornamen (alles vor dem ersten Leerzeichen)
                    const firstName = voice.name.split(' ')[0];
                    
                    // Erstelle einzigartige deutsche Beschreibung basierend auf Stimmenname und Eigenschaften
                    let description = '';
                    const name = voice.name.toLowerCase();
                    
                    // Spezifische Beschreibungen für bekannte Stimmen basierend auf Voice-ID
                    if (voice.id === '8N2ng9i2uiUWqstgmWlH') { // Beth
                      description = 'sanft & mütterlich';
                    } else if (voice.id === 'E0OS48T5F0KU7O2NInWS') { // Lucy
                      description = 'warm & erzählend';
                    } else if (voice.id === 'Z3R5wn05IrDiVCyEkUrK') { // Arabella
                      description = 'elegant & geheimnisvoll';
                    } else if (voice.id === 'SHTtk5n3RQvLx4dcvfGR') { // Warm and easy-to-listen-to voice
                      description = 'klar & verständlich';
                    } else if (voice.id === 'Y5JXXvUD3rmjDInkLVA2') { // Kerstin - Calm, gentle, and sensual
                      description = 'ruhig & sanft';
                    } else if (voice.id === 'WHaUUVTDq47Yqc9aDbkH') { // Friendly and mature female voice
                      description = 'freundlich & motivierend';
                    } else if (voice.id === 'cpy7GcpDa9iah3sbx3uA') { // Tanja B. - Empathetic and warm-hearted
                      description = 'einfühlsam & warmherzig';
                    } else if (voice.id === 'E0OS48T5F0KU7O2NInWS') { // Professional Young German Female
                      description = 'professionell & fesselnd';
                    } else if (voice.id === 'rwMvgbQxwV0LJTium7sd') { // Lucy Fennek - Studio-Quality German Audiobooks
                      description = 'ausdrucksstark & fesselnd';
                    } else if (voice.id === 'rAmra0SCIYOxYmRNDSm3') { // Female meditation voice
                      description = 'meditativ & neugierig';
                    } else if (voice.id === 'dCnu06FiOZma2KVNUoPZ') { // Female, 20s-30s, opinionated and confident
                      description = 'selbstbewusst & einfühlsam';
                    } else if (voice.id === 'uvysWDLbKpA4XvpD3GI6') { // Leonie - Captivating German studio-quality voice
                      description = 'vielseitig & klar';
                    } else if (voice.id === 'SaqYcK3ZpDKBAImA8AdW') { // Jane
                      description = 'intim & vertraut';
                    } else if (voice.id === 'oae6GCCzwoEbfc5FHdEu') { // William - gentle bedtime narrator
                      description = 'sanft & beruhigend';
                    } else if (voice.id === '8TMmdpPgqHKvDOGYP2lN') { // Gregory Grumble - gruff but lovable
                      description = 'gemütlich & warmherzig';
                    } else if (voice.id === 'iMHt6G42evkXunaDU065') { // Stefan - middle-aged German - UPDATED
                      description = 'beruhigend & erfahren';
                    } else if (voice.id === 'fNQuGwgi0iD0nacRyExh') { // Timothy Twilight - calm and soothing
                      description = 'ruhig & anmutig';
                    } else if (voice.id === 'oYuK6X6xL9cwJKfgStee') { // German resonant male voice
                      description = 'resonant & vertrauensvoll';
                    } else if (voice.id === 'dWlo9A8YyLspmlvHk1dB') { // Sawyer - deep soothing rhythm
                      description = 'tief & klar';
                    } else if (voice.id === 'e0K1gavG8dJdPZiwQ7Np') { // Marcus
                      description = 'warm & ausgewogen';
                    } else if (voice.id === 'g298lY8JIucgBDyOpRLj') { // German meditation voice
                      description = 'meditativ & sanft';
                    } else if (voice.id === 'oziFLKtaxVDHQAh7o45V') { // Alexander
                      description = 'charismatisch & klar';
                    } else {
                      // Fallback basierend auf voiceType - mit einzigartigen Beschreibungen
                      if (voice.voiceType === 'maternal') {
                        description = 'warm & fürsorglich';
                      } else if (voice.voiceType === 'paternal') {
                        description = 'stark & weise';
                      } else if (voice.voiceType === 'elderly') {
                        description = 'erfahren & liebevoll';
                      } else if (voice.voiceType === 'friendly') {
                        description = 'freundlich & unterstützend';
                      } else {
                        description = 'beruhigend & klar';
                      }
                    }
                    
                    return `${firstName} - ${description}`;
                  })()}
                </CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (playingVoiceId === voice.id) {
                      stopVoicePreview();
                    } else {
                      playVoicePreview(voice);
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  {playingVoiceId === voice.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {playingVoiceId === voice.id ? 'Stoppen' : 'Testen'}
                </Button>

              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toggle unterhalb der Liste */}
      {filteredVoices.length > 3 && (
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            aria-expanded={showAllVoices}
            onClick={() => setShowAllVoices(!showAllVoices)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors text-sm ${
              showAllVoices
                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <ChevronUp className={`w-4 h-4 ${showAllVoices ? 'block' : 'hidden'}`} />
            <ChevronDown className={`w-4 h-4 ${showAllVoices ? 'hidden' : 'block'}`} />
            {showAllVoices ? 'Weniger anzeigen' : `Weitere ${filteredVoices.length - 3} Stimmen anzeigen`}
          </motion.button>
        </div>
      )}

      {/* Sparmodus Option */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="sparModus"
            checked={sparModus}
            onChange={(e) => {
              setSparModus(e.target.checked);
              onSparModusChange?.(e.target.checked);
            }}
            className="w-4 h-4 text-amber-600 bg-amber-100 border-amber-300 rounded focus:ring-amber-500 focus:ring-2"
          />
          <label htmlFor="sparModus" className="text-sm font-medium text-amber-800 cursor-pointer">
            Sparmodus aktivieren (nur erster Satz wird als Audio generiert)
          </label>
        </div>
        <p className="text-xs text-amber-600 mt-1 ml-7">
          Günstiger und schneller - perfekt zum Testen
        </p>
      </div>

      {/* Navigation Buttons (nur Desktop) */}
      <div className="flex justify-center items-center mt-6 gap-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onPrevious}
          className="px-6 py-3 text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-50 transition-colors flex items-center gap-2 text-base font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          Zurück
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNext}
          disabled={!selectedVoiceId}
          className={`px-8 py-3 rounded-lg text-white shadow-lg transition-all flex items-center gap-2 text-base font-medium ${
            selectedVoiceId
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
              : 'bg-amber-300 cursor-not-allowed opacity-60'
          }`}
        >
          Weiter
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>
    </div>
  );
}
