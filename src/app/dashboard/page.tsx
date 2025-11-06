"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, Settings, CheckCircle, AlertTriangle, Trash2, Download, Volume2, User, Mail, Calendar, Clock, Star, Trophy, Target, Shield, HelpCircle, MessageCircle, Bug, Key, Trash, Crown, Zap, TrendingUp, Play, Pause, BarChart3, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { getUserAccess, canAccessResource, hasActiveAccess } from "@/lib/access";
import Paywall from "@/components/Paywall";
import { trackEvent } from "@/lib/analytics";
import { isEnabled } from "@/lib/featureFlags";

interface SavedStory {
  id: string;
  title: string;
  content: string;
  resource_figure: any;
  question_answers: any[];
  audio_url?: string;
  voice_id?: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'stories'>('stories');
  
  // Prüfe ob User Admin ist
  const isAdmin = (() => {
    if (!user?.email) return false;
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    return adminEmails.includes(user.email.toLowerCase());
  })();
  const [showPaywall, setShowPaywall] = useState(false);
  const [userAccess, setUserAccess] = useState<any>(null);
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingAudioFor, setGeneratingAudioFor] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [pendingStory, setPendingStory] = useState<any>(null);
  const [isSavingPendingStory, setIsSavingPendingStory] = useState(false);
  const hasCheckedPendingRef = useRef(false);
  
  // Profil-spezifische States
  const [fullName, setFullName] = useState('');
  const [pronunciationHint, setPronunciationHint] = useState('');
  const [fullNameLoading, setFullNameLoading] = useState(false);
  const [fullNameError, setFullNameError] = useState('');
  const [fullNameSuccess, setFullNameSuccess] = useState('');
  const [userStats, setUserStats] = useState({
    totalStories: 0,
    totalAudioTime: 0,
    favoriteFigure: '',
    favoriteVoice: '',
    streak: 0,
    badges: [] as string[],
    lastActivity: null as Date | null
  });
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    plan: 'Free',
    credits: 0,
    expiresAt: null as Date | null,
    isPro: false
  });
  const [resourceAccessStatus, setResourceAccessStatus] = useState<Record<string, { canAccess: boolean; isFirst: boolean; trialExpired: boolean }>>({});

  // Funktion zur Bestimmung des Ressourcen-Typs
  const getResourceTypeLabel = (resourceFigure: any) => {
    if (!resourceFigure) return 'Ressource';
    
    const category = resourceFigure.category;
    const name = resourceFigure.name?.toLowerCase() || '';
    
    // Spezielle Behandlung für Orte
    if (name.includes('ort') || name.includes('platz') || name.includes('wald') || 
        name.includes('strand') || name.includes('berg') || name.includes('garten') ||
        name.includes('zimmer') || name.includes('raum') || name.includes('platz')) {
      return 'Ort';
    }
    
    // Kategorien-basierte Labels
    switch (category) {
      case 'real':
        return 'Reale Ressource';
      case 'fictional':
        return 'Fiktive Ressource';
      case 'place':
        return 'Ort';
      default:
        return 'Ressource';
    }
  };

  // Berechne Benutzerstatistiken
  const calculateUserStats = useCallback((stories: SavedStory[]) => {
    if (!stories.length) return;

    // Zähle Figuren und Stimmen
    const figureCounts: { [key: string]: number } = {};
    const voiceCounts: { [key: string]: number } = {};
    
    stories.forEach(story => {
      const figureName = story.resource_figure?.name || 'Unbekannt';
      figureCounts[figureName] = (figureCounts[figureName] || 0) + 1;
      
      if (story.voice_id) {
        voiceCounts[story.voice_id] = (voiceCounts[story.voice_id] || 0) + 1;
      }
    });

    // Finde beliebteste Figur und Stimme
    const favoriteFigure = Object.keys(figureCounts).reduce((a, b) => 
      figureCounts[a] > figureCounts[b] ? a : b, 'Keine'
    );
    
    const favoriteVoiceId = Object.keys(voiceCounts).reduce((a, b) => 
      voiceCounts[a] > voiceCounts[b] ? a : b, 'Keine'
    );

    // Mappe Voice-ID zu Vorname + Beschreibung (nur unsere Stimmauswahl)
    const voiceIdToName: { [key: string]: string } = {
      // Weibliche Stimmen
      'E0OS48T5F0KU7O2NInWS': 'Lucy - warm & erzählend',
      'SaqYcK3ZpDKBAImA8AdW': 'Jane - intim & vertraut', 
      'Z3R5wn05IrDiVCyEkUrK': 'Arabella - elegant & geheimnisvoll',
      '8N2ng9i2uiUWqstgmWlH': 'Beth - sanft & mütterlich',
      // Männliche Stimmen
      'oae6GCCzwoEbfc5FHdEu': 'William - ruhig & weise',
      '8TMmdpPgqHKvDOGYP2lN': 'Gregory - warm & tief',
      'iMHt6G42evkXunaDU065': 'Stefan - professionell & klar',
      'fNQuGwgi0iD0nacRyExh': 'Timothy - sanft & träumerisch'
    };
    
    const favoriteVoice = favoriteVoiceId !== 'Keine' 
      ? voiceIdToName[favoriteVoiceId] || favoriteVoiceId 
      : 'Keine';

    // Berechne Streak (vereinfacht: Anzahl aufeinanderfolgender Tage mit Aktivität)
    const today = new Date();
    const lastActivity = stories.length > 0 ? new Date(stories[0].created_at) : null;
    
    setUserStats({
      totalStories: stories.length,
      totalAudioTime: stories.filter(s => s.audio_url).length * 3, // Schätzung: 3 Min pro Audio
      favoriteFigure,
      favoriteVoice,
      streak: lastActivity ? Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      badges: stories.length >= 5 ? ['Erste Schritte'] : [] as string[],
      lastActivity
    });
  }, []);

  // Lade Zugangsstatus
  const loadUserAccess = useCallback(async () => {
    if (!user) return;
    
    try {
      // Versuche zuerst getUserAccess (für Details)
      const access = await getUserAccess(user.id);
      
      // Falls getUserAccess erfolgreich war, setze userAccess
      if (access) {
        setUserAccess(access);
        setSubscriptionStatus({
          plan: '3-Monats-Paket',
          credits: access.resources_limit - access.resources_created,
          expiresAt: access.access_expires_at ? new Date(access.access_expires_at) : null,
          isPro: access.status === 'active' && (!access.access_expires_at || new Date(access.access_expires_at) > new Date())
        });
        return; // Erfolgreich geladen, keine weiteren Checks nötig
      }
      
      // Falls getUserAccess null zurückgibt (406 Error oder kein Zugang), prüfe direkt mit hasActiveAccess
      // hasActiveAccess verwendet RPC-Funktion (SECURITY DEFINER) und umgeht RLS
      console.log('[loadUserAccess] getUserAccess returned null, checking hasActiveAccess as fallback');
      const hasAccess = await hasActiveAccess(user.id);
      console.log('[loadUserAccess] hasActiveAccess result:', hasAccess);
      
      if (hasAccess) {
        // User hat Zugang in DB, aber Details konnten nicht geladen werden (406 Error)
        // Setze minimalen Zugang-Status - das Dashboard verwendet dann hasActiveAccess als Fallback
        setUserAccess({
          id: '',
          user_id: user.id,
          plan_type: 'standard',
          resources_created: 0,
          resources_limit: 3,
          access_starts_at: new Date().toISOString(),
          access_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 Wochen
          status: 'active'
        } as any);
      } else {
        // Kein Zugang vorhanden
        setUserAccess(null);
      }
    } catch (error) {
      console.error('Error loading user access:', error);
      // Fallback: Prüfe direkt mit hasActiveAccess
      try {
        const hasAccess = await hasActiveAccess(user.id);
        console.log('[loadUserAccess] Exception fallback hasActiveAccess result:', hasAccess);
        if (hasAccess) {
          setUserAccess({
            id: '',
            user_id: user.id,
            plan_type: 'standard',
            resources_created: 0,
            resources_limit: 3,
            access_starts_at: new Date().toISOString(),
            access_expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 Wochen
            status: 'active'
          } as any);
        } else {
          setUserAccess(null);
        }
      } catch (fallbackError) {
        console.error('Fallback hasActiveAccess also failed:', fallbackError);
        setUserAccess(null);
      }
    }
  }, [user]);

  // Funktion zum Entfernen von Duplikaten
  const removeDuplicates = useCallback((stories: SavedStory[]): SavedStory[] => {
    if (!stories || stories.length === 0) return stories;
    
    const normalizeText = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
    const seen = new Map<string, SavedStory>();
    
    // Sortiere nach created_at (neueste zuerst), damit wir die neueste Version behalten
    const sorted = [...stories].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    
    for (const story of sorted) {
      const normalizedContent = normalizeText(story.content || '').slice(0, 500);
      const title = story.title || '';
      
      // Erstelle einen eindeutigen Key basierend auf title und content
      const key = `${title}:${normalizedContent}`;
      
      // Wenn wir diese Kombination noch nicht gesehen haben, behalte sie
      if (!seen.has(key)) {
        seen.set(key, story);
      } else {
        // Duplikat gefunden - entscheide welche Version behalten werden soll
        const existing = seen.get(key)!;
        const existingHasAudio = !!(existing.audio_url && existing.audio_url.trim() !== '');
        const currentHasAudio = !!(story.audio_url && story.audio_url.trim() !== '');
        
        // Priorität: Version mit Audio > neueste Version
        if (currentHasAudio && !existingHasAudio) {
          // Neue Version hat Audio, alte nicht - ersetze die alte
          console.log(`Dashboard: Keeping duplicate with audio (newer): ${story.id}`);
          seen.set(key, story);
        } else if (!currentHasAudio && existingHasAudio) {
          // Alte Version hat Audio, neue nicht - behalte die alte
          console.log(`Dashboard: Keeping duplicate with audio (older): ${existing.id}`);
          // Keine Änderung, behalte existing
        } else {
          // Beide haben Audio oder beide nicht - behalte die neueste
          if (new Date(story.created_at).getTime() > new Date(existing.created_at).getTime()) {
            console.log(`Dashboard: Keeping newer duplicate: ${story.id}`);
            seen.set(key, story);
          }
        }
      }
    }
    
    const unique = Array.from(seen.values());
    
    if (unique.length < stories.length) {
      console.log(`Dashboard: Removed ${stories.length - unique.length} duplicate stories`);
    }
    
    return unique;
  }, []);

  // Lade Geschichten aus Supabase
  const loadStories = useCallback(async () => {
    if (!user) {
      console.log('Dashboard: No user logged in, skipping loadStories');
      return;
    }
    
    console.log('Dashboard: Loading stories for user:', user.id, user.email);
    setLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase
        .from('saved_stories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Error loading stories:', error);
        setError(`Fehler beim Laden der Geschichten: ${error.message}`);
      } else {
        console.log('Stories loaded successfully:', data);
        
        // Entferne Duplikate BEVOR wir sie setzen
        const storiesData = (data || []) as SavedStory[];
        const uniqueStories = removeDuplicates(storiesData);
        const duplicateCount = storiesData.length - uniqueStories.length;
        console.log(`Dashboard: After deduplication: ${uniqueStories.length} unique stories (was ${storiesData.length})`);
        
        // Wenn Duplikate gefunden wurden, lösche sie automatisch aus der Datenbank
        if (duplicateCount > 0) {
          console.log(`Dashboard: Found ${duplicateCount} duplicate(s), cleaning up...`);
          // Finde die IDs der Duplikate
          const uniqueIds = new Set(uniqueStories.map(s => s.id));
          const duplicateIds = storiesData
            .filter(s => !uniqueIds.has(s.id))
            .map(s => s.id);
          
          // Logge welche Duplikate gelöscht werden und welche behalten werden
          const keptStories = uniqueStories.filter(s => 
            storiesData.some(d => d.id === s.id && 
              storiesData.filter(d2 => {
                const norm1 = (s.content || '').replace(/\s+/g, ' ').trim().slice(0, 500);
                const norm2 = (d2.content || '').replace(/\s+/g, ' ').trim().slice(0, 500);
                return d2.title === s.title && norm1 === norm2 && d2.id !== s.id;
              }).length > 0
            )
          );
          
          keptStories.forEach(kept => {
            const duplicates = storiesData.filter(d => {
              const norm1 = (kept.content || '').replace(/\s+/g, ' ').trim().slice(0, 500);
              const norm2 = (d.content || '').replace(/\s+/g, ' ').trim().slice(0, 500);
              return d.title === kept.title && norm1 === norm2 && d.id !== kept.id;
            });
            console.log(`Dashboard: Keeping story ${kept.id} (has audio: ${!!kept.audio_url}), deleting duplicates:`, duplicates.map(d => `${d.id} (has audio: ${!!d.audio_url})`));
          });
          
          if (duplicateIds.length > 0) {
            console.log(`Dashboard: Deleting ${duplicateIds.length} duplicate stories from database:`, duplicateIds);
            // Lösche Duplikate im Hintergrund (nicht blockierend)
            supabase
              .from('saved_stories')
              .delete()
              .in('id', duplicateIds)
              .then(({ error }) => {
                if (error) {
                  console.error('Dashboard: Error deleting duplicates:', error);
                } else {
                  console.log(`Dashboard: Successfully deleted ${duplicateIds.length} duplicate stories`);
                }
              });
          }
        }
        
        // Prüfe Zugangsstatus für jede Ressource BEVOR wir sie setzen
        if (user && uniqueStories.length > 0) {
          const accessStatusMap: Record<string, { canAccess: boolean; isFirst: boolean; trialExpired: boolean }> = {};
          const sortedStories = [...uniqueStories].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Prüfe ob User aktiven Zugang hat
          // Verwende userAccess State (wird von loadUserAccess gesetzt, inkl. Fallback)
          // Fallback: Wenn userAccess null ist (406 Error), prüfe direkt mit hasActiveAccess
          let userHasActiveAccess = false;
          if (userAccess) {
            userHasActiveAccess = userAccess.status === 'active' && 
              (!userAccess.access_expires_at || new Date(userAccess.access_expires_at) > new Date());
          } else {
            // userAccess konnte nicht geladen werden (406 Error) - prüfe direkt mit RPC
            // Dies ist ein Fallback für den Fall, dass getUserAccess fehlschlägt
            try {
              userHasActiveAccess = await hasActiveAccess(user.id);
              console.log('[Dashboard] userAccess is null, using hasActiveAccess fallback:', userHasActiveAccess);
            } catch (error) {
              console.error('[Dashboard] Error checking hasActiveAccess fallback:', error);
              userHasActiveAccess = false;
            }
          }
          
          for (const story of uniqueStories) {
            const isFirst = sortedStories[0].id === story.id;
            let canAccess = false;
            let trialExpired = false;
            
            // Wenn User aktiven Zugang hat, kann er immer Audio abspielen
            if (userHasActiveAccess) {
              canAccess = true;
              trialExpired = false;
            } else if (isFirst) {
              // Prüfe ob erste Ressource noch innerhalb von 3 Tagen
              const firstResourceDate = new Date(sortedStories[0].created_at);
              const daysSinceFirst = (Date.now() - firstResourceDate.getTime()) / (1000 * 60 * 60 * 24);
              canAccess = daysSinceFirst < 3;
              trialExpired = daysSinceFirst >= 3;
            } else {
              // Nicht die erste Ressource - benötigt aktiven Zugang
              canAccess = false;
              trialExpired = false;
            }
            
            accessStatusMap[story.id] = { canAccess, isFirst, trialExpired };
          }
          
          setResourceAccessStatus(accessStatusMap);
        }
        
        setStories(uniqueStories);
        calculateUserStats(uniqueStories);
        
        // Track Dashboard-Visit (nur wenn User eingeloggt ist UND eine gültige Session hat)
        console.log('Dashboard: Checking if should track dashboard_visit:', {
          hasUser: !!user,
          hasSession: !!session,
          userEmail: user?.email,
        });
        if (user && session) {
          console.log('Dashboard: Tracking dashboard_visit event');
          trackEvent({
            eventType: 'dashboard_visit',
          }, { accessToken: session.access_token });
        } else {
          console.log('Dashboard: NOT tracking dashboard_visit - missing user or session');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // calculateUserStats, removeDuplicates, userAccess werden über Closure verwendet

  const loadFullName = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, pronunciation_hint')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading full name:', error);
      } else if (data) {
        const profileData = data as { full_name?: string | null; pronunciation_hint?: string | null };
        setFullName(profileData.full_name || '');
        setPronunciationHint(profileData.pronunciation_hint || '');
      }
    } catch (err) {
      console.error('Error loading full name:', err);
    }
  }, [user]);

  const checkForPendingStories = useCallback(async () => {
    console.log('Dashboard: Checking for pending stories...');
    
    // Verhindere mehrfache Aufrufe während der Ausführung
    if (isSavingPendingStory) {
      console.log('Dashboard: Already processing pending story, skipping...');
      return;
    }

    // Einfacher Mutex über localStorage, um Mehrfach-Saves zu verhindern (z.B. nach Redirects/StrictMode)
    try {
      const mutex = typeof window !== 'undefined' ? localStorage.getItem('pendingStory_saving') : null;
      if (mutex === '1') {
        console.log('Dashboard: Mutex active (pendingStory_saving=1), skipping save');
        return;
      }
    } catch {}
    
    const savedPendingStory = localStorage.getItem('pendingStory');
    console.log('Dashboard: Pending story exists:', !!savedPendingStory);
    
    if (!savedPendingStory) {
      console.log('Dashboard: No pending story found');
      return;
    }
    
    if (pendingStory) {
      console.log('Dashboard: Pending story already in state, skipping...');
      return;
    }
    
    // Prüfe, ob der User wirklich authentifiziert ist
    console.log('Dashboard: User check:', { user: !!user, userId: user?.id, userEmail: user?.email });
    
    if (!user || !user.id) {
      console.log('Dashboard: No valid user found, cannot save pending story');
      // Setze die temporäre Ressource trotzdem an, damit sie angezeigt wird
      try {
        const storyData = JSON.parse(savedPendingStory);
        setPendingStory(storyData);
        console.log('Dashboard: Pending story set in state for display (user not authenticated)');
      } catch (err) {
        console.error('Dashboard: Error parsing pending story:', err);
      }
      return;
    }
    
    // Verhindere mehrfache Speicherung
    if (isSavingPendingStory) {
      console.log('Dashboard: Already saving pending story, skipping...');
      return;
    }
    
    try {
      const storyData = JSON.parse(savedPendingStory);
      console.log('Dashboard: Story data:', {
        generatedStory: storyData.generatedStory?.substring(0, 50) + '...',
        selectedFigure: storyData.selectedFigure?.name,
        questionAnswers: storyData.questionAnswers?.length || 0
      });
      
      // Setze die temporäre Ressource IMMER im State, damit sie angezeigt wird
      setPendingStory(storyData);
      console.log('Dashboard: Pending story set in state for display');
      
    // Prüfe User-Status erneut, da er sich während der Ausführung ändern kann
    const currentUser = user;
    console.log('Dashboard: Current user status:', !!currentUser, currentUser?.id);
    
    // Warte kurz, falls der User-Status noch nicht vollständig geladen ist
    if (!currentUser) {
      console.log('Dashboard: User not ready yet, waiting...');
      setTimeout(() => {
        checkForPendingStories();
      }, 2000);
      return;
    }
    
    console.log('Dashboard: User is authenticated, proceeding with save...');
    
    // Flag FRÜH setzen um mehrfache Aufrufe zu verhindern
    setIsSavingPendingStory(true);
    try { localStorage.setItem('pendingStory_saving', '1'); } catch {}
    
    if (currentUser) {
        // Wenn User authentifiziert ist, versuche in der Datenbank zu speichern
        console.log('Dashboard: User authenticated, attempting to save to database...');
        
        try {
          // Normalisierung/Signatur zur robusteren Duplikaterkennung
          const normalizeText = (s: string) => (s || '').replace(/\s+/g, ' ').trim();
          const figureName: string = storyData.selectedFigure?.name || '';
          const normalizedContent = normalizeText(storyData.generatedStory || '');
          const signatureHead = normalizedContent.slice(0, 200);
          // Prüfe zuerst, ob bereits eine identische Ressource existiert
          console.log('Dashboard: Checking for existing duplicate story...');
          
          let shouldSkipSave = false;
          
          try {
            // Robuste Duplikat-Prüfung - prüfe nach title, content und user_id
            console.log('Dashboard: Checking for duplicates with title:', figureName, 'and head:', signatureHead.substring(0, 50) + '...');
            
            // Verbesserte Duplikatsprüfung: Prüfe auf vollständigen Content, nicht nur auf title
            const { data: existingStories, error: checkError } = await supabase
              .from('saved_stories')
              .select('id, title, content, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(20); // Prüfe mehr Stories

            if (checkError) {
              console.error('Error checking for duplicates:', checkError);
              console.log('Continuing with save despite duplicate check error...');
            } else if (existingStories && existingStories.length > 0) {
              // Prüfe auf exakte Übereinstimmung des Contents (erste 500 Zeichen)
              const normalizedContentFull = normalizedContent.slice(0, 500);
              const foundSimilar = existingStories.some((es: any) => {
                const norm = normalizeText(es.content || '');
                const normHead = norm.slice(0, 500);
                // Exakte Übereinstimmung oder sehr ähnlich (>95% der ersten 500 Zeichen)
                return normHead === normalizedContentFull || 
                       (normHead.length > 100 && normalizedContentFull.length > 100 && 
                        normHead.slice(0, 100) === normalizedContentFull.slice(0, 100));
              });
              if (foundSimilar) {
                console.log('Dashboard: Duplicate story (by content) found, skipping save');
                shouldSkipSave = true;
                // Lösche pendingStory sofort, da Duplikat
                localStorage.removeItem('pendingStory');
                try { localStorage.removeItem('pendingStory_saving'); } catch {}
                setPendingStory(null);
                setIsSavingPendingStory(false);
                loadStories(); // Lade Stories neu, um Duplikat zu entfernen
                return;
              }
            } else {
              console.log('Dashboard: No duplicates found, proceeding with save');
            }
          } catch (duplicateCheckError) {
            console.error('Error during duplicate check:', duplicateCheckError);
            console.log('Continuing with save despite duplicate check error...');
          }

          if (shouldSkipSave) {
            // Lösche temporäre Daten trotzdem
            localStorage.removeItem('pendingStory');
            try { localStorage.removeItem('pendingStory_saving'); } catch {}
            setPendingStory(null);
            loadStories();
            return;
          }

          // Debug: Logge die Daten vor dem Speichern
          console.log('Dashboard: No duplicates found, attempting to save with data:', {
            user_id: user.id,
            story_text: storyData.generatedStory?.substring(0, 50) + '...',
            figure_name: storyData.selectedFigure?.name,
            figure_emoji: storyData.selectedFigure?.emoji,
            audio_url: storyData.audioState?.audioUrl ? 'has audio' : 'no audio',
            voice_id: storyData.selectedVoiceId,
            question_answers_count: storyData.questionAnswers?.length || 0
          });

          // Verwende nur die user_id Spalte, die wir wissen, dass sie existiert
          // Verwende die Spalten, die definitiv existieren: user_id, title, content, resource_figure und question_answers
          console.log('Dashboard: Using confirmed columns: user_id, title, content, resource_figure and question_answers');
          
          const correctData = {
            user_id: user.id,
            title: storyData.selectedFigure.name,
            content: storyData.generatedStory,
            resource_figure: storyData.selectedFigure.name,
            question_answers: Array.isArray(storyData.questionAnswers) ? storyData.questionAnswers : []
          };
          
          console.log('Dashboard: Inserting with correct data:', correctData);
          
          const { data, error } = await supabase
            .from('saved_stories')
            .insert(correctData as any)
            .select();

          if (error) {
            console.error('Error saving pending story from dashboard:', error);
            console.log('Dashboard: Database save failed, but showing temporary resource anyway');
            console.log('Dashboard: Error details:', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            console.log('Dashboard: Full error object:', error);
            console.log('Dashboard: Error message:', error.message);
            console.log('Dashboard: Error code:', error.code);
            console.log('Dashboard: Insert data that failed:', correctData);
            // Versuche es erneut nach einer kurzen Pause
            setTimeout(() => {
              checkForPendingStories();
            }, 3000);
          } else {
            console.log('Pending story saved from dashboard:', data);
            // Lösche temporäre Daten SOFORT wenn erfolgreich gespeichert
            localStorage.removeItem('pendingStory');
            try { localStorage.removeItem('pendingStory_saving'); } catch {}
            setPendingStory(null);
            setIsSavingPendingStory(false);
            // Lade Geschichten neu
            await loadStories();
            // Verhindere weitere Speicherversuche - markiere als erledigt
            hasCheckedPendingRef.current = true;
            return;
          }
        } catch (dbError) {
          console.error('Database error:', dbError);
          console.log('Dashboard: Database error, but showing temporary resource anyway');
          // Versuche es erneut nach einer kurzen Pause
          setTimeout(() => {
            checkForPendingStories();
          }, 3000);
        } finally {
          setIsSavingPendingStory(false); // Flag zurücksetzen
        }
      } else {
        // Wenn User nicht authentifiziert ist, zeige temporäre Ressource an
        console.log('Dashboard: User not authenticated, showing temporary resource');
        console.log('Dashboard: Please log in to save your resource permanently');
        setIsSavingPendingStory(false); // Flag auch hier zurücksetzen
      }
    } catch (err) {
      console.error('Error processing pending story:', err);
      setIsSavingPendingStory(false); // Flag auch bei Fehlern zurücksetzen
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingStory, isSavingPendingStory]); // loadStories wird über Closure verwendet

  const saveFullName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setFullNameLoading(true);
    setFullNameError('');
    setFullNameSuccess('');

    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ full_name: fullName, pronunciation_hint: pronunciationHint })
        .eq('id', user.id);

      if (error) {
        setFullNameError(error.message);
      } else {
        setFullNameSuccess('Name erfolgreich gespeichert!');
      }
    } catch (err) {
      setFullNameError('Fehler beim Speichern');
    } finally {
      setFullNameLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadStories();
      loadUserAccess();
      // Lade den vollständigen Namen
      loadFullName();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Nur user als Dependency, um Endlosschleife zu vermeiden

  // Einziger useEffect für pending stories und URL-Parameter
  useEffect(() => {
    if (!user) return;
    
    // WICHTIG: Prüfe ob bereits gespeichert wurde, bevor wir erneut prüfen
    const savedPendingStory = typeof window !== 'undefined' ? localStorage.getItem('pendingStory') : null;
    if (!savedPendingStory && hasCheckedPendingRef.current) {
      // Keine pending story mehr und bereits geprüft - nicht erneut prüfen
      return;
    }
    
    // Setze Flag nur wenn wir wirklich prüfen werden
    if (hasCheckedPendingRef.current && !savedPendingStory) {
      return;
    }
    
    // Setze Flag wenn wir prüfen werden
    if (savedPendingStory) {
    hasCheckedPendingRef.current = true;
    }

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const confirmed = urlParams.get('confirmed');
      const paymentSuccess = urlParams.get('payment') === 'success';
      const sessionId = urlParams.get('session_id');
      
      // Nach erfolgreicher Zahlung: Zugangsstatus neu laden
      if (paymentSuccess) {
        console.log('Dashboard: Payment successful, reloading access status', { sessionId });
        // Warte kurz, damit Webhook Zeit hat, den Zugang zu erstellen
        // Versuche mehrmals, falls Webhook noch nicht verarbeitet wurde
        let retryCount = 0;
        const maxRetries = 8; // Mehr Versuche für Live-Website
        const retryDelay = 2000; // 2 Sekunden
        
        const checkAccess = async () => {
          console.log(`Dashboard: Checking access (attempt ${retryCount + 1}/${maxRetries})`);
          await loadUserAccess();
          await loadStories();
          
          // Prüfe ob Zugang jetzt aktiv ist
          const hasAccess = await hasActiveAccess(user.id);
          console.log('Dashboard: Access check result:', hasAccess);
          
          if (hasAccess) {
            // Erfolgsmeldung anzeigen und Seite neu laden für vollständige Aktualisierung
            alert('Zahlung erfolgreich! Dein Zugang wurde aktiviert. Die Seite wird neu geladen...');
            // Seite neu laden, damit alles korrekt aktualisiert wird
            window.location.reload();
          } else if (retryCount < maxRetries - 1) {
            // Noch kein Zugang - versuche es erneut
            retryCount++;
            setTimeout(checkAccess, retryDelay);
          } else {
            // Nach mehreren Versuchen immer noch kein Zugang
            // Lade Seite trotzdem neu - möglicherweise ist der Zugang jetzt in der DB
            console.warn('Dashboard: Access not activated after payment, webhook may have failed. Reloading page anyway...');
            alert('Zahlung erfolgreich! Die Seite wird neu geladen, um den Zugang zu prüfen...');
            window.location.reload();
          }
        };
        
        // Starte erste Prüfung nach 3 Sekunden (mehr Zeit für Webhook auf Live-Website)
        setTimeout(checkAccess, 3000);
      }

      console.log('Dashboard: URL params check', { confirmed, paymentSuccess, user: !!user });

      // Direkt prüfen, ohne zusätzliche Verzögerung; Guard verhindert Doppelausführung
      checkForPendingStories();

      // confirmed Parameter aufräumen
      if (confirmed === 'true') {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('confirmed');
        window.history.replaceState({}, '', newUrl.toString());
      }
      
      // payment Parameter aufräumen nach erfolgreicher Verarbeitung
      if (paymentSuccess) {
        setTimeout(() => {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('payment');
          newUrl.searchParams.delete('session_id');
          window.history.replaceState({}, '', newUrl.toString());
        }, 3000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // checkForPendingStories, loadUserAccess, loadStories werden über Closure verwendet

  // Entfernt - redundanter useEffect

  // Cleanup Audio-Elemente beim Unmount
  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [audioElements]);

  

  const deleteStory = async (storyId: string) => {
    try {
      const { error } = await supabase
        .from('saved_stories')
        .delete()
        .eq('id', storyId);

      if (error) {
        console.error('Error deleting story:', error);
        alert('Fehler beim Löschen der Geschichte');
      } else {
        // Aktualisiere die lokale Liste
        setStories(stories.filter(story => story.id !== storyId));
        setDeleteConfirmId(null); // Bestätigung schließen
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Ein unerwarteter Fehler ist aufgetreten');
    }
  };


  const handleDeleteClick = (storyId: string) => {
    setDeleteConfirmId(storyId);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  // Temporäre Funktion zum Löschen aller Duplikate für einen User
  const deleteAllDuplicates = async () => {
    if (!user) return;
    
    try {
      // Hole alle Stories für den User
      const { data: allStories, error: fetchError } = await supabase
        .from('saved_stories')
        .select('*')
        .eq('user_id', user.id);

      if (fetchError) {
        console.error('Error fetching stories:', fetchError);
        return;
      }

      // Gruppiere nach title (Figure-Name)
      const groupedStories = (allStories as SavedStory[]).reduce((acc, story) => {
        const key = story.title;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(story);
        return acc;
      }, {} as Record<string, SavedStory[]>);

      // Für jede Gruppe: behalte nur die erste, lösche den Rest
      let deletedCount = 0;
      for (const [title, stories] of Object.entries(groupedStories)) {
        if (Array.isArray(stories) && stories.length > 1) {
          // Sortiere nach created_at (älteste zuerst)
          const sortedStories = stories.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Behalte die erste (älteste), lösche den Rest
          const toDelete = sortedStories.slice(1);
          const idsToDelete = toDelete.map(story => story.id);
          
          if (idsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('saved_stories')
              .delete()
              .in('id', idsToDelete);
              
            if (deleteError) {
              console.error(`Error deleting duplicates for ${title}:`, deleteError);
            } else {
              deletedCount += idsToDelete.length;
              console.log(`Deleted ${idsToDelete.length} duplicates for ${title}`);
            }
          }
        }
      }

      console.log(`Total duplicates deleted: ${deletedCount}`);
      if (deletedCount > 0) {
        loadStories(); // Lade Stories neu
      }
    } catch (error) {
      console.error('Error deleting duplicates:', error);
    }
  };

  const downloadStory = (story: SavedStory) => {
    const content = `
Titel: ${story.title}
${getResourceTypeLabel(story.resource_figure)}: ${story.resource_figure?.name || 'Unbekannt'}
Erstellt: ${new Date(story.created_at).toLocaleDateString('de-DE')}

${story.content}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAudio = async (story: SavedStory) => {
    if (!story.audio_url) return;
    
    // Prüfe Premium-Status
    if (user) {
      const { hasPremiumAccess } = await import('@/lib/access');
      const hasPremium = await hasPremiumAccess(user.id);
      
      if (!hasPremium) {
        alert('Audio-Downloads sind nur für Premium-User verfügbar. Bitte wähle den Premium-Plan, um Downloads zu nutzen.');
        return;
      }
    }
    
    const a = document.createElement('a');
    a.href = story.audio_url;
    a.download = `${story.title}_audio.mp3`;
    a.click();
  };





  const generateAudio = async (storyId: string) => {
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    setGeneratingAudioFor(storyId);
    try {
      const response = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: story.content,
                  voiceId: '21m00Tcm4TlvDq8ikWAM', // Standard-Stimme
                  adminPreview: false // Dashboard generiert immer vollständiges Audio
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler beim Generieren des Audios');
      }

      const data = await response.json();
      const audioUrl = data.audioUrl; // Verwende die permanente Supabase-URL direkt
      
      // Aktualisiere die Geschichte in der lokalen Liste
      const updatedStory = {
        ...story,
        audio_url: audioUrl,
                voice_id: '21m00Tcm4TlvDq8ikWAM'
      };
      
      setStories(stories.map(s => s.id === storyId ? updatedStory : s));
      
      // Speichere das Audio in der Datenbank
      const { error } = await (supabase as any)
        .from('saved_stories')
        .update({
          audio_url: audioUrl,
          voice_id: '21m00Tcm4TlvDq8ikWAM'
        })
        .eq('id', storyId);

      if (error) {
        console.error('Error saving audio to database:', error);
      }
      
    } catch (error) {
      console.error('Error generating audio:', error);
      alert('Fehler beim Generieren des Audios. Bitte versuche es erneut.');
    } finally {
      setGeneratingAudioFor(null);
    }
  };

  const playAudio = useCallback(async (audioUrl: string, storyId: string) => {
    // VALIDIERUNG: Prüfe ob audioUrl gültig ist
    if (!audioUrl || audioUrl.trim() === '') {
      console.error(`[playAudio] Invalid audioUrl for story ${storyId}:`, audioUrl);
      alert('Fehler: Audio-URL ist ungültig. Bitte kontaktiere den Support.');
      return;
    }
    
    console.log(`[playAudio] Starting playback for story ${storyId} with URL:`, audioUrl);
    
    // Prüfe ob User Zugang hat (Trial-Periode oder bezahlt)
    // Nur wenn Paywall-Feature aktiviert ist
    const paywallEnabled = isEnabled('PAYWALL_ENABLED');
    
    if (user && paywallEnabled) {
      console.log(`[playAudio] Checking access for story ${storyId}...`);
      try {
        const canAccess = await canAccessResource(user.id, storyId);
        console.log(`[playAudio] Access check result for story ${storyId}:`, canAccess);
        if (!canAccess) {
          // Trial-Periode abgelaufen oder nicht die erste Ressource - zeige Paywall
          console.log(`[playAudio] Access denied for story ${storyId} - showing paywall`);
          setShowPaywall(true);
          return;
        }
        console.log(`[playAudio] Access granted for story ${storyId} - proceeding with playback`);
      } catch (accessError) {
        console.error(`[playAudio] Error checking access for story ${storyId}:`, accessError);
        // Bei Fehler bei der Zugangsprüfung: Zeige Paywall (sicherer)
        setShowPaywall(true);
        return;
      }
    }
    
    // Stoppe alle anderen Audio-Elemente und resette sie
    Object.entries(audioElements).forEach(([id, audio]) => {
      if (id !== storyId) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    
    // Finde Story für Tracking
    const story = stories.find(s => s.id === storyId);
    
    // Erstelle oder verwende existierendes Audio-Element
    let audio = audioElements[storyId];
    if (!audio) {
      console.log(`[playAudio] Creating new audio element for story ${storyId}`);
      audio = new Audio();
      audio.preload = 'auto';
      setAudioElements(prev => ({ ...prev, [storyId]: audio }));
      
      // Event Listener für Audio-Ende
      audio.addEventListener('ended', () => {
        setPlayingAudioId(null);
        
        // Track vollständigen Audio-Play (nur wenn User eingeloggt ist UND eine gültige Session hat)
        if (user && session && story && audio.duration) {
          trackEvent({
            eventType: 'audio_play_complete',
            storyId: storyId,
            resourceFigureName: typeof story.resource_figure === 'string' 
              ? story.resource_figure 
              : story.resource_figure?.name,
            voiceId: story.voice_id || undefined,
            metadata: {
              completed: true,
              audioDuration: audio.duration,
            },
          }, { accessToken: session.access_token });
        }
      });
      
      audio.addEventListener('error', (e) => {
        setPlayingAudioId(null);
        const error = audio.error;
        console.error('Audio playback error:', {
          code: error?.code,
          message: error?.message,
          storyId,
          audioUrl
        });
        // Zeige benutzerfreundliche Fehlermeldung nur wenn es wirklich ein Audio-Fehler ist
        // (nicht wenn Paywall angezeigt werden sollte)
        // Prüfe ob Paywall-Feature aktiviert ist und ob User Zugang hat
        const paywallEnabled = isEnabled('PAYWALL_ENABLED');
        if (paywallEnabled && user) {
          // Prüfe nochmal ob User Zugang hat - wenn nicht, zeige Paywall statt Fehlermeldung
          canAccessResource(user.id, storyId).then(canAccess => {
            if (!canAccess) {
              console.log(`[playAudio] Access denied after audio error - showing paywall instead`);
              setShowPaywall(true);
            } else {
              // Echter Audio-Fehler
              alert('Fehler beim Abspielen des Audios. Bitte versuche es erneut oder kontaktiere den Support.');
            }
          }).catch(() => {
            // Bei Fehler bei der Prüfung: Zeige normale Fehlermeldung
            alert('Fehler beim Abspielen des Audios. Bitte versuche es erneut oder kontaktiere den Support.');
          });
        } else {
          // Paywall nicht aktiviert oder kein User - zeige normale Fehlermeldung
          alert('Fehler beim Abspielen des Audios. Bitte versuche es erneut oder kontaktiere den Support.');
        }
      });
      
      // Event Listener für Load-Error
      audio.addEventListener('loadstart', () => {
        console.log(`[playAudio] Loading audio for story ${storyId}`);
      });
      
      audio.addEventListener('canplay', () => {
        console.log(`[playAudio] Audio ready for story ${storyId}`);
      });
    }
    
    // Setze neue URL falls nötig
    // Vergleiche die vollständigen URLs (Audio-URLs sind vollständige HTTPS-URLs)
    const currentSrc = audio.src || '';
    const needsNewSource = currentSrc !== audioUrl && audioUrl;
    
    if (needsNewSource) {
      console.log(`[playAudio] Setting new audio source for story ${storyId}:`, {
        oldSrc: currentSrc,
        newSrc: audioUrl
      });
      
      // Pausiere und resette Audio-Element vor dem URL-Wechsel
      audio.pause();
      audio.currentTime = 0;
      
      // WICHTIG: Erstelle ein neues Audio-Element für eine saubere Basis
      // Verwende new Audio() ohne URL, dann setze src explizit
      const newAudio = new Audio();
      newAudio.preload = 'auto';
      
      // Setze URL explizit
      newAudio.src = audioUrl;
      
      // WICHTIG: Prüfe sofort ob URL gesetzt wurde
      if (!newAudio.src || newAudio.src === '' || newAudio.src === window.location.href) {
        console.error(`[playAudio] Failed to set audio src! Retrying...`, {
          storyId,
          audioUrl,
          audioSrc: newAudio.src
        });
        // Versuche nochmal
        newAudio.src = audioUrl;
        // Falls immer noch nicht gesetzt, verwende load() Methode
        if (!newAudio.src || newAudio.src === '') {
          console.error(`[playAudio] Audio src still empty after retry! Using load() method`);
          newAudio.load();
        }
      }
      
      console.log(`[playAudio] Created new audio element with URL:`, {
        storyId,
        audioUrl,
        audioSrc: newAudio.src,
        srcIsSet: !!newAudio.src && newAudio.src !== '' && newAudio.src !== window.location.href
      });
      
      // Verwende neues Audio-Element BEVOR wir es im State setzen
      audio = newAudio;
      
      // Ersetze altes Audio-Element im State NACH dem Setzen der URL
      setAudioElements(prev => ({ ...prev, [storyId]: newAudio }));
      
      // Füge Event-Listener NACH dem Setzen der URL hinzu
      newAudio.addEventListener('ended', () => {
        setPlayingAudioId(null);
        if (user && session && story && newAudio.duration) {
          trackEvent({
            eventType: 'audio_play_complete',
            storyId: storyId,
            resourceFigureName: typeof story.resource_figure === 'string' 
              ? story.resource_figure 
              : story.resource_figure?.name,
            voiceId: story.voice_id || undefined,
            metadata: {
              completed: true,
              audioDuration: newAudio.duration,
            },
          }, { accessToken: session.access_token });
        }
      });
      
      newAudio.addEventListener('error', (e) => {
        const error = newAudio.error;
        const isDuringLoading = error?.code === 4 && (newAudio.readyState === 0 || newAudio.readyState === 1);
        
        // Prüfe ob es ein echter Fehler ist (nicht nur ein Loading-Event)
        // Error-Code 4 = MEDIA_ELEMENT_ERROR, aber das kann auch während des Ladens auftreten
        if (isDuringLoading) {
          // Audio ist noch im Loading-Zustand - warte auf canplay event
          // Logge nur als debug, nicht als error
          console.log('[playAudio] Audio error during loading (ignoring, waiting for canplay):', {
            code: error?.code,
            message: error?.message,
            readyState: newAudio.readyState,
            audioSrc: newAudio.src
          });
          return; // Nicht als Fehler behandeln, warte auf canplay
        }
        
        // Nur als Fehler behandeln, wenn Audio wirklich nicht geladen werden kann
        console.error('[playAudio] Real audio error (not during loading):', {
          code: error?.code,
          message: error?.message,
          storyId,
          audioUrl,
          audioSrc: newAudio.src,
          readyState: newAudio.readyState
        });
        
        setPlayingAudioId(null);
        
        const paywallEnabled = isEnabled('PAYWALL_ENABLED');
        if (paywallEnabled && user) {
          canAccessResource(user.id, storyId).then(canAccess => {
            if (!canAccess) {
              console.log(`[playAudio] Access denied after audio error - showing paywall instead`);
              setShowPaywall(true);
            } else {
              alert('Fehler beim Abspielen des Audios. Bitte versuche es erneut oder kontaktiere den Support.');
            }
          }).catch(() => {
            alert('Fehler beim Abspielen des Audios. Bitte versuche es erneut oder kontaktiere den Support.');
          });
        } else {
          alert('Fehler beim Abspielen des Audios. Bitte versuche es erneut oder kontaktiere den Support.');
        }
      });
      
      newAudio.addEventListener('loadstart', () => {
        console.log(`[playAudio] Loading audio for story ${storyId}`);
      });
      
      newAudio.addEventListener('canplay', () => {
        console.log(`[playAudio] Audio ready for story ${storyId}`);
      });
      
      // Prüfe ob URL korrekt gesetzt wurde
      if (!audio.src || audio.src === '' || audio.src === window.location.href) {
        console.error(`[playAudio] Audio src is empty or invalid for story ${storyId}!`, {
          audioSrc: audio.src,
          audioUrl: audioUrl,
          readyState: audio.readyState
        });
        // Versuche URL nochmal zu setzen
        audio.src = audioUrl;
        console.log(`[playAudio] Retried setting audio src:`, audio.src);
      }
      
      // Warte auf Load, bevor wir abspielen
      try {
        await new Promise<void>((resolve, reject) => {
          let resolved = false;
          
          const cleanup = (timeoutIdToClear?: NodeJS.Timeout) => {
            if (timeoutIdToClear) {
              clearTimeout(timeoutIdToClear);
            }
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError);
            audio.removeEventListener('loadstart', onLoadStart);
          };
          
          const onCanPlay = () => {
            if (resolved) return;
            resolved = true;
            cleanup(timeoutId);
            resolve();
          };
          
          const onError = (e: Event) => {
            if (resolved) return;
            resolved = true;
            cleanup(timeoutId);
            const error = audio.error;
            console.error(`[playAudio] Audio error during load for story ${storyId}:`, {
              code: error?.code,
              message: error?.message,
              audioSrc: audio.src,
              audioUrl: audioUrl
            });
            reject(new Error(`Audio konnte nicht geladen werden: ${error?.message || 'Unbekannter Fehler'}`));
          };
          
          const onLoadStart = () => {
            console.log(`[playAudio] Audio loading started for story ${storyId}, src: ${audio.src}`);
          };
          
          // Wenn Audio bereits geladen ist, resolve sofort
          if (audio.readyState >= 2) { // HAVE_CURRENT_DATA
            console.log(`[playAudio] Audio already loaded for story ${storyId}, readyState: ${audio.readyState}`);
            resolved = true;
            cleanup();
            resolve();
            return;
          }
          
          // Prüfe ob Audio bereits im Loading-Prozess ist
          if (audio.readyState >= 1) { // HAVE_METADATA
            console.log(`[playAudio] Audio metadata loaded, waiting for canplay, readyState: ${audio.readyState}`);
          }
          
          // Prüfe nochmal ob src gesetzt ist bevor wir Event-Listener hinzufügen
          if (!audio.src || audio.src === '') {
            console.error(`[playAudio] Audio src is still empty before adding listeners! Setting again...`);
            audio.src = audioUrl;
          }
          
          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('canplaythrough', onCanPlay, { once: true }); // Auch auf canplaythrough warten
          audio.addEventListener('error', onError, { once: true });
          audio.addEventListener('loadstart', onLoadStart, { once: true });
          
          // Timeout nach 15 Sekunden (länger für langsamere Verbindungen)
          const timeoutId: NodeJS.Timeout = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            cleanup(timeoutId);
            console.error(`[playAudio] Timeout: Audio did not load within 15 seconds for story ${storyId}`, {
              readyState: audio.readyState,
              audioSrc: audio.src,
              audioUrl: audioUrl
            });
            reject(new Error('Audio-Laden hat zu lange gedauert'));
          }, 15000);
        });
        console.log(`[playAudio] Audio loaded successfully for story ${storyId}`);
      } catch (error) {
        console.error('[playAudio] Error loading audio:', error);
        alert('Fehler beim Laden des Audios. Bitte versuche es erneut.');
        setPlayingAudioId(null);
        return;
      }
    } else {
      console.log(`[playAudio] Using existing audio source for story ${storyId}, readyState: ${audio.readyState}`);
      // Prüfe ob Audio-Element in einem guten Zustand ist
      if (audio.readyState === 0) { // HAVE_NOTHING - Audio wurde noch nicht geladen
        console.log(`[playAudio] Audio element not loaded yet, triggering load`);
        audio.load();
      }
    }
    
    // Spiele Audio ab
    try {
      await audio.play();
      setPlayingAudioId(storyId);
      
      // Track Audio-Play Event (nur wenn User eingeloggt ist UND eine gültige Session hat)
      if (user && session && story) {
        trackEvent({
          eventType: 'audio_play',
          storyId: storyId,
          resourceFigureName: typeof story.resource_figure === 'string' 
            ? story.resource_figure 
            : story.resource_figure?.name,
          voiceId: story.voice_id || undefined,
        }, { accessToken: session.access_token });
      }
    } catch (playError: any) {
      console.error('[playAudio] Error playing audio:', playError);
      setPlayingAudioId(null);
      // Zeige benutzerfreundliche Fehlermeldung
      if (playError?.name === 'NotAllowedError') {
        alert('Audio-Wiedergabe wurde blockiert. Bitte erlaube Audio-Wiedergabe in deinem Browser.');
      } else if (playError?.name === 'NotSupportedError') {
        alert('Dieses Audio-Format wird von deinem Browser nicht unterstützt.');
      } else {
        alert('Fehler beim Abspielen des Audios. Bitte versuche es erneut.');
      }
    }
  }, [audioElements, user, stories, session]);

  const pauseAudio = useCallback((storyId: string) => {
    const audio = audioElements[storyId];
    if (audio) {
      audio.pause();
      setPlayingAudioId(null);
    }
  }, [audioElements]);

  const stopAllAudio = useCallback(() => {
    Object.values(audioElements).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setPlayingAudioId(null);
  }, [audioElements]);

        return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-amber-900 mb-2">
            Dashboard
          </h1>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white rounded-2xl shadow-lg p-2 flex space-x-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Profil</span>
            </button>
            
            <button
              onClick={() => setActiveTab('stories')}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'stories'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Meine Ressourcen ({stories.length})</span>
            </button>
            
            {isAdmin && (
              <button
                onClick={() => router.push('/admin/analytics')}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-lg"
              >
                <BarChart3 className="w-5 h-5" />
                <span>Admin Analytics</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'profile' ? (
            <div className="space-y-6">
              {/* Basis-Informationen */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Basis-Informationen</h2>
                </div>
              {user ? (
                  <div className="space-y-6">
                    {/* E-Mail Info */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-5 h-5 text-amber-600" />
                        <span className="font-semibold text-amber-900">E-Mail-Adresse</span>
                      </div>
                      <p className="text-amber-800 text-sm font-medium">{user.email}</p>
                    </div>
                    
                    {/* Personalisierungs-Einstellungen */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h3 className="font-semibold text-blue-900">Personalisierung für Geschichten</h3>
                      </div>
                      
                      <form onSubmit={saveFullName} className="space-y-4">
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
                              placeholder="z.B. An-ge-la, Mi-cha-el"
                            />
                            <p className="text-blue-600 text-xs mt-1.5">
                              Für korrekte Audio-Aussprache
                            </p>
                          </div>
                        </div>
                        
                        {fullNameError && (
                          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                            {fullNameError}
                          </div>
                        )}
                        
                        {fullNameSuccess && (
                          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
                            {fullNameSuccess}
                          </div>
                        )}
                        
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={fullNameLoading}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                          >
                            {fullNameLoading ? 'Speichern...' : 'Einstellungen speichern'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
              ) : (
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <p className="text-amber-700 text-sm">
                    Bitte melde dich an, um dein Profil zu sehen.
                  </p>
                </div>
              )}
              </div>

              {/* Nutzungs-Statistiken */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Nutzungs-Statistiken</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <BookOpen className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                            <p className="text-2xl font-bold text-blue-900">{userStats.totalStories}</p>
                            <p className="text-blue-700 text-sm">Ressourcen</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-900">{userStats.totalAudioTime}</p>
                    <p className="text-purple-700 text-sm">Min. Audio</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <Star className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-green-900">{userStats.favoriteFigure}</p>
                    <p className="text-green-700 text-sm">Lieblingsfigur</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <Volume2 className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                    <p className="text-lg font-bold text-orange-900">{userStats.favoriteVoice}</p>
                    <p className="text-orange-700 text-sm">Lieblingsstimme</p>
                  </div>
                </div>
              </div>

              {/* Abo-Status */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Crown className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Abo-Status</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-5 h-5 text-amber-600" />
                      <span className="font-medium text-amber-900">Aktueller Plan</span>
                    </div>
                    <p className="text-amber-700 text-lg font-semibold">{subscriptionStatus.plan}</p>
                    {subscriptionStatus.isPro && (
                      <p className="text-amber-600 text-sm">Pro-Version aktiv</p>
                    )}
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Credits</span>
                    </div>
                    <p className="text-blue-700 text-lg font-semibold">{subscriptionStatus.credits}</p>
                    <p className="text-blue-600 text-sm">Verfügbar</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">Ablauf</span>
                    </div>
                    <p className="text-green-700 text-lg font-semibold">
                      {subscriptionStatus.expiresAt 
                        ? new Date(subscriptionStatus.expiresAt).toLocaleDateString('de-DE')
                        : 'Unbegrenzt'
                      }
                    </p>
                  </div>
                </div>
                {!subscriptionStatus.isPro && (
                  <div className="mt-4 text-center">
                    <button 
                      onClick={() => setShowPaywall(true)}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 font-medium"
                    >
                      3-Monats-Paket aktivieren (179€)
                    </button>
                    <p className="text-xs text-amber-600 mt-2">
                      Statt 1,5 Sitzungen (330€) nur 179€
                    </p>
                  </div>
                )}
              </div>


              {/* Account-Management */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Account-Management</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <Key className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium text-blue-900">Passwort ändern</p>
                      <p className="text-blue-700 text-sm">Sicherheitseinstellungen</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                    <Mail className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-green-900">E-Mail ändern</p>
                      <p className="text-green-700 text-sm">Kontaktdaten aktualisieren</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                    <Download className="w-5 h-5 text-orange-600" />
                    <div className="text-left">
                      <p className="font-medium text-orange-900">Daten exportieren</p>
                      <p className="text-orange-700 text-sm">Alle Daten herunterladen</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                    <Trash className="w-5 h-5 text-red-600" />
                    <div className="text-left">
                      <p className="font-medium text-red-900">Account löschen</p>
                      <p className="text-red-700 text-sm">Dauerhaft entfernen</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Support */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <HelpCircle className="w-6 h-6 text-amber-600" />
                  <h2 className="text-xl font-bold text-amber-900">Support & Hilfe</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium text-blue-900">FAQ</p>
                      <p className="text-blue-700 text-sm">Häufige Fragen</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium text-green-900">Kontakt</p>
                      <p className="text-green-700 text-sm">Support kontaktieren</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                    <Star className="w-5 h-5 text-purple-600" />
                    <div className="text-left">
                      <p className="font-medium text-purple-900">Feedback</p>
                      <p className="text-purple-700 text-sm">Verbesserungsvorschläge</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors">
                    <Bug className="w-5 h-5 text-orange-600" />
                    <div className="text-left">
                      <p className="font-medium text-orange-900">Bug melden</p>
                      <p className="text-orange-700 text-sm">Problem melden</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-amber-900">Meine Ressourcen</h2>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">Lade Geschichten...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600">{error}</p>
                </div>
              ) : stories.length === 0 && !pendingStory ? (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Noch keine Geschichten gespeichert.</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Erstelle eine neue Ressourcen-Geschichte, um sie hier zu sehen.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Temporäre Ressource anzeigen - nur wenn Benutzer nicht eingeloggt ist */}
                  {pendingStory && !user && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-3xl">{pendingStory.selectedFigure?.emoji}</div>
                          <div>
                            <h3 className="text-lg font-semibold text-blue-900">
                              {pendingStory.selectedFigure?.name}
                            </h3>
                            <p className="text-blue-700 text-sm">
                              Temporäre Ressource - Bitte melde dich an, um sie zu speichern
                            </p>
                          </div>
                        </div>
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                          Temporär
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 mb-4">
                        <p className="text-gray-800 leading-relaxed">
                          {pendingStory.generatedStory}
                        </p>
                      </div>
                      
                      {pendingStory.audioState?.audioUrl && (
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              const audio = new Audio(pendingStory.audioState.audioUrl);
                              audio.play();
                            }}
                            className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            <span>Audio abspielen</span>
                          </button>
                        </div>
                      )}
                      
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          ⚠️ Diese Ressource ist nur temporär gespeichert. Bitte melde dich an, um sie dauerhaft zu speichern.
                        </p>
                      </div>
                    </motion.div>
                  )}
                  
                  
                  {stories.map((story) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50 border border-amber-200 rounded-xl p-6"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-amber-900 mb-2">
                            {story.title}
                          </h3>
                          <p className="text-amber-700 text-sm mb-2">
                            <strong>{getResourceTypeLabel(story.resource_figure)}:</strong> {story.resource_figure?.name || 'Unbekannt'}
                          </p>
                          <p className="text-amber-600 text-sm">
                            <strong>Erstellt am:</strong> {new Date(story.created_at).toLocaleDateString('de-DE', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: 'numeric' 
                            })}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {deleteConfirmId === story.id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => deleteStory(story.id)}
                                className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                              >
                                Bestätigen
                              </button>
                              <button
                                onClick={handleDeleteCancel}
                                className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                              >
                                Abbrechen
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleDeleteClick(story.id)}
                              className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                              title="Geschichte löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Audio-Fokus Bereich */}
                      <div className="bg-white rounded-lg p-4">
                        <div className="text-center">
                          <div className="mb-4">
                            {story.audio_url ? (
                            <div className="space-y-3">
                                <div className="flex justify-center">
                                  {playingAudioId === story.id ? (
                                <button
                                      onClick={() => pauseAudio(story.id)}
                                      className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-8 py-4 rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-3 text-lg font-medium"
                                    >
                                      <Pause className="w-6 h-6" />
                                      Pause
                                </button>
                                  ) : (() => {
                                    const accessStatus = resourceAccessStatus[story.id];
                                    const canAccess = accessStatus?.canAccess ?? true; // Fallback: erlauben wenn nicht geprüft
                                    const isFirst = accessStatus?.isFirst ?? false;
                                    const trialExpired = accessStatus?.trialExpired ?? false;
                                    
                                    if (!canAccess) {
                                      return (
                                    <button
                                          onClick={() => setShowPaywall(true)}
                                          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-3 text-lg font-medium opacity-75 cursor-pointer"
                                        >
                                          <Lock className="w-6 h-6" />
                                          {isFirst && trialExpired ? 'Trial abgelaufen - Zugang aktivieren' : 'Zugang aktivieren'}
                                        </button>
                                      );
                                    }
                                    
                                    return (
                                      <button
                                        onClick={async () => {
                                          // Prüfe Zugang vor dem Abspielen (nur wenn Paywall aktiviert)
                                          const paywallEnabled = isEnabled('PAYWALL_ENABLED');
                                          
                                          if (user && paywallEnabled) {
                                            console.log(`[Dashboard] Checking access for story ${story.id} before playing...`);
                                            const canAccessNow = await canAccessResource(user.id, story.id);
                                            console.log(`[Dashboard] Access check result for story ${story.id}:`, canAccessNow);
                                            if (!canAccessNow) {
                                              console.log(`[Dashboard] Access denied for story ${story.id} - showing paywall`);
                                              setShowPaywall(true);
                                              return;
                                            }
                                            console.log(`[Dashboard] Access granted for story ${story.id} - playing audio`);
                                          }
                                          
                                          // VALIDIERUNG: Prüfe ob audio_url vorhanden ist
                                          if (!story.audio_url || story.audio_url.trim() === '') {
                                            console.error(`[Dashboard] No audio_url for story ${story.id}:`, story);
                                            alert('Fehler: Diese Ressource hat keine Audio-URL. Bitte generiere das Audio erneut.');
                                            return;
                                          }
                                          
                                          console.log(`[Dashboard] Calling playAudio with URL:`, story.audio_url);
                                          playAudio(story.audio_url, story.id);
                                        }}
                                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-4 rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-3 text-lg font-medium"
                                    >
                                      <Play className="w-6 h-6" />
                                      Audio abspielen
                                    </button>
                                    );
                                  })()}
                                </div>
                                <p className="text-amber-600 text-sm">
                                  {playingAudioId === story.id ? '🔊 Audio wird abgespielt' : (() => {
                                    const accessStatus = resourceAccessStatus[story.id];
                                    const canAccess = accessStatus?.canAccess ?? true;
                                    const isFirst = accessStatus?.isFirst ?? false;
                                    const trialExpired = accessStatus?.trialExpired ?? false;
                                    
                                    if (!canAccess && isFirst && trialExpired) {
                                      return '⏰ Deine 3-Tage-Trial-Periode ist abgelaufen. Aktiviere den Zugang, um Audio abzuspielen.';
                                    } else if (!canAccess) {
                                      return '🔒 Aktiviere den Zugang, um Audio abzuspielen.';
                                    }
                                    return '✓ Audio verfügbar - Klicke zum Abspielen';
                                  })()}
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-amber-600 text-sm text-center mb-3">
                                  Für diese Geschichte ist noch kein Audio verfügbar.
                                </p>
                                {generatingAudioFor === story.id ? (
                                  <div className="flex items-center justify-center gap-2 text-amber-600">
                                    <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Audio wird generiert...</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => generateAudio(story.id)}
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-md hover:shadow-lg flex items-center gap-2 mx-auto font-medium"
                                  >
                                    <Volume2 className="w-5 h-5" />
                                    Audio generieren
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Pro-Version Hinweis für Text und Downloads */}
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                            <div className="flex items-center justify-center gap-2 mb-3">
                              <span className="text-2xl">👑</span>
                              <h4 className="text-lg font-semibold text-purple-900">Pro-Version</h4>
                            </div>
                            <p className="text-purple-700 text-sm mb-4">
                              Textanzeige, Bearbeitung und Downloads sind in der Pro-Version verfügbar
                            </p>
                            
                            {/* Pro-Features Liste */}
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center gap-2 text-sm text-purple-700">
                                <span className="text-purple-500">📝</span>
                                <span>Text anzeigen und bearbeiten</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-purple-700">
                                <span className="text-purple-500">📄</span>
                                <span>Text als TXT herunterladen</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-purple-700">
                                <span className="text-purple-500">🎵</span>
                                <span>Audio als MP3 herunterladen</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-purple-700">
                                <span className="text-purple-500">🎤</span>
                                <span>Stimme nachträglich ändern</span>
                              </div>
                            </div>
                            
                            
                            <button className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 text-sm font-medium">
                              Upgrade zu Pro
                              </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          message="Aktiviere das 3-Monats-Paket für 179€, um Ressourcen zu erstellen."
        />
      )}
    </div>
    );
}