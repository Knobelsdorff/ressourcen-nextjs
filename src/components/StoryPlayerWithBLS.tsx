"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Play, Pause, RotateCcw, Rewind, FastForward, Sparkles, Volume2, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getBackgroundMusicUrl, DEFAULT_MUSIC_VOLUME } from "@/data/backgroundMusic";
import { useBLS } from "@/components/providers/bls-provider";

interface StoryPlayerWithBLSProps {
  audioUrl: string;
  title: string;
  subtitle?: string | null;
  resourceFigure?: any;
  showBLS?: boolean;
  onEnded?: () => void;
}

export default function StoryPlayerWithBLS({
  audioUrl,
  title,
  subtitle,
  resourceFigure,
  showBLS = false,
  onEnded
}: StoryPlayerWithBLSProps) {
  // Generate unique ID for this instance based on audioUrl
  const instanceId = useMemo(() => audioUrl, [audioUrl]);
  
  // Use BLS context to manage which instance is open
  const { isBLSOpen, openBLS, closeBLS } = useBLS();
  const isBLSExpanded = isBLSOpen(instanceId);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMusicLoaded, setIsMusicLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mobileVideoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isUserPausingRef = useRef(false);

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

    // Seek voice audio
    if (clampedTime < voiceDuration) {
      audio.currentTime = clampedTime;
    } else {
      audio.currentTime = voiceDuration;
    }

    // Synchronize background music to same time
    if (musicElement && musicDur) {
      const musicTime = Math.min(clampedTime, musicDur);
      musicElement.currentTime = musicTime;
    }

    // Sync video
    if (videoRef.current) {
      videoRef.current.currentTime = clampedTime % (videoRef.current.duration || clampedTime);
    }

    setCurrentTime(clampedTime);

    // Resume playback if was playing
    if (resumePlayback && wasPlaying) {
      if (clampedTime < voiceDuration && audio.paused) {
        audio.play().catch(err => console.warn('[StoryPlayerWithBLS] Seek resume voice error:', err));
      }
      if (musicElement && clampedTime < musicDur && musicElement.paused) {
        musicElement.play().catch(err => console.warn('[StoryPlayerWithBLS] Seek resume music error:', err));
      }
    }
  }, [isPlaying]);

  // Skip backward 5 seconds
  const skipBackward = useCallback(() => {
    const newTime = Math.max(0, currentTime - 5);
    seekToTime(newTime, true);
  }, [currentTime, seekToTime]);

  // Skip forward 5 seconds
  const skipForward = useCallback(() => {
    const effDuration = getEffectiveDuration();
    const newTime = Math.min(effDuration, currentTime + 5);
    seekToTime(newTime, true);
  }, [currentTime, getEffectiveDuration, seekToTime]);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const loadBackgroundMusic = async () => {
      try {
        const figureId = resourceFigure?.id || resourceFigure?.name || resourceFigure;
        const backgroundMusicUrl = await getBackgroundMusicUrl(figureId);

        if (backgroundMusicUrl) {
          const bgMusic = new Audio(backgroundMusicUrl);
          bgMusic.loop = true;
          bgMusic.volume = DEFAULT_MUSIC_VOLUME;
          bgMusic.preload = 'auto';
          backgroundMusicRef.current = bgMusic;

          bgMusic.addEventListener('loadedmetadata', () => {
            setMusicDuration(bgMusic.duration);
          });

          bgMusic.addEventListener('canplay', () => {
            setIsMusicLoaded(true);
          });

          bgMusic.load();
        } else {
          setIsMusicLoaded(true);
        }
      } catch (error) {
        console.error('[StoryPlayerWithBLS] Error loading background music:', error);
        setIsMusicLoaded(true);
      }
    };

    loadBackgroundMusic();

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      const musicElement = backgroundMusicRef.current;
      if (audio.currentTime < audio.duration) {
        setCurrentTime(audio.currentTime);
      } else if (musicElement && musicElement.duration > audio.duration) {
        setCurrentTime(musicElement.currentTime);
      }
    };

    const handleEnded = () => {
      const musicElement = backgroundMusicRef.current;

      if (!musicElement) {
        setIsPlaying(false);
        setCurrentTime(0);
        if (onEnded) onEnded();
        return;
      }

      const musicStillPlaying = musicElement && !musicElement.paused && !musicElement.ended;

      if (musicStillPlaying && musicElement.duration > audio.duration) {
        const trackMusicTime = setInterval(() => {
          if (isUserPausingRef.current) {
            clearInterval(trackMusicTime);
            (window as any)._storyPlayerMusicTracker = null;
            return;
          }

          if (musicElement && !musicElement.paused && !musicElement.ended) {
            setCurrentTime(musicElement.currentTime);
          } else if (musicElement.paused) {
            clearInterval(trackMusicTime);
            (window as any)._storyPlayerMusicTracker = null;
          } else {
            clearInterval(trackMusicTime);
            (window as any)._storyPlayerMusicTracker = null;
            setIsPlaying(false);
            setCurrentTime(0);
            if (onEnded) onEnded();
          }
        }, 100);

        (window as any)._storyPlayerMusicTracker = trackMusicTime;
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
        if (musicElement) {
          musicElement.pause();
          musicElement.currentTime = 0;
        }
        if (onEnded) onEnded();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      // Start video when audio plays
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    };

    const handlePause = () => {
      if (isUserPausingRef.current) {
        return;
      }

      const musicElement = backgroundMusicRef.current;
      const voiceEnded = audio.currentTime >= audio.duration - 0.1;

      if (voiceEnded && musicElement && musicElement.duration > audio.duration) {
        return;
      }

      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      const trackInterval = (window as any)._storyPlayerMusicTracker;
      if (trackInterval) {
        clearInterval(trackInterval);
        (window as any)._storyPlayerMusicTracker = null;
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

  // Automatisches Abspielen des Videos, wenn BLS erweitert wird
  useEffect(() => {
    if (isBLSExpanded) {
      // Versuche Desktop-Video abzuspielen
      if (videoRef.current) {
        videoRef.current.play().catch((error) => {
          console.warn('[StoryPlayerWithBLS] Desktop video autoplay failed:', error);
        });
      }
      
      // Versuche Mobile-Video abzuspielen
      if (mobileVideoRef.current) {
        mobileVideoRef.current.play().catch((error) => {
          console.warn('[StoryPlayerWithBLS] Mobile video autoplay failed:', error);
        });
      }
    }
  }, [isBLSExpanded]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      isUserPausingRef.current = true;
      audioRef.current.pause();
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setIsPlaying(false);
      setTimeout(() => {
        isUserPausingRef.current = false;
      }, 100);
    } else {
      const audio = audioRef.current;
      const bgMusic = backgroundMusicRef.current;

      // Wait for audio to be ready if it's not loaded yet
      if (!audio.duration || !isFinite(audio.duration)) {
        console.log('[StoryPlayerWithBLS] Audio not ready, waiting for metadata...');
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
              clearTimeout(timeout);
              resolve(true);
            } else {
              audio.addEventListener('loadedmetadata', onLoadedMetadata);
              audio.addEventListener('error', onError);
              if (audio.readyState === 0) {
                audio.load();
              }
            }
          });
          console.log('[StoryPlayerWithBLS] Audio ready, duration:', audio.duration);
        } catch (error) {
          console.error('[StoryPlayerWithBLS] Failed to load audio:', error);
          return;
        }
      }

      const voiceDuration = audio.duration || 0;

      try {
        const beyondVoice = currentTime >= voiceDuration && voiceDuration > 0;

        if (bgMusic && bgMusic.duration && isFinite(bgMusic.duration)) {
          bgMusic.currentTime = Math.min(currentTime, bgMusic.duration);
        }

        if (beyondVoice && bgMusic && bgMusic.duration) {
          await bgMusic.play();
          setIsPlaying(true);

          const trackMusicTime = setInterval(() => {
            if (isUserPausingRef.current) {
              clearInterval(trackMusicTime);
              (window as any)._storyPlayerMusicTracker = null;
              return;
            }
            if (bgMusic && !bgMusic.paused && !bgMusic.ended) {
              setCurrentTime(bgMusic.currentTime);
            } else if (bgMusic.paused) {
              clearInterval(trackMusicTime);
              (window as any)._storyPlayerMusicTracker = null;
            } else {
              clearInterval(trackMusicTime);
              (window as any)._storyPlayerMusicTracker = null;
              setIsPlaying(false);
              setCurrentTime(0);
            }
          }, 100);
          (window as any)._storyPlayerMusicTracker = trackMusicTime;
        } else {
          audio.currentTime = currentTime;

          const playPromises: Promise<void>[] = [];
          playPromises.push(audio.play());

          if (bgMusic && bgMusic.duration && isFinite(bgMusic.duration)) {
            playPromises.push(bgMusic.play());
          }

          await Promise.all(playPromises);
        }

        // Start video
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
        }
      } catch (error) {
        console.error('[StoryPlayerWithBLS] Error playing audio:', error);
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

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
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
      }
      setIsDragging(false);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (touch) {
        const newTime = getTimeFromPosition(touch.clientX);
        if (newTime !== null) {
          seekToTime(newTime);
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
    <div className="bg-gradient-to-br from-white via-amber-50/30 to-orange-50/30 rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
      {/* Main Content Area */}
      <div className="flex">
        {/* Audio Player Section */}
        <div className={`p-6 md:p-8 flex-1 transition-all duration-300 ${showBLS && isBLSExpanded ? 'lg:border-r lg:border-amber-100' : ''}`}>
          {/* Header with Title and BLS Toggle */}
          <div className="flex items-start justify-between mb-6">
            {/* Story Title */}
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-sm">
                  <Volume2 className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                  Deine Geschichte
                </span>
              </div>
              <h3 className="text-xl md:text-2xl font-medium text-amber-900 mb-1">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm md:text-base text-amber-700/70">
                  {subtitle}
                </p>
              )}
            </div>

            {/* BLS Toggle Button - Only show on larger screens when showBLS is true */}
            {showBLS && (
              <motion.button
                onClick={() => {
                  if (isBLSExpanded) {
                    closeBLS();
                  } else {
                    openBLS(instanceId);
                  }
                }}
                className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-700 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md ml-4"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Wirkung vertiefen</span>
                {isBLSExpanded ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </motion.button>
            )}
          </div>

          {/* Audio Controls */}
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

          {/* Mobile BLS Toggle */}
          {showBLS && (
            <div className="lg:hidden mt-6">
              <motion.button
                onClick={() => {
                  if (isBLSExpanded) {
                    closeBLS();
                  } else {
                    openBLS(instanceId);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-amber-100 to-orange-100 hover:from-amber-200 hover:to-orange-200 text-amber-700 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Wirkung vertiefen</span>
                <motion.div
                  animate={{ rotate: isBLSExpanded ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.div>
              </motion.button>
            </div>
          )}
        </div>

        {/* BLS Video Section - Expandable horizontally */}
        <AnimatePresence>
          {showBLS && isBLSExpanded && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="hidden lg:block bg-gradient-to-br from-amber-50 to-orange-50 border-l border-amber-100 overflow-hidden"
            >
              <div className="w-[400px] xl:w-[450px] p-6 md:p-8">
                {/* BLS Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-sm">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-amber-900 font-medium">Wirkung vertiefen</h4>
                    <p className="text-xs text-amber-600">(optional)</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-amber-800 leading-relaxed mb-4">
                  Manche Menschen empfinden die Geschichte intensiver, wenn sie dabei sanft abwechselnd auf ihre Oberarme klopfen.
                </p>

                {/* Video */}
                <div className="relative rounded-xl overflow-hidden shadow-lg bg-amber-900/10">
                  <video
                    ref={videoRef}
                    src="/videos/Bilaterale Stimulation.mp4"
                    loop
                    muted
                    playsInline
                    preload="auto"
                    className="w-full"
                    style={{ aspectRatio: '1280 / 852' }}
                  >
                    Dein Browser unterstützt das Video-Element nicht.
                  </video>
                </div>

                {/* Additional Info */}
                <p className="text-xs text-amber-600/80 mt-3 text-center">
                  Bilaterale Stimulation
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile BLS Section - Below the player */}
      <AnimatePresence>
        {showBLS && isBLSExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden bg-gradient-to-br from-amber-50 to-orange-50 border-t border-amber-100 overflow-hidden"
          >
            <div className="p-6">
              {/* BLS Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-sm">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-amber-900 font-medium">Wirkung vertiefen</h4>
                  <p className="text-xs text-amber-600">(optional)</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-amber-800 leading-relaxed mb-4">
                Manche Menschen empfinden die Geschichte intensiver, wenn sie dabei sanft abwechselnd auf ihre Oberarme klopfen.
              </p>

              {/* Video */}
              <div className="relative rounded-xl overflow-hidden shadow-lg bg-amber-900/10">
                <video
                  ref={mobileVideoRef}
                  src="/videos/Bilaterale Stimulation.mp4"
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full"
                  style={{ aspectRatio: '1280 / 852' }}
                >
                  Dein Browser unterstützt das Video-Element nicht.
                </video>
              </div>

              {/* Additional Info */}
              <p className="text-xs text-amber-600/80 mt-3 text-center">
                Bilaterale Stimulation
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
