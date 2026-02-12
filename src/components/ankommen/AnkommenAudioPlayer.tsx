"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";
import { trackEvent } from "@/lib/analytics";

interface AnkommenAudioPlayerProps {
  audioUrl: string;
  title: string;
  subtitle?: string | null;
  onEnded?: () => void;
}

export default function AnkommenAudioPlayer({ 
  audioUrl, 
  title, 
  subtitle,
  onEnded 
}: AnkommenAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Screen Wake Lock: prevent phone from sleeping during playback
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        // Wake lock request failed (e.g. low battery)
      }
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try { await wakeLockRef.current.release(); } catch (err) {}
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPlaying) { requestWakeLock(); } else { releaseWakeLock(); }
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

  useEffect(() => { return () => { releaseWakeLock(); }; }, [releaseWakeLock]);

  useEffect(() => {
    // Erstelle Audio-Element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Event Listeners
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onEnded) {
        onEnded();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
    };
  }, [audioUrl, onEnded]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
      setIsPlaying(true);
      // Track audio play
      trackEvent({
        eventType: 'audio_play',
        metadata: {
          page_path: '/ankommen',
        },
      });
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 max-w-lg mx-auto">
      {/* Story Title */}
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-2xl md:text-3xl font-medium text-amber-900 mb-1">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs md:text-sm text-gray-400/70 italic mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Audio Player */}
      <div className="space-y-4 md:space-y-5">
        {/* Progress Bar */}
        <div className="w-full bg-amber-100 rounded-full h-1.5 md:h-2 overflow-hidden">
          <motion.div
            className="bg-amber-600 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={togglePlayPause}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                togglePlayPause();
              }
            }}
            className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-full p-4 md:p-5 shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            aria-label={isPlaying ? 'Pause' : 'Abspielen'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 md:w-6 md:h-6" />
            ) : (
              <Play className="w-5 h-5 md:w-6 md:h-6 ml-0.5" />
            )}
          </button>

          {duration > 0 && (
            <span className="text-xs md:text-sm text-gray-400/60 font-medium tabular-nums">
              {formatTime(duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

