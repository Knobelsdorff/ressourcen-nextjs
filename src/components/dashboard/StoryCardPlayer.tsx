"use client";

/**
 * Wiedergabe einer Power Story im Dashboard.
 *
 * In der Karte nur eine ruhige "Anhören"-Zeile. Antippen lässt die Karte zum
 * Vollbild-Player wachsen (Klopf-Video, Steuerung, Hintergrundmusik) und
 * startet die Story – im selben Tippen, sonst blockiert iOS das Audio.
 * Schließt man den Player, läuft die Story weiter und unten erscheint die
 * Mini-Leiste.
 *
 * Audio-Motor unverändert: useAudioPlayer (Safari-Fallback, Musik je Figur
 * mit Admin- und Nutzer-Lautstärke, iOS-Lautstärke über musicOutput, Wake
 * Lock, Ende-Erkennung fürs Abo-Angebot). Funnel-Events wie bisher im
 * AudioPlayer: story_play_started / story_play_completed.
 *
 * Neu: Startet eine andere Story, hält diese an (activeStory).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { PLAY_STORY_EVENT } from "@/components/audio/play-events";
import { type StoryPlayContext, storyPlayCompleted, storyPlayStarted } from "@/lib/product-analytics/story-plays";
import FullscreenStoryPlayer from "@/components/story-player/FullscreenStoryPlayer";
import MiniPlayer from "@/components/story-player/MiniPlayer";
import { formatPlayerTime } from "@/components/story-player/StoryPlayerLayout";
import { getActiveStory, setActiveStory, useActiveStory } from "@/components/story-player/activeStory";
import { useMediaSession } from "@/components/story-player/useMediaSession";
import { useTappingIntro } from "@/components/story-player/useTappingIntro";

export interface StoryEndAction {
  label: string;
  onClick: () => void;
}

interface StoryCardPlayerProps {
  storyId: string;
  title: string;
  subtitle: string | null;
  audioUrl: string;
  resourceFigure: any;
  /** Funnel-Events (story_play_started/completed). Ohne: keine Events (z. B. Testseite). */
  playAnalytics?: StoryPlayContext;
  /** Story hat ihr Ende erreicht (Abo-Angebot der Gratis-Story). */
  onCompleted?: () => void;
  /** Nach dem Hören: "Neue Power Story erstellen" bzw. "Weitere Power Storys freischalten". */
  endAction?: StoryEndAction;
  /** Die Karte – aus ihr wächst der Player. */
  originRef: React.RefObject<HTMLElement | null>;
  /** data-tour-Anker (Willkommens-Hinweis scrollt dorthin). */
  tourAnchor?: string;
}

export default function StoryCardPlayer({
  storyId,
  title,
  subtitle,
  audioUrl,
  resourceFigure,
  playAnalytics,
  onCompleted,
  endAction,
  originRef,
  tourAnchor,
}: StoryCardPlayerProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [ended, setEnded] = useState(false);
  const rowRef = useRef<HTMLButtonElement | null>(null);

  const playAnalyticsRef = useRef(playAnalytics);
  playAnalyticsRef.current = playAnalytics;
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;

  const engine = useAudioPlayer({
    audioUrl,
    storyId,
    resourceFigure,
    onEnded: () => setEnded(true),
    onCompleted: () => {
      if (playAnalyticsRef.current) storyPlayCompleted(playAnalyticsRef.current);
      onCompletedRef.current?.();
    },
  });
  const { isPlaying, isLoading, isPreparingAudio, currentTime, duration, togglePlayPause, seekTo, skipBy } = engine;

  const activeId = useActiveStory();
  const isActive = activeId === storyId;
  const tapping = useTappingIntro(user?.id);

  // Funnel: Start einer Hör-Sitzung (storyPlayStarted entdoppelt Pausen und Fortsetzen).
  useEffect(() => {
    if (!isPlaying) return;
    if (playAnalyticsRef.current) storyPlayStarted(playAnalyticsRef.current);
    setEnded(false);
    setActiveStory(storyId);
    tapping.markPlayed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, storyId]);

  // Nur eine Story zur Zeit: Wird eine andere aktiv, hält diese an.
  const togglePlayRef = useRef(togglePlayPause);
  togglePlayRef.current = togglePlayPause;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  useEffect(() => {
    if (activeId === null || activeId === storyId) return;
    if (isPlayingRef.current) togglePlayRef.current();
    setExpanded(false);
  }, [activeId, storyId]);

  // Beim Aushängen (Story gelöscht, Liste neu geladen) nicht "aktiv" hängen
  // bleiben – aber nur, wenn es wirklich diese Story war.
  useEffect(() => () => {
    if (getActiveStory() === storyId) setActiveStory(null);
  }, [storyId]);

  /** MUSS synchron im Tippen laufen: play() direkt, sonst blockiert iOS. */
  const open = useCallback((play: boolean) => {
    if (play && !isPlayingRef.current && !isPreparingAudio) togglePlayRef.current();
    setActiveStory(storyId);
    setExpanded(true);
  }, [isPreparingAudio, storyId]);

  // Start von außen (Willkommens-Hinweis "Jetzt anhören" → requestStoryPlay).
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    const onPlayRequest = (event: Event) => {
      if ((event as CustomEvent<{ storyId: string }>).detail?.storyId === storyId) openRef.current(true);
    };
    window.addEventListener(PLAY_STORY_EVENT, onPlayRequest);
    return () => window.removeEventListener(PLAY_STORY_EVENT, onPlayRequest);
  }, [storyId]);

  const toggle = useCallback(() => {
    if (!isPlayingRef.current && isPreparingAudio) return;
    togglePlayRef.current();
  }, [isPreparingAudio]);

  const pause = useCallback(() => {
    if (isPlayingRef.current) togglePlayRef.current();
  }, []);

  useMediaSession({
    active: isActive,
    title,
    subtitle,
    playing: isPlaying,
    time: currentTime,
    duration,
    onPlay: () => { if (!isPlayingRef.current) toggle(); },
    onPause: pause,
    onSkip: skipBy,
    onSeek: (seconds) => seekTo(seconds),
  });

  const started = isPlaying || currentTime > 0;
  const rowLabel = isPreparingAudio ? "Wird vorbereitet …" : isPlaying ? "Läuft" : currentTime > 0 ? "Weiterhören" : "Anhören";
  const rowTime = currentTime > 0 && duration > 0
    ? `${formatPlayerTime(currentTime)} / ${formatPlayerTime(duration)}`
    : duration > 0 ? formatPlayerTime(duration) : "";

  const extra = ended ? (
    <>
      <p className="sp-message">Schön, dass du dir diese Zeit genommen hast.</p>
      <button type="button" className="sp-link" onClick={toggle}>Nochmal hören</button>
      {endAction && (
        <button type="button" className="sp-pill" onClick={endAction.onClick}>{endAction.label}</button>
      )}
    </>
  ) : null;

  return (
    <>
      <button
        ref={rowRef}
        type="button"
        className="story-listen-row"
        data-tour={tourAnchor}
        data-playing={isPlaying || undefined}
        onClick={() => open(!isPlaying)}
        aria-label={`${title} ${isPlaying ? "– Player öffnen" : currentTime > 0 ? "weiterhören" : "anhören"}`}
      >
        <span className="story-listen-play" aria-hidden="true">
          {isPlaying
            ? <Pause size={20} fill="currentColor" strokeWidth={0} />
            : <Play size={20} fill="currentColor" strokeWidth={0} className="story-listen-play-icon" />}
        </span>
        <span className="story-listen-label">{rowLabel}</span>
        {rowTime && <span className="story-listen-time">{rowTime}</span>}
        {started && duration > 0 && (
          <span className="story-listen-progress" style={{ width: `${Math.min(100, (currentTime / duration) * 100)}%` }} aria-hidden="true" />
        )}
      </button>

      <FullscreenStoryPlayer
        open={expanded}
        onClose={() => setExpanded(false)}
        originRef={originRef}
        returnFocusRef={rowRef}
        layout={{
          title,
          subtitle,
          playing: isPlaying,
          busy: isPreparingAudio || (isPlaying && isLoading),
          playDisabled: isPreparingAudio,
          time: currentTime,
          duration,
          onToggle: toggle,
          onSeek: (seconds) => seekTo(seconds),
          onSkip: skipBy,
          hasMusic: engine.hasBackgroundMusic,
          explainOpen: tapping.explainOpen,
          onToggleExplain: tapping.toggleExplain,
          extra,
        }}
      />

      {isActive && !expanded && started && !ended && (
        <MiniPlayer
          title={title}
          subtitle={subtitle}
          playing={isPlaying}
          progress={duration > 0 ? currentTime / duration : 0}
          onToggle={toggle}
          onOpen={() => open(false)}
          onDismiss={() => {
            pause();
            setActiveStory(null);
          }}
        />
      )}
    </>
  );
}
