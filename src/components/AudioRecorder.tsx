"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Play, Pause, Trash2, Upload } from "lucide-react";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  onError?: (error: string) => void;
  maxDuration?: number; // in seconds
}

export default function AudioRecorder({
  onRecordingComplete,
  onError,
  maxDuration = 600 // 10 minutes default
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Prüfe Mikrofon-Berechtigung beim Mount
  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  // Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [audioUrl]);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Sofort stoppen, nur Berechtigung prüfen
      setHasPermission(true);
    } catch (error: any) {
      console.error("Microphone permission error:", error);
      setHasPermission(false);
      if (onError) {
        onError("Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
      }
    }
  };

  const startRecording = async () => {
    try {
      if (hasPermission === false) {
        if (onError) {
          onError("Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
        }
        return;
      }

      // Wenn bereits eine Aufnahme vorhanden ist (die noch nicht zur Liste hinzugefügt wurde),
      // lösche sie, damit eine neue Aufnahme gestartet werden kann
      // Der Parent-Component (ClientResourceModal) setzt den AudioRecorder über die key-Prop zurück,
      // nachdem die Aufnahme zur Liste hinzugefügt wurde, sodass normalerweise keine Aufnahme vorhanden sein sollte
      if (audioBlob || audioUrl) {
        deleteRecording();
        // Kurze Verzögerung, damit UI aktualisiert wird
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      setRecordingTime(0);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType || 'audio/webm' 
        });
        setAudioBlob(blob);
        
        // Erstelle URL für Vorschau
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Cleanup stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        onRecordingComplete(blob);
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        if (onError) {
          onError("Fehler beim Aufnehmen. Bitte versuche es erneut.");
        }
        stopRecording();
      };

      mediaRecorder.start(1000); // Sammle Daten jede Sekunde
      setIsRecording(true);
      setIsPaused(false);

      // Starte Timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            if (onError) {
              onError(`Maximale Aufnahmezeit von ${Math.floor(maxDuration / 60)} Minuten erreicht.`);
            }
            return prev;
          }
          return newTime;
        });
      }, 1000);

    } catch (error: any) {
      console.error("Error starting recording:", error);
      setHasPermission(false);
      if (onError) {
        onError("Fehler beim Starten der Aufnahme. Bitte erlaube den Mikrofon-Zugriff.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isRecording && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Starte Timer wieder
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            if (onError) {
              onError(`Maximale Aufnahmezeit von ${Math.floor(maxDuration / 60)} Minuten erreicht.`);
            }
            return prev;
          }
          return newTime;
        });
      }, 1000);
    }
  };

  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setAudioBlob(null);
    setRecordingTime(0);
    setIsPlaying(false);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
  };

  const playPreview = () => {
    if (!audioUrl) return;

    if (audioElementRef.current) {
      if (isPlaying) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else {
        audioElementRef.current.play();
        setIsPlaying(true);
      }
    } else {
      const audio = new Audio(audioUrl);
      audioElementRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        audioElementRef.current = null;
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        if (onError) {
          onError("Fehler beim Abspielen der Vorschau.");
        }
        audioElementRef.current = null;
      };
      
      audio.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasPermission === false) {
    return (
      <div className="w-full p-6 bg-red-50 border-2 border-red-200 rounded-xl">
        <p className="text-red-800 text-center">
          Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen und lade die Seite neu.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Aufnahme-Status */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full p-4 bg-red-50 border-2 border-red-300 rounded-xl"
        >
          <div className="flex items-center justify-center space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-800 font-semibold">
              Aufnahme läuft: {formatTime(recordingTime)}
            </span>
          </div>
        </motion.div>
      )}

      {/* Audio-Vorschau */}
      {audioUrl && !isRecording && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full p-4 bg-green-50 border-2 border-green-300 rounded-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={playPreview}
                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>
              <span className="text-green-800 font-medium">
                Vorschau verfügbar ({formatTime(recordingTime)})
              </span>
            </div>
            <button
              onClick={deleteRecording}
              className="p-2 text-red-600 hover:bg-red-100 rounded-full transition-colors"
              title="Aufnahme löschen"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Steuerungs-Buttons */}
      <div className="flex items-center justify-center space-x-4">
        {!isRecording && (
          <button
            onClick={startRecording}
            className="flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition-colors shadow-lg"
          >
            <Mic className="w-5 h-5" />
            <span>{audioBlob ? "Neu aufnehmen" : "Aufnahme starten"}</span>
          </button>
        )}

        {isRecording && (
          <>
            {isPaused ? (
              <button
                onClick={resumeRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-full font-semibold transition-colors"
              >
                <Play className="w-5 h-5" />
                <span>Fortsetzen</span>
              </button>
            ) : (
              <button
                onClick={pauseRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full font-semibold transition-colors"
              >
                <Pause className="w-5 h-5" />
                <span>Pausieren</span>
              </button>
            )}
            <button
              onClick={stopRecording}
              className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-semibold transition-colors"
            >
              <Square className="w-5 h-5" />
              <span>Aufnahme beenden</span>
            </button>
          </>
        )}
      </div>

      {/* Info-Text */}
      <p className="text-sm text-gray-600 text-center">
        {isRecording 
          ? "Spreche jetzt deine Ressourcen-Geschichte ein..."
          : audioBlob 
          ? "Aufnahme abgeschlossen. Bitte füge diese Aufnahme zur Liste hinzu, bevor du eine neue Aufnahme startest."
          : "Klicke auf 'Aufnahme starten', um deine Ressourcen-Geschichte aufzunehmen."}
      </p>
    </div>
  );
}

