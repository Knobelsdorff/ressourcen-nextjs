"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, Settings, CheckCircle, AlertTriangle, Trash2, Download, Volume2, User, Mail, Calendar, Clock, Star, Trophy, Target, Shield, HelpCircle, MessageCircle, Bug, Key, Trash, Crown, Zap, TrendingUp, Play, Pause, BarChart3, Lock, Music, RefreshCw, Plus, RotateCcw, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { getUserAccess, canAccessResource, hasActiveAccess } from "@/lib/access";
import Paywall from "@/components/Paywall";
import PaymentSuccessModal from "@/components/PaymentSuccessModal";
import ClientResourceModal from "@/components/ClientResourceModal";
import { trackEvent } from "@/lib/analytics";
import { isEnabled } from "@/lib/featureFlags";
import { getBackgroundMusicTrack, DEFAULT_MUSIC_VOLUME } from "@/data/backgroundMusic";
import ChangePassword from "@/components/ChangePassword";
import DeleteAccount from "@/components/DeleteAccount";
import ContactModal from "@/components/ContactModal";
import FeedbackModal from "@/components/FeedbackModal";
import BugModal from "@/components/BugModal";
import AnkommenAudioPlayer from "@/components/ankommen/AnkommenAudioPlayer";
import DashboardAudioPlayer from "@/components/DashboardAudioPlayer";
import SubscriptionManagement from "@/components/SubscriptionManagement";
import StoryPlayerWithBLS from "@/components/StoryPlayerWithBLS";
import { BLSProvider } from "@/components/providers/bls-provider";
import EditableSubtitle from "@/components/EditableSubtitle";
import StoryActionsMenu from "@/components/StoryActionsMenu";
import EditableTitle from "@/components/EditableTitle";
import DeleteStoryDialog from "@/components/DeleteStoryDialog";

interface SavedStory {
  id: string;
  title: string;
  content: string | null;
  resource_figure: any;
  question_answers: any[];
  audio_url?: string;
  voice_id?: string;
  created_at: string;
  is_audio_only?: boolean;
  client_email?: string | null;
  auto_subtitle?: string | null;
  custom_subtitle?: string | null;
}

