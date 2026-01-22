"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { getBackgroundMusicUrl, DEFAULT_MUSIC_VOLUME } from "@/data/backgroundMusic";

interface DashboardAudioPlayerProps {
  audioUrl: string;
  title: string;
  subtitle?: string | null;
  resourceFigure?: any;
  onEnded?: () => void;
}

export default function DashboardAudioPlayer({
  audioUrl,
  title,
  subtitle,
  resourceFigure,
  onEnded
}: DashboardAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0); // Voice duration
  const [musicDuration, setMusicDuration] = useState(0); // Background music duration
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Calculate effective duration (longer of voice or music)
  const getEffectiveDuration = useCallback(() => {
    return Math.max(duration, musicDuration) || duration;
  }, [duration, musicDuration]);

  // Get time from mouse click position
  const getTimeFromMouseEvent = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressBarRef.current;
    const effDuration = getEffectiveDuration();
    if (!progressBar || !effDuration) return null;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressBarWidth = rect.width;
    const clickRatio = Math.max(0, Math.min(1, clickX / progressBarWidth));
    return clickRatio * effDuration;
  }, [getEffectiveDuration]);

  // Seek to specific time (both voice and music)
  const seekToTime = useCallback((newTime: number) => {
    const audio = audioRef.current;
    const musicElement = backgroundMusicRef.current;
    if (!audio) return;

    const voiceDuration = audio.duration || 0;
    const wasPlaying = isPlaying;

    console.log('[DashboardAudioPlayer] Seeking to:', newTime, 'Voice duration:', voiceDuration);

    // Seek voice audio (only if within voice duration)
    if (newTime < voiceDuration) {
      audio.currentTime = newTime;
      // Resume playing if it was playing
      if (wasPlaying && audio.paused) {
        audio.play().catch((err) => {
          console.warn('[DashboardAudioPlayer] Failed to resume voice after seek:', err);
        });
      }
    } else {
      // Seek is beyond voice duration - pause voice
      audio.pause();
      audio.currentTime = voiceDuration; // Set to end
    }

    // Synchronize background music to same time
    if (musicElement) {
      musicElement.currentTime = Math.min(newTime, musicElement.duration || newTime);
      // Resume playing if it was playing
      if (wasPlaying && musicElement.paused) {
        musicElement.play().catch((err: any) => {
          console.warn('[DashboardAudioPlayer] Failed to resume music after seek:', err);
        });
      }
    }

    setCurrentTime(newTime);
  }, [isPlaying]);

  // Initialize audio elements
  useEffect(() => {
    // Create main audio element
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    // Load background music asynchronously
    const loadBackgroundMusic = async () => {
      try {
        // Extract figure ID or name from resourceFigure
        const figureId = resourceFigure?.id || resourceFigure?.name || resourceFigure;
        console.log('[DashboardAudioPlayer] Loading background music for:', figureId);

        const backgroundMusicUrl = await getBackgroundMusicUrl(figureId);
        console.log('[DashboardAudioPlayer] Background music URL:', backgroundMusicUrl);

        if (backgroundMusicUrl) {
          const bgMusic = new Audio(backgroundMusicUrl);
          bgMusic.loop = true;
          bgMusic.volume = DEFAULT_MUSIC_VOLUME;
          backgroundMusicRef.current = bgMusic;

          // Set music duration when loaded
          bgMusic.addEventListener('loadedmetadata', () => {
            setMusicDuration(bgMusic.duration);
            console.log('[DashboardAudioPlayer] Background music duration:', bgMusic.duration);
          });

          console.log('[DashboardAudioPlayer] Background music loaded successfully');
        } else {
          console.log('[DashboardAudioPlayer] No background music found for:', figureId);
        }
      } catch (error) {
        console.error('[DashboardAudioPlayer] Error loading background music:', error);
      }
    };

    loadBackgroundMusic();

    // Event listeners for main audio
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      console.log('[DashboardAudioPlayer] Voice duration:', audio.duration);
    };

    const handleTimeUpdate = () => {
      const musicElement = backgroundMusicRef.current;
      // If voice is still playing, use voice time
      if (audio.currentTime < audio.duration) {
        setCurrentTime(audio.currentTime);
      } else if (musicElement && musicElement.duration > audio.duration) {
        // Voice ended but music continues - use music time
        setCurrentTime(musicElement.currentTime);
      }
    };

    const handleEnded = () => {
      console.log('[DashboardAudioPlayer] 🏁 ENDED event - Voice audio ended');
      console.log('[DashboardAudioPlayer] Voice duration was:', audio.duration);

      // Check if background music is still playing
      const musicElement = backgroundMusicRef.current;

      if (!musicElement) {
        console.log('[DashboardAudioPlayer] ❌ No background music element');
        setIsPlaying(false);
        setCurrentTime(0);
        if (onEnded) {
          onEnded();
        }
        return;
      }

      console.log('[DashboardAudioPlayer] 🎵 Music state check:');
      console.log('  - Music duration:', musicElement.duration);
      console.log('  - Music current time:', musicElement.currentTime);
      console.log('  - Music paused:', musicElement.paused);
      console.log('  - Music ended:', musicElement.ended);
      console.log('  - Music duration > voice duration:', musicElement.duration > audio.duration);

      const musicStillPlaying = musicElement && !musicElement.paused && !musicElement.ended;
      console.log('[DashboardAudioPlayer] Music still playing:', musicStillPlaying);

      if (musicStillPlaying && musicElement.duration > audio.duration) {
        // Music is longer and still playing - keep isPlaying true
        console.log('[DashboardAudioPlayer] ✅ Background music continues! Keeping isPlaying=true');
        console.log('[DashboardAudioPlayer] 🎵 Starting interval to track music time (every 100ms)');

        // Start interval to track music time
        const trackMusicTime = setInterval(() => {
          if (musicElement && !musicElement.paused && !musicElement.ended) {
            console.log('[DashboardAudioPlayer] 🎵 Tracking music time:', musicElement.currentTime);
            setCurrentTime(musicElement.currentTime);
          } else {
            // Music also ended
            console.log('[DashboardAudioPlayer] 🏁 Music ended! Stopping interval');
            clearInterval(trackMusicTime);
            setIsPlaying(false);
            setCurrentTime(0);
            if (onEnded) {
              onEnded();
            }
          }
        }, 100);

        // Store interval for cleanup (attach to window to access in cleanup)
        (window as any)._dashboardMusicTimeTracker = trackMusicTime;
        console.log('[DashboardAudioPlayer] ✅ Interval stored, music will continue playing');
      } else {
        // No music or music also ended
        console.log('[DashboardAudioPlayer] ❌ Music not playing or ended, stopping everything');
        setIsPlaying(false);
        setCurrentTime(0);

        // Stop background music
        if (musicElement) {
          musicElement.pause();
          musicElement.currentTime = 0;
        }

        if (onEnded) {
          onEnded();
        }
      }
    };

    const handlePlay = () => {
      console.log('[DashboardAudioPlayer] ▶️ PLAY event - Voice audio started playing');
      setIsPlaying(true);
      // Start background music when voice starts
      const musicElement = backgroundMusicRef.current;
      if (musicElement) {
        console.log('[DashboardAudioPlayer] 🎵 Starting background music');
        musicElement.play().catch(err => {
          console.warn('[DashboardAudioPlayer] Background music play failed:', err);
        });
      }
    };

    const handlePause = () => {
      console.log('[DashboardAudioPlayer] ⏸️ PAUSE event - Voice audio paused');
      console.log('[DashboardAudioPlayer] Current voice time:', audio.currentTime, '/ Voice duration:', audio.duration);
      const musicElement = backgroundMusicRef.current;
      if (musicElement) {
        console.log('[DashboardAudioPlayer] Current music time:', musicElement.currentTime, '/ Music duration:', musicElement.duration);
        console.log('[DashboardAudioPlayer] Music paused?', musicElement.paused, 'Music ended?', musicElement.ended);
      }

      // Check if this pause is because voice ended (currentTime === duration)
      const voiceEnded = audio.currentTime >= audio.duration;
      console.log('[DashboardAudioPlayer] Voice ended?', voiceEnded);

      if (voiceEnded && musicElement && musicElement.duration > audio.duration) {
        // Voice ended but music should continue - DON'T pause music, DON'T set isPlaying to false
        console.log('[DashboardAudioPlayer] 🎵 Voice ended but music continues - NOT pausing music!');
        // The 'ended' event will handle setting up the interval
        return;
      }

      // Normal pause (user clicked pause, or no music to continue)
      setIsPlaying(false);
      // Pause background music when voice pauses
      if (musicElement) {
        console.log('[DashboardAudioPlayer] 🎵 Pausing background music');
        musicElement.pause();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      // Clean up interval if exists
      const trackInterval = (window as any)._dashboardMusicTimeTracker;
      if (trackInterval) {
        clearInterval(trackInterval);
        (window as any)._dashboardMusicTimeTracker = null;
      }

      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.src = '';

      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
        backgroundMusicRef.current.src = '';
      }
    };
  }, [audioUrl, resourceFigure, onEnded]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    console.log('[DashboardAudioPlayer] 🎮 togglePlayPause clicked, current isPlaying:', isPlaying);

    if (isPlaying) {
      console.log('[DashboardAudioPlayer] 🎮 User clicked PAUSE button');
      audioRef.current.pause();
    } else {
      console.log('[DashboardAudioPlayer] 🎮 User clicked PLAY button');
      audioRef.current.play().catch((error) => {
        console.error('[DashboardAudioPlayer] Error playing audio:', error);
      });
    }
  };

  const restart = () => {
    if (!audioRef.current) return;

    const wasPlaying = isPlaying;
    audioRef.current.currentTime = 0;

    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.currentTime = 0;
    }

    setCurrentTime(0);

    if (wasPlaying) {
      audioRef.current.play();
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const newTime = getTimeFromMouseEvent(e);
    if (newTime !== null) {
      seekToTime(newTime);
      console.log('[DashboardAudioPlayer] Seeked both audio streams to:', newTime);
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const effectiveDuration = getEffectiveDuration();
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
      {/* Story Title */}
      <div className="text-center mb-6 md:mb-8">
        <h3 className="text-xl md:text-2xl font-medium text-amber-900 mb-2">
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm md:text-base text-amber-700/70">
            {subtitle}
          </p>
        )}
      </div>

      {/* Audio Player */}
      <div className="space-y-4 md:space-y-5">
        {/* Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          className="relative w-full h-3 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full overflow-hidden cursor-pointer group shadow-inner"
        >
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 rounded-full shadow-sm"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.1 }}
          >
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse" />
          </motion.div>
        </div>

        {/* Time Display */}
        <div className="flex justify-between items-center text-sm text-amber-600">
          <span className="font-medium tabular-nums">
            {formatTime(currentTime)}
          </span>
          <span className="font-medium tabular-nums">
            {formatTime(effectiveDuration)}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Restart Button */}
          {currentTime > 0 && (
            <motion.button
              whileHover={{ scale: 1.1, rotate: -15 }}
              whileTap={{ scale: 0.9 }}
              onClick={restart}
              className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 text-amber-700 rounded-full hover:from-orange-200 hover:to-amber-200 transition-all duration-300 shadow-lg hover:shadow-xl"
              aria-label="Von vorne beginnen"
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>
          )}

          {/* Play/Pause Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlayPause}
            disabled={isLoading}
            className="p-5 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white rounded-full shadow-xl hover:shadow-2xl hover:from-amber-600 hover:to-orange-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isPlaying ? 'Pause' : 'Abspielen'}
          >
            {isLoading ? (
              <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-1" />
            )}
          </motion.button>

          {/* Spacer for symmetry when restart button is hidden */}
          {currentTime === 0 && <div className="w-[52px]"></div>}
        </div>

        {/* Status Text */}
        <div className="text-center text-sm text-amber-600/70">
          {isPlaying ? '🔊 Audio wird abgespielt' : isLoading ? 'Lädt...' : '✓ Bereit zum Abspielen'}
        </div>
      </div>
    </div>
  );
}
