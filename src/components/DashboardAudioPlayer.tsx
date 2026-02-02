"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Rewind, FastForward } from "lucide-react";
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
  const [isMusicLoaded, setIsMusicLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isUserPausingRef = useRef(false); // Track if user initiated pause

  // Calculate effective duration (longer of voice or music)
  const getEffectiveDuration = useCallback(() => {
    // Handle NaN and invalid values
    const validDuration = isFinite(duration) && duration > 0 ? duration : 0;
    const validMusicDuration = isFinite(musicDuration) && musicDuration > 0 ? musicDuration : 0;

    const maxDuration = Math.max(validDuration, validMusicDuration);

    // If both are invalid, return 0 instead of NaN
    return maxDuration > 0 ? maxDuration : 0;
  }, [duration, musicDuration]);


  // Seek to specific time (both voice and music) and resume playback if needed
  const seekToTime = useCallback((newTime: number, resumePlayback: boolean = true) => {
    const audio = audioRef.current;
    const musicElement = backgroundMusicRef.current;
    if (!audio) return;

    const voiceDuration = audio.duration || 0;
    const musicDur = musicElement?.duration || 0;
    const effDuration = Math.max(voiceDuration, musicDur);

    // Clamp time to valid range
    const clampedTime = Math.max(0, Math.min(newTime, effDuration));
    const wasPlaying = isPlaying;

    console.log('[DashboardAudioPlayer] Seeking to:', clampedTime, 'Voice duration:', voiceDuration, 'isPlaying:', isPlaying);

    // Seek voice audio
    if (clampedTime < voiceDuration) {
      audio.currentTime = clampedTime;
    } else {
      // Beyond voice duration - set to end
      audio.currentTime = voiceDuration;
    }

    // Synchronize background music to same time
    if (musicElement && musicDur) {
      const musicTime = Math.min(clampedTime, musicDur);
      musicElement.currentTime = musicTime;
    }

    setCurrentTime(clampedTime);

    // Resume playback if was playing
    if (resumePlayback && wasPlaying) {
      // Resume voice if within duration
      if (clampedTime < voiceDuration && audio.paused) {
        audio.play().catch(err => console.warn('[DashboardAudioPlayer] Seek resume voice error:', err));
      }
      // Resume music if within duration
      if (musicElement && clampedTime < musicDur && musicElement.paused) {
        musicElement.play().catch(err => console.warn('[DashboardAudioPlayer] Seek resume music error:', err));
      }
    }
  }, [isPlaying]);

  // Skip backward 5 seconds
  const skipBackward = useCallback(() => {
    const newTime = Math.max(0, currentTime - 5);
    console.log('[DashboardAudioPlayer] Skip backward to:', newTime);
    seekToTime(newTime, true);
  }, [currentTime, seekToTime]);

  // Skip forward 5 seconds
  const skipForward = useCallback(() => {
    const effDuration = getEffectiveDuration();
    const newTime = Math.min(effDuration, currentTime + 5);
    console.log('[DashboardAudioPlayer] Skip forward to:', newTime);
    seekToTime(newTime, true);
  }, [currentTime, getEffectiveDuration, seekToTime]);

  // Initialize audio elements
  useEffect(() => {
    console.log('poopoo [DashboardAudioPlayer] Initializing audio player');
    console.log('poopoo [DashboardAudioPlayer] audioUrl received:', audioUrl);
    console.log('poopoo [DashboardAudioPlayer] title:', title);
    console.log('poopoo [DashboardAudioPlayer] resourceFigure:', resourceFigure);

    // Create main audio element
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    // Add error handler for audio loading
    audio.addEventListener('error', (e) => {
      console.error('poopoo [DashboardAudioPlayer] AUDIO LOAD ERROR:', {
        error: audio.error,
        errorCode: audio.error?.code,
        errorMessage: audio.error?.message,
        audioUrl: audioUrl,
        networkState: audio.networkState,
        readyState: audio.readyState
      });
    });

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
          bgMusic.preload = 'auto';
          backgroundMusicRef.current = bgMusic;

          // Set music duration when loaded
          bgMusic.addEventListener('loadedmetadata', () => {
            setMusicDuration(bgMusic.duration);
            console.log('[DashboardAudioPlayer] Background music duration:', bgMusic.duration);
          });

          // Track when music is ready to play
          bgMusic.addEventListener('canplaythrough', () => {
            setIsMusicLoaded(true);
            console.log('[DashboardAudioPlayer] Background music ready to play');
          });

          // Also mark as loaded on canplay for faster response
          bgMusic.addEventListener('canplay', () => {
            setIsMusicLoaded(true);
            console.log('[DashboardAudioPlayer] Background music can play');
          });

          // Force load
          bgMusic.load();

          console.log('[DashboardAudioPlayer] Background music loading started');
        } else {
          console.log('[DashboardAudioPlayer] No background music found for:', figureId);
          setIsMusicLoaded(true); // No music to load, so mark as "loaded"
        }
      } catch (error) {
        console.error('[DashboardAudioPlayer] Error loading background music:', error);
        setIsMusicLoaded(true); // Error loading, proceed without music
      }
    };

    loadBackgroundMusic();

    // Event listeners for main audio
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      console.log('poopoo [DashboardAudioPlayer] Audio loaded successfully!');
      console.log('poopoo [DashboardAudioPlayer] Voice duration:', audio.duration);
      console.log('poopoo [DashboardAudioPlayer] Audio src:', audio.src);
    };

    const handleCanPlay = () => {
      console.log('poopoo [DashboardAudioPlayer] Audio can play - ready for playback');
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
      console.log('[DashboardAudioPlayer] ENDED event - Voice audio ended naturally');
      console.log('[DashboardAudioPlayer] Voice duration was:', audio.duration);

      // Check if background music is still playing
      const musicElement = backgroundMusicRef.current;

      if (!musicElement) {
        console.log('[DashboardAudioPlayer] No background music element');
        setIsPlaying(false);
        setCurrentTime(0);
        if (onEnded) {
          onEnded();
        }
        return;
      }

      const musicStillPlaying = musicElement && !musicElement.paused && !musicElement.ended;

      if (musicStillPlaying && musicElement.duration > audio.duration) {
        // Music is longer and still playing - keep isPlaying true
        console.log('[DashboardAudioPlayer] Background music continues');

        // Start interval to track music time
        const trackMusicTime = setInterval(() => {
          // If user paused, just stop the interval but don't reset time
          if (isUserPausingRef.current) {
            console.log('[DashboardAudioPlayer] User paused, stopping interval without reset');
            clearInterval(trackMusicTime);
            (window as any)._dashboardMusicTimeTracker = null;
            return;
          }

          if (musicElement && !musicElement.paused && !musicElement.ended) {
            setCurrentTime(musicElement.currentTime);
          } else if (musicElement.paused) {
            // Music was paused (possibly by user) - just stop tracking, don't reset
            console.log('[DashboardAudioPlayer] Music paused, stopping interval');
            clearInterval(trackMusicTime);
            (window as any)._dashboardMusicTimeTracker = null;
          } else {
            // Music actually ended (reached the end)
            console.log('[DashboardAudioPlayer] Music ended naturally, resetting');
            clearInterval(trackMusicTime);
            (window as any)._dashboardMusicTimeTracker = null;
            setIsPlaying(false);
            setCurrentTime(0);
            if (onEnded) {
              onEnded();
            }
          }
        }, 100);

        // Store interval for cleanup
        (window as any)._dashboardMusicTimeTracker = trackMusicTime;
      } else {
        // No music or music also ended - fully complete
        console.log('[DashboardAudioPlayer] Playback complete');
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
      console.log('[DashboardAudioPlayer] PLAY event - Voice audio started playing');
      setIsPlaying(true);
      // Background music is now started in togglePlayPause for synchronization
    };

    const handlePause = () => {
      console.log('[DashboardAudioPlayer] PAUSE event - Voice audio paused');

      // If user initiated the pause via togglePlayPause, don't do anything here
      // (togglePlayPause already handles setting isPlaying to false)
      if (isUserPausingRef.current) {
        console.log('[DashboardAudioPlayer] User-initiated pause, skipping handlePause logic');
        return;
      }

      const musicElement = backgroundMusicRef.current;

      // Check if this pause is because voice ended (currentTime === duration)
      const voiceEnded = audio.currentTime >= audio.duration - 0.1; // Small tolerance

      if (voiceEnded && musicElement && musicElement.duration > audio.duration) {
        // Voice ended but music should continue - DON'T pause music, DON'T set isPlaying to false
        console.log('[DashboardAudioPlayer] Voice ended but music continues');
        // The 'ended' event will handle setting up the interval
        return;
      }

      // Normal pause (not user-initiated, maybe browser triggered)
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
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
      audio.removeEventListener('canplay', handleCanPlay);
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

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    console.log('[DashboardAudioPlayer] togglePlayPause clicked, current isPlaying:', isPlaying);

    if (isPlaying) {
      console.log('[DashboardAudioPlayer] User clicked PAUSE button');
      // Mark as user-initiated pause to prevent resetting currentTime
      isUserPausingRef.current = true;
      audioRef.current.pause();
      // Also pause background music
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
      setIsPlaying(false);
      // Reset the flag after a short delay
      setTimeout(() => {
        isUserPausingRef.current = false;
      }, 100);
    } else {
      console.log('[DashboardAudioPlayer] User clicked PLAY button');

      // Ensure both audios start together
      const audio = audioRef.current;
      const bgMusic = backgroundMusicRef.current;

      // Wait for audio to be ready if it's not loaded yet
      if (!audio.duration || !isFinite(audio.duration)) {
        console.log('[DashboardAudioPlayer] Audio not ready, waiting for metadata...');
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Audio load timeout')), 5000);

            const onLoadedMetadata = () => {
              clearTimeout(timeout);
              audio.removeEventListener('loadedmetadata', onLoadedMetadata);
              audio.removeEventListener('error', onError);
              resolve(true);
            };

            const onError = () => {
              clearTimeout(timeout);
              audio.removeEventListener('loadedmetadata', onLoadedMetadata);
              audio.removeEventListener('error', onError);
              reject(new Error('Audio load error'));
            };

            if (audio.readyState >= 1) {
              // Metadata already loaded
              clearTimeout(timeout);
              resolve(true);
            } else {
              audio.addEventListener('loadedmetadata', onLoadedMetadata);
              audio.addEventListener('error', onError);
              // Trigger load if not already loading
              if (audio.readyState === 0) {
                audio.load();
              }
            }
          });
          console.log('[DashboardAudioPlayer] Audio ready, duration:', audio.duration);
        } catch (error) {
          console.error('[DashboardAudioPlayer] Failed to load audio:', error);
          return;
        }
      }

      const voiceDuration = audio.duration || 0;

      try {
        // Check if we're beyond voice duration (only music should play)
        const beyondVoice = currentTime >= voiceDuration && voiceDuration > 0;
        console.log('[DashboardAudioPlayer] Resume at currentTime:', currentTime, 'voiceDuration:', voiceDuration, 'beyondVoice:', beyondVoice);

        // Sync background music to current time
        if (bgMusic && bgMusic.duration && isFinite(bgMusic.duration)) {
          bgMusic.currentTime = Math.min(currentTime, bgMusic.duration);
        }

        if (beyondVoice && bgMusic && bgMusic.duration) {
          // Only play background music, voice already ended
          await bgMusic.play();
          setIsPlaying(true);
          console.log('[DashboardAudioPlayer] Only music resumed (beyond voice duration)');

          // Start interval to track music time since voice won't update it
          const trackMusicTime = setInterval(() => {
            if (isUserPausingRef.current) {
              clearInterval(trackMusicTime);
              (window as any)._dashboardMusicTimeTracker = null;
              return;
            }
            if (bgMusic && !bgMusic.paused && !bgMusic.ended) {
              setCurrentTime(bgMusic.currentTime);
            } else if (bgMusic.paused) {
              clearInterval(trackMusicTime);
              (window as any)._dashboardMusicTimeTracker = null;
            } else {
              clearInterval(trackMusicTime);
              (window as any)._dashboardMusicTimeTracker = null;
              setIsPlaying(false);
              setCurrentTime(0);
            }
          }, 100);
          (window as any)._dashboardMusicTimeTracker = trackMusicTime;
        } else {
          // Normal case: play both voice and music
          audio.currentTime = currentTime;

          const playPromises: Promise<void>[] = [];
          playPromises.push(audio.play());

          if (bgMusic && bgMusic.duration && isFinite(bgMusic.duration)) {
            playPromises.push(bgMusic.play());
          }

          await Promise.all(playPromises);
          console.log('[DashboardAudioPlayer] Both audio tracks started successfully');
        }
      } catch (error) {
        console.error('[DashboardAudioPlayer] Error playing audio:', error);
        // If main audio fails, try to stop background music too
        if (bgMusic && !bgMusic.paused) {
          bgMusic.pause();
        }
      }
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

  // Get time from position (mouse or touch)
  const getTimeFromPosition = useCallback((clientX: number) => {
    const progressBar = progressBarRef.current;
    const effDuration = getEffectiveDuration();
    if (!progressBar || !effDuration) return null;

    const rect = progressBar.getBoundingClientRect();
    const posX = clientX - rect.left;
    const progressBarWidth = rect.width;
    const clickRatio = Math.max(0, Math.min(1, posX / progressBarWidth));
    return clickRatio * effDuration;
  }, [getEffectiveDuration]);

  const handleProgressBarMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const newTime = getTimeFromPosition(e.clientX);
    if (newTime !== null) {
      seekToTime(newTime);
      console.log('[DashboardAudioPlayer] Started seeking to:', newTime);
    }
  }, [getTimeFromPosition, seekToTime]);

  const handleProgressBarTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    if (touch) {
      const newTime = getTimeFromPosition(touch.clientX);
      if (newTime !== null) {
        seekToTime(newTime);
        console.log('[DashboardAudioPlayer] Touch started seeking to:', newTime);
      }
    }
  }, [getTimeFromPosition, seekToTime]);

  // Handle mouse/touch move and up events for dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newTime = getTimeFromPosition(e.clientX);
      if (newTime !== null) {
        setCurrentTime(newTime);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        const newTime = getTimeFromPosition(touch.clientX);
        if (newTime !== null) {
          setCurrentTime(newTime);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      const newTime = getTimeFromPosition(e.clientX);
      if (newTime !== null) {
        seekToTime(newTime);
        console.log('[DashboardAudioPlayer] Finished seeking to:', newTime);
      }
      setIsDragging(false);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (touch) {
        const newTime = getTimeFromPosition(touch.clientX);
        if (newTime !== null) {
          seekToTime(newTime);
          console.log('[DashboardAudioPlayer] Touch finished seeking to:', newTime);
        }
      }
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, getTimeFromPosition, seekToTime]);


  const formatTime = (seconds: number): string => {
    // Handle NaN, Infinity, and invalid values
    if (!isFinite(seconds) || seconds < 0) return '0:00';
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
        {/* Progress Bar with improved touch/mouse handling */}
        <div
          ref={progressBarRef}
          onMouseDown={handleProgressBarMouseDown}
          onTouchStart={handleProgressBarTouchStart}
          className="relative w-full h-4 bg-gradient-to-r from-orange-100 to-amber-100 rounded-full overflow-hidden cursor-pointer group shadow-inner touch-none select-none"
        >
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 rounded-full shadow-sm pointer-events-none"
            style={{ width: `${progress}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: isDragging ? 0 : 0.1 }}
          >
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse" />
          </motion.div>
          {/* Draggable thumb indicator */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-md border-2 border-amber-500 pointer-events-none transition-transform"
            style={{ left: `calc(${progress}% - 10px)` }}
          />
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
        <div className="flex items-center justify-center gap-3">
          {/* Restart Button - Always visible */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: -15 }}
            whileTap={{ scale: 0.9 }}
            onClick={restart}
            disabled={isLoading}
            className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 text-amber-700 rounded-full hover:from-orange-200 hover:to-amber-200 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Von vorne beginnen"
          >
            <RotateCcw className="w-5 h-5" />
          </motion.button>

          {/* Rewind 5s Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={skipBackward}
            disabled={isLoading || currentTime <= 0}
            className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 text-amber-700 rounded-full hover:from-orange-200 hover:to-amber-200 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="5 Sekunden zurück"
          >
            <Rewind className="w-5 h-5" />
          </motion.button>

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

          {/* Forward 5s Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={skipForward}
            disabled={isLoading || currentTime >= effectiveDuration}
            className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 text-amber-700 rounded-full hover:from-orange-200 hover:to-amber-200 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="5 Sekunden vorwärts"
          >
            <FastForward className="w-5 h-5" />
          </motion.button>

          {/* Spacer for symmetry */}
          <div className="w-[52px]"></div>
        </div>

        {/* Status Text */}
        {(isLoading || isPlaying) && (
          <div className="text-center text-sm text-amber-600/70">
            {isLoading ? 'Lädt...' : 'Audio wird abgespielt'}
          </div>
        )}
      </div>
    </div>
  );
}
