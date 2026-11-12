"use client";

/**
 * Player QA – prüft den Story-Player mit den ECHTEN Komponenten:
 *
 *  1. Dashboard: echte StoryCard + StoryCardPlayer + useAudioPlayer
 *     (Vollbild, Mini-Leiste, nur eine Story zur Zeit, Zurück-Taste).
 *  2. Ende von /create-story: echtes StoryPlayerLayout im Seitenfluss.
 *
 * Audio: Kostprobe der Startseite (/api/homepage-sample), Musik je Figur wie
 * im Dashboard. Keine echten Storys, keine Funnel-Events (analytics={false}).
 */

import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import StoryCard from "@/components/dashboard/StoryCard";
import StoryPlayerLayout from "@/components/story-player/StoryPlayerLayout";
import { useTappingIntro } from "@/components/story-player/useTappingIntro";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useAuth } from "@/components/providers/auth-provider";

const NOOP = () => {};
const NOOP_ASYNC = async () => {};

export default function PlayerQaPage() {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string>("");

  useEffect(() => {
    fetch("/api/homepage-sample")
      .then((response) => response.json())
      .then((data) => {
        if (data?.sample?.audio_url) setAudioUrl(data.sample.audio_url);
        else setNote("Keine Kostprobe hinterlegt (/admin/kostprobe).");
      })
      .catch(() => setNote("Kostprobe konnte nicht geladen werden."));
  }, []);

  const now = new Date().toISOString();
  const stories = audioUrl
    ? [
        { id: "qa-engel", title: "Mein Engel", audio_url: audioUrl, resource_figure: { id: "angel", name: "Engel" }, created_at: now, auto_subtitle: "Geborgenheit, Wärme und Schutz" },
        { id: "qa-ort", title: "Mein sicherer Ort", audio_url: audioUrl, resource_figure: { id: "place", name: "Ort" }, created_at: now, auto_subtitle: "Ruhe am Meer" },
      ]
    : [];

  return (
    <MotionConfig reducedMotion="user">
      <div className="wellness-theme dashboard-theme">
        <p style={{ margin: 0, padding: "8px 16px", background: "#49301e", color: "#f3ece4", fontSize: 12, textAlign: "center" }}>
          <strong style={{ color: "white" }}>Player QA</strong> · echte Komponenten · Kostprobe statt echter Storys · keine Funnel-Events
          {note && <> · {note}</>}
        </p>

        <div className="dashboard-page min-h-screen pb-10">
          <div className="mx-auto max-w-6xl px-4 py-6">
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 16px" }}>1 · Dashboard</h2>
            <div className="dashboard-story-list">
              {stories.map((story) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  subtitle={story.auto_subtitle}
                  isRenaming={false}
                  onStartRename={NOOP}
                  onSaveTitle={NOOP_ASYNC}
                  onCancelRename={NOOP}
                  onSaveSubtitle={NOOP_ASYNC}
                  onDelete={NOOP}
                  canDelete={false}
                  analytics={false}
                  endAction={{ label: "Weitere Power Storys freischalten", onClick: () => setNote("Ende-Aktion getippt (im Dashboard: Abo-Angebot bzw. neue Story).") }}
                />
              ))}
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "40px 0 16px" }}>2 · Ende von /create-story</h2>
            {audioUrl && <CreateStoryPreview audioUrl={audioUrl} />}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

/** Nachbau des Player-Bereichs von /create-story (gleiche Hülle, gleiches Layout). */
function CreateStoryPreview({ audioUrl }: { audioUrl: string }) {
  const [ended, setEnded] = useState(false);
  const engine = useAudioPlayer({ audioUrl, resourceFigure: { id: "angel" }, onEnded: () => setEnded(true) });
  const { user } = useAuth();
  const tapping = useTappingIntro(user?.id);

  return (
    <div className="wellness-theme story-flow" style={{ height: 640, border: "1px solid #e4ded6", borderRadius: 16, overflow: "hidden", background: "#f8f5f2" }}>
      <div className="story-audio-stage">
        <div className="story-player-shell">
          <div className="sp-inline sp-root">
            <StoryPlayerLayout
              title="Engel"
              subtitle="Deine Power Story"
              playing={engine.isPlaying}
              busy={engine.isPreparingAudio}
              playDisabled={engine.isPreparingAudio}
              time={engine.currentTime}
              duration={engine.duration}
              onToggle={engine.togglePlayPause}
              onSeek={(seconds) => engine.seekTo(seconds)}
              onSkip={engine.skipBy}
              hasMusic={engine.hasBackgroundMusic}
              explainOpen={tapping.explainOpen}
              onToggleExplain={tapping.toggleExplain}
              hideTapping={ended}
              lead={!engine.isPlaying && engine.currentTime === 0 && !ended ? "Deine Power Story ist da. Du musst nichts tun. Du kannst einfach zuhören – oder jederzeit pausieren." : undefined}
              extra={
                <>
                  <button type="button" className="sp-link" onClick={() => setEnded((value) => !value)}>
                    {ended ? "QA: Ende-Ansicht ausblenden" : "QA: Ende-Ansicht zeigen"}
                  </button>
                  {ended && (
                    <>
                      <p className="sp-message">Lass das Gehörte einen Moment nachwirken.</p>
                      <p className="sp-message sp-message--soft">Du musst nichts festhalten oder verstehen. Manchmal reicht es, etwas wirken zu lassen.</p>
                      <button type="button" className="sp-link">Nochmal hören</button>
                      <button type="button" className="sp-pill">Eine weitere persönliche Geschichte erstellen</button>
                    </>
                  )}
                </>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
