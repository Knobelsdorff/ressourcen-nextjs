"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { motion } from "framer-motion";

interface ExampleAudioPlayerProps {
  audioUrl: string;
  title: string;
}

export default function ExampleAudioPlayer({ audioUrl, title }: ExampleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
  }, [audioUrl]);

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
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      <h3 className="text-2xl md:text-3xl font-bold text-amber-900 mb-6 text-center">
        {title}
      </h3>

      {/* Audio Player */}
      <div className="space-y-4">
        {/* Progress Bar */}
        <div className="w-full bg-amber-100 rounded-full h-2 overflow-hidden">
          <motion.div
            className="bg-amber-600 h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-amber-700 font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <button
            onClick={togglePlayPause}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 ml-1" />
            )}
          </button>

          <span className="text-sm text-amber-700 font-medium w-16 text-right">
            {isPlaying ? 'Läuft...' : 'Pausiert'}
          </span>
        </div>
      </div>
    </div>
  );
}