export default function Dashboard() {
  const { user, session } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'stories'>('stories');
  
  // Prüfe ob User Full Admin ist (Analytics + Music)
  const isAdmin = (() => {
    if (!user?.email) return false;
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    return adminEmails.includes(user.email.toLowerCase());
  })();

  // Prüfe ob User Music Admin ist (nur Music-Verwaltung)
  const isMusicAdmin = (() => {
    if (!user?.email) return false;
    const musicAdminEmails = (process.env.NEXT_PUBLIC_MUSIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const fullAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    return musicAdminEmails.includes(user.email.toLowerCase()) || 
           fullAdminEmails.includes(user.email.toLowerCase());
  })();
  const [showPaywall, setShowPaywall] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string>('');
  const [showClientResourceModal, setShowClientResourceModal] = useState(false);
  const [userAccess, setUserAccess] = useState<any>(null);
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [ankommenStory, setAnkommenStory] = useState<SavedStory | null>(null);
  const [personalStories, setPersonalStories] = useState<SavedStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingAudioFor, setGeneratingAudioFor] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [backgroundMusicElements, setBackgroundMusicElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [musicEnabled, setMusicEnabled] = useState(true); // Toggle für Musik
  const [audioCurrentTime, setAudioCurrentTime] = useState<{ [key: string]: number }>({});
  const [audioDuration, setAudioDuration] = useState<{ [key: string]: number }>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renamingStoryId, setRenamingStoryId] = useState<string | null>(null);
  const adminResourceLoadingRef = useRef<string | null>(null); // Verhindere mehrfaches Laden derselben Ressource
  const [pendingStory, setPendingStory] = useState<any>(null);
  const [isSavingPendingStory, setIsSavingPendingStory] = useState(false);
  const hasCheckedPendingRef = useRef(false);
  
  // Profil-spezifische States
  const [fullName, setFullName] = useState('');
  const [pronunciationHint, setPronunciationHint] = useState('');
  const [pronunciationStress, setPronunciationStress] = useState<number>(1); // Standard: erste Silbe betont
  const [pronunciationStressLetter, setPronunciationStressLetter] = useState<number>(1); // Standard: erster Buchstabe der betonten Silbe
  const [pronunciationShortVowel, setPronunciationShortVowel] = useState<boolean>(false); // Standard: Vokal ist lang
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
    isPro: false,
    subscriptionId: null as string | null,
    subscriptionStatus: null as string | null,
  });
  const [loadingCustomerPortal, setLoadingCustomerPortal] = useState(false);
  const [resourceAccessStatus, setResourceAccessStatus] = useState<Record<string, { canAccess: boolean; isFirst: boolean; trialExpired: boolean; daysRemaining?: number }>>({});
  
  // Beispiel-Ressourcenfigur Konfiguration (nur für Admins)
  const [exampleResourceId, setExampleResourceId] = useState<string>("");
  const [exampleResourceLoading, setExampleResourceLoading] = useState(false);
  const [exampleResourceError, setExampleResourceError] = useState<string | null>(null);

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
        
        console.log('[loadUserAccess] getUserAccess returned access:', {
          planType: access.plan_type,
          stripeSubscriptionId: (access as any).stripe_subscription_id,
          subscriptionStatus: (access as any).subscription_status,
          status: access.status,
        });
        
        // Prüfe ob es ein Subscription-Abo ist
        const isSubscription = access.plan_type === 'subscription';
        const hasActiveSubscription = isSubscription && 
          access.status === 'active' && 
          (access as any).subscription_status === 'active';
        
        setSubscriptionStatus({
          plan: isSubscription ? 'Monatliches Abo' : '3-Monats-Paket',
          credits: isSubscription ? 999999 : Math.max(0, access.resources_limit - access.resources_created), // Unlimited für Subscription, verhindere negative Werte
          expiresAt: isSubscription ? null : (access.access_expires_at ? new Date(access.access_expires_at) : null),
          isPro: hasActiveSubscription || (access.status === 'active' && (!access.access_expires_at || new Date(access.access_expires_at) > new Date())),
          subscriptionId: (access as any).stripe_subscription_id || null,
          subscriptionStatus: (access as any).subscription_status || null,
        });
        
        console.log('[loadUserAccess] Set subscriptionStatus:', {
          subscriptionId: (access as any).stripe_subscription_id || null,
          plan: isSubscription ? 'Monatliches Abo' : '3-Monats-Paket',
          isPro: hasActiveSubscription || (access.status === 'active' && (!access.access_expires_at || new Date(access.access_expires_at) > new Date())),
          status: access.status,
          expiresAt: access.access_expires_at,
          hasActiveSubscription,
        });
        
        // Prüfe zusätzlich, ob User ein Abo hat (auch wenn nicht in access gefunden)
        // Dies ist wichtig, damit der "Abo verwalten" Button auch angezeigt wird, wenn das Abo inaktiv ist
        try {
          const { data: subscriptionData, error: subscriptionQueryError } = await supabase
            .from('user_access')
            .select('stripe_subscription_id, subscription_status, plan_type')
            .eq('user_id', user.id)
            .not('stripe_subscription_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          console.log('[loadUserAccess] Subscription query result:', {
            hasData: !!subscriptionData,
            subscriptionId: subscriptionData ? (subscriptionData as any).stripe_subscription_id : null,
            subscriptionStatus: subscriptionData ? (subscriptionData as any).subscription_status : null,
            planType: subscriptionData ? (subscriptionData as any).plan_type : null,
            fullData: subscriptionData,
            error: subscriptionQueryError?.message,
            errorCode: subscriptionQueryError?.code,
          });
          
          if (subscriptionData && (subscriptionData as any).stripe_subscription_id) {
            // User hat ein Abo (auch wenn inaktiv), setze subscriptionId
            setSubscriptionStatus(prev => ({
              ...prev,
              subscriptionId: (subscriptionData as any).stripe_subscription_id,
              subscriptionStatus: (subscriptionData as any).subscription_status || null,
              plan: (subscriptionData as any).plan_type === 'subscription' ? 'Monatliches Abo' : prev.plan,
              credits: (subscriptionData as any).plan_type === 'subscription' ? 999999 : prev.credits,
              expiresAt: (subscriptionData as any).plan_type === 'subscription' ? null : prev.expiresAt,
            }));
          } else {
            // Keine Subscription-ID in DB gefunden - prüfe direkt in Stripe
            try {
              const checkResponse = await fetch('/api/stripe/check-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
              });
              
              if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                if (checkData.hasSubscription && checkData.subscriptionId) {
                  // Subscription in Stripe gefunden - aktualisiere Status
                  setSubscriptionStatus(prev => ({
                    ...prev,
                    subscriptionId: checkData.subscriptionId,
                    subscriptionStatus: checkData.subscriptionStatus || 'active',
                    plan: 'Monatliches Abo',
                    credits: 999999,
                    expiresAt: null,
                  }));
                  console.log('[loadUserAccess] Found subscription in Stripe:', checkData);
                }
              }
            } catch (checkError) {
              console.error('[loadUserAccess] Error checking Stripe subscription:', checkError);
            }
          }
        } catch (subscriptionError) {
          console.error('[loadUserAccess] Error checking for subscription:', subscriptionError);
        }
        
        return; // Erfolgreich geladen
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
      
      // Prüfe trotzdem, ob User ein Abo hat (auch wenn inaktiv/gekündigt)
      // Dies ist wichtig, damit der "Abo verwalten" Button angezeigt wird
      try {
        const { data: subscriptionData } = await supabase
          .from('user_access')
          .select('stripe_subscription_id, subscription_status, plan_type')
          .eq('user_id', user.id)
          .not('stripe_subscription_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (subscriptionData && (subscriptionData as any).stripe_subscription_id) {
          // User hat ein Abo (auch wenn inaktiv), setze subscriptionId
          setSubscriptionStatus(prev => ({
            ...prev,
            subscriptionId: (subscriptionData as any).stripe_subscription_id,
            subscriptionStatus: (subscriptionData as any).subscription_status || null,
            plan: (subscriptionData as any).plan_type === 'subscription' ? 'Monatliches Abo' : prev.plan,
            credits: (subscriptionData as any).plan_type === 'subscription' ? 999999 : prev.credits,
            expiresAt: (subscriptionData as any).plan_type === 'subscription' ? null : prev.expiresAt,
          }));
        } else {
          // Keine Subscription-ID in DB gefunden - prüfe direkt in Stripe
          try {
            const checkResponse = await fetch('/api/stripe/check-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id }),
            });
            
            if (checkResponse.ok) {
              const checkData = await checkResponse.json();
              if (checkData.hasSubscription && checkData.subscriptionId) {
                setSubscriptionStatus(prev => ({
                  ...prev,
                  subscriptionId: checkData.subscriptionId,
                  subscriptionStatus: checkData.subscriptionStatus || 'active',
                  plan: 'Monatliches Abo',
                  credits: 999999,
                  expiresAt: null,
                }));
              }
            }
          } catch (checkError) {
            console.error('[loadUserAccess] Error checking Stripe subscription:', checkError);
          }
        }
      } catch (subscriptionError) {
        console.error('[loadUserAccess] Error checking for subscription:', subscriptionError);
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
        
        // Prüfe auch hier nach subscriptionId
        try {
          const { data: subscriptionData } = await supabase
            .from('user_access')
            .select('stripe_subscription_id, subscription_status, plan_type')
            .eq('user_id', user.id)
            .not('stripe_subscription_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (subscriptionData && (subscriptionData as any).stripe_subscription_id) {
            setSubscriptionStatus(prev => ({
              ...prev,
              subscriptionId: (subscriptionData as any).stripe_subscription_id,
              subscriptionStatus: (subscriptionData as any).subscription_status || null,
              plan: (subscriptionData as any).plan_type === 'subscription' ? 'Monatliches Abo' : prev.plan,
              credits: (subscriptionData as any).plan_type === 'subscription' ? 999999 : prev.credits,
              expiresAt: (subscriptionData as any).plan_type === 'subscription' ? null : prev.expiresAt,
            }));
          } else {
            // Keine Subscription-ID in DB gefunden - prüfe direkt in Stripe
            try {
              const checkResponse = await fetch('/api/stripe/check-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
              });
              
              if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                if (checkData.hasSubscription && checkData.subscriptionId) {
                  setSubscriptionStatus(prev => ({
                    ...prev,
                    subscriptionId: checkData.subscriptionId,
                    subscriptionStatus: checkData.subscriptionStatus || 'active',
                    plan: 'Monatliches Abo',
                    credits: 999999,
                    expiresAt: null,
                  }));
                }
              }
            } catch (checkError) {
              console.error('[loadUserAccess] Error checking Stripe subscription in fallback:', checkError);
            }
          }
        } catch (subscriptionError) {
          console.error('[loadUserAccess] Error checking for subscription in fallback:', subscriptionError);
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

  // Ordne pending Ressourcen zu (wenn User eingeloggt ist)
  const assignPendingResources = useCallback(async () => {
    if (!user?.email) return false;

    try {
      const response = await fetch('/api/resources/assign-pending', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.assignedCount > 0) {
          console.log(`Dashboard: Assigned ${data.assignedCount} pending resources`);
          return true; // Ressourcen wurden zugeordnet
        }
      }
      return false;
    } catch (error) {
      console.error('Error assigning pending resources:', error);
      return false;
    }
  }, [user]);

  // Lade Beispiel-Ressource (wie auf /ankommen Seite)
  const loadExampleResource = useCallback(async () => {
    try {
      console.log('[Dashboard] Loading example resource from /api/example-resource');
      
      const response = await fetch('/api/example-resource');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Laden der Beispiel-Ressourcenfigur');
      }

      if (data.success && data.resource) {
        // Konvertiere die Resource zu SavedStory Format für Kompatibilität
        const exampleStory: SavedStory = {
          id: data.resource.id,
          title: data.resource.title,
          content: data.resource.content,
          resource_figure: data.resource.resource_figure,
          question_answers: [],
          audio_url: data.resource.audio_url,
          voice_id: data.resource.voice_id,
          created_at: data.resource.created_at,
          is_audio_only: false,
          client_email: null,
        };
        
        setAnkommenStory(exampleStory);
        console.log('[Dashboard] Example resource loaded successfully:', exampleStory.title);
      } else {
        throw new Error('Beispiel-Ressourcenfigur nicht gefunden');
      }
    } catch (err: any) {
      console.error('[Dashboard] Error fetching example resource:', err);
      setAnkommenStory(null);
    }
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
      // Versuche zuerst pending Ressourcen zuzuordnen
      const resourcesAssigned = await assignPendingResources();
      
      // Wenn Ressourcen zugeordnet wurden, warte kurz bevor wir neu laden
      if (resourcesAssigned) {
        // Kurze Pause, damit die DB-Update abgeschlossen ist
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('poopoo [Dashboard] Fetching stories for user:', user.id);

      const { data, error } = await supabase
        .from('saved_stories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('poopoo [Dashboard] Supabase response:', {
        storiesCount: data?.length,
        error: error?.message
      });

      // Log each story's audio_url
      if (data) {
        console.log('poopoo [Dashboard] Stories audio URLs:');
        data.forEach((story: any, index: number) => {
          console.log(`poopoo [Dashboard] Story ${index + 1}: "${story.title}"`, {
            id: story.id,
            audio_url: story.audio_url,
            voice_id: story.voice_id,
            has_audio: !!story.audio_url,
            created_at: story.created_at
          });
        });
      }

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
          const accessStatusMap: Record<string, { canAccess: boolean; isFirst: boolean; trialExpired: boolean; daysRemaining?: number }> = {};
          const sortedStories = [...uniqueStories].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          
          // Prüfe ob User ein Admin ist (Full-Admin oder Music-Admin)
          const fullAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(Boolean);
          const musicAdminEmails = (process.env.NEXT_PUBLIC_MUSIC_ADMIN_EMAILS || '')
            .split(',')
            .map(e => e.trim().toLowerCase())
            .filter(Boolean);
          const userEmail = user.email?.toLowerCase().trim();
          const isAdminUser = userEmail && (fullAdminEmails.includes(userEmail) || musicAdminEmails.includes(userEmail));
          
          console.log('[Dashboard] Admin check in loadStories:', {
            userEmail,
            fullAdminEmails,
            musicAdminEmails,
            isAdminUser
          });
          
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
          
          // Trenne Audio-only und normale Ressourcen
          const audioOnlyStories = sortedStories.filter(s => s.is_audio_only === true);
          const normalStories = sortedStories.filter(s => !s.is_audio_only);
          
          for (const story of uniqueStories) {
            const isFirst = sortedStories[0].id === story.id;
            const isAudioOnly = story.is_audio_only === true;
            
            // Prüfe ob es die erste normale Ressource ist (ignoriere Audio-only Ressourcen)
            const isFirstNormal = normalStories.length > 0 && normalStories[0].id === story.id;
            
            let canAccess = false;
            let trialExpired = false;
            
            // Admins haben immer Zugriff auf alle Ressourcen
            if (isAdminUser) {
              canAccess = true;
              trialExpired = false;
              console.log(`[Dashboard] Admin user - granting access to story ${story.id}`);
            } else if (userHasActiveAccess) {
              // Wenn User aktiven Zugang hat, kann er immer Audio abspielen
              canAccess = true;
              trialExpired = false;
            } else if (isAudioOnly) {
              // Audio-only Ressourcen: 3 Monate (90 Tage) kostenlos
              const resourceDate = new Date(story.created_at);
              const daysSinceCreation = (Date.now() - resourceDate.getTime()) / (1000 * 60 * 60 * 24);
              const monthsSinceCreation = daysSinceCreation / 30;
              canAccess = monthsSinceCreation < 3;
              trialExpired = monthsSinceCreation >= 3;
              console.log(`[Dashboard] Audio-only resource ${story.id}:`, {
                daysSinceCreation: daysSinceCreation.toFixed(2),
                monthsSinceCreation: monthsSinceCreation.toFixed(2),
                canAccess,
                trialExpired
              });
            } else if (isFirstNormal) {
              // Erste normale Ressource: 3 Tage kostenlos (unabhängig von Audio-only Ressourcen)
              const firstResourceDate = new Date(normalStories[0].created_at);
              const daysSinceFirst = (Date.now() - firstResourceDate.getTime()) / (1000 * 60 * 60 * 24);
              canAccess = daysSinceFirst < 3;
              trialExpired = daysSinceFirst >= 3;
              
              // Berechne verbleibende Tage für Trial
              const daysRemaining = canAccess ? Math.max(0, Math.ceil(3 - daysSinceFirst)) : 0;
              
              console.log(`[Dashboard] First normal resource ${story.id}:`, {
                daysSinceFirst: daysSinceFirst.toFixed(2),
                daysRemaining,
                canAccess,
                trialExpired,
                totalNormalResources: normalStories.length,
                totalAudioOnlyResources: audioOnlyStories.length
              });
              
              accessStatusMap[story.id] = { canAccess, isFirst, trialExpired, daysRemaining };
            } else {
              // Nicht die erste normale Ressource - benötigt aktiven Zugang
              canAccess = false;
              trialExpired = false;
              console.log(`[Dashboard] Not first normal resource ${story.id} - access denied`, {
                storyId: story.id,
                firstNormalResourceId: normalStories.length > 0 ? normalStories[0].id : 'none',
                totalNormalResources: normalStories.length
              });
              
              accessStatusMap[story.id] = { canAccess, isFirst, trialExpired };
            }
          }
          
          setResourceAccessStatus(accessStatusMap);
        }

        setStories(uniqueStories);

        // Note: personalStories is now filtered via useEffect to exclude ankommenStory

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
  }, [user, assignPendingResources]); // calculateUserStats, removeDuplicates, userAccess werden über Closure verwendet

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
        // Parse pronunciation_hint: Format kann sein "AN DI" oder "AN DI|1" oder "AN DI|1|2" oder "AN DI|1|2|true" (mit Betonung, Buchstabenposition und Vokal-Länge)
        if (profileData.pronunciation_hint) {
          const hintParts = profileData.pronunciation_hint.split('|');
          setPronunciationHint(hintParts[0] || '');
          if (hintParts[1]) {
            const stress = parseInt(hintParts[1], 10);
            if (!isNaN(stress) && stress > 0) {
              setPronunciationStress(stress);
            }
          }
          if (hintParts[2]) {
            const stressLetter = parseInt(hintParts[2], 10);
            if (!isNaN(stressLetter) && stressLetter > 0) {
              setPronunciationStressLetter(stressLetter);
            }
          }
          if (hintParts[3]) {
            setPronunciationShortVowel(hintParts[3] === 'true');
          }
        } else {
          setPronunciationHint('');
          setPronunciationStress(1);
          setPronunciationStressLetter(1);
          setPronunciationShortVowel(false);
        }
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

          // Verwende alle relevanten Spalten inkl. audio_url und voice_id
          console.log('poopoo [Dashboard] Preparing to save pending story with audio data');

          const correctData = {
            user_id: user.id,
            title: storyData.selectedFigure.name,
            content: storyData.generatedStory,
            resource_figure: storyData.selectedFigure.name,
            question_answers: Array.isArray(storyData.questionAnswers) ? storyData.questionAnswers : [],
            audio_url: storyData.audioState?.audioUrl || null,
            voice_id: storyData.selectedVoiceId || storyData.audioState?.voiceId || null,
            auto_subtitle: null // Kein auto_subtitle beim ersten Speichern - User kann eigenen Satz eingeben
          };

          console.log('poopoo [Dashboard] Inserting pending story with data:', JSON.stringify({
            user_id: correctData.user_id,
            title: correctData.title,
            content_length: correctData.content?.length,
            audio_url: correctData.audio_url,
            voice_id: correctData.voice_id,
            question_answers_count: correctData.question_answers?.length
          }, null, 2));
          
          const { data, error } :any= await supabase
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
            console.log('poopoo [Dashboard] Pending story saved successfully!', JSON.stringify({
              id: data?.[0]?.id,
              audio_url: data?.[0]?.audio_url,
              voice_id: data?.[0]?.voice_id,
              title: data?.[0]?.title
            }, null, 2));
            
            // Track Resource Creation Event (nur wenn erfolgreich gespeichert)
            if (data && Array.isArray(data) && data.length > 0 && user && session) {
              const savedResource = data[0] as any;
              try {
                await trackEvent({
                  eventType: 'resource_created',
                  storyId: savedResource.id,
                  resourceFigureName: storyData.selectedFigure.name,
                  voiceId: storyData.selectedVoiceId || undefined,
                }, { accessToken: session?.access_token || null });
                console.log('✅ Resource creation event tracked successfully from dashboard');
              } catch (trackError) {
                console.error('❌ Failed to track resource_created event from dashboard:', trackError);
                // Nicht kritisch - Ressource wurde bereits gespeichert
              }
            } else {
              console.warn('⚠️ Cannot track resource_created event from dashboard:', {
                hasData: !!data,
                hasDataArray: !!(data && Array.isArray(data)),
                hasDataItem: !!(data && Array.isArray(data) && data.length > 0),
                hasUser: !!user,
                hasSession: !!session,
                hasAccessToken: !!session?.access_token
              });
            }
            
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
      // Speichere pronunciation_hint mit Betonung im Format "SILBEN|BETONUNG|BUCHSTABENPOSITION|VOKAL_KURZ"
      const pronunciationHintWithStress = pronunciationHint.trim() 
        ? `${pronunciationHint.trim()}|${pronunciationStress}|${pronunciationStressLetter}|${pronunciationShortVowel}`
        : null;
      
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ 
          full_name: fullName, 
          pronunciation_hint: pronunciationHintWithStress 
        })
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
      // Lade Beispiel-Ressource (wie auf /ankommen Seite)
      loadExampleResource();
      
      // Lade Beispiel-Ressourcenfigur Konfiguration (nur für Admins)
      if (isAdmin) {
        fetchExampleResourceConfig();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]); // Nur user und isAdmin als Dependency, um Endlosschleife zu vermeiden

  // Filter personalStories to exclude the ankommenStory (Wohlwollende Präsenz)
  // This ensures the example resource only shows in "Zum Ankommen" section, not in "Meine Power Storys"
  useEffect(() => {
    // Always filter out "Wohlwollende Präsenz" by name/title, regardless of ID
    const filteredStories = stories.filter(story => {
      // Filter by ankommenStory ID if available
      if (ankommenStory && story.id === ankommenStory.id) {
        return false;
      }
      // Also forcefully filter by name "Wohlwollende Präsenz"
      if (story.resource_figure?.name === 'Wohlwollende Präsenz') {
        return false;
      }
      if (story.title === 'Wohlwollende Präsenz') {
        return false;
      }
      return true;
    });
    setPersonalStories(filteredStories);
  }, [stories, ankommenStory]);

  // Lade Beispiel-Ressourcenfigur Konfiguration (nur für Admins)
  const fetchExampleResourceConfig = useCallback(async () => {
    if (!isAdmin || !user) return;
    
    try {
      setExampleResourceLoading(true);
      setExampleResourceError(null);

      const response = await fetch('/api/admin/config');
      const data = await response.json();

      if (response.ok && data.success) {
        if (data.config) {
          setExampleResourceId(data.config.value);
        } else {
          setExampleResourceId("");
        }
      } else {
        throw new Error(data.error || 'Fehler beim Laden der Konfiguration');
      }
    } catch (err: any) {
      console.error('Error fetching example resource config:', err);
      setExampleResourceError(err.message || 'Fehler beim Laden der Konfiguration');
    } finally {
      setExampleResourceLoading(false);
    }
  }, [isAdmin, user]);


  // Speichere Beispiel-Ressourcenfigur (nur für Admins)
  const saveExampleResource = async (resourceId: string) => {
    try {
      setExampleResourceLoading(true);
      setExampleResourceError(null);

      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resourceId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setExampleResourceId(resourceId);
        setExampleResourceError(null);
        setFullNameSuccess('Beispiel-Ressourcenfigur erfolgreich gespeichert!');
        setTimeout(() => setFullNameSuccess(''), 3000);
      } else {
        throw new Error(data.error || 'Fehler beim Speichern');
      }
    } catch (err: any) {
      console.error('Error saving example resource:', err);
      setExampleResourceError(err.message || 'Fehler beim Speichern');
    } finally {
      setExampleResourceLoading(false);
    }
  };

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
      const resourceId = urlParams.get('resource');
      
      // Prüfe ob resource Parameter vorhanden ist (nach Signup/Login oder Admin-Zugriff)
      if (resourceId) {
        console.log('Dashboard: Resource parameter found:', resourceId);
        
        // Wenn Admin: Lade Ressource direkt, auch wenn sie einem anderen User gehört
        if (isAdmin) {
          // Verhindere mehrfaches Laden derselben Ressource
          if (adminResourceLoadingRef.current === resourceId) {
            console.log('Dashboard: Resource already being loaded, skipping');
            return;
          }
          adminResourceLoadingRef.current = resourceId;
          
          console.log('Dashboard: Admin user - loading resource directly');
          // Warte bis loadStories() fertig ist, dann füge die Ressource hinzu
          loadStories().then(() => {
            // Kurze Verzögerung, damit setStories() in loadStories() abgeschlossen ist
            setTimeout(() => {
              fetch(`/api/admin/resources/search?storyId=${resourceId}`, {
                headers: {
                  'Authorization': `Bearer ${session?.access_token || ''}`,
                },
              })
                .then(res => res.json())
                .then(data => {
                  adminResourceLoadingRef.current = null; // Reset nach erfolgreichem Laden
                  if (data.resource) {
                    // Füge Ressource temporär zu stories hinzu (nach loadStories)
                    const tempStory: SavedStory = {
                      id: data.resource.id,
                      title: data.resource.title,
                      content: data.resource.content,
                      resource_figure: data.resource.resource_figure,
                      question_answers: [],
                      audio_url: data.resource.audio_url,
                      is_audio_only: data.resource.is_audio_only,
                      client_email: data.resource.client_email,
                      created_at: data.resource.created_at || new Date().toISOString(),
                    };
                    setStories(prev => {
                      // Prüfe ob Ressource bereits vorhanden ist
                      if (prev.find(s => s.id === tempStory.id)) {
                        console.log('Dashboard: Resource already in stories list');
                        return prev;
                      }
                      console.log('Dashboard: Adding resource to stories list:', tempStory.title);
                      return [tempStory, ...prev];
                    });
                    
                    // Entferne resource Parameter aus URL
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.delete('resource');
                    window.history.replaceState({}, '', newUrl.toString());
                    
                    console.log('Dashboard: Resource loaded successfully for admin');
                  } else {
                    console.error('Dashboard: Resource not found');
                    adminResourceLoadingRef.current = null;
                  }
                })
                .catch(error => {
                  console.error('Dashboard: Error loading resource:', error);
                  adminResourceLoadingRef.current = null;
                });
            }, 500); // Kurze Verzögerung nach loadStories()
          });
        } else {
          // Normale User: Rufe assignPendingResources auf, um die Ressource zuzuordnen
          assignPendingResources().then(() => {
            // Lade Stories neu, um die zugeordnete Ressource anzuzeigen
            loadStories().then(() => {
              // Entferne resource Parameter aus URL
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('resource');
              window.history.replaceState({}, '', newUrl.toString());
              
              // Zeige Erfolgsmeldung
              console.log('Dashboard: Resource assigned successfully');
            });
          });
        }
      }
      
      // Nach erfolgreicher Zahlung: Zugangsstatus neu laden
      if (paymentSuccess) {
        // WICHTIG: Prüfe ob bereits geprüft wurde, um mehrfache Ausführung zu vermeiden
        const paymentCheckKey = `payment_checked_${sessionId || 'unknown'}`;
        if (typeof window !== 'undefined' && sessionStorage.getItem(paymentCheckKey)) {
          console.log('Dashboard: Payment already checked, skipping...');
          // Entferne URL-Parameter sofort, um erneute Ausführung zu verhindern
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('payment');
          newUrl.searchParams.delete('session_id');
          window.history.replaceState({}, '', newUrl.toString());
          return;
        }
        
        // Markiere als geprüft SOFORT, bevor wir etwas anderes tun
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(paymentCheckKey, 'true');
          // Entferne URL-Parameter sofort, um erneute Ausführung zu verhindern
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete('payment');
          newUrl.searchParams.delete('session_id');
          window.history.replaceState({}, '', newUrl.toString());
        }
        
        console.log('Dashboard: Payment successful, checking access status', { sessionId });
        // Warte kurz, damit Webhook Zeit hat, den Zugang zu erstellen
        // Versuche mehrmals, falls Webhook noch nicht verarbeitet wurde
        let retryCount = 0;
        const maxRetries = 6; // Reduziert von 10 auf 6 (12 Sekunden statt 20)
        const retryDelay = 2000; // 2 Sekunden
        let alertShown = false; // Verhindere mehrfache Alerts
        let storiesLoaded = false; // Verhindere mehrfaches Laden von Stories
        
        const checkAccess = async () => {
          console.log(`Dashboard: Checking access (attempt ${retryCount + 1}/${maxRetries})`);
          
          // Lade UserAccess nur einmal am Anfang, nicht bei jedem Retry
          if (retryCount === 0) {
            await loadUserAccess();
          }
          
          // Prüfe ob Zugang jetzt aktiv ist (ohne Stories zu laden)
          const hasAccess = await hasActiveAccess(user.id);
          console.log('Dashboard: Access check result:', hasAccess);
          
          if (hasAccess) {
            // Zugang aktiv - lade Stories nur einmal
            if (!storiesLoaded) {
              storiesLoaded = true;
              await loadStories();
            }
            
            // Erfolgsmeldung nur einmal anzeigen
            if (!alertShown) {
              alertShown = true;
              setPaymentSuccessMessage('Dein Zugang wurde aktiviert! Du kannst jetzt unbegrenzt Ressourcen erstellen.');
              setShowPaymentSuccess(true);
            }
            // Stoppe Retry-Loop, da Zugang aktiv ist
            return;
          } else if (retryCount < maxRetries - 1) {
            // Noch kein Zugang - versuche es erneut (ohne Stories zu laden)
            retryCount++;
            setTimeout(checkAccess, retryDelay);
          } else {
            // Nach mehreren Versuchen immer noch kein Zugang
            console.warn('Dashboard: Access not activated after payment. Webhook may have failed or is still processing.');
            // Lade Stories einmal am Ende, auch wenn kein Zugang aktiv ist
            if (!storiesLoaded) {
              await loadStories();
            }
            if (!alertShown) {
              alertShown = true;
              setPaymentSuccessMessage('Zahlung erfolgreich! Der Zugang wird in Kürze aktiviert. Bitte lade die Seite in ein paar Minuten neu.');
              setShowPaymentSuccess(true);
            }
          }
        };
        
        // Starte erste Prüfung nach 2 Sekunden (Webhook sollte schnell sein)
        setTimeout(checkAccess, 2000);
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
      
      // payment Parameter wird bereits oben entfernt, hier nicht nochmal entfernen
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

  // Initialize audio metadata for all stories when audioElements change
  useEffect(() => {
    Object.entries(audioElements).forEach(([storyId, audio]) => {
      if (audio.duration && isFinite(audio.duration)) {
        setAudioDuration(prev => {
          // Only update if not already set
          if (!prev[storyId] || prev[storyId] !== audio.duration) {
            return { ...prev, [storyId]: audio.duration };
          }
          return prev;
        });
      }
    });
  }, [audioElements]);



  const deleteStory = async (storyId: string) => {
    // Prüfe ob es die erste Story ist
    if (personalStories.length <= 1) {
      console.warn('Cannot delete the first story');
      return;
    }

    try {
      const { error } = await supabase
        .from('saved_stories')
        .delete()
        .eq('id', storyId);

      if (error) {
        console.error('Error deleting story:', error);
        alert('Fehler beim Löschen der Power Story');
      } else {
        // Aktualisiere die lokale Liste
        setStories(stories.filter(story => story.id !== storyId));
        setPersonalStories(personalStories.filter(story => story.id !== storyId));
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

  const saveSubtitle = async (storyId: string, customSubtitle: string | null) => {
    try {
      const updateData = {
        custom_subtitle: customSubtitle
      };

      console.log('[saveSubtitle] Updating story:', { storyId, customSubtitle, updateData });

      const { data, error } = await (supabase as any)
        .from('saved_stories')
        .update(updateData)
        .eq('id', storyId)
        .select();

      if (error) {
        console.error('[saveSubtitle] Supabase error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        });
        
        // Prüfe ob die Spalte möglicherweise nicht existiert
        if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
          console.warn('[saveSubtitle] Column custom_subtitle might not exist. Please run the migration: supabase-subtitle-migration.sql');
          // Fallback: Aktualisiere nur lokal, ohne Datenbank-Update
          setStories(stories.map(story => 
            story.id === storyId 
              ? { ...story, custom_subtitle: customSubtitle }
              : story
          ));
          setPersonalStories(personalStories.map(story => 
            story.id === storyId 
              ? { ...story, custom_subtitle: customSubtitle }
              : story
          ));
          return; // Erfolgreich lokal aktualisiert, kein Fehler werfen
        }
        
        throw error;
      }

      console.log('[saveSubtitle] Success:', data);

      // Aktualisiere die lokale Liste
      setStories(stories.map(story => 
        story.id === storyId 
          ? { ...story, custom_subtitle: customSubtitle }
          : story
      ));
      setPersonalStories(personalStories.map(story => 
        story.id === storyId 
          ? { ...story, custom_subtitle: customSubtitle }
          : story
      ));
    } catch (err: any) {
      console.error('[saveSubtitle] Unexpected error:', {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        stack: err?.stack,
        fullError: err
      });
      throw err;
    }
  };

  // Hilfsfunktion: Gibt den anzuzeigenden Untertitel zurück (customSubtitle wenn vorhanden, sonst autoSubtitle)
  const getDisplaySubtitle = (story: SavedStory): string | null => {
    return story.custom_subtitle || story.auto_subtitle || null;
  };

  const saveTitle = async (storyId: string, newTitle: string) => {
    try {
      const { error } = await (supabase as any)
        .from('saved_stories')
        .update({ title: newTitle })
        .eq('id', storyId);

      if (error) {
        console.error('[saveTitle] Error:', error);
        throw error;
      }

      // Aktualisiere die lokale Liste
      setStories(stories.map(story => 
        story.id === storyId 
          ? { ...story, title: newTitle }
          : story
      ));
      setPersonalStories(personalStories.map(story => 
        story.id === storyId 
          ? { ...story, title: newTitle }
          : story
      ));
    } catch (err) {
      console.error('[saveTitle] Unexpected error:', err);
      throw err;
    }
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

  // Download-Funktion entfernt - Streaming only für bessere Kundenbindung
  const downloadAudio = async (story: SavedStory) => {
    // Downloads sind deaktiviert - nur Streaming verfügbar
    alert('Downloads sind aktuell nicht verfügbar. Bitte nutze das Streaming-Feature.');
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

  // Hilfsfunktion zum Setzen der Lautstärke (unterstützt Web Audio API für iOS)
  const setMusicVolume = useCallback((musicAudio: HTMLAudioElement, volume: number) => {
    if ((musicAudio as any)._useWebAudio && (musicAudio as any)._gainNode) {
      // iOS (Safari & Chrome): Verwende Web Audio API GainNode
      try {
        const gainNode = (musicAudio as any)._gainNode;
        const audioContext = (musicAudio as any)._audioContext;
        
        // Stelle sicher, dass AudioContext aktiv ist
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().catch((err: any) => {
            console.warn('[setMusicVolume] Failed to resume AudioContext:', err);
          });
        }
        
        gainNode.gain.value = volume;
      } catch (error) {
        console.warn('[setMusicVolume] Failed to set volume via GainNode, falling back to HTMLAudioElement:', error);
        musicAudio.volume = volume;
      }
    } else {
      // Android/Desktop: Verwende normale volume Property
      musicAudio.volume = volume;
    }
  }, []);

  // Hilfsfunktion zum Abrufen der aktuellen Lautstärke
  const getMusicVolume = useCallback((musicAudio: HTMLAudioElement): number => {
    if ((musicAudio as any)._useWebAudio && (musicAudio as any)._gainNode) {
      // iOS: Verwende Web Audio API GainNode
      return (musicAudio as any)._gainNode.gain.value;
    } else {
      // Android/Desktop: Verwende normale volume Property
      return musicAudio.volume;
    }
  }, []);

  // Fade-Out-Funktion für Hintergrundmusik
  const fadeOutMusic = useCallback((musicAudio: HTMLAudioElement | null | undefined, storyId: string, duration: number = 2000) => {
    if (!musicAudio) {
      console.warn(`[fadeOutMusic] No music audio element found for story ${storyId}`);
      return;
    }
    
    // Stoppe vorheriges Fade-Out-Interval falls vorhanden
    if ((musicAudio as any)._fadeOutInterval) {
      clearInterval((musicAudio as any)._fadeOutInterval);
      (musicAudio as any)._fadeOutInterval = null;
    }
    
    // Fade-Out mit volume (konsistente Methode für alle User)
    const startVolume = getMusicVolume(musicAudio);
    const fadeOutInterval = 50; // Update alle 50ms
    const steps = duration / fadeOutInterval;
    const volumeStep = startVolume / steps;
    let currentStep = 0;
    
    console.log(`[fadeOutMusic] Starting fade-out for story ${storyId}, duration: ${duration}ms, startVolume: ${startVolume}`);
    
    const fadeInterval = setInterval(() => {
      if (!musicAudio || musicAudio.paused) {
        clearInterval(fadeInterval);
        (musicAudio as any)._fadeOutInterval = null;
        console.log(`[fadeOutMusic] Music already paused, stopping fade-out`);
        return;
      }
      
      currentStep++;
      const newVolume = Math.max(0, startVolume - (volumeStep * currentStep));
      setMusicVolume(musicAudio, newVolume);
      
      if (currentStep >= steps || newVolume <= 0) {
        clearInterval(fadeInterval);
        (musicAudio as any)._fadeOutInterval = null;
        musicAudio.pause();
        musicAudio.currentTime = 0;
        // Verwende die ursprüngliche track-spezifische Lautstärke statt DEFAULT_MUSIC_VOLUME
        const originalVolume = (musicAudio as any)._originalVolume || DEFAULT_MUSIC_VOLUME;
        setMusicVolume(musicAudio, originalVolume);
        console.log(`[fadeOutMusic] Fade-out completed for story ${storyId}, reset volume to ${originalVolume * 100}%`);
      }
    }, fadeOutInterval);
    
    // Speichere Interval-Referenz für späteres Cleanup
    (musicAudio as any)._fadeOutInterval = fadeInterval;
  }, [setMusicVolume, getMusicVolume]);

  const playAudio = useCallback(async (audioUrl: string, storyId: string) => {
    // VALIDIERUNG: Prüfe ob audioUrl gültig ist
    if (!audioUrl || audioUrl.trim() === '') {
      console.error(`[playAudio] Invalid audioUrl for story ${storyId}:`, audioUrl);
      alert('Fehler: Audio-URL ist ungültig. Bitte kontaktiere den Support.');
      return;
    }
    
    // Prüfe ob URL ein gültiges Format hat
    const isValidUrl = audioUrl.startsWith('http://') || audioUrl.startsWith('https://') || audioUrl.startsWith('blob:') || audioUrl.startsWith('data:');
    if (!isValidUrl) {
      console.error(`[playAudio] Invalid audio URL format for story ${storyId}:`, audioUrl);
      alert('Fehler: Audio-URL hat ein ungültiges Format. Bitte kontaktiere den Support.');
      return;
    }
    
    console.log(`[playAudio] ===== STARTING PLAYBACK =====`);
    console.log(`[playAudio] Story ID: ${storyId}`);
    console.log(`[playAudio] Audio URL: ${audioUrl}`);
    
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
    
    // Stoppe alle anderen Hintergrundmusik-Tracks
    Object.entries(backgroundMusicElements).forEach(([id, music]) => {
      if (id !== storyId) {
        // Entferne pause-Event-Listener vor dem Stoppen
        if ((music as any)._pauseHandler) {
          // Entferne alle iOS Event-Listener
          if ((music as any)._pauseHandler) {
            music.removeEventListener('pause', (music as any)._pauseHandler);
            music.removeEventListener('suspend', (music as any)._pauseHandler);
          }
          if ((music as any)._timeupdateHandler) {
            music.removeEventListener('timeupdate', (music as any)._timeupdateHandler);
          }
        }
        music.pause();
        music.currentTime = 0;
      }
    });
    
    // Finde Story für Tracking und Musik-Auswahl
    const story = stories.find(s => s.id === storyId);
    
    // Hole Figur-ID oder Name für Hintergrundmusik
    // resource_figure kann ein String (Name) oder ein Objekt mit id/name sein
    let figureIdOrName: string | undefined;
    if (typeof story?.resource_figure === 'string') {
      figureIdOrName = story.resource_figure; // Name z.B. "Lilith"
    } else if (story?.resource_figure?.id) {
      figureIdOrName = story.resource_figure.id; // ID z.B. "lilith"
    } else if (story?.resource_figure?.name) {
      figureIdOrName = story.resource_figure.name; // Name als Fallback
    }
    
    // Hole Hintergrundmusik-URL für diese Figur (unterstützt ID und Name)
    const musicTrack = await getBackgroundMusicTrack(figureIdOrName);
    const musicUrl = musicTrack?.track_url || null;
    const musicVolume = musicTrack?.volume || DEFAULT_MUSIC_VOLUME;
    
    // Nur loggen wenn Musik gefunden wurde (für Debugging)
    if (musicUrl) {
      console.log(`[playAudio] Background music found for ${figureIdOrName}:`, { musicUrl, musicVolume });
    }
    
      // Erstelle oder verwende existierendes Audio-Element
      let audio = audioElements[storyId];
      if (!audio) {
        console.log(`[playAudio] Creating new audio element for story ${storyId}`);
        audio = new Audio();
        audio.preload = 'auto';
        audio.volume = 1.0; // Stelle sicher, dass Stimme immer auf 100% ist
        
        // iOS: Konfiguriere Audio-Session für Hintergrundwiedergabe
        if (typeof window !== 'undefined' && 'audioSession' in navigator) {
          try {
            (navigator as any).audioSession.type = 'playback';
            console.log('[playAudio] iOS AudioSession configured for background playback');
          } catch (error) {
            console.warn('[playAudio] Failed to configure AudioSession:', error);
          }
        }
        
        // Überwache Lautstärke und stelle sicher, dass sie immer auf 100% bleibt
        const volumeCheckInterval = setInterval(() => {
          if (audio && audio.volume !== 1.0) {
            console.warn(`[playAudio] Voice volume was ${audio.volume}, resetting to 1.0`);
            audio.volume = 1.0;
          }
        }, 100); // Prüfe alle 100ms
        
        // Cleanup beim Pausieren/Stoppen
        audio.addEventListener('pause', () => {
          clearInterval(volumeCheckInterval);
        }, { once: true });
        
        audio.addEventListener('ended', () => {
          clearInterval(volumeCheckInterval);
        }, { once: true });
        
        // Speichere Interval-Referenz für späteres Cleanup
        (audio as any)._volumeCheckInterval = volumeCheckInterval;
        
        setAudioElements(prev => ({ ...prev, [storyId]: audio }));

      // Funktion zum Stoppen der Musik (wird sowohl von 'ended' als auch von Polling verwendet)
      const stopMusicForStory = () => {
        console.log(`[playAudio] Stopping music for story ${storyId}`);
        setPlayingAudioId(null);

        // Reset seekbar to beginning when audio ends
        setAudioCurrentTime(prev => ({ ...prev, [storyId]: 0 }));

        // Lasse Hintergrundmusik weiterlaufen bis zum Ende (Musik spielt weiter, auch wenn Stimme endet)
        setBackgroundMusicElements(prev => {
          const musicAudio = prev[storyId];
          if (musicAudio) {
            // Deaktiviere Loop, damit Musik nach dem Ende stoppt (nicht endlos wiederholt)
            musicAudio.loop = false;
            console.log(`[playAudio] Voice audio ended - background music continues playing until track ends`);
          }
          return prev;
        });
      };
      
      audio.addEventListener('ended', stopMusicForStory);
      
      // Polling-Mechanismus für den Fall, dass 'ended' Event nicht feuert (z.B. wenn Tab im Hintergrund ist)
      const checkAudioEnded = setInterval(() => {
        if (audio.ended) {
          clearInterval(checkAudioEnded);
          stopMusicForStory();
        }
      }, 500); // Prüfe alle 500ms
      
      // Speichere Interval-Referenz für späteres Cleanup
      (audio as any)._endedCheckInterval = checkAudioEnded;
      
      // Cleanup: Stoppe Polling wenn Audio-Element endet
      audio.addEventListener('ended', () => {
        if ((audio as any)._endedCheckInterval) {
          clearInterval((audio as any)._endedCheckInterval);
          (audio as any)._endedCheckInterval = null;
        }
      }, { once: true });
      
      // Track vollständigen Audio-Play (nur wenn User eingeloggt ist UND eine gültige Session hat)
      audio.addEventListener('ended', () => {
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
      }, { once: true });
      
      audio.addEventListener('error', (e) => {
        const error = audio.error;
        // Prüfe ob Audio noch im Loading-Prozess ist (readyState 0 oder 1)
        // Ignoriere Fehler während des Ladens, da diese vom Promise-Handler behandelt werden
        const isDuringLoading = (audio.readyState === 0 || audio.readyState === 1) && 
                                (error?.code === 4 || error?.code === undefined);
        
        // Ignoriere temporäre Loading-Fehler (werden von onError im Promise behandelt)
        if (isDuringLoading) {
          // Temporärer Loading-Fehler - wird ignoriert, da onError im Promise ihn behandelt
          return;
        }
        
        // Echter Fehler - nur loggen wenn Audio nicht erfolgreich geladen wurde
        if (audio.readyState < 2) {
          setPlayingAudioId(null);
        console.error('Audio playback error:', {
          code: error?.code,
          message: error?.message,
          storyId,
            audioUrl,
            readyState: audio.readyState,
            networkState: audio.networkState
          });
        } else {
          // Audio wurde bereits erfolgreich geladen, Fehler kann ignoriert werden
          console.warn('Audio error after successful load (ignoring):', {
            code: error?.code,
            message: error?.message,
            storyId,
            readyState: audio.readyState
          });
          return; // Keine weitere Behandlung nötig
        }
        
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
      
      // VALIDIERUNG: Prüfe ob URL gültig ist bevor wir sie setzen
      if (!audioUrl || audioUrl.trim() === '') {
        console.error(`[playAudio] Cannot set audio src: URL is empty for story ${storyId}`);
        alert('Fehler: Audio-URL ist leer. Bitte kontaktiere den Support.');
        setPlayingAudioId(null);
        return;
      }
      
      const isValidUrl = audioUrl.startsWith('http://') || audioUrl.startsWith('https://') || audioUrl.startsWith('blob:') || audioUrl.startsWith('data:');
      if (!isValidUrl) {
        console.error(`[playAudio] Cannot set audio src: Invalid URL format for story ${storyId}:`, audioUrl);
        alert('Fehler: Audio-URL hat ein ungültiges Format. Bitte kontaktiere den Support.');
        setPlayingAudioId(null);
        return;
      }
      
      // DEBUG: Prüfe ob Datei über HTTP erreichbar ist (nur für Diagnose)
      try {
        const testResponse = await fetch(audioUrl, { method: 'HEAD', cache: 'no-cache' });
        console.log(`[playAudio] HTTP HEAD request for audio URL:`, {
          url: audioUrl,
          status: testResponse.status,
          statusText: testResponse.statusText,
          contentType: testResponse.headers.get('content-type'),
          contentLength: testResponse.headers.get('content-length'),
          accessible: testResponse.ok
        });
        
        if (!testResponse.ok) {
          console.warn(`[playAudio] Audio file not accessible via HTTP HEAD: ${testResponse.status} ${testResponse.statusText}`);
        }
      } catch (fetchError: any) {
        console.warn(`[playAudio] HTTP HEAD request failed (may be CORS issue):`, fetchError.message);
        // CORS-Fehler sind normal bei HEAD-Requests, nicht kritisch
      }
      
      // DEBUG: Logge Browser-Informationen für Diagnose
      console.log(`[playAudio] Browser/Device info for debugging:`, {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        audioUrl: audioUrl
      });
      
      // Setze crossOrigin für CORS
      newAudio.crossOrigin = 'anonymous';
      
      // Setze URL explizit
      newAudio.src = audioUrl;
      
      // WICHTIG: Rufe load() auf, um das Laden zu starten
      // Das ist besonders wichtig für einige Browser
      try {
        newAudio.load();
      } catch (loadError: any) {
        console.warn(`[playAudio] load() call failed (may be normal):`, loadError.message);
      }
      
      // DEBUG: Prüfe Audio-Element nach src-Setzung und load()
      setTimeout(() => {
        console.log(`[playAudio] Audio element after src set and load():`, {
          src: newAudio.src,
          currentSrc: newAudio.currentSrc,
          networkState: newAudio.networkState,
          readyState: newAudio.readyState,
          error: newAudio.error ? {
            code: newAudio.error.code,
            message: newAudio.error.message
          } : null
        });
        
        // FALLBACK: Wenn currentSrc immer noch leer ist, versuche Blob-URL
        if (!newAudio.currentSrc && newAudio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
          console.warn(`[playAudio] Audio element has no currentSrc after load(), trying blob fallback for story ${storyId}`);
          
          // Lade Datei als Blob und erstelle Blob-URL
          fetch(audioUrl, { mode: 'cors', cache: 'no-cache' })
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              return response.blob();
            })
            .then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              console.log(`[playAudio] Created blob URL for fallback:`, blobUrl);
              newAudio.src = blobUrl;
              newAudio.crossOrigin = null; // Blob-URLs brauchen kein CORS
              newAudio.load(); // Lade neu mit Blob-URL
            })
            .catch(error => {
              console.error(`[playAudio] Blob fallback failed for story ${storyId}:`, error);
            });
        }
      }, 200); // Prüfe nach 200ms
      
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
      // HINWEIS: timeupdate-Listener für Seekbar wird später hinzugefügt (nach needsNewSource-Check)
      // um sicherzustellen, dass er am finalen Audio-Element angehängt wird

      newAudio.addEventListener('ended', () => {
        console.log(`[playAudio] Audio ended for story ${storyId} (newAudio)`);
        setPlayingAudioId(null);

        // Lasse Hintergrundmusik weiterlaufen bis zum Ende (Musik spielt weiter, auch wenn Stimme endet)
        setBackgroundMusicElements(prev => {
          const musicAudio = prev[storyId];
          if (musicAudio) {
            // Deaktiviere Loop, damit Musik nach dem Ende stoppt (nicht endlos wiederholt)
            musicAudio.loop = false;
            console.log(`[playAudio] Voice audio ended - background music continues playing until track ends`);
          }
          return prev;
        });
        
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
          // timeoutId wird später zugewiesen, daher let (nicht const)
          // eslint-disable-next-line prefer-const
          let timeoutId: NodeJS.Timeout | undefined;
          
          // Basis cleanup-Funktion
          let cleanup = (timeoutIdToClear?: NodeJS.Timeout) => {
            if (timeoutIdToClear) {
              clearTimeout(timeoutIdToClear);
            }
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onCanPlay);
            audio.removeEventListener('error', onError); // Wichtig: auch entfernen wenn nicht once:true
            audio.removeEventListener('loadstart', onLoadStart);
            audio.removeEventListener('emptied', checkNetworkState);
          };
          
          const onCanPlay = () => {
            if (resolved) return;
            resolved = true;
            cleanup(timeoutId);
            resolve();
          };
          
          const onError = (e: Event) => {
            if (resolved) return;
            const error = audio.error;
            const networkState = audio.networkState;
            
            // NETWORK_NO_SOURCE (3) bedeutet definitiv, dass die Datei nicht geladen werden kann
            // Versuche Blob-Fallback bevor wir aufgeben
            if (networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
              // Versuche Blob-Fallback wenn noch nicht verwendet
              if (!audio.src.startsWith('blob:')) {
                console.warn(`[playAudio] Audio source not found (NETWORK_NO_SOURCE), trying blob fallback for story ${storyId}:`, {
                  code: error?.code,
                  message: error?.message,
                  readyState: audio.readyState,
                  networkState: networkState,
                  audioSrc: audio.src,
                  audioUrl: audioUrl
                });
                
                // Versuche Blob-Fallback
                fetch(audioUrl, { mode: 'cors', cache: 'no-cache' })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error(`HTTP ${response.status}`);
                    }
                    return response.blob();
                  })
                  .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    console.log(`[playAudio] Created blob URL for NETWORK_NO_SOURCE fallback:`, blobUrl);
                    audio.src = blobUrl;
                    audio.crossOrigin = null; // Blob-URLs brauchen kein CORS
                    audio.load(); // Lade neu mit Blob-URL
                    // Nicht rejecten - warte auf canplay mit Blob-URL
                  })
                  .catch(fetchError => {
                    console.error(`[playAudio] Audio blob fallback failed for NETWORK_NO_SOURCE:`, fetchError);
                    // Blob-Fallback fehlgeschlagen - jetzt wirklich rejecten
            resolved = true;
            cleanup(timeoutId);
                    
                    // Prüfe spezifische Fehlertypen
                    if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 
                        error?.message?.includes('Format error') ||
                        error?.message?.includes('Failed to load because no supported source was found')) {
                      reject(new Error(`Audio-Format wird nicht unterstützt oder Datei ist nicht zugänglich. Bitte prüfe die Datei in Supabase Storage. URL: ${audioUrl}`));
                    } else {
                      reject(new Error(`Audio-Datei konnte nicht gefunden werden oder ist nicht zugänglich. Bitte prüfe die Datei in Supabase Storage. URL: ${audioUrl}`));
                    }
                  });
                return; // Warte auf Blob-Fallback
              } else {
                // NETWORK_NO_SOURCE mit Blob-URL - Datei ist wirklich nicht zugänglich
                resolved = true;
                cleanup(timeoutId);
                console.error(`[playAudio] Audio source not found (NETWORK_NO_SOURCE) even with blob URL for story ${storyId}:`, {
                  code: error?.code,
                  message: error?.message,
                  readyState: audio.readyState,
                  networkState: networkState,
                  audioSrc: audio.src,
                  audioUrl: audioUrl
                });
                
                // Prüfe spezifische Fehlertypen
                if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 
                    error?.message?.includes('Format error') ||
                    error?.message?.includes('Failed to load because no supported source was found')) {
                  reject(new Error(`Audio-Format wird nicht unterstützt oder Datei ist nicht zugänglich. Bitte prüfe die Datei in Supabase Storage. URL: ${audioUrl}`));
                } else {
                  reject(new Error(`Audio-Datei konnte nicht gefunden werden oder ist nicht zugänglich. Bitte prüfe die Datei in Supabase Storage. URL: ${audioUrl}`));
                }
                return;
              }
            }
            
            const isDuringLoading = error?.code === 4 && (audio.readyState === 0 || audio.readyState === 1);
            
            // Prüfe ob es ein echter Fehler ist (nicht nur ein Loading-Event)
            // Error-Code 4 = MEDIA_ELEMENT_ERROR, aber das kann auch während des Ladens auftreten
            if (isDuringLoading && networkState !== HTMLMediaElement.NETWORK_NO_SOURCE) {
              // Audio ist noch im Loading-Zustand - warte auf canplay event
              // Logge nur als debug, nicht als error
              console.log(`[playAudio] Audio error during loading (ignoring, waiting for canplay) for story ${storyId}:`, {
                code: error?.code,
                message: error?.message,
                readyState: audio.readyState,
                networkState: networkState,
                audioSrc: audio.src,
                audioUrl: audioUrl
              });
              // Nicht rejecten - warte auf canplay
              return;
            }
            
            // Prüfe ob es ein Format-Fehler ist
            const isFormatError = error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || 
                                 error?.message?.includes('FFmpegDemuxer') ||
                                 error?.message?.includes('DEMUXER_ERROR') ||
                                 error?.message?.includes('Format error') ||
                                 error?.message?.includes('Failed to load because no supported source was found');
            
            if (isFormatError) {
              // Format-Fehler - versuche Blob-URL-Fallback wenn noch nicht verwendet
              if (!audio.src.startsWith('blob:')) {
                console.warn(`[playAudio] Audio format error with direct URL, trying blob fallback for story ${storyId}:`, {
                  code: error?.code,
                  message: error?.message,
                  audioSrc: audio.src,
                  audioUrl: audioUrl
                });
                
                // Versuche Blob-Fallback
                fetch(audioUrl, { mode: 'cors', cache: 'no-cache' })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error(`HTTP ${response.status}`);
                    }
                    return response.blob();
                  })
                  .then(blob => {
                    const blobUrl = URL.createObjectURL(blob);
                    console.log(`[playAudio] Created blob URL for audio error fallback:`, blobUrl);
                    audio.src = blobUrl;
                    audio.crossOrigin = null; // Blob-URLs brauchen kein CORS
                    audio.load(); // Lade neu mit Blob-URL
                    // Nicht rejecten - warte auf canplay mit Blob-URL
                  })
                  .catch(fetchError => {
                    console.error(`[playAudio] Audio blob fallback failed for story ${storyId}:`, fetchError);
                    // Blob-Fallback fehlgeschlagen - jetzt wirklich rejecten
                    resolved = true;
                    cleanup(timeoutId);
                    reject(new Error(`Audio-Format wird nicht unterstützt oder Datei ist beschädigt. URL: ${audioUrl}`));
                  });
                return; // Warte auf Blob-Fallback
              } else {
                // Format-Fehler mit Blob-URL - Datei ist möglicherweise beschädigt
                resolved = true;
                cleanup(timeoutId);
                console.error(`[playAudio] Audio format error even with blob URL - file may be corrupted for story ${storyId}:`, {
                  code: error?.code,
                  message: error?.message,
                  readyState: audio.readyState,
                  networkState: networkState,
                  audioSrc: audio.src,
                  audioUrl: audioUrl
                });
                reject(new Error(`Audio-Format wird nicht unterstützt oder Datei ist beschädigt. URL: ${audioUrl}`));
                return;
              }
            }
            
            // Echter Fehler - reject
            resolved = true;
            cleanup(timeoutId);
            console.error(`[playAudio] Audio error during load for story ${storyId}:`, {
              code: error?.code,
              message: error?.message,
              readyState: audio.readyState,
              networkState: networkState,
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
          
          // DEBUG: Logge Browser-Informationen für Diagnose
          console.log(`[playAudio] Browser/Device info for debugging:`, {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            vendor: navigator.vendor,
            language: navigator.language,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            audioUrl: audioUrl
          });
          
          // Überwache networkState Änderungen (wichtig für frühe Erkennung von NETWORK_NO_SOURCE)
          const checkNetworkState = () => {
            if (audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE && !resolved) {
              // Prüfe ob Audio bereits geladen ist oder im Loading-Prozess
              // Wenn readyState > 0 oder currentSrc gesetzt ist, ist es kein echter Fehler
              if (audio.readyState > 0 || audio.currentSrc) {
                // Audio ist im Loading-Prozess, kein echter Fehler
                return;
              }
              
              // Prüfe ob es ein echter Fehler ist (nur wenn auch ein Error-Objekt vorhanden ist)
              if (audio.error) {
                console.warn(`[playAudio] Network state is NETWORK_NO_SOURCE for story ${storyId}`, {
                  readyState: audio.readyState,
                  networkState: audio.networkState,
                  currentSrc: audio.currentSrc,
                  audioSrc: audio.src,
                  audioUrl: audioUrl,
                  error: audio.error ? {
                    code: audio.error.code,
                    message: audio.error.message
                  } : null
                });
                // Trigger error handler nur wenn es ein echter Fehler ist
                onError(new Event('error'));
              }
            }
          };
          
          // Prüfe networkState regelmäßig während des Ladens
          const networkStateCheckInterval = setInterval(() => {
            if (resolved) {
              clearInterval(networkStateCheckInterval);
              return;
            }
            checkNetworkState();
          }, 500); // Prüfe alle 500ms
          
          // Cleanup für networkState-Check
          const originalCleanup = cleanup;
          cleanup = (timeoutIdToClear?: NodeJS.Timeout) => {
            clearInterval(networkStateCheckInterval);
            originalCleanup(timeoutIdToClear);
          };
          
          audio.addEventListener('canplay', onCanPlay, { once: true });
          audio.addEventListener('canplaythrough', onCanPlay, { once: true }); // Auch auf canplaythrough warten
          // Error-Handler nicht als once:true, da wir Loading-Fehler ignorieren wollen
          audio.addEventListener('error', onError);
          audio.addEventListener('loadstart', onLoadStart, { once: true });
          audio.addEventListener('emptied', checkNetworkState); // Wird ausgelöst wenn networkState zu NO_SOURCE wechselt
          
          // Timeout nach 15 Sekunden (länger für langsamere Verbindungen)
          timeoutId = setTimeout(() => {
            if (resolved) return;
            resolved = true;
            cleanup(timeoutId);
            
            const errorDetails = {
              readyState: audio.readyState,
              audioSrc: audio.src,
              audioUrl: audioUrl,
              networkState: audio.networkState,
              error: audio.error ? {
                code: audio.error.code,
                message: audio.error.message
              } : null
            };
            
            console.error(`[playAudio] Timeout: Audio did not load within 15 seconds for story ${storyId}`, errorDetails);
            
            // Prüfe ob es ein Format-Fehler ist
            if (audio.error && audio.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
              reject(new Error(`Audio-Format wird nicht unterstützt. URL: ${audioUrl}`));
            } else if (audio.error && audio.error.code === MediaError.MEDIA_ERR_NETWORK) {
              reject(new Error(`Netzwerkfehler beim Laden des Audios. URL: ${audioUrl}`));
            } else {
              reject(new Error(`Audio-Laden hat zu lange gedauert. URL: ${audioUrl}`));
            }
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

    // Stelle sicher, dass Event-Listener für Seekbar immer vorhanden sind
    // Dieser Code muss NACH dem needsNewSource-Check kommen, damit die Listener
    // am finalen audio-Element (nicht an einem temporären) angehängt werden
    // Nur neu hinzufügen wenn sie noch nicht existieren oder wenn sich die Story-ID geändert hat
    const needsNewListeners = !(audio as any)._seekbarListenersAttached || (audio as any)._lastStoryId !== storyId;

    if (needsNewListeners) {
      // Entferne alte Listener zuerst, um Duplikate zu vermeiden
      if ((audio as any)._timeupdateHandler) {
        audio.removeEventListener('timeupdate', (audio as any)._timeupdateHandler);
      }
      if ((audio as any)._metadataHandler) {
        audio.removeEventListener('loadedmetadata', (audio as any)._metadataHandler);
      }

      // Füge neue Event-Listener hinzu
      const timeupdateHandler = () => {
        // Update current time for seekbar
        setAudioCurrentTime(prev => ({ ...prev, [storyId]: audio.currentTime }));

        // Kein Fade-out - Musik spielt bis zum Ende weiter (auch wenn Stimme endet)
      };
      const metadataHandler = () => {
        setAudioDuration(prev => ({ ...prev, [storyId]: audio.duration }));
      };

      audio.addEventListener('timeupdate', timeupdateHandler);
      audio.addEventListener('loadedmetadata', metadataHandler);

      // Speichere Referenzen für späteres Cleanup
      (audio as any)._timeupdateHandler = timeupdateHandler;
      (audio as any)._metadataHandler = metadataHandler;
      (audio as any)._seekbarListenersAttached = true;
      (audio as any)._lastStoryId = storyId;

      console.log(`[playAudio] Attached seekbar event listeners for story ${storyId}`);
    }

    // Wenn Audio bereits geladen ist, setze die Dauer sofort
    if (audio.duration && isFinite(audio.duration)) {
      setAudioDuration(prev => ({ ...prev, [storyId]: audio.duration }));
      // Setze auch aktuelle Zeit, falls schon vorhanden
      setAudioCurrentTime(prev => ({ ...prev, [storyId]: audio.currentTime }));
    }
    // Spiele Audio ab
    try {
      // Stelle sicher, dass Stimme immer auf 100% läuft
      audio.volume = 1.0;
      
      // Starte Hintergrundmusik ZUERST (wenn verfügbar und aktiviert)
      // Prüfe ob Musik-URL gültig ist
      const isValidMusicUrl = musicUrl && 
                              musicUrl.trim() !== '' && 
                              (musicUrl.startsWith('http://') || musicUrl.startsWith('https://'));
      
      if (musicUrl && !isValidMusicUrl) {
        console.warn(`[playAudio] Invalid music URL for story ${storyId}:`, musicUrl);
      }
      
      if (isValidMusicUrl && musicEnabled) {
        let musicAudio = backgroundMusicElements[storyId];
        
        if (!musicAudio) {
          console.log(`[playAudio] Creating background music element for story ${storyId}`);
          
          // iOS-Erkennung (muss VOR der Verwendung deklariert werden)
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                       // Chrome auf iPhone erkennt
                       (navigator.userAgent.includes('CriOS') && /iPad|iPhone|iPod/.test(navigator.userAgent));
          
          // Erstelle Audio-Element ohne URL, dann setze src explizit (wie bei Voice-Audio)
          musicAudio = new Audio();
          musicAudio.crossOrigin = 'anonymous'; // Für CORS
          musicAudio.loop = true; // Wiederholt sich
          musicAudio.preload = 'auto';
          
          // iOS: WICHTIG für Hintergrundwiedergabe - setze playsInline Attribut
          // Dies verhindert, dass iOS die Musik pausiert, wenn der Bildschirm ausgeht
          if (isIOS) {
            (musicAudio as any).playsInline = true;
            // Setze auch das HTML-Attribut falls möglich
            if (musicAudio.setAttribute) {
              musicAudio.setAttribute('playsinline', 'true');
            }
            
            // iOS Audio Session API (iOS 16.4+) - konfiguriere für Hintergrundwiedergabe
            if (typeof (navigator as any).audioSession !== 'undefined') {
              try {
                (navigator as any).audioSession.type = 'playback';
                console.log('[playAudio] iOS Audio Session configured for background playback');
              } catch (audioSessionError: any) {
                console.warn('[playAudio] Failed to configure iOS Audio Session:', audioSessionError);
              }
            }
          }
          
          // Versuche zuerst direkt mit URL, aber bereite Blob-Fallback vor
          // Da die Datei direkt im Browser funktioniert, aber nicht im Audio-Element,
          // verwenden wir direkt den Blob-Fallback für bessere Kompatibilität
          console.log(`[playAudio] Loading background music as blob for better compatibility...`);
          
          // Lade Datei als Blob und erstelle Blob-URL (umgeht mögliche CORS/Format-Probleme)
          fetch(musicUrl, { mode: 'cors', cache: 'no-cache' })
            .then(response => {
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              return response.blob();
            })
            .then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              console.log(`[playAudio] Created blob URL for background music:`, blobUrl);
              musicAudio.src = blobUrl;
              musicAudio.crossOrigin = null; // Blob-URLs brauchen kein CORS
              
              // WICHTIG: Rufe load() auf, um das Laden zu starten
              try {
                musicAudio.load();
              } catch (loadError: any) {
                console.warn(`[playAudio] Background music load() call failed (may be normal):`, loadError.message);
              }
              
              // DEBUG: Prüfe Audio-Element nach src-Setzung und load()
              setTimeout(() => {
                console.log(`[playAudio] Background music element after blob URL set and load():`, {
                  src: musicAudio.src,
                  currentSrc: musicAudio.currentSrc,
                  networkState: musicAudio.networkState,
                  readyState: musicAudio.readyState,
                  error: musicAudio.error ? {
                    code: musicAudio.error.code,
                    message: musicAudio.error.message
                  } : null
                });
              }, 200);
            })
            .catch(error => {
              console.error(`[playAudio] Failed to load background music as blob, trying direct URL:`, error);
              // Fallback: Versuche direkte URL
              musicAudio.src = musicUrl;
              musicAudio.crossOrigin = 'anonymous';
              try {
                musicAudio.load();
              } catch (loadError: any) {
                console.warn(`[playAudio] Background music load() call failed:`, loadError.message);
              }
            });
          
          // Speichere die ursprüngliche track-spezifische Lautstärke für späteres Reset
          (musicAudio as any)._originalVolume = musicVolume;
          
          // Setze initiale Lautstärke (wird später für iOS überschrieben)
          musicAudio.volume = musicVolume;
          (musicAudio as any)._useWebAudio = false;
          
          // Verwende track-spezifische Lautstärke (falls vorhanden), sonst Standard-Lautstärke
          // Hinweis: isIOS wurde bereits oben deklariert
          console.log(`[playAudio] Background music initialized with volume: ${musicVolume * 100}% (track-specific: ${musicTrack?.volume ? 'yes' : 'no'}, iOS: ${isIOS}) for story ${storyId}`);
          
          musicAudio.addEventListener('error', (e) => {
            const error = musicAudio.error;
            const errorDetails = {
              error: error,
              errorCode: error?.code,
              errorMessage: error?.message,
              src: musicAudio.src,
              currentSrc: musicAudio.currentSrc,
              readyState: musicAudio.readyState,
              networkState: musicAudio.networkState,
              musicUrl: musicUrl
            };
            
            // Prüfe ob es ein Loading-Fehler ist (kann ignoriert werden)
            const isDuringLoading = error?.code === 4 && (musicAudio.readyState === 0 || musicAudio.readyState === 1);
            
            // Prüfe ob es ein Format-Fehler ist (FFmpegDemuxer)
            const isFormatError = error?.message?.includes('FFmpegDemuxer') || 
                                 error?.message?.includes('DEMUXER_ERROR') ||
                                 error?.message?.includes('Format error') ||
                                 error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;
            
            if (isDuringLoading && !isFormatError) {
              console.log('[playAudio] Background music error during loading (ignoring, waiting for canplay):', errorDetails);
              // Nicht kritisch - warte auf canplay
            } else if (isFormatError && musicAudio.src.startsWith('blob:')) {
              // Format-Fehler mit Blob-URL - Datei ist möglicherweise beschädigt
              console.error('[playAudio] Background music format error even with blob URL - file may be corrupted:', errorDetails);
            } else if (isFormatError && !musicAudio.src.startsWith('blob:')) {
              // Format-Fehler mit direkter URL - versuche Blob-Fallback
              console.warn('[playAudio] Background music format error with direct URL, trying blob fallback:', errorDetails);
              
              // Versuche Blob-Fallback
              fetch(musicUrl, { mode: 'cors', cache: 'no-cache' })
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                  }
                  return response.blob();
                })
                .then(blob => {
                  const blobUrl = URL.createObjectURL(blob);
                  console.log(`[playAudio] Created blob URL for background music error fallback:`, blobUrl);
                  musicAudio!.src = blobUrl;
                  musicAudio!.crossOrigin = null; // Blob-URLs brauchen kein CORS
                  musicAudio!.load(); // Lade neu mit Blob-URL
                })
                .catch(fetchError => {
                  console.error(`[playAudio] Background music blob fallback failed:`, fetchError);
                });
            } else {
              // Echter Fehler - logge als Warnung (nicht kritisch für Voice-Wiedergabe)
              console.warn('[playAudio] Background music error:', errorDetails);
              
              // Prüfe spezifische Fehlertypen
              if (error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                console.warn('[playAudio] Background music format not supported. URL:', musicUrl);
              } else if (error?.code === MediaError.MEDIA_ERR_NETWORK) {
                console.warn('[playAudio] Background music network error. URL:', musicUrl);
              } else if (error?.message?.includes('FFmpegDemuxer') || error?.message?.includes('DEMUXER_ERROR')) {
                console.warn('[playAudio] Background music file may be corrupted or invalid format. URL:', musicUrl);
              }
              
              // Prüfe ob URL gültig ist
              if (!musicUrl || musicUrl.trim() === '') {
                console.warn('[playAudio] Background music URL is empty!');
              } else if (!musicUrl.startsWith('http://') && !musicUrl.startsWith('https://')) {
                console.warn('[playAudio] Background music URL is not a valid HTTP(S) URL:', musicUrl);
              }
              
              // Entferne das fehlerhafte Audio-Element aus dem State, damit es nicht wiederverwendet wird
              setBackgroundMusicElements(prev => {
                const updated = { ...prev };
                delete updated[storyId];
                return updated;
              });
            }
            // Musik-Fehler blockieren nicht die Voice-Wiedergabe (nicht kritisch)
          });
          
          musicAudio.addEventListener('loadstart', () => {
            console.log(`[playAudio] Background music loading for story ${storyId}`);
          });
          
          // Warte auf canplay Event bevor play() aufgerufen wird
          // Das verhindert "AbortError: The play() request was interrupted by a new load request"
          const playMusicWhenReady = () => {
            console.log(`[playAudio] Background music ready for story ${storyId}`);
            
            // Verbinde Web Audio API für iOS erst nachdem Audio geladen ist
            if (isIOS && typeof AudioContext !== 'undefined' && !(musicAudio as any)._useWebAudio) {
              try {
                // Prüfe ob bereits verbunden (verhindert doppelte Verbindung)
                if ((musicAudio as any)._audioContext) {
                  console.log('[playAudio] Web Audio API already connected, skipping');
                  return;
                }
                
                // Erstelle AudioContext (kann im suspended Zustand starten)
                const audioContext = new AudioContext();
          
                // Aktiviere AudioContext falls nötig (iOS erfordert manchmal Benutzerinteraktion)
                if (audioContext.state === 'suspended') {
                  audioContext.resume().catch(err => {
                    console.warn('[playAudio] Failed to resume AudioContext:', err);
                  });
                }
                
                const source = audioContext.createMediaElementSource(musicAudio);
                const gainNode = audioContext.createGain();
                
                // Verbinde Source -> GainNode -> Destination
                source.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                // Setze Lautstärke über GainNode (funktioniert auf iOS, auch in Chrome)
                const targetVolume = (musicAudio as any)._originalVolume || musicVolume;
                gainNode.gain.value = targetVolume;
                
                // Speichere Referenzen für späteres Update
                (musicAudio as any)._audioContext = audioContext;
                (musicAudio as any)._gainNode = gainNode;
                (musicAudio as any)._useWebAudio = true;
                
                console.log(`[playAudio] iOS detected (${navigator.userAgent.includes('CriOS') ? 'Chrome' : 'Safari'}): Web Audio API connected with GainNode for volume control (${targetVolume * 100}%)`);
              } catch (error: any) {
                console.warn('[playAudio] Failed to create Web Audio API context after canplay, keeping HTMLAudioElement:', error);
                // Behalte normale volume Property bei Fehler
                (musicAudio as any)._useWebAudio = false;
              }
            }
            
            // iOS: Verhindere, dass Musik pausiert wird, wenn der Bildschirm ausgeht
            if (isIOS) {
              // Event-Listener für pause Events - starte Musik automatisch wieder, wenn sie unerwartet pausiert wird
              const handlePause = () => {
                // Prüfe ob Musik gestoppt werden soll (z.B. wenn Audio endet)
                if ((musicAudio as any)._shouldStop) {
                  console.log(`[playAudio] Background music pause ignored - music should stop`);
                  return;
                }
                
                // Prüfe ob die Stimme noch läuft (dann sollte Musik auch laufen)
                const voiceAudio = audioElements[storyId];
                if (voiceAudio && !voiceAudio.paused && !voiceAudio.ended) {
                  console.log(`[playAudio] Background music was paused unexpectedly on iOS, restarting...`);
                  // Verwende setTimeout, um sicherzustellen, dass der Play-Befehl nach dem Pause-Event ausgeführt wird
                  setTimeout(() => {
                    // Prüfe nochmal, ob Musik gestoppt werden soll
                    if (!(musicAudio as any)._shouldStop) {
                      musicAudio.play().catch((err: any) => {
                        console.warn('[playAudio] Failed to restart background music after pause:', err);
                      });
                    }
                  }, 100);
                }
              };
              
              // Mehrere Event-Listener für verschiedene Szenarien
              musicAudio.addEventListener('pause', handlePause);
              musicAudio.addEventListener('suspend', handlePause); // iOS suspend Event
              
              // Timeupdate-Listener: Prüfe regelmäßig, ob Musik pausiert wurde, während Stimme läuft
              const checkMusicPlaying = () => {
                // Prüfe ob Musik gestoppt werden soll (z.B. wenn Audio endet)
                if ((musicAudio as any)._shouldStop) {
                  return;
                }
                
                const voiceAudio = audioElements[storyId];
                if (voiceAudio && !voiceAudio.paused && !voiceAudio.ended) {
                  // Stimme läuft noch
                  if (musicAudio.paused && !musicAudio.ended) {
                    // Musik wurde pausiert, obwohl Stimme läuft - starte wieder
                    console.log(`[playAudio] Background music paused while voice is playing, restarting...`);
                    musicAudio.play().catch((err: any) => {
                      console.warn('[playAudio] Failed to restart background music in timeupdate:', err);
                    });
                  }
                }
              };
              
              musicAudio.addEventListener('timeupdate', checkMusicPlaying);
              
              // Cleanup beim Entfernen des Audio-Elements
              (musicAudio as any)._pauseHandler = handlePause;
              (musicAudio as any)._timeupdateHandler = checkMusicPlaying;
              (musicAudio as any)._shouldStop = false; // Initialisiere Flag
            }
            
            // Markiere dass Audio bereit ist zum Abspielen
            (musicAudio as any)._readyToPlay = true;
          };
          
          musicAudio.addEventListener('canplay', playMusicWhenReady, { once: true });
          musicAudio.addEventListener('canplaythrough', playMusicWhenReady, { once: true });
          
          setBackgroundMusicElements(prev => ({ ...prev, [storyId]: musicAudio }));
        } else {
          // Audio-Element existiert bereits - aktualisiere Lautstärke falls sie sich geändert hat
          const originalVolume = (musicAudio as any)._originalVolume || DEFAULT_MUSIC_VOLUME;
          if (Math.abs(originalVolume - musicVolume) > 0.001) {
            console.log(`[playAudio] Updating music volume from ${originalVolume * 100}% to ${musicVolume * 100}% for story ${storyId}`);
            setMusicVolume(musicAudio, musicVolume);
            (musicAudio as any)._originalVolume = musicVolume;
          } else {
            // Stelle sicher, dass die Lautstärke korrekt ist (falls sie durch Fade-Out geändert wurde)
            const currentVolume = getMusicVolume(musicAudio);
            if (Math.abs(currentVolume - originalVolume) > 0.001) {
              console.log(`[playAudio] Resetting music volume from ${currentVolume * 100}% to ${originalVolume * 100}% for story ${storyId}`);
              setMusicVolume(musicAudio, originalVolume);
            }
          }
        }
        
        // Starte Musik ZUERST (bei Sekunde 0) - nur wenn sie nicht bereits läuft
        try {
          // Stelle sicher, dass die Lautstärke korrekt ist (falls sie durch Fade-Out geändert wurde)
          const originalVolume = (musicAudio as any)._originalVolume || musicVolume;
          const currentVolume = getMusicVolume(musicAudio);
          if (Math.abs(currentVolume - originalVolume) > 0.001) {
            console.log(`[playAudio] Resetting music volume from ${currentVolume * 100}% to ${originalVolume * 100}% for story ${storyId}`);
            setMusicVolume(musicAudio, originalVolume);
          }
          
          // Prüfe ob Musik bereits läuft
          if (musicAudio.paused) {
            musicAudio.currentTime = 0; // Starte von Anfang
            
            // Stelle sicher, dass Lautstärke vor play() gesetzt ist
            const targetVolume = (musicAudio as any)._originalVolume || musicVolume;
            setMusicVolume(musicAudio, targetVolume);
            
            // Warte auf canplay Event bevor play() aufgerufen wird
            // Das verhindert "AbortError: The play() request was interrupted by a new load request"
            if (musicAudio.readyState >= 4 || (musicAudio as any)._readyToPlay) {
              // Audio ist bereits bereit
            await musicAudio.play();
            } else {
              // Warte auf canplay Event
              await new Promise<void>((resolve) => {
                const onCanPlay = () => {
                  musicAudio.removeEventListener('canplay', onCanPlay);
                  musicAudio.removeEventListener('canplaythrough', onCanPlay);
                  resolve();
                };
                musicAudio.addEventListener('canplay', onCanPlay, { once: true });
                musicAudio.addEventListener('canplaythrough', onCanPlay, { once: true });
              });
              await musicAudio.play();
            }
            
            // Setze Lautstärke NACH play() nochmal (wichtig für alle Geräte, besonders iOS)
            const targetVolumeAfterPlay = (musicAudio as any)._originalVolume || musicVolume;
            setMusicVolume(musicAudio, targetVolumeAfterPlay);
            
            // Und nochmal nach kurzer Verzögerung (Browser brauchen manchmal Zeit)
            setTimeout(() => {
              if (!musicAudio.paused) {
                setMusicVolume(musicAudio, targetVolumeAfterPlay);
              }
            }, 100);
            setTimeout(() => {
              if (!musicAudio.paused) {
                setMusicVolume(musicAudio, targetVolumeAfterPlay);
              }
            }, 500);
            
            const finalVolume = getMusicVolume(musicAudio);
            console.log(`[playAudio] Background music started for story ${storyId} (at 0s) with volume ${finalVolume * 100}%`);

            // Aktualisiere Button-Status SOFORT, wenn Musik startet (vor der 3-Sekunden-Wartezeit)
            setPlayingAudioId(storyId);

            // Warte 3 Sekunden bevor die Stimme startet
            await new Promise(resolve => setTimeout(resolve, 3000));
          } else {
            console.log(`[playAudio] Background music already playing for story ${storyId}, skipping start`);
            // Stelle sicher, dass Lautstärke auch bei bereits laufender Musik korrekt ist
            const targetVolume = (musicAudio as any)._originalVolume || musicVolume;
            const currentVol = getMusicVolume(musicAudio);
            if (Math.abs(currentVol - targetVolume) > 0.001) {
              setMusicVolume(musicAudio, targetVolume);
            }
            // Aktualisiere Button-Status auch wenn Musik bereits läuft
            setPlayingAudioId(storyId);
          }
        } catch (musicError: any) {
          console.error('[playAudio] Failed to play background music:', musicError);
          // Musik-Fehler nicht anzeigen, nur loggen (nicht kritisch)
        }
      }

      // Stelle sicher, dass Stimme immer auf 100% läuft (auch nach Musik-Start)
      audio.volume = 1.0;

      // Spiele Stimme ab (nach 3 Sekunden Verzögerung, wenn Musik läuft)
      await audio.play();

      // Setze playingAudioId wenn Audio startet (auch wenn keine Musik vorhanden ist)
      setPlayingAudioId(storyId);
      console.log(`[playAudio] Audio playback started for story ${storyId}, setPlayingAudioId`);
      
      // Überwache Lautstärke während der Wiedergabe und stelle sicher, dass sie immer auf 100% bleibt
      const ensureVolumeInterval = setInterval(() => {
        if (audio && !audio.paused && !audio.ended && audio.volume !== 1.0) {
          console.warn(`[playAudio] Voice volume was ${audio.volume} during playback, resetting to 1.0`);
          audio.volume = 1.0;
        }
      }, 200); // Prüfe alle 200ms während der Wiedergabe
      
      // Cleanup wenn Audio endet oder pausiert wird
      const cleanupVolumeCheck = () => {
        clearInterval(ensureVolumeInterval);
      };
      
      audio.addEventListener('ended', cleanupVolumeCheck, { once: true });
      audio.addEventListener('pause', cleanupVolumeCheck, { once: true });
      
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
  }, [audioElements, backgroundMusicElements, musicEnabled, user, stories, session]);

  const pauseAudio = useCallback((storyId: string) => {
    const audio = audioElements[storyId];
    if (audio) {
      audio.pause();
      setPlayingAudioId(null);
    }

    // Pausiere auch Hintergrundmusik (und stoppe Fade-Out falls aktiv)
    const musicAudio = backgroundMusicElements[storyId];
    if (musicAudio) {
      // Stoppe Fade-Out-Interval falls vorhanden
      if ((musicAudio as any)._fadeOutInterval) {
        clearInterval((musicAudio as any)._fadeOutInterval);
        (musicAudio as any)._fadeOutInterval = null;
      }
      
      musicAudio.pause();
      console.log(`[pauseAudio] Background music paused for story ${storyId}`);
    }
  }, [audioElements, backgroundMusicElements]);

  const restartAudio = useCallback((storyId: string) => {
    const audio = audioElements[storyId];
    if (!audio) return;

    audio.currentTime = 0;
    setAudioCurrentTime(prev => ({ ...prev, [storyId]: 0 }));

    // Starte Musik neu, wenn sie gerade läuft
    if (playingAudioId === storyId) {
      audio.play().catch((err) => {
        console.error('Audio play failed on restart:', err);
      });
    }
  }, [audioElements, playingAudioId]);

  const handleSeek = useCallback((storyId: string, time: number) => {
    const audio = audioElements[storyId];
    if (!audio) return;

    audio.currentTime = time;
    setAudioCurrentTime(prev => ({ ...prev, [storyId]: time }));
  }, [audioElements]);

  const formatTime = (time: number) => {
    if (!isFinite(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const stopAllAudio = useCallback(() => {
    Object.values(audioElements).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Stoppe auch alle Hintergrundmusik-Tracks
    Object.values(backgroundMusicElements).forEach(music => {
      // Entferne pause-Event-Listener vor dem Stoppen
      if ((music as any)._pauseHandler) {
        music.removeEventListener('pause', (music as any)._pauseHandler);
      }
      music.pause();
      music.currentTime = 0;
    });
    
    setPlayingAudioId(null);
  }, [audioElements, backgroundMusicElements]);

  // Überwache Tab-Visibility, um sicherzustellen, dass Musik gestoppt wird, wenn Audio endet (auch wenn Tab im Hintergrund ist)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab wurde wieder aktiv - prüfe alle Audio-Elemente
        Object.entries(audioElements).forEach(([storyId, audio]) => {
          if (audio.ended) {
            // Audio ist beendet - lasse Musik weiterlaufen bis zum Ende
            const musicAudio = backgroundMusicElements[storyId];
            if (musicAudio) {
              // Deaktiviere Loop, damit Musik nach dem Ende stoppt (nicht endlos wiederholt)
              musicAudio.loop = false;
              console.log(`[handleVisibilityChange] Voice audio ended - background music continues playing until track ends`);

              // Aktualisiere State
              setPlayingAudioId(prev => prev === storyId ? null : prev);
            }
          }
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [audioElements, backgroundMusicElements]);

        return (
    <BLSProvider>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-6xl mx-auto px-4 sm:py-8 py-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center sm:mb-8 mb-4"
        >
          <h1 className="text-3xl md:text-4xl font-light text-amber-900 mb-2">
            Willkommen in deinem Raum
          </h1>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-center sm:mb-8 mb-5"
        >
          <div className="bg-white w-full rounded-2xl shadow-lg p-3 lg:flex grid sm:grid-cols-2 grid-cols-1 sm:gap-3 gap-2 sm:space-x-2 ">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center space-x-2 flex-grow px-4 py-3 rounded-xl justify-center font-medium transition-all duration-300 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="max-sm:text-sm">Profil</span>
            </button>
            
            <button
              onClick={() => setActiveTab('stories')}
              className={`flex items-center space-x-2 flex-grow px-4 py-3 rounded-xl justify-center font-medium transition-all duration-300 ${
                activeTab === 'stories'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span className="max-sm:text-sm">Meine Power Storys ({stories.length})</span>
            </button>

            {/* Subscription Management Link - only for Pro users */}
            {subscriptionStatus.isPro && (
              <button
                onClick={() => router.push('/subscription')}
                className="flex items-center space-x-2 flex-grow px-4 py-3 rounded-xl justify-center font-medium transition-all duration-300 text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg"
              >
                <CreditCard className="w-5 h-5" />
                <span className="max-sm:text-sm">Abo verwalten</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => router.push('/admin/analytics')}
                className="flex items-center space-x-2 flex-grow px-4 py-3 rounded-xl justify-center font-medium transition-all duration-300 text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-lg"
              >
                <BarChart3 className="w-5 h-5" />
                <span className="max-sm:text-sm">Admin Analytics</span>
              </button>
            )}
            
            {isMusicAdmin && (
              <button
                onClick={() => router.push('/admin/music')}
                className="flex items-center space-x-2 flex-grow px-4 py-3 rounded-xl justify-center font-medium transition-all duration-300 text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg"
              >
                <Music className="w-5 h-5" />
                <span className="max-sm:text-sm">Musik verwalten</span>
              </button>
            )}
            
            {(isAdmin || isMusicAdmin) && (
              <button
                onClick={() => setShowClientResourceModal(true)}
                className="flex items-center space-x-2 flex-grow px-4 py-3 rounded-xl justify-center font-medium transition-all duration-300 text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
              >
                <Volume2 className="w-5 h-5" />
                <span className="max-sm:text-sm">Ressource für Klienten erstellen</span>
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
            <div className="sm:space-y-6 space-y-3">
              {/* Basis-Informationen */}
              <div className="bg-white rounded-2xl shadow-lg sm:p-6 p-3">
                <div className="flex items-center sm:gap-3 gap-2 sm:mb-6 mb-4">
                  <User className="w-6 h-6 text-amber-600" />
                  <h2 className="sm:text-xl text-lg font-bold text-amber-900">Basis-Informationen</h2>
                </div>
              {user ? (
                  <div className="sm:space-y-6 space-y-3">
                    {/* E-Mail Info */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 sm:p-4 p-3 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-5 h-5 text-amber-600" />
                        <span className="font-semibold text-amber-900">E-Mail-Adresse</span>
                      </div>
                      <p className="text-amber-800 text-sm font-medium">{user.email}</p>
                    </div>
                    
                    {/* Personalisierungs-Einstellungen */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 sm:p-5 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 sm:mb-4 mb-3">
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
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white sm:px-6 px-4 sm:py-2.5 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-sm hover:shadow-md"
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
              <div className="bg-white rounded-2xl shadow-lg sm:p-6 p-3">
                <div className="flex items-center gap-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                  <h2 className="sm:text-xl text-lg font-bold text-amber-900">Nutzungs-Statistiken</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <BookOpen className="sm:w-8 sm:h-8 w-6 h-6 text-blue-600 mx-auto mb-2" />
                            <p className="sm:text-2xl text-base font-bold text-ellipsis overflow-hidden text-blue-900">{userStats.totalStories}</p>
                            <p className="text-blue-700 text-sm">Ressourcen</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <Clock className="sm:w-8 sm:h-8 w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="sm:text-2xl text-base font-bold text-ellipsis overflow-hidden text-purple-900">{userStats.totalAudioTime}</p>
                    <p className="text-purple-700 text-sm">Min. Audio</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <Star className="sm:w-8 sm:h-8 w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="sm:text-lg text-base font-bold text-ellipsis overflow-hidden text-green-900">{userStats.favoriteFigure}</p>
                    <p className="text-green-700 text-sm">Lieblingsfigur</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <Volume2 className="sm:w-8 sm:h-8 w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="sm:text-lg text-base font-bold text-ellipsis overflow-hidden text-orange-900">{userStats.favoriteVoice}</p>
                    <p className="text-orange-700 text-sm">Lieblingsstimme</p>
                  </div>
                </div>
              </div>

            
              {/* Fallback für Nicht-Abonnenten */}
              {!subscriptionStatus.isPro && (
                <div className="bg-white rounded-2xl shadow-lg sm:p-6 p-3 text-center">
                  <div className="max-w-md mx-auto">
                    <Crown className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                    <h3 className="text-xl font-light text-amber-900 mb-2">
                      Unbegrenzte Power Storys
                    </h3>
                    <p className="text-amber-700 mb-6">
                      Erstelle so viele personalisierte Ressourcen wie du möchtest
                    </p>
                    <button
                      onClick={() => setShowPaywall(true)}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 font-medium max-sm:text-sm max-sm:w-full"
                    >
                      Unbegrenzte Ressourcen erstellen
                    </button>
                    <p className="text-xs text-amber-600 mt-2">
                      Early Adopter Preis - 50% Rabatt
                    </p>
                  </div>
                </div>
              )}


              {/* Account-Management */}
              <div className="bg-white rounded-2xl shadow-lg sm:p-6 p-3">
                <div className="flex items-center gap-3 mb-4">
                  <Settings className="w-6 h-6 text-amber-600" />
                  <h2 className="sm:text-xl text-lg font-bold text-amber-900">Account-Management</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ChangePassword/>
                  <DeleteAccount/>
                </div>
              </div>

              {/* Support */}
              <div className="bg-white rounded-2xl shadow-lg sm:p-6 p-3">
                <div className="flex items-center gap-3 mb-4">
                  <HelpCircle className="w-6 h-6 text-amber-600" />
                  <h2 className="sm:text-xl text-lg font-bold text-amber-900">Support & Hilfe</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button onClick={()=> router.push('faq')} className="flex items-center gap-3 sm:p-4 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                    <HelpCircle className="w-5 h-5 text-blue-600" />
                    <div className="text-left">
                      <p className="font-medium text-blue-900">FAQ</p>
                      <p className="text-blue-700 text-sm">Häufige Fragen</p>
                    </div>
                  </button>
                  <ContactModal />
                  <FeedbackModal />
                  <BugModal />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-gray-600 max-sm:text-sm">Lade Geschichten...</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600">{error}</p>
                </div>
              ) : stories.length === 0 && !pendingStory ? (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <div className="text-center py-8">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 max-sm:text-sm">Noch keine Geschichten gespeichert.</p>
                    <p className="text-gray-500 text-sm max-sm:text-xs mt-2 mb-6">
                      Erstelle deine erste persönliche Ressource, um sie hier zu sehen.
                    </p>
                    <button
                      onClick={() => router.push('/create-story')}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Erstelle deine erste Ressource
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Section 1: Arrival Space (Ankommen) */}
                  {ankommenStory && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                      className="bg-white rounded-2xl shadow-lg p-8"
                    >
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-amber-900 mb-2">Zum Ankommen</h2>
                        <p className="text-amber-700">Wann immer du möchtest.</p>
                      </div>

                      {ankommenStory.audio_url ? (
                        <div className="max-w-lg mx-auto">
                          <AnkommenAudioPlayer
                            audioUrl={ankommenStory.audio_url}
                            title={ankommenStory.title}
                            subtitle={ankommenStory.resource_figure?.name || null}
                          />
                          <p className="text-center text-sm text-amber-600/70 mt-4">
                            (immer kostenlos)
                          </p>
                        </div>
                      ) : (
                        <div className="text-center py-4 text-amber-600">
                          <p>Audio wird geladen...</p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Section 2: Personal Stories */}
                  <div className="bg-white rounded-2xl shadow-lg p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-amber-900">Meine Power Storys</h2>
                      <button
                        onClick={async () => {
                          // Check if user can create more stories
                          if (user) {
                            const { canCreateResource } = await import('@/lib/access');
                            const canCreate = await canCreateResource(user.id);

                            if (!canCreate) {
                              setShowPaywall(true);
                              return;
                            }
                          }

                          router.push('/create-story');
                        }}
                        className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl shadow-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-200 flex items-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        Neue Power Story erstellen
                      </button>
                    </div>

                    {personalStories.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 max-sm:text-sm">Noch keine persönlichen Geschichten.</p>
                        <p className="text-gray-500 text-sm max-sm:text-xs mt-2">
                          Erstelle deine erste personalisierte Power Story.
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
                  
                  {/* Fehlermeldung für Beispiel-Ressourcenfigur (nur für Admins) */}
                  {isAdmin && exampleResourceError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
                    >
                      <p className="text-red-700 text-sm">{exampleResourceError}</p>
                    </motion.div>
                  )}

                  {personalStories.map((story, storyIndex) => (
                    <motion.div
                      key={story.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50 border border-amber-200 rounded-xl sm:p-6 p-4"
                    >
                      <div className="flex justify-between items-start mb-4 group pt-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            {renamingStoryId === story.id ? (
                              <EditableTitle
                                value={story.title}
                                autoEdit={true}
                                onSave={async (newTitle) => {
                                  await saveTitle(story.id, newTitle);
                                  setRenamingStoryId(null);
                                }}
                              />
                            ) : (
                              <h3 className="text-lg font-semibold text-amber-900">
                                {story.title}
                              </h3>
                            )}
                            {/* Badge für Story-Quelle */}
                            {(() => {
                              // Prüfe ob Story mit Andreas erstellt wurde (manuell aufgenommen)
                              // Stories mit Andreas haben is_audio_only=true ODER client_email gesetzt
                              const isAndreasCreated = story.is_audio_only === true || story.client_email !== null;
                              
                              if (isAndreasCreated) {
                                return (
                                  <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-[10px] font-medium">
                                    Mit Andreas erstellt
                                  </span>
                                );
                              }
                              
                              // User-created via product flow (AI-assisted)
                              // Zeige Badge nur wenn sicher kategorisierbar (nicht Andreas-created)
                              if (story.is_audio_only !== true && story.client_email === null) {
                                return (
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-medium">
                                    Selbst erstellt
                                  </span>
                                );
                              }
                              
                              // Wenn nicht eindeutig kategorisierbar, kein Badge
                              return null;
                            })()}
                            {/* Beispiel-Ressourcenfigur Checkbox (nur für Admins, nur wenn Audio vorhanden) */}
                            {isAdmin && story.audio_url && story.audio_url.trim() !== '' && (
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name="example-resource"
                                  checked={exampleResourceId === story.id}
                                  onChange={() => saveExampleResource(story.id)}
                                  disabled={exampleResourceLoading}
                                  className="w-4 h-4 text-purple-600 border-purple-300 focus:ring-purple-500 focus:ring-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <span className="text-xs font-medium text-purple-700 group-hover:text-purple-900 transition-colors">
                                  Als Beispiel-Ressource
                                </span>
                              </label>
                            )}
                          </div>
                          <div className="mb-2">
                            <EditableSubtitle
                              value={getDisplaySubtitle(story)}
                              autoSubtitle={story.auto_subtitle}
                              customSubtitle={story.custom_subtitle}
                              onSave={(value) => saveSubtitle(story.id, value || null)}
                            />
                          </div>
                        </div>
                        <div>
                          <StoryActionsMenu
                            onRename={() => setRenamingStoryId(story.id)}
                            onDelete={() => handleDeleteClick(story.id)}
                            canDelete={personalStories.length > 1}
                          />
                        </div>
                      </div>

                      {/* Audio Player */}
                      {story.audio_url ? (
                        <div className="mt-4">
                          {/* Use enhanced player with BLS for Pro users (not first story), regular player otherwise */}
                          {subscriptionStatus.isPro ? (
                            <StoryPlayerWithBLS
                              audioUrl={story.audio_url}
                              title={story.title}
                              subtitle={getDisplaySubtitle(story)}
                              resourceFigure={story.resource_figure}
                              showBLS={true}
                            />
                          ) : (
                            <DashboardAudioPlayer
                              audioUrl={story.audio_url}
                              title={story.title}
                              subtitle={getDisplaySubtitle(story)}
                              resourceFigure={story.resource_figure}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-amber-600">
                          <p className="mb-4">Für diese Geschichte ist noch kein Audio verfügbar.</p>
                          {generatingAudioFor === story.id ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                              <span>Audio wird generiert...</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => generateAudio(story.id)}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-md hover:shadow-lg inline-flex items-center gap-2 font-medium"
                            >
                              <Volume2 className="w-5 h-5" />
                              Audio generieren
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Paywall Modal */}
      {showPaywall && (
        <Paywall
          onClose={() => setShowPaywall(false)}
          message="Fühle dich jeden Tag sicher, geborgen und beschützt"
        />
      )}

      {/* Payment Success Modal */}
      {showPaymentSuccess && (
        <PaymentSuccessModal
          onClose={() => setShowPaymentSuccess(false)}
          message={paymentSuccessMessage}
        />
      )}

      {/* Client Resource Modal */}
      <ClientResourceModal
        isOpen={showClientResourceModal}
        onClose={() => setShowClientResourceModal(false)}
        onSuccess={() => {
          // Lade Stories neu nach erfolgreicher Erstellung
          if (user) {
            loadStories();
          }
        }}
      />

      {/* Delete Story Dialog */}
      <DeleteStoryDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteStory(deleteConfirmId);
          }
        }}
        storyTitle={deleteConfirmId ? personalStories.find(s => s.id === deleteConfirmId)?.title : undefined}
      />

      </div>
    </BLSProvider>
  );
}