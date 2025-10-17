'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Play, Pause, Volume2, ChevronRight, ChevronLeft } from 'lucide-react';
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
    
    // Bestimme den gewünschten Stimmentyp basierend auf der Figur
    let preferredVoiceTypes: string[] = [];
    
    if (isAnimal) {
      // Für Tiere: freundliche und neutrale Stimmen bevorzugen
      preferredVoiceTypes = ['friendly', 'neutral', 'maternal', 'paternal'];
    } else if (figureName.includes('oma') || figureName.includes('grandma') || figureName.includes('großmutter')) {
      preferredVoiceTypes = ['elderly', 'maternal', 'neutral', 'friendly'];
    } else if (figureName.includes('opa') || figureName.includes('grandpa') || figureName.includes('großvater')) {
      preferredVoiceTypes = ['elderly', 'paternal', 'neutral', 'friendly'];
    } else if (figureName.includes('mutter') || figureName.includes('mama') || figureName.includes('mother')) {
      preferredVoiceTypes = ['maternal', 'elderly', 'neutral', 'friendly'];
    } else if (figureName.includes('vater') || figureName.includes('papa') || figureName.includes('father')) {
      preferredVoiceTypes = ['paternal', 'elderly', 'neutral', 'friendly'];
    } else if (figureName.includes('freund') || figureName.includes('friend')) {
      preferredVoiceTypes = ['friendly', 'neutral'];
    } else {
      // Fallback für unbekannte Figuren
      preferredVoiceTypes = ['maternal', 'paternal', 'elderly', 'friendly', 'neutral'];
    }

    // Filtere und sortiere Stimmen basierend auf Typ und Geschlecht
    const filtered = voices
      .filter(voice => {
        // Filtere nach Stimmentyp
        if (!preferredVoiceTypes.includes(voice.voiceType)) {
          return false;
        }
        
        // Gender-Filter: für Tiere zeige sowohl männliche als auch weibliche Stimmen
        const vg = (voice.gender || '').toLowerCase();
        if (isAnimal) {
          return vg === 'female' || vg === 'male'; // Zeige beide Geschlechter für Tiere
        }
        if (isFemaleFigure) {
          return vg === 'female';
        }
        if (isMaleFigure) {
          return vg === 'male';
        }
        return true; // falls unbestimmt, zeige alle
      })
      .sort((a, b) => {
        const aIndex = preferredVoiceTypes.indexOf(a.voiceType);
        const bIndex = preferredVoiceTypes.indexOf(b.voiceType);
        return aIndex - bIndex;
      });

    // Kein automatischer Fallback auf neutral/alle mehr – harte Vorgabe

    setFilteredVoices(filtered);
  }, [voices, resourceFigure]);

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

      // Generiere Demo-Audio
      const response = await fetch('/api/voice-preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voiceId: voice.id,
          text: voice.demoText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate preview');
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
        <div className="text-amber-600">Lade verfügbare Stimmen...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">Stimme auswählen</h2>
        <p className="text-amber-700">
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
        {filteredVoices.map((voice) => (
          <Card 
            key={voice.id} 
            className={`cursor-pointer transition-all duration-200 ${
              selectedVoiceId === voice.id 
                ? 'ring-2 ring-amber-500 bg-amber-50' 
                : 'hover:shadow-md hover:bg-amber-50'
            }`}
            onClick={() => onVoiceSelect(voice.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-amber-900">
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
                    } else if (voice.id === 'SaqYcK3ZpDKBAImA8AdW') { // Jane
                      description = 'intim & vertraut';
                    } else if (voice.id === 'oae6GCCzwoEbfc5FHdEu') { // William
                      description = 'ruhig & weise';
                    } else if (voice.id === '8TMmdpPgqHKvDOGYP2lN') { // Gregory
                      description = 'warm & tief';
                    } else if (voice.id === 'iMHt6G42evkXunaDU065') { // Stefan
                      description = 'professionell & klar';
                    } else if (voice.id === 'fNQuGwgi0iD0nacRyExh') { // Timothy
                      description = 'sanft & träumerisch';
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
                  {playingVoiceId === voice.id ? 'Stoppen' : 'Anhören'}
                </Button>
                
                {selectedVoiceId === voice.id && (
                  <Badge className="bg-amber-500 text-white">
                    Ausgewählt
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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

      {/* Navigation Buttons */}
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
          className={`px-8 py-3 rounded-xl text-white shadow-lg transition-all flex items-center gap-2 text-lg font-medium ${
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
