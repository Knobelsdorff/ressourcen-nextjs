"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { supabase } from "@/lib/supabase";
import { createSPAClient } from "@/lib/supabase/client";
import { realFigures, fictionalFigures } from "@/data/figures";
import { motion } from "framer-motion";
import { Music, Upload, Trash2, Play, Pause, CheckCircle, XCircle, ArrowLeft, Edit2, Save, X, Volume2, TestTube } from "lucide-react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";

interface MusicTrack {
  id: string;
  figure_id: string;
  figure_name: string | null;
  track_id: string;
  track_url: string;
  track_title: string | null;
  track_artist: string | null;
  is_default: boolean;
  volume: number;
  created_at: string;
  updated_at: string;
}

export default function AdminMusicPage() {
  const { user, loading: authLoading } = useAuth();
  const [figures, setFigures] = useState<any[]>([]);
  const [selectedFigure, setSelectedFigure] = useState<string>("");
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [sourceLink, setSourceLink] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editSourceLink, setEditSourceLink] = useState("");
  const [editingVolume, setEditingVolume] = useState<number>(0.12);
  const [showTestModal, setShowTestModal] = useState<string | null>(null);

  // Prüfe ob User Admin ist (Full Admin oder Music Admin)
  const isMusicAdmin = (() => {
    if (!user?.email) return false;
    const musicAdminEmails = (process.env.NEXT_PUBLIC_MUSIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const fullAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return musicAdminEmails.includes(user.email.toLowerCase()) || 
           fullAdminEmails.includes(user.email.toLowerCase());
  })();

  // Prüfe ob User Full Admin ist (für Analytics-Zugriff)
  const isFullAdmin = (() => {
    if (!user?.email) return false;
    const fullAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return fullAdminEmails.includes(user.email.toLowerCase());
  })();

  useEffect(() => {
    const allFigures = [...realFigures, ...fictionalFigures];
    setFigures(allFigures);
    setLoading(false);
  }, []);

  const loadTracks = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("background_music_tracks")
        .select("*")
        .eq("figure_id", selectedFigure)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        // Prüfe ob es ein "Tabelle nicht gefunden" Fehler ist
        if (error.message?.includes("Could not find the table") || error.message?.includes("relation") || error.code === "PGRST116") {
          throw new Error(
            "Die Datenbank-Tabelle 'background_music_tracks' existiert noch nicht.\n\n" +
            "Bitte führe das SQL-Skript 'supabase-music-setup.sql' in deinem Supabase SQL Editor aus.\n\n" +
            "Schritte:\n" +
            "1. Gehe zu deinem Supabase-Projekt\n" +
            "2. Öffne den SQL Editor\n" +
            "3. Öffne die Datei 'supabase-music-setup.sql'\n" +
            "4. Ersetze 'deine-admin-email@example.com' mit deiner Admin-Email (3x)\n" +
            "5. Führe das Skript aus"
          );
        }
        throw error;
      }
      setTracks(data || []);
    } catch (error: any) {
      console.error("Error loading tracks:", error);
      alert("Fehler beim Laden der Tracks:\n\n" + error.message);
    }
  }, [selectedFigure]);

  useEffect(() => {
    if (selectedFigure) {
      loadTracks();
    } else {
      setTracks([]);
    }
  }, [selectedFigure, loadTracks]);

  const handleUpload = async () => {
    if (!uploadFile || !selectedFigure) {
      alert("Bitte wähle eine Figur und eine Datei aus.");
      return;
    }

    // Validierung
    if (!uploadFile.name.toLowerCase().endsWith(".mp3")) {
      alert("Bitte lade nur MP3-Dateien hoch.");
      return;
    }

    // Dateigrößenprüfung (max 100MB)
    const maxFileSize = 100 * 1024 * 1024; // 100MB in Bytes
    const fileSizeMB = (uploadFile.size / 1024 / 1024).toFixed(2);
    
    if (uploadFile.size > maxFileSize) {
      alert(`Die Datei ist zu groß (${fileSizeMB} MB). Maximale Dateigröße: 100 MB.\n\nBitte komprimiere die Datei oder verwende eine kleinere Version.`);
      return;
    }

    // Optional: URL-Validierung für Source-Link
    if (sourceLink) {
      try {
        new URL(sourceLink);
      } catch {
        alert("Bitte gib eine gültige URL für den Quell-Link ein.");
        return;
      }
    }

    setUploading(true);
    try {
      // Erstelle FormData für API-Request
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("figureId", selectedFigure);
      const figure = figures.find((f) => f.id === selectedFigure);
      if (figure?.name) {
        formData.append("figureName", figure.name);
      }
      if (sourceLink) {
        formData.append("sourceLink", sourceLink);
      }
      formData.append("isDefault", isDefault.toString());

      // Für große Dateien (> 4 MB): Versuche direkten Upload zu Supabase Storage
      // Dies umgeht das Body-Size-Limit von Next.js/Vercel (4.5 MB)
      const LARGE_FILE_THRESHOLD = 4 * 1024 * 1024; // 4 MB
      const useDirectUpload = uploadFile.size > LARGE_FILE_THRESHOLD;

      if (useDirectUpload) {
        console.log(`[handleUpload] Using direct upload for large file: ${fileSizeMB} MB`);
        
        // Generiere Dateinamen
        const fileExt = uploadFile.name.split('.').pop();
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const storageFileName = `${selectedFigure}_${timestamp}_${randomId}.${fileExt}`;

        // Versuche direkten Upload zu Supabase Storage
        const supabaseClient = createSPAClient();
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from('background-music')
          .upload(storageFileName, uploadFile, {
            contentType: 'audio/mpeg',
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          // Falls direkter Upload fehlschlägt, zeige detaillierte Fehlermeldung
          console.error('[handleUpload] Direct upload failed:', uploadError);
          console.error('[handleUpload] Upload error details:', {
            message: uploadError.message,
            error: (uploadError as any).error,
            statusCode: (uploadError as any).statusCode,
            fileName: storageFileName,
            fileSize: uploadFile.size,
            userEmail: user?.email
          });
          
          // Prüfe spezifische Fehler
          let errorMessage = 'Fehler beim direkten Upload zu Storage';
          const errorMessageLower = uploadError.message?.toLowerCase() || '';
          const statusCode = (uploadError as any).statusCode;
          
          if (errorMessageLower.includes('new row violates row-level security') || 
              errorMessageLower.includes('rls') ||
              errorMessageLower.includes('permission') ||
              errorMessageLower.includes('forbidden') ||
              statusCode === '403' ||
              statusCode === 403) {
            errorMessage = `Zugriff verweigert. Bitte stelle sicher, dass deine Email (${user?.email}) in der music_admins Tabelle eingetragen ist und du dich neu eingeloggt hast.`;
          } else if (errorMessageLower.includes('bucket not found') || 
                     errorMessageLower.includes('bucket')) {
            errorMessage = 'Der Storage-Bucket "background-music" existiert nicht. Bitte kontaktiere den Administrator.';
          } else {
            errorMessage = `Upload-Fehler: ${uploadError.message || 'Unbekannter Fehler'}`;
          }
          
          throw new Error(errorMessage);
        } else {
          // Direkter Upload erfolgreich - speichere Metadaten in DB
          const { data: { publicUrl } } = supabaseClient.storage
            .from('background-music')
            .getPublicUrl(storageFileName);

          // Speichere Metadaten über API
          const saveResponse = await fetch("/api/admin/music/save-track-metadata", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              figureId: selectedFigure,
              figureName: figures.find((f) => f.id === selectedFigure)?.name,
              trackUrl: publicUrl,
              storageFileName,
              sourceLink,
              isDefault,
            }),
          });

          if (!saveResponse.ok) {
            const errorData = await saveResponse.json().catch(() => ({ error: "Unbekannter Fehler" }));
            throw new Error(errorData.error || "Fehler beim Speichern der Track-Metadaten");
          }

          alert("Track erfolgreich hochgeladen!");
          setUploadFile(null);
          setSourceLink("");
          setIsDefault(false);
          loadTracks();
          return;
        }
      }

      // Standard-Upload über API-Endpoint (serverseitig)
      const response = await fetch("/api/admin/music/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          // Wenn JSON-Parsing fehlschlägt, könnte es ein Body-Size-Limit-Problem sein
          if (response.status === 413 || response.status === 0) {
            throw new Error(`Die Datei ist zu groß (${fileSizeMB} MB) für den Standard-Upload über die API-Route. Bitte versuche es erneut - das System sollte automatisch einen direkten Upload verwenden.`);
          }
          errorData = { error: `Upload fehlgeschlagen (Status: ${response.status})` };
        }
        
        const errorMessage = errorData.error || errorData.details || `Upload fehlgeschlagen (Status: ${response.status})`;
        const suggestion = errorData.suggestion ? `\n\n${errorData.suggestion}` : '';
        throw new Error(errorMessage + suggestion);
      }

      const result = await response.json();

      // Erfolg - lade Tracks neu
      alert("Track erfolgreich hochgeladen!");
      setUploadFile(null);
      setSourceLink("");
      setIsDefault(false);
      loadTracks();
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error.message || "Unbekannter Fehler beim Hochladen";
      
      // Zeige detaillierte Fehlermeldung
      alert(`Fehler beim Hochladen:\n\n${errorMessage}\n\n${uploadFile ? `Datei: ${uploadFile.name} (${(uploadFile.size / 1024 / 1024).toFixed(2)} MB)` : ''}\n\nTipp: Falls die Datei zu groß ist, versuche sie zu komprimieren oder eine kleinere Version zu verwenden.`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (trackId: string) => {
    if (!confirm("Möchtest du diesen Track wirklich löschen?")) return;

    try {
      const track = tracks.find((t) => t.id === trackId);
      if (!track) return;

      // Verwende API-Endpoint für serverseitige Admin-Prüfung (umgeht RLS-Probleme)
      const response = await fetch("/api/admin/music/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackId,
          trackUrl: track.track_url,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Delete failed with status ${response.status}`);
      }

      alert("Track erfolgreich gelöscht!");
      loadTracks();
    } catch (error: any) {
      console.error("Delete error:", error);
      alert("Fehler beim Löschen: " + (error.message || "Unbekannter Fehler"));
    }
  };

  const handleToggleDefault = async (trackId: string, currentDefault: boolean) => {
    try {
      // Verwende API-Endpoint für serverseitige Admin-Prüfung (umgeht RLS-Probleme)
      const response = await fetch("/api/admin/music/toggle-default", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackId,
          figureId: selectedFigure,
          isDefault: currentDefault,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Toggle failed with status ${response.status}`);
      }

      // Erfolg - lade Tracks neu
      loadTracks();
    } catch (error: any) {
      console.error("Toggle default error:", error);
      alert("Fehler: " + (error.message || "Unbekannter Fehler"));
    }
  };

  const handleStartEdit = (track: MusicTrack) => {
    setEditingTrackId(track.id);
    // Verwende track_title als Source-Link (falls vorhanden)
    setEditSourceLink(track.track_title || "");
    // Setze aktuelle Lautstärke (falls vorhanden, sonst Standard)
    setEditingVolume(track.volume != null ? parseFloat(track.volume.toString()) : 0.12);
  };

  const handleCancelEdit = () => {
    setEditingTrackId(null);
    setEditSourceLink("");
    setEditingVolume(0.12);
  };

  const handleSaveEdit = async (trackId: string) => {
    // Source-Link ist optional, aber wenn angegeben, sollte es eine gültige URL sein
    if (editSourceLink) {
      try {
        new URL(editSourceLink);
      } catch {
        alert("Bitte gib eine gültige URL für den Quell-Link ein.");
        return;
      }
    }

    // Validierung: Lautstärke muss zwischen 0.01 und 0.25 sein (1% - 25%)
    if (editingVolume < 0.01 || editingVolume > 0.25) {
      alert("Lautstärke muss zwischen 1% und 25% liegen.");
      return;
    }

    try {
      const response = await fetch("/api/admin/music/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackId,
          sourceLink: editSourceLink || null,
          volume: editingVolume,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Update failed with status ${response.status}`);
      }

      // Erfolg - lade Tracks neu
      alert("Track erfolgreich aktualisiert!");
      setEditingTrackId(null);
      setEditSourceLink("");
      setEditingVolume(0.12);
      loadTracks();
    } catch (error: any) {
      console.error("Update error:", error);
      alert("Fehler beim Aktualisieren: " + (error.message || "Unbekannter Fehler"));
    }
  };

  const handlePlayPause = (trackUrl: string, trackId: string) => {
    if (playingTrack === trackId && audioElement) {
      // Pausiere
      audioElement.pause();
      setPlayingTrack(null);
      setAudioElement(null);
    } else {
      // Stoppe vorheriges Audio
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }

      // Spiele neues Audio
      const audio = new Audio(trackUrl);
      audio.play();
      setPlayingTrack(trackId);
      setAudioElement(audio);

      audio.addEventListener("ended", () => {
        setPlayingTrack(null);
        setAudioElement(null);
      });
    }
  };

  // Test-Modal State (muss VOR useEffect definiert werden)
  const [testResource, setTestResource] = useState<{ audioUrl: string; title: string } | null>(null);
  const [testMusicVolume, setTestMusicVolume] = useState<number>(0.12);
  const [testMusicPlaying, setTestMusicPlaying] = useState(false);
  const [testVoicePlaying, setTestVoicePlaying] = useState(false);
  const [testMusicAudio, setTestMusicAudio] = useState<HTMLAudioElement | null>(null);
  const [testVoiceAudio, setTestVoiceAudio] = useState<HTMLAudioElement | null>(null);
  const [loadingTestResource, setLoadingTestResource] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // iOS-Erkennung für Web Audio API
  const isIOS = typeof window !== 'undefined' && (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );

  // Hilfsfunktion zum Setzen der Lautstärke (unterstützt Web Audio API für iOS)
  const setMusicVolume = useCallback((musicAudio: HTMLAudioElement | null, volume: number) => {
    if (!musicAudio) return;
    
    if (isIOS && (musicAudio as any)._useWebAudio && (musicAudio as any)._gainNode) {
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
      // Desktop/Android: Verwende HTMLAudioElement.volume
      musicAudio.volume = volume;
    }
  }, [isIOS]);

  // Hilfsfunktion zum Abrufen der Lautstärke
  const getMusicVolume = useCallback((musicAudio: HTMLAudioElement | null): number => {
    if (!musicAudio) return 0.12;
    
    if (isIOS && (musicAudio as any)._useWebAudio && (musicAudio as any)._gainNode) {
      // iOS: Verwende Web Audio API GainNode
      return (musicAudio as any)._gainNode.gain.value;
    } else {
      // Desktop/Android: Verwende HTMLAudioElement.volume
      return musicAudio.volume;
    }
  }, [isIOS]);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      if (testMusicAudio) {
        testMusicAudio.pause();
        testMusicAudio.currentTime = 0;
      }
      if (testVoiceAudio) {
        testVoiceAudio.pause();
        testVoiceAudio.currentTime = 0;
      }
    };
  }, [audioElement, testMusicAudio, testVoiceAudio]);

  // Lade Test-Ressource für Track
  const loadTestResource = async (track: MusicTrack) => {
    setLoadingTestResource(true);
    try {
      // Prüfe ob User vorhanden ist
      if (!user?.id) {
        console.warn('[loadTestResource] No user ID available');
        setTestResource({
          audioUrl: '',
          title: `Test für ${track.figure_name || track.figure_id}`
        });
        setLoadingTestResource(false);
        return;
      }

      // Suche nach Admin-eigener Ressource für diese Figur
      const figureId = track.figure_id.toLowerCase();
      const figureName = track.figure_name?.toLowerCase();
      
      console.log('[loadTestResource] Searching for resources:', {
        figureId,
        figureName,
        userId: user.id
      });

      const { data: resources, error } = await supabase
        .from('saved_stories')
        .select('id, title, audio_url, resource_figure')
        .eq('user_id', user.id)
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20); // Erhöht auf 20 für bessere Suche

      if (error) {
        console.error('[loadTestResource] Error loading test resources:', error);
        // Fallback: Verwende generische Test-Stimme
        setTestResource({
          audioUrl: '', // Wird generiert
          title: `Test für ${track.figure_name || figureId}`
        });
        setLoadingTestResource(false);
        return;
      }

      console.log('[loadTestResource] Found resources:', resources?.length || 0);
      console.log('[loadTestResource] Resources:', resources?.map((r: any) => ({
        id: r.id,
        title: r.title,
        resource_figure: r.resource_figure,
        audio_url: !!r.audio_url
      })));
      
      // Debug: Zeige alle Ressourcen mit ihren figure-IDs/Names
      console.log('[loadTestResource] All resource figures:', resources?.map((r: any) => {
        const rf = r.resource_figure;
        if (typeof rf === 'string') {
          return { resourceId: r.id, figure: rf };
        } else if (rf && typeof rf === 'object') {
          return { resourceId: r.id, figureId: rf.id, figureName: rf.name };
        }
        return { resourceId: r.id, figure: 'unknown' };
      }));

      // Finde Ressource mit passender figure_id oder figure_name
      type ResourceType = {
        id: string;
        title: string;
        audio_url: string | null;
        resource_figure: any;
      };
      
      const matchingResource = (resources as ResourceType[] | null)?.find((r: ResourceType) => {
        const resourceFigure = r.resource_figure;
        
        // Debug-Logging
        console.log('[loadTestResource] Checking resource:', {
          resourceId: r.id,
          resourceTitle: r.title,
          resourceFigure,
          figureId,
          figureName
        });

        // Fall 1: resource_figure ist ein String
        if (typeof resourceFigure === 'string') {
          const resourceFigureLower = resourceFigure.toLowerCase();
          // Normalisiere auch Leerzeichen und Bindestriche für besseres Matching
          const normalizedResourceFigure = resourceFigureLower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const normalizedFigureId = figureId.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const normalizedFigureName = figureName?.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
          
          const matches = resourceFigureLower === figureId || 
                         (figureName && resourceFigureLower === figureName) ||
                         normalizedResourceFigure === normalizedFigureId ||
                         (normalizedFigureName && normalizedResourceFigure === normalizedFigureName);
          console.log('[loadTestResource] String match:', {
            resourceFigure,
            resourceFigureLower,
            normalizedResourceFigure,
            figureId,
            figureName,
            normalizedFigureId,
            normalizedFigureName,
            matches
          });
          return matches;
        }

        // Fall 2: resource_figure ist ein Objekt mit id und/oder name
        if (resourceFigure && typeof resourceFigure === 'object') {
          const resourceId = resourceFigure.id?.toLowerCase();
          const resourceName = resourceFigure.name?.toLowerCase();
          
          // Normalisiere auch für Objekt-Matching
          const normalizedResourceId = resourceId?.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const normalizedResourceName = resourceName?.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const normalizedFigureId = figureId.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          const normalizedFigureName = figureName?.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || '';
          
          // Exakte Übereinstimmungen (ohne Normalisierung)
          const exactMatch = 
            (resourceId && (resourceId === figureId || (figureName && resourceId === figureName))) ||
            (resourceName && (resourceName === figureId || (figureName && resourceName === figureName)));
          
          // Normalisierte Übereinstimmungen (mit Normalisierung)
          const normalizedMatch = 
            (normalizedResourceId && (normalizedResourceId === normalizedFigureId || (normalizedFigureName && normalizedResourceId === normalizedFigureName))) ||
            (normalizedResourceName && (normalizedResourceName === normalizedFigureId || (normalizedFigureName && normalizedResourceName === normalizedFigureName)));
          
          const matches = exactMatch || normalizedMatch;
          
          console.log('[loadTestResource] Object match:', {
            resourceId,
            resourceName,
            normalizedResourceId,
            normalizedResourceName,
            figureId,
            figureName,
            normalizedFigureId,
            normalizedFigureName,
            matches
          });
          return matches;
        }

        return false;
      });

      console.log('[loadTestResource] Matching resource found:', matchingResource);

      if (matchingResource && matchingResource.audio_url) {
        console.log('[loadTestResource] Using found resource:', matchingResource.title);
        setTestResource({
          audioUrl: matchingResource.audio_url,
          title: matchingResource.title || 'Test-Ressource'
        });
      } else {
        // Spezieller Fallback: Wenn "Engel" nicht gefunden wird, verwende "Erzengel Michael"
        if (figureId === 'angel' || figureName === 'engel') {
          const archangelResource = (resources as ResourceType[] | null)?.find((r: ResourceType) => {
            if (!r.audio_url) return false;
            const resourceFigure = r.resource_figure;
            
            if (typeof resourceFigure === 'string') {
              return resourceFigure.toLowerCase().includes('erzengel michael') || 
                     resourceFigure.toLowerCase().includes('archangel');
            } else if (resourceFigure && typeof resourceFigure === 'object') {
              const resourceId = resourceFigure.id?.toLowerCase();
              const resourceName = resourceFigure.name?.toLowerCase();
              return resourceId === 'archangel-michael' || 
                     resourceName?.includes('erzengel michael') ||
                     resourceName?.includes('archangel');
            }
            return false;
          });
          
          if (archangelResource) {
            console.log('[loadTestResource] No exact match for "Engel", using "Erzengel Michael" as fallback:', archangelResource.title);
            setTestResource({
              audioUrl: archangelResource.audio_url!,
              title: archangelResource.title || 'Test-Ressource'
            });
            return;
          }
        }
        
        // Keine exakte Übereinstimmung gefunden - verwende generische Test-Stimme
        console.log('[loadTestResource] No exact match found, using generic test voice');
        setTestResource({
          audioUrl: '', // Wird generiert
          title: `Test für ${track.figure_name || figureId}`
        });
      }
    } catch (error) {
      console.error('[loadTestResource] Error in loadTestResource:', error);
      setTestResource({
        audioUrl: '',
        title: `Test für ${track.figure_name || track.figure_id}`
      });
    } finally {
      setLoadingTestResource(false);
    }
  };

  // Öffne Test-Modal
  const handleOpenTest = async (track: MusicTrack) => {
    setShowTestModal(track.id);
    setTestMusicVolume(track.volume || 0.12);
    await loadTestResource(track);
  };

  // Schließe Test-Modal
  const handleCloseTest = () => {
    // Stoppe alle Audio-Wiedergaben
    if (testMusicAudio) {
      testMusicAudio.pause();
      testMusicAudio.currentTime = 0;
      setTestMusicAudio(null);
    }
    if (testVoiceAudio) {
      testVoiceAudio.pause();
      testVoiceAudio.currentTime = 0;
      setTestVoiceAudio(null);
    }
    setTestMusicPlaying(false);
    setTestVoicePlaying(false);
    setShowTestModal(null);
    setTestResource(null);
    setSaveSuccess(false); // Reset Success-Meldung
  };

  // Test-Playback starten
  const handleTestPlay = async (track: MusicTrack) => {
    try {
      // Stoppe vorherige Wiedergaben
      if (testMusicAudio) {
        testMusicAudio.pause();
        testMusicAudio.currentTime = 0;
      }
      if (testVoiceAudio) {
        testVoiceAudio.pause();
        testVoiceAudio.currentTime = 0;
      }

      // Starte Hintergrundmusik ZUERST
      let music: HTMLAudioElement | null = null;
      if (track.track_url) {
        music = new Audio(track.track_url);
        music.loop = true;
        music.crossOrigin = 'anonymous'; // Für CORS-Probleme
        
        // iOS: Verwende Web Audio API für Lautstärke-Kontrolle
        if (isIOS) {
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaElementSource(music);
            const gainNode = audioContext.createGain();
            
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Speichere Referenzen für späteren Zugriff
            (music as any)._useWebAudio = true;
            (music as any)._gainNode = gainNode;
            (music as any)._audioContext = audioContext;
            
            // Setze Lautstärke über GainNode
            gainNode.gain.value = testMusicVolume;
            
            // Aktiviere AudioContext bei User-Interaktion
            if (audioContext.state === 'suspended') {
              audioContext.resume().catch((err: any) => {
                console.warn('[handleTestPlay] Failed to resume AudioContext:', err);
              });
            }
          } catch (error) {
            console.warn('[handleTestPlay] Web Audio API setup failed, falling back to HTMLAudioElement:', error);
        music.volume = testMusicVolume;
          }
        } else {
          // Desktop/Android: Verwende HTMLAudioElement.volume
          music.volume = testMusicVolume;
        }
        
        // Lade Musik als Blob für bessere Kompatibilität (wie im Dashboard)
        console.log('[handleTestPlay] Loading background music as blob for better compatibility...');
        try {
          const response = await fetch(track.track_url, { mode: 'cors', cache: 'no-cache' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          console.log('[handleTestPlay] Created blob URL for background music:', blobUrl);
          music.src = blobUrl;
          music.crossOrigin = null; // Blob-URLs brauchen kein CORS
        } catch (fetchError) {
          console.warn('[handleTestPlay] Failed to load as blob, using direct URL:', fetchError);
          music.src = track.track_url;
          music.crossOrigin = 'anonymous';
        }
        
        // Warte bis Musik geladen ist
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Musik konnte nicht geladen werden: Timeout nach 10 Sekunden. URL: ${track.track_url}`));
          }, 10000); // 10 Sekunden Timeout
          
          music!.addEventListener('canplay', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
          
          music!.addEventListener('error', (e) => {
            const error = music!.error;
            const networkState = music!.networkState;
            const readyState = music!.readyState;
            
            // Prüfe ob es ein temporärer Loading-Fehler ist
            const isDuringLoading = (readyState === 0 || readyState === 1) && 
                                   (error?.code === 4 || error?.code === undefined);
            
            // Ignoriere temporäre Loading-Fehler
            if (isDuringLoading && networkState !== HTMLMediaElement.NETWORK_NO_SOURCE) {
              console.log('[handleTestPlay] Musik-Fehler während des Ladens (ignoriere, warte auf canplay):', {
                code: error?.code,
                message: error?.message,
                readyState,
                networkState
              });
              return; // Nicht rejecten - warte auf canplay
            }
            
            // Prüfe ob es ein Format-Fehler ist
            const isFormatError = error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
                                 error?.message?.includes('FFmpegDemuxer') ||
                                 error?.message?.includes('DEMUXER_ERROR') ||
                                 error?.message?.includes('Format error');
            
            // Bei Format-Fehler mit Blob-URL: Datei ist möglicherweise beschädigt
            if (isFormatError && music!.src.startsWith('blob:')) {
              clearTimeout(timeout);
              console.error('[handleTestPlay] Musik-Format-Fehler auch mit Blob-URL - Datei möglicherweise beschädigt:', {
                code: error?.code,
                message: error?.message,
                url: track.track_url
              });
              reject(new Error(`Musik-Format wird nicht unterstützt oder Datei ist beschädigt. URL: ${track.track_url}`));
              return;
            }
            
            // Bei Format-Fehler mit direkter URL: Versuche Blob-Fallback
            if (isFormatError && !music!.src.startsWith('blob:')) {
              console.warn('[handleTestPlay] Musik-Format-Fehler mit direkter URL, versuche Blob-Fallback');
              fetch(track.track_url, { mode: 'cors', cache: 'no-cache' })
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                  }
                  return response.blob();
                })
                .then(blob => {
                  const blobUrl = URL.createObjectURL(blob);
                  console.log('[handleTestPlay] Erstelle Blob-URL für Musik-Fallback:', blobUrl);
                  music!.src = blobUrl;
                  music!.crossOrigin = null;
          music!.load();
                  // Nicht rejecten - warte auf canplay mit Blob-URL
                })
                .catch(fetchError => {
                  console.error('[handleTestPlay] Blob-Fallback fehlgeschlagen:', fetchError);
                  clearTimeout(timeout);
                  reject(new Error(`Musik-Format wird nicht unterstützt. URL: ${track.track_url}`));
                });
              return; // Warte auf Blob-Fallback
            }
            
            // Echter Fehler - nur rejecten wenn nicht während des Ladens
            if (!isDuringLoading) {
              clearTimeout(timeout);
              let errorMessage = 'Musik konnte nicht geladen werden';
              if (error) {
                switch (error.code) {
                  case MediaError.MEDIA_ERR_ABORTED:
                    errorMessage = 'Musik-Laden wurde abgebrochen';
                    break;
                  case MediaError.MEDIA_ERR_NETWORK:
                    errorMessage = 'Netzwerkfehler beim Laden der Musik';
                    break;
                  case MediaError.MEDIA_ERR_DECODE:
                    errorMessage = 'Musik-Datei konnte nicht dekodiert werden';
                    break;
                  case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    errorMessage = 'Musik-Format wird nicht unterstützt';
                    break;
                  default:
                    errorMessage = `Musik-Fehler (Code: ${error.code})`;
                }
              }
              reject(new Error(`${errorMessage}. URL: ${track.track_url}`));
            }
          }, { once: true });
          
          music!.load();
        });
        
        await music.play();
        setTestMusicAudio(music);
        setTestMusicPlaying(true);
        console.log('[handleTestPlay] Background music started');
      }

      // Starte Stimme (falls vorhanden)
      let voiceUrl = testResource?.audioUrl;
      
      // Falls keine Ressource gefunden, generiere generische Test-Stimme
      if (!voiceUrl) {
        setLoadingTestResource(true);
        try {
          // Verwende "empfohlene" Stimme (erste weibliche Stimme aus der Liste)
          const recommendedVoiceId = 'SHTtk5n3RQvLx4dcvfGR'; // Sanft und beruhigend
          const testText = `Dies ist ein Test der Hintergrundmusik für ${track.figure_name || track.figure_id}. Die Musik sollte die Stimme unterstützen, ohne sie zu übertönen.`;
          
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/generate-audio`;
      const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!SUPABASE_ANON_KEY) {
        throw new Error('SUPABASE_ANON_KEY ist nicht definiert');
      }

      const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY, // Supabase Edge Functions benötigen auch den apikey Header
            },
            body: JSON.stringify({
              text: testText,
              voiceId: recommendedVoiceId,
              adminPreview: false,
            }),
          });

          if (!response.ok) {
            throw new Error('Fehler beim Generieren der Test-Stimme');
          }

          const data = await response.json();
          voiceUrl = data.audioUrl;
        } catch (error) {
          console.error('Error generating test voice:', error);
          alert('Fehler beim Generieren der Test-Stimme. Bitte versuche es erneut.');
          setLoadingTestResource(false);
          return;
        } finally {
          setLoadingTestResource(false);
        }
      }

      if (voiceUrl) {
        // Hole aktuelle Musik-Referenz aus State (falls State noch nicht aktualisiert wurde, verwende lokale Variable)
        const currentMusic = testMusicAudio || music;
        
        const voice = new Audio();
        voice.volume = 1.0;
        
        // Lade Stimme als Blob für bessere Kompatibilität (wie bei Musik)
        console.log('[handleTestPlay] Loading voice as blob for better compatibility...');
        try {
          const response = await fetch(voiceUrl, { mode: 'cors', cache: 'no-cache' });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          console.log('[handleTestPlay] Created blob URL for voice:', blobUrl);
          voice.src = blobUrl;
          voice.crossOrigin = null; // Blob-URLs brauchen kein CORS
        } catch (fetchError) {
          console.warn('[handleTestPlay] Failed to load as blob, using direct URL:', fetchError);
          voice.src = voiceUrl;
          voice.crossOrigin = 'anonymous';
        }
        
        // Warte bis Stimme geladen ist
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Stimme konnte nicht geladen werden: Timeout nach 10 Sekunden. URL: ${voiceUrl}`));
          }, 10000);
          
          voice.addEventListener('canplay', () => {
            clearTimeout(timeout);
            resolve();
          }, { once: true });
          
          voice.addEventListener('error', (e) => {
            const error = voice.error;
            const networkState = voice.networkState;
            const readyState = voice.readyState;
            
            // Prüfe ob es ein temporärer Loading-Fehler ist
            const isDuringLoading = (readyState === 0 || readyState === 1) && 
                                   (error?.code === 4 || error?.code === undefined);
            
            // Ignoriere temporäre Loading-Fehler
            if (isDuringLoading && networkState !== HTMLMediaElement.NETWORK_NO_SOURCE) {
              console.log('[handleTestPlay] Voice error during loading (ignoring, waiting for canplay):', {
                code: error?.code,
                message: error?.message,
                readyState,
                networkState
              });
              return; // Nicht rejecten - warte auf canplay
            }
            
            clearTimeout(timeout);
            let errorMessage = 'Stimme konnte nicht geladen werden';
            if (error) {
              switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                  errorMessage = 'Stimmen-Laden wurde abgebrochen';
                  break;
                case MediaError.MEDIA_ERR_NETWORK:
                  errorMessage = 'Netzwerkfehler beim Laden der Stimme';
                  break;
                case MediaError.MEDIA_ERR_DECODE:
                  errorMessage = 'Stimmen-Datei konnte nicht dekodiert werden';
                  break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  errorMessage = 'Stimmen-Format wird nicht unterstützt';
                  break;
                default:
                  errorMessage = `Stimmen-Fehler (Code: ${error.code})`;
              }
            }
            reject(new Error(`${errorMessage}. URL: ${voiceUrl}`));
          }, { once: true });
          
          voice.load();
        });
        
        // Stelle sicher, dass Musik noch läuft
        if (currentMusic && currentMusic.paused) {
          console.log('[handleTestPlay] Music was paused, restarting...');
          await currentMusic.play();
        }
        
        voice.addEventListener('ended', () => {
          setTestVoicePlaying(false);
          // Fade-out Musik wenn Stimme endet
          const musicToFade = testMusicAudio || currentMusic;
          if (musicToFade) {
            const fadeOut = setInterval(() => {
              if (musicToFade && musicToFade.volume > 0) {
                musicToFade.volume = Math.max(0, musicToFade.volume - 0.01);
              } else {
                clearInterval(fadeOut);
                if (musicToFade) {
                  musicToFade.pause();
                  musicToFade.currentTime = 0;
                  setTestMusicAudio(null);
                  setTestMusicPlaying(false);
                }
              }
            }, 50);
          }
        });
        
        await voice.play();
        setTestVoiceAudio(voice);
        setTestVoicePlaying(true);
        console.log('[handleTestPlay] Voice started, music should still be playing');
        
        // Verifiziere dass Musik noch läuft
        setTimeout(() => {
          const musicCheck = testMusicAudio || currentMusic;
          if (musicCheck) {
            console.log('[handleTestPlay] Music status after voice start:', {
              paused: musicCheck.paused,
              volume: musicCheck.volume,
              currentTime: musicCheck.currentTime
            });
            if (musicCheck.paused) {
              console.warn('[handleTestPlay] Music was paused after voice start, restarting...');
              musicCheck.play().catch(err => console.error('Error restarting music:', err));
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error in handleTestPlay:', error);
      alert('Fehler beim Abspielen des Tests. Bitte versuche es erneut.');
    }
  };

  // Test-Playback stoppen
  const handleTestStop = () => {
    if (testMusicAudio) {
      testMusicAudio.pause();
      testMusicAudio.currentTime = 0;
      setTestMusicAudio(null);
      setTestMusicPlaying(false);
    }
    if (testVoiceAudio) {
      testVoiceAudio.pause();
      testVoiceAudio.currentTime = 0;
      setTestVoiceAudio(null);
      setTestVoicePlaying(false);
    }
  };

  // Speichere Lautstärke-Änderung
  const handleSaveTestVolume = async (track: MusicTrack) => {
    try {
      const response = await fetch("/api/admin/music/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trackId: track.id,
          volume: testMusicVolume,
        }),
      });

      if (!response.ok) {
        throw new Error("Fehler beim Speichern der Lautstärke");
      }

      // Aktualisiere lokalen Track
      setTracks(tracks.map(t => 
        t.id === track.id ? { ...t, volume: testMusicVolume } : t
      ));

      // Aktualisiere Musik-Lautstärke während Wiedergabe (unterstützt iOS Web Audio API)
      if (testMusicAudio) {
        setMusicVolume(testMusicAudio, testMusicVolume);
      }

      // Zeige Success-Meldung und schließe Modal nach kurzer Verzögerung
      setSaveSuccess(true);
      setTimeout(() => {
        handleCloseTest();
        setSaveSuccess(false);
      }, 1500); // 1.5 Sekunden anzeigen, dann schließen
    } catch (error: any) {
      console.error("Error saving volume:", error);
      alert("Fehler beim Speichern: " + (error.message || "Unbekannter Fehler"));
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Lade...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 mb-4">Bitte melde dich an, um auf das Admin-Dashboard zuzugreifen.</p>
          <Link href="/dashboard" className="text-blue-500 hover:underline">
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isMusicAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 mb-4">Du hast keine Berechtigung für die Musik-Verwaltung.</p>
          <Link href="/dashboard" className="text-blue-500 hover:underline">
            Zum Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          {isFullAdmin && (
            <Link
              href="/admin/analytics"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zu Admin Analytics
            </Link>
          )}
          {!isFullAdmin && (
            <Link
              href="/dashboard"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Zurück zum Dashboard
            </Link>
          )}
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-blue-500" />
            <h1 className="text-3xl font-bold text-gray-900">Hintergrundmusik verwalten</h1>
          </div>
          <p className="mt-2 text-gray-600">
            Lade Musik-Tracks für Ressourcen hoch und verwalte sie hier.
          </p>
        </div>

        {/* Figuren-Auswahl */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow p-6 mb-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ressource auswählen:
          </label>
          <select
            value={selectedFigure}
            onChange={(e) => setSelectedFigure(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">-- Bitte wählen --</option>
            <optgroup label="Echte Personen">
              {realFigures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Fiktive Figuren">
              {fictionalFigures.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name}
                </option>
              ))}
            </optgroup>
          </select>
        </motion.div>

        {selectedFigure && (
          <>
            {/* Upload-Formular */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6 mb-6"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Neuen Track hochladen
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MP3-Datei: <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="audio/mpeg,.mp3"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={uploading}
                  />
                  {uploadFile && (
                    <p className="mt-1 text-sm text-gray-500">
                      Ausgewählt: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link zur Quelle (optional):
                  </label>
                  <input
                    type="url"
                    value={sourceLink}
                    onChange={(e) => setSourceLink(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://www.premiumbeat.com/..."
                    disabled={uploading}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Optional: Link zur Quelle des Tracks (z.B. PremiumBeat) für Referenz.
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={uploading}
                  />
                  <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                    Als Standard-Track setzen (wird automatisch abgespielt)
                  </label>
                </div>

                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || uploading}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Wird hochgeladen...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Track hochladen
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Vorhandene Tracks */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Music className="w-5 h-5" />
                Vorhandene Tracks ({tracks.length})
              </h2>

              {tracks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Noch keine Tracks für diese Ressource vorhanden.
                </p>
              ) : (
                <div className="space-y-4">
                  {tracks.map((track) => (
                    <div
                      key={track.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">
                              {track.track_title || track.track_id}
                            </h3>
                            {track.is_default && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Standard
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-gray-500 font-mono break-all mb-2">
                            {track.track_url}
                          </p>
                          {editingTrackId === track.id ? (
                            <div className="mb-3 space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Link zur Quelle (optional):
                                </label>
                                <input
                                  type="url"
                                  value={editSourceLink}
                                  onChange={(e) => setEditSourceLink(e.target.value)}
                                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="https://www.premiumbeat.com/..."
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Lautstärke: {(editingVolume * 100).toFixed(0)}%
                                </label>
                                <input
                                  type="range"
                                  min="0.01"
                                  max="0.25"
                                  step="0.01"
                                  value={editingVolume}
                                  onChange={(e) => setEditingVolume(parseFloat(e.target.value))}
                                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>1%</span>
                                  <span>25%</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSaveEdit(track.id)}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded-md transition-colors"
                                >
                                  <Save className="w-4 h-4" />
                                  Speichern
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mb-3 space-y-1">
                              {track.track_title ? (
                                <p className="text-xs text-gray-400">
                                  Quelle: <a href={track.track_title} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{track.track_title}</a>
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400 italic">
                                  Kein Quell-Link gesetzt. Klicke auf "Bearbeiten", um einen Link hinzuzufügen.
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Lautstärke: {((track.volume || 0.12) * 100).toFixed(0)}%
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4">
                            {editingTrackId !== track.id && (
                              <>
                                <button
                                  onClick={() => handlePlayPause(track.track_url, track.id)}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                                  disabled={!track.track_url}
                                >
                                  {playingTrack === track.id ? (
                                    <>
                                      <Pause className="w-4 h-4" />
                                      Pausieren
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4" />
                                      Abspielen
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleOpenTest(track)}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-md transition-colors"
                                  title="Mit Ressource testen"
                                >
                                  <TestTube className="w-4 h-4" />
                                  Testen
                                </button>
                                <button
                                  onClick={() => handleStartEdit(track)}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => handleToggleDefault(track.id, track.is_default)}
                                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                                    track.is_default
                                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  }`}
                                >
                                  {track.is_default ? "Standard entfernen" : "Als Standard setzen"}
                                </button>
                                <button
                                  onClick={() => handleDelete(track.id)}
                                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-md transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Löschen
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* Test-Modal */}
      <AnimatePresence>
        {showTestModal && (() => {
          const track = tracks.find(t => t.id === showTestModal);
          if (!track) return null;

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
              onClick={handleCloseTest}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Hintergrundmusik testen
                  </h2>
                  <button
                    onClick={handleCloseTest}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Track: {track.track_title || track.track_id}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Figur: {track.figure_name || track.figure_id}
                    </p>
                  </div>

                  {/* Lautstärke-Slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Musik-Lautstärke: {(testMusicVolume * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0.01"
                      max="0.25"
                      step="0.01"
                      value={testMusicVolume}
                      onChange={(e) => {
                        const newVolume = parseFloat(e.target.value);
                        setTestMusicVolume(newVolume);
                        // Aktualisiere während Wiedergabe (unterstützt iOS Web Audio API)
                        if (testMusicAudio) {
                          setMusicVolume(testMusicAudio, newVolume);
                        }
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1%</span>
                      <span>25%</span>
                    </div>
                  </div>

                  {/* Success-Meldung */}
                  {saveSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex items-center gap-3"
                    >
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-green-800 font-medium">
                          Lautstärke erfolgreich gespeichert!
                        </p>
                        <p className="text-green-700 text-sm mt-1">
                          Die Einstellung wurde auf {(testMusicVolume * 100).toFixed(0)}% gesetzt.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Test-Ressource Info */}
                  {loadingTestResource ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-sm text-gray-600">Lade Test-Ressource...</p>
                    </div>
                  ) : testResource ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-800">
                        {testResource.audioUrl 
                          ? `✅ Test-Ressource gefunden: "${testResource.title}"`
                          : `ℹ️ Keine eigene Ressource gefunden. Verwende generische Test-Stimme.`
                        }
                      </p>
                    </div>
                  ) : null}

                  {/* Playback Controls */}
                  <div className="flex items-center justify-center gap-4">
                    {testMusicPlaying || testVoicePlaying ? (
                      <button
                        onClick={handleTestStop}
                        className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-colors"
                      >
                        <Pause className="w-5 h-5" />
                        Stoppen
                      </button>
                    ) : (
                      <button
                        onClick={() => handleTestPlay(track)}
                        disabled={loadingTestResource}
                        className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold transition-colors disabled:opacity-50"
                      >
                        <Play className="w-5 h-5" />
                        Test abspielen
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                  <button
                    onClick={handleCloseTest}
                    className="px-6 py-3 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                  >
                    Schließen
                  </button>
                  <button
                    onClick={() => handleSaveTestVolume(track)}
                    className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Lautstärke speichern
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

