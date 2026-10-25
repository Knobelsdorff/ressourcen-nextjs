'use client';

/**
 * Schritt 3 im Story-Flow: Stimme wählen – im Aufbau des Engel-Flows.
 *
 * Jede Stimme ist eine Zeile: antippen wählt sie, der runde Knopf spielt die
 * Hörprobe. Die Hörprobe zeigt ehrlich, was gerade passiert: lädt, wird erstellt
 * (mit Sekunden, wenn es dauert), läuft (Ring = Fortschritt) oder ist gerade
 * nicht verfügbar. Fertige Hörproben bleiben im Speicher und starten beim
 * zweiten Mal sofort. Beim Verlassen des Schritts verstummt alles.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Check, ChevronDown, ChevronLeft, ChevronUp, Headphones, Pause, Play, RotateCcw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ResourceFigure } from '@/lib/types/story';
import FigureIcon from './story-flow/FigureIcon';
import { useScrollFade } from './story-flow/useScrollFade';

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
  resourceFigure?: ResourceFigure;
  onSparModusChange?: (enabled: boolean) => void;
}

type PreviewStatus = 'loading' | 'playing' | 'paused' | 'blocked' | 'error';
interface PreviewState {
  voiceId: string;
  status: PreviewStatus;
  startedAt: number;
}

const DEMO_TEXT = 'Das ist ein kurzer Test. Hörst du meine Stimme klar und angenehm?';
const VISIBLE_VOICES = 3;
const RING_R = 19;
const RING_C = 2 * Math.PI * RING_R;

/** Kurze deutsche Beschreibung pro Stimme (Voice-ID), sonst nach Stimmtyp. */
function voiceDescription(voice: Voice): string {
  let description = '';
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
  return description;
}

/** Was unter der Stimme steht, während die Hörprobe lädt. */
function loadingNote(seconds: number) {
  if (seconds < 2.5) return 'Hörprobe wird geladen …';
  if (seconds < 10) return `Die Hörprobe wird erstellt – einen Moment noch (${Math.floor(seconds)} s)`;
  return `Dauert heute etwas länger – gleich geht es los (${Math.floor(seconds)} s)`;
}

export default function VoiceSelection({ onVoiceSelect, onNext, onPrevious, selectedVoiceId, resourceFigure, onSparModusChange }: VoiceSelectionProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [sparModus, setSparModus] = useState(false);
  const [showAllVoices, setShowAllVoices] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestRef = useRef(0);
  // Fertige Hörproben (Preview-URL oder erzeugtes Audio) pro Stimme.
  const sourcesRef = useRef<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const moreBelow = useScrollFade(scrollRef, `${showAllVoices}-${filteredVoices.length}-${loading}`);

  // Dev Mode state (sessionStorage)
  const [devMode, setDevMode] = useState(false);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef(0);
  const hasScrolledRef = useRef(false);

  // Initialize dev mode from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('ps_dev_mode') === 'true';
      setDevMode(stored);
    }
  }, []);

  const toggleDevMode = useCallback(() => {
    setDevMode(prev => {
      const newDevMode = !prev;
      
      if (typeof window !== 'undefined') {
        if (newDevMode) {
          sessionStorage.setItem('ps_dev_mode', 'true');
          console.log('Dev mode enabled');
        } else {
          sessionStorage.removeItem('ps_dev_mode');
          console.log('Dev mode disabled');
        }
      }
      
      return newDevMode;
    });
  }, []);

  // Keyboard shortcut: Windows/Linux: Ctrl + Shift + D | macOS: Ctrl + Option + Shift + D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Safety: ignore if any input/textarea/select is focused or contentEditable is active
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        (activeElement as HTMLElement).isContentEditable
      )) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const key = e.key.toLowerCase();
      
      // Windows/Linux: Ctrl + Shift + D
      // macOS: Ctrl + Option(Alt) + Shift + D
      if (isMac) {
        if (e.ctrlKey && e.altKey && e.shiftKey && key === 'd') {
          e.preventDefault();
          toggleDevMode();
        }
      } else {
        if (e.ctrlKey && e.shiftKey && key === 'd') {
          e.preventDefault();
          toggleDevMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDevMode]);

  // Multi-tap handler for H1 headline
  const handleHeadlineTap = () => {
    // Safety: ignore if any input/button is focused
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'BUTTON' ||
      activeElement.tagName === 'TEXTAREA'
    )) {
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;
    
    // Reset if more than 2 seconds passed
    if (timeSinceLastTap > 2000) {
      tapCountRef.current = 0;
      hasScrolledRef.current = false;
    }

    // Cancel if user scrolled
    if (hasScrolledRef.current) {
      tapCountRef.current = 0;
      hasScrolledRef.current = false;
      return;
    }

    tapCountRef.current++;
    lastTapTimeRef.current = now;

    // Clear existing timer
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    // Set timer to reset after 2 seconds
    tapTimerRef.current = setTimeout(() => {
      if (tapCountRef.current < 7) {
        tapCountRef.current = 0;
      }
    }, 2000);

    // Check if we reached 7 taps
    if (tapCountRef.current >= 7) {
      tapCountRef.current = 0;
      toggleDevMode();
    }
  };

  // Track scroll to cancel tap sequence
  useEffect(() => {
    const handleScroll = () => {
      hasScrolledRef.current = true;
    };

    const handleTouchMove = () => {
      hasScrolledRef.current = true;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

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

    // Passt keine Stimme zum Geschlecht der Figur, lieber alle zeigen als keine.
    setFilteredVoices(ranked.length > 0 ? ranked : voices);
  }, [voices, resourceFigure]);

  // Empfohlene Vorauswahl: wenn keine Stimme gewählt ist, setze die erste gefilterte als Standard
  useEffect(() => {
    if (filteredVoices.length > 0 && !selectedVoiceId) {
      onVoiceSelect(filteredVoices[0].id);
    }
  }, [filteredVoices, selectedVoiceId, onVoiceSelect]);

  // Eine gewählte Stimme außerhalb der ersten drei bleibt sichtbar.
  useEffect(() => {
    const index = filteredVoices.findIndex((voice) => voice.id === selectedVoiceId);
    if (index >= VISIBLE_VOICES) setShowAllVoices(true);
  }, [filteredVoices, selectedVoiceId]);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      // Lade nur Collection-Stimmen
      const response = await fetch('/api/voices?collections_only=true');
      const data = await response.json();

      if (data.voices?.length > 0) {
        setVoices(data.voices);
      } else {
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

  const stopPreview = useCallback(() => {
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.onended = audio.onerror = audio.ontimeupdate = audio.onplaying = null;
      audio.pause();
    }
    audioRef.current = null;
    setPreview(null);
    setPreviewProgress(0);
  }, []);

  // Weiter, Zurück oder Seitenwechsel: keine Hörprobe läuft im Hintergrund weiter.
  useEffect(() => stopPreview, [stopPreview]);

  // Sekunden zählen, solange eine Hörprobe lädt.
  useEffect(() => {
    if (preview?.status !== 'loading') return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [preview?.status]);

  const startAudio = async (voiceId: string, source: string, request: number) => {
    const audio = new Audio(source);
    audioRef.current = audio;
    audio.ontimeupdate = () => {
      if (audio.duration) setPreviewProgress(audio.currentTime / audio.duration);
    };
    audio.onplaying = () => {
      if (request === requestRef.current) setPreview((p) => (p ? { ...p, status: 'playing' } : p));
    };
    audio.onended = () => {
      if (request !== requestRef.current) return;
      setPreview(null);
      setPreviewProgress(0);
    };
    audio.onerror = () => {
      if (request !== requestRef.current) return;
      delete sourcesRef.current[voiceId];
      setPreview((p) => (p ? { ...p, status: 'error' } : p));
    };
    try {
      await audio.play();
    } catch (error) {
      if (request !== requestRef.current) return;
      // Manche Browser (iOS) erlauben nach längerem Laden kein automatisches
      // Abspielen mehr – dann liegt die Hörprobe bereit für den nächsten Tipp.
      const blocked = (error as DOMException)?.name === 'NotAllowedError';
      setPreview((p) => (p ? { ...p, status: blocked ? 'blocked' : 'error' } : p));
    }
  };

  const playVoicePreview = async (voice: Voice) => {
    stopPreview();
    const request = requestRef.current;
    const startedAt = Date.now();
    setNow(startedAt);
    setPreview({ voiceId: voice.id, status: 'loading', startedAt });

    try {
      let source = sourcesRef.current[voice.id] || voice.previewUrl?.trim();
      if (!source) {
        // Demo-Audio erzeugen (kostet Credits – deshalb wird es gemerkt)
        const controller = new AbortController();
        abortRef.current = controller;
        const response = await fetch('/api/voice-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceId: voice.id, text: voice.demoText?.trim() || DEMO_TEXT }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Failed to generate preview (${response.status})`);
        const { audioData, mimeType } = await response.json();
        source = `data:${mimeType};base64,${audioData}`;
      }
      if (request !== requestRef.current) return;
      sourcesRef.current[voice.id] = source;
      await startAudio(voice.id, source, request);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError' || request !== requestRef.current) return;
      console.error('Error playing voice preview:', error);
      setPreview((p) => (p ? { ...p, status: 'error' } : p));
    }
  };

  const togglePreview = (voice: Voice) => {
    const audio = audioRef.current;
    if (preview?.voiceId === voice.id) {
      if (preview.status === 'loading') {
        stopPreview();
        return;
      }
      if (audio && preview.status === 'playing') {
        audio.pause();
        setPreview({ ...preview, status: 'paused' });
        return;
      }
      if (audio && (preview.status === 'paused' || preview.status === 'blocked')) {
        setPreview({ ...preview, status: 'playing' });
        audio.play().catch(() => setPreview((p) => (p ? { ...p, status: 'error' } : p)));
        return;
      }
    }
    void playVoicePreview(voice);
  };

  // Generiere figurenspezifische Subline mit korrektem Artikel
  const getFigureSubline = (figure: typeof resourceFigure): string => {
    if (!figure) {
      return 'Höre kurz hinein und wähle die Stimme, die sich im Moment stimmig anfühlt.';
    }

    const figureId = figure.name.toLowerCase();
    const figureName = figure.name;
    const pronouns = figure.pronouns?.toLowerCase() || '';

    // Sonderfälle mit spezifischer Formulierung
    if (figureId.includes('mutter erde')) {
      return 'Höre kurz hinein und wähle die Stimme, die sich für Mutter Erde im Moment stimmig anfühlt.';
    }
    
    if (figureId.includes('erzengel michael')) {
      return 'Höre kurz hinein und wähle die Stimme, die sich für den Erzengel Michael im Moment stimmig anfühlt.';
    }
    
    // Engel: spezielle Formulierung mit "Engelsfigur"
    if (figureId.includes('engel') && !figureId.includes('erzengel')) {
      return 'Höre kurz hinein und wähle die Stimme, die sich für die Engelsfigur im Moment stimmig anfühlt.';
    }
    
    if (figureId.includes('krafttier')) {
      return 'Höre kurz hinein und wähle die Stimme, die sich für dein Krafttier im Moment stimmig anfühlt.';
    }
    
    if (figureId.includes('bester freund') || figureId.includes('beste freundin')) {
      if (pronouns.includes('sie')) {
        return 'Höre kurz hinein und wähle die Stimme, die sich für deine beste Freundin im Moment stimmig anfühlt.';
      }
      return 'Höre kurz hinein und wähle die Stimme, die sich für deinen besten Freund im Moment stimmig anfühlt.';
    }

    // Ideal-Vater / Ideal-Mutter: natürliche Formulierung ohne Bindestrich
    if (figureId.includes('ideal-vater')) {
      return 'Höre kurz hinein und wähle die Stimme, die sich für deinen idealen Vater im Moment stimmig anfühlt.';
    }
    
    if (figureId.includes('ideal-mutter')) {
      return 'Höre kurz hinein und wähle die Stimme, die sich für deine ideale Mutter im Moment stimmig anfühlt.';
    }
    
    if (figureId.includes('ideal-großfamilie')) {
      return 'Höre kurz hinein und wähle die Stimme, die sich für deine ideale Großfamilie im Moment stimmig anfühlt.';
    }

    // Familienmitglieder und nahe Beziehungen: Possessivartikel
    if (figureId.includes('oma') || figureId.includes('mama') || figureId.includes('mutter') || 
        figureId.includes('tante') || figureId.includes('schwester') || figureId.includes('lehrerin') ||
        figureId.includes('partnerin') || figureId.includes('göttliche mutter')) {
      return `Höre kurz hinein und wähle die Stimme, die sich für deine ${figureName} im Moment stimmig anfühlt.`;
    }
    
    if (figureId.includes('opa') || figureId.includes('papa') || figureId.includes('vater') ||
        figureId.includes('onkel') || figureId.includes('bruder') || figureId.includes('lehrer') ||
        figureId.includes('partner') || figureId.includes('göttlicher vater')) {
      return `Höre kurz hinein und wähle die Stimme, die sich für deinen ${figureName} im Moment stimmig anfühlt.`;
    }

    // Standard: Artikel basierend auf Pronomen
    if (pronouns.includes('er')) {
      // Männlich: "den" für Akkusativ
      return `Höre kurz hinein und wähle die Stimme, die sich für den ${figureName} im Moment stimmig anfühlt.`;
    } else if (pronouns.includes('sie')) {
      // Weiblich: "die" für Akkusativ
      return `Höre kurz hinein und wähle die Stimme, die sich für die ${figureName} im Moment stimmig anfühlt.`;
    } else if (pronouns.includes('es')) {
      // Neutral: Possessivartikel
      return `Höre kurz hinein und wähle die Stimme, die sich für dein ${figureName} im Moment stimmig anfühlt.`;
    }

    // Fallback: ohne Artikel
    return `Höre kurz hinein und wähle die Stimme, die sich für ${figureName} im Moment stimmig anfühlt.`;
  };

  const visibleVoices = showAllVoices ? filteredVoices : filteredVoices.slice(0, VISIBLE_VOICES);

  const statusNote = (voice: Voice) => {
    if (preview?.voiceId !== voice.id) return null;
    switch (preview.status) {
      case 'loading': return loadingNote((now - preview.startedAt) / 1000);
      case 'playing': return 'Hörprobe läuft';
      case 'paused': return 'Hörprobe pausiert';
      case 'blocked': return 'Bereit – tippe noch einmal auf Abspielen';
      case 'error': return 'Hörprobe gerade nicht verfügbar – tippe zum erneuten Versuch';
    }
  };

  return (
    <section className="story-first-stage story-voice-stage" aria-label="Stimme wählen">
      <div className="story-first-intro">
        {resourceFigure && (
          <div className="story-first-character">
            <span className="story-first-avatar" aria-hidden="true">
              <FigureIcon figure={resourceFigure} size={52} className="story-first-avatar-image" />
            </span>
            <span>{resourceFigure.name}</span>
          </div>
        )}
        <p className="story-stage-kicker">Deine Stimme</p>
        <h1
          data-dev-tap-target="true"
          onClick={handleHeadlineTap}
          style={{ cursor: 'default' }}
        >
          Eine Stimme für deine Geschichte
        </h1>
        <p className="story-first-guidance">{getFigureSubline(resourceFigure)}</p>
        <p className="story-stage-hint"><Headphones size={15} aria-hidden="true" /> Am schönsten mit Kopfhörern</p>
      </div>

      <div className="story-first-response">
        <div className="story-first-response-heading">
          <span>Wenn nichts anderes ruft, bleib bei der Empfehlung.</span>
          {!loading && filteredVoices.length > 1 && <span>{filteredVoices.length} Stimmen</span>}
        </div>

        <div ref={scrollRef} className="story-first-scroll" data-more-below={moreBelow || undefined}>
          {(!mounted || loading) ? (
            <div className="story-voice-list" aria-busy="true">
              {Array.from({ length: VISIBLE_VOICES }).map((_, i) => (
                <div key={i} className="story-voice-row story-voice-row--skeleton" aria-hidden="true">
                  <span className="story-skeleton-line" />
                  <span className="story-skeleton-dot" />
                </div>
              ))}
              <p className="story-voice-loading" role="status">Stimmen werden geladen …</p>
            </div>
          ) : filteredVoices.length === 0 ? (
            <div className="story-voice-failed" role="alert">
              <p>Die Stimmen konnten gerade nicht geladen werden.</p>
              <button type="button" onClick={() => void fetchVoices()}><RotateCcw size={15} aria-hidden="true" /> Erneut versuchen</button>
            </div>
          ) : (
            <div className="story-voice-list">
              <div role="radiogroup" aria-label="Stimmen" className="story-voice-list">
                {visibleVoices.map((voice, idx) => {
                  const selected = selectedVoiceId === voice.id;
                  const state = preview?.voiceId === voice.id ? preview.status : null;
                  const note = statusNote(voice);
                  const firstName = voice.name.split(' ')[0].replace(/[.,:;]+$/, '');
                  const heard = state === 'playing' || state === 'paused' ? previewProgress : 0;
                  return (
                    <div key={voice.id} className="story-voice-row" data-selected={selected || undefined} data-preview={state || undefined}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        className="story-voice-pick"
                        onClick={() => onVoiceSelect(voice.id)}
                      >
                        <span className="story-voice-mark" aria-hidden="true">{selected && <Check size={14} strokeWidth={3} />}</span>
                        <span className="story-voice-text">
                          <span className="story-voice-name">
                            {firstName}
                            {idx === 0 && <span className="story-voice-badge">Empfohlen</span>}
                          </span>
                          <span className="story-voice-desc">{voiceDescription(voice)}</span>
                          <AnimatePresence initial={false}>
                            {note && (
                              <motion.span
                                key="note"
                                className="story-voice-note"
                                data-tone={state === 'error' ? 'error' : undefined}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                              >
                                {state === 'playing' && <span className="story-voice-eq" aria-hidden="true"><i /><i /><i /></span>}
                                <span role="status">{note}</span>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="story-voice-play"
                        data-state={state || undefined}
                        onClick={() => togglePreview(voice)}
                        aria-label={
                          state === 'playing' ? `Hörprobe von ${firstName} pausieren`
                            : state === 'loading' ? `Hörprobe von ${firstName} abbrechen`
                              : `Hörprobe von ${firstName} anhören`
                        }
                      >
                        <svg viewBox="0 0 44 44" className="story-voice-play-ring" aria-hidden="true">
                          <circle cx="22" cy="22" r={RING_R} className="story-voice-play-track" />
                          <circle cx="22" cy="22" r={RING_R} className="story-voice-play-arc" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - heard)} />
                        </svg>
                        {state === 'loading' ? (
                          <span className="story-voice-spinner" aria-hidden="true" />
                        ) : state === 'playing' ? (
                          <Pause size={16} fill="currentColor" aria-hidden="true" />
                        ) : state === 'error' ? (
                          <RotateCcw size={16} aria-hidden="true" />
                        ) : (
                          <Play size={16} fill="currentColor" className="story-voice-play-icon" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {filteredVoices.length > VISIBLE_VOICES && (
                <button
                  type="button"
                  className="story-voice-more"
                  aria-expanded={showAllVoices}
                  onClick={() => setShowAllVoices(!showAllVoices)}
                >
                  {showAllVoices ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                  {showAllVoices ? 'Weniger anzeigen' : `Weitere ${filteredVoices.length - VISIBLE_VOICES} Stimmen anzeigen`}
                </button>
              )}

              {/* Sparmodus Option - nur wenn Dev Mode aktiv */}
              {devMode && (
                <label className="story-voice-dev">
                  <input
                    type="checkbox"
                    checked={sparModus}
                    onChange={(e) => {
                      setSparModus(e.target.checked);
                      onSparModusChange?.(e.target.checked);
                    }}
                  />
                  <span>Sparmodus: nur der erste Satz wird vertont – günstiger und schneller zum Testen</span>
                </label>
              )}
            </div>
          )}
        </div>

        <div className="story-first-actions">
          <button type="button" className="story-first-previous" onClick={onPrevious}>
            <ChevronLeft size={17} aria-hidden="true" /> <span>Zurück</span>
          </button>
          <button type="button" className="story-first-next" onClick={onNext} disabled={!selectedVoiceId}>
            <span>Weiter</span>
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
