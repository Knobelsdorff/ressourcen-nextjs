"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Square, Play, Pause, Trash2, RotateCcw, Check } from "lucide-react";

interface AudioRecorderProps {
  /** Wird mit dem Blob aufgerufen, oder mit null wenn die Aufnahme verworfen wurde. */
  onRecordingComplete: (audioBlob: Blob | null) => void;
  onError?: (error: string) => void;
  maxDuration?: number; // in seconds
}

// Anzahl der Balken in der Wellenform-Anzeige
const WAVE_BARS = 48;

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
  // Live-Pegel während der Aufnahme (0..1 pro Balken)
  const [levels, setLevels] = useState<number[]>(() => new Array(WAVE_BARS).fill(0));
  // Eingefrorene Wellenform der fertigen Aufnahme
  const [capturedWave, setCapturedWave] = useState<number[]>([]);

  // Mikrofon-Auswahl
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Web-Audio-Analyse für die Wellenform
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const levelsRef = useRef<number[]>(new Array(WAVE_BARS).fill(0));
  const isPausedRef = useRef(false);

  /**
   * Liest die verfügbaren Mikrofone aus. Labels sind erst nach erteilter
   * Berechtigung sichtbar, daher wird dies nach dem Permission-Check aufgerufen.
   */
  const loadDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all.filter((d) => d.kind === "audioinput");
      setDevices(mics);
      setSelectedDeviceId((prev) => {
        // Bisherige Auswahl behalten, wenn das Gerät noch existiert
        if (prev && mics.some((m) => m.deviceId === prev)) return prev;
        return mics[0]?.deviceId ?? "";
      });
    } catch (error) {
      console.warn("[AudioRecorder] Could not enumerate devices:", error);
    }
  }, []);

  // Prüfe Mikrofon-Berechtigung beim Mount
  useEffect(() => {
    checkMicrophonePermission();
    // Auf Wechsel von Mikrofonen reagieren (z.B. Headset ein-/ausstecken)
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener("devicechange", loadDevices);
      return () => {
        navigator.mediaDevices.removeEventListener("devicechange", loadDevices);
      };
    }
  }, [loadDevices]);

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
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [audioUrl]);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Sofort stoppen, nur Berechtigung prüfen
      setHasPermission(true);
      // Erst jetzt sind die Geräte-Labels lesbar
      await loadDevices();
    } catch (error: any) {
      console.error("Microphone permission error:", error);
      setHasPermission(false);
      if (onError) {
        onError("Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen.");
      }
    }
  };

  /**
   * Startet die Live-Analyse des Mikrofon-Signals und schiebt den aktuellen
   * Lautstärke-Pegel als neuen Balken in die Wellenform (Scroll von rechts nach links).
   */
  const startWaveAnalysis = useCallback((stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;

      const buffer = new Uint8Array(analyser.fftSize);
      let lastPush = 0;

      const tick = (now: number) => {
        rafRef.current = requestAnimationFrame(tick);

        const currentAnalyser = analyserRef.current;
        if (!currentAnalyser) return;

        // Während der Pause bleibt die Wellenform stehen
        if (isPausedRef.current) return;

        // Neuer Balken ca. alle 90ms – ruhiger Lauf statt hektischem Flackern
        if (now - lastPush < 90) return;
        lastPush = now;

        currentAnalyser.getByteTimeDomainData(buffer);

        // RMS über das Zeitsignal (128 = Stille bei Uint8-Zeitdaten)
        let sumSquares = 0;
        for (let i = 0; i < buffer.length; i++) {
          const sample = (buffer[i] - 128) / 128;
          sumSquares += sample * sample;
        }
        const rms = Math.sqrt(sumSquares / buffer.length);

        // Sanfte Kurve, damit auch leise Sprache sichtbar bleibt
        const level = Math.min(1, Math.pow(rms * 3.2, 0.7));

        const next = [...levelsRef.current.slice(1), level];
        levelsRef.current = next;
        setLevels(next);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (error) {
      // Wellenform ist rein visuell – ein Fehler darf die Aufnahme nie blockieren
      console.warn("[AudioRecorder] Waveform analysis unavailable:", error);
    }
  }, []);

  const stopWaveAnalysis = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

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
      if (audioBlob || audioUrl) {
        deleteRecording();
        // Kurze Verzögerung, damit UI aktualisiert wird
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          // Gewähltes Mikrofon verwenden, sonst Standardgerät
          ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];
      setRecordingTime(0);

      // Labels sind nach dem ersten getUserMedia verfügbar
      if (devices.length === 0) {
        loadDevices();
      }

      // Wellenform zurücksetzen und Live-Analyse starten
      levelsRef.current = new Array(WAVE_BARS).fill(0);
      setLevels(levelsRef.current);
      setCapturedWave([]);
      isPausedRef.current = false;
      startWaveAnalysis(stream);

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
    const recorder = mediaRecorderRef.current;
    if (!recorder || !isRecording) return;

    // Puffer leeren: letzten Chunk anfordern, damit nichts verloren geht (start(1000) = 1s-Chunks)
    if (recorder.state === 'recording' || recorder.state === 'paused') {
      try {
        recorder.requestData();
      } catch (_) {
        // requestData() nicht in allen Browsern/States unterstützt
      }
    }

    // Wellenform der Aufnahme einfrieren, bevor die Analyse endet
    setCapturedWave(levelsRef.current.filter(v => v > 0).length > 0 ? [...levelsRef.current] : []);
    stopWaveAnalysis();
    isPausedRef.current = false;

    // Kurz warten, damit ondataavailable für den letzten Chunk noch feuert, bevor onstop den Blob baut
    setTimeout(() => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, 150);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording && !isPaused) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      isPausedRef.current = true;

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
      isPausedRef.current = false;

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
    setCapturedWave([]);
    levelsRef.current = new Array(WAVE_BARS).fill(0);
    setLevels(levelsRef.current);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    // Eltern-Komponente muss wissen, dass keine Aufnahme mehr vorliegt
    onRecordingComplete(null);
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
      <div className="w-full sm:p-5 p-4 bg-amber-50/60 border border-amber-400 rounded-lg">
        <p className="text-amber-800 max-sm:text-sm text-center">
          Mikrofon-Zugriff wurde verweigert. Bitte erlaube den Zugriff in den Browser-Einstellungen und lade die Seite neu.
        </p>
      </div>
    );
  }

  const showWave = isRecording || capturedWave.length > 0;
  const waveData = isRecording ? levels : capturedWave;

  return (
    <div className="w-full space-y-4">
      {/* Mikrofon-Auswahl – nur vor der Aufnahme änderbar */}
      {!audioBlob && (
        <div>
          <label
            htmlFor="mic-select"
            className="block text-sm text-amber-700 mb-2"
          >
            Mikrofon
          </label>
          <select
            id="mic-select"
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            disabled={isRecording || devices.length === 0}
            className="w-full sm:px-4 px-3 sm:py-2.5 py-2 bg-white border border-amber-400 rounded-lg text-amber-900 focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 transition-colors disabled:bg-amber-50 disabled:text-amber-600 max-sm:text-sm"
          >
            {devices.length === 0 ? (
              <option value="">Mikrofone werden geladen...</option>
            ) : (
              devices.map((device, index) => (
                <option key={device.deviceId || index} value={device.deviceId}>
                  {device.label || `Mikrofon ${index + 1}`}
                </option>
              ))
            )}
          </select>
          {isRecording && (
            <p className="mt-2 text-xs text-amber-600">
              Während der Aufnahme nicht änderbar.
            </p>
          )}
        </div>
      )}

      {/* Wellenform + Status */}
      <AnimatePresence initial={false}>
        {showWave && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="w-full sm:px-5 px-4 sm:py-4 py-3 bg-amber-50/60 border border-amber-400 rounded-lg">
              {/* Kopfzeile: Status links, Zeit rechts */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isRecording && !isPaused && (
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-amber-600"
                      animate={{ opacity: [1, 0.25, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  <span className="text-sm text-amber-700">
                    {isRecording
                      ? isPaused
                        ? "Pausiert"
                        : "Aufnahme läuft"
                      : "Aufnahme fertig"}
                  </span>
                </div>
                <span className="text-sm text-amber-900 tabular-nums tracking-tight">
                  {formatTime(recordingTime)}
                </span>
              </div>

              {/* Wellenform */}
              <div
                className="flex items-center justify-between gap-[2px] h-12"
                aria-hidden="true"
              >
                {waveData.map((level, index) => (
                  <motion.span
                    key={index}
                    className={`flex-1 rounded-full ${
                      isRecording && !isPaused ? "bg-amber-600" : "bg-amber-400"
                    }`}
                    animate={{ height: `${Math.max(6, level * 100)}%` }}
                    transition={{ duration: 0.12, ease: "easeOut" }}
                    style={{ minHeight: 3 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steuerung */}
      {!audioBlob ? (
        <div className="flex items-center justify-center gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-medium transition-colors max-sm:text-sm"
            >
              <Mic className="w-4 h-4" />
              <span>Aufnahme starten</span>
            </button>
          ) : (
            <>
              <button
                onClick={isPaused ? resumeRecording : pauseRecording}
                className="flex items-center gap-2 px-4 py-2 border border-amber-400 text-amber-800 hover:bg-amber-50 rounded-md font-medium transition-colors max-sm:text-sm"
              >
                {isPaused ? (
                  <>
                    <Play className="w-4 h-4" />
                    <span>Fortsetzen</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pausieren</span>
                  </>
                )}
              </button>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-medium transition-colors max-sm:text-sm"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Aufnahme beenden</span>
              </button>
            </>
          )}
        </div>
      ) : (
        /* Fertige Aufnahme: anhören oder verwerfen */
        <div className="flex items-center justify-between gap-3 sm:px-4 px-3 sm:py-3 py-2.5 bg-white border border-amber-400 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={playPreview}
              className="w-8 h-8 flex items-center justify-center border border-amber-400 text-amber-700 hover:bg-amber-50 rounded-md transition-colors flex-shrink-0"
              title={isPlaying ? "Vorschau pausieren" : "Vorschau anhören"}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 ml-0.5" />
              )}
            </button>
            <span className="text-sm text-amber-800 truncate">
              {isPlaying ? "Wird abgespielt" : "Anhören"} · {formatTime(recordingTime)}
            </span>
          </div>
          <button
            onClick={deleteRecording}
            className="flex items-center gap-1.5 px-2 py-1.5 text-amber-700 hover:text-amber-900 text-sm rounded-md transition-colors flex-shrink-0"
            title="Aufnahme verwerfen und neu aufnehmen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="max-sm:hidden">Neu aufnehmen</span>
          </button>
        </div>
      )}

      {/* Hinweis */}
      <p className="text-sm text-amber-700 text-center leading-snug">
        {isRecording
          ? "Sprich jetzt deine Ressourcen-Geschichte ein..."
          : audioBlob
          ? "Höre die Aufnahme an oder nimm sie neu auf."
          : "Wähle dein Mikrofon und starte die Aufnahme."}
      </p>
    </div>
  );
}
