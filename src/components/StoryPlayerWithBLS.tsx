"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Sparkles, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { getBackgroundMusicUrl, DEFAULT_MUSIC_VOLUME } from "@/data/backgroundMusic";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [musicDuration, setMusicDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const getEffectiveDuration = useCallback(() => {
    return Math.max(duration, musicDuration) || duration;
  }, [duration, musicDuration]);

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

  const seekToTime = useCallback((newTime: number) => {
    const audio = audioRef.current;
    const musicElement = backgroundMusicRef.current;
    if (!audio) return;

    const voiceDuration = audio.duration || 0;
    const wasPlaying = isPlaying;

    if (newTime < voiceDuration) {
      audio.currentTime = newTime;
      if (wasPlaying && audio.paused) {
        audio.play().catch(() => {});
      }
    } else {
      audio.pause();
      audio.currentTime = voiceDuration;
    }

    if (musicElement) {
      musicElement.currentTime = Math.min(newTime, musicElement.duration || newTime);
      if (wasPlaying && musicElement.paused) {
        musicElement.play().catch(() => {});
      }
    }

    setCurrentTime(newTime);
  }, [isPlaying]);

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
          backgroundMusicRef.current = bgMusic;

          bgMusic.addEventListener('loadedmetadata', () => {
            setMusicDuration(bgMusic.duration);
          });
        }
      } catch (error) {
        console.error('[StoryPlayerWithBLS] Error loading background music:', error);
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
          if (musicElement && !musicElement.paused && !musicElement.ended) {
            setCurrentTime(musicElement.currentTime);
          } else {
            clearInterval(trackMusicTime);
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
      const musicElement = backgroundMusicRef.current;
      if (musicElement) {
        musicElement.play().catch(() => {});
      }
      // Start video when audio plays
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
    };

    const handlePause = () => {
      const musicElement = backgroundMusicRef.current;
      const voiceEnded = audio.currentTime >= audio.duration;

      if (voiceEnded && musicElement && musicElement.duration > audio.duration) {
        return;
      }

      setIsPlaying(false);
      if (musicElement) {
        musicElement.pause();
      }
      // Pause video when audio pauses
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

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => {
        console.error('[StoryPlayerWithBLS] Error playing audio:', error);
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

    if (videoRef.current) {
      videoRef.current.currentTime = 0;
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
    <div className="bg-gradient-to-br from-white via-amber-50/30 to-orange-50/30 rounded-2xl shadow-lg border border-amber-100 overflow-hidden">
      {/* Main Content Area */}
      <div className={`${showBLS ? 'lg:flex' : ''}`}>
        {/* Audio Player Section */}
        <div className={`p-6 md:p-8 ${showBLS ? 'lg:flex-1 lg:border-r lg:border-amber-100' : ''}`}>
          {/* Story Title */}
          <div className="text-center mb-6">
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

          {/* Audio Controls */}
          <div className="space-y-5">
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
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse" />
              </motion.div>
              {/* Progress handle */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-orange-500 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${progress}% - 8px)` }}
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
            <div className="flex items-center justify-center gap-4">
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

              {currentTime === 0 && <div className="w-[52px]"></div>}
            </div>

            {/* Status Text */}
            <div className="text-center">
              <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm ${
                isPlaying
                  ? 'bg-green-100 text-green-700'
                  : isLoading
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-amber-50 text-amber-600'
              }`}>
                {isPlaying ? (
                  <>
                    <span className="flex gap-0.5">
                      <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <span className="w-1 h-3 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </span>
                    Audio wird abgespielt
                  </>
                ) : isLoading ? (
                  'Lädt...'
                ) : (
                  'Bereit zum Abspielen'
                )}
              </span>
            </div>
          </div>
        </div>

        {/* BLS Video Section - Side by Side on large screens */}
        {showBLS && (
          <div className="lg:w-[400px] xl:w-[450px] bg-gradient-to-br from-amber-50 to-orange-50 p-6 md:p-8 border-t lg:border-t-0 border-amber-100">
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

              {/* Video overlay when not playing */}
              {!isPlaying && (
                <div className="absolute inset-0 bg-amber-900/20 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Play className="w-10 h-10 mx-auto mb-2 opacity-80" />
                    <p className="text-sm font-medium opacity-90">Video startet mit Audio</p>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Info */}
            <p className="text-xs text-amber-600/80 mt-3 text-center">
              Bilaterale Stimulation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
