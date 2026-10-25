"use client";

import { useEffect } from "react";
import StoryGenerationLoader from "@/components/story-flow/StoryGenerationLoader";
import { EXPECTED_STORY_CHARS, storyTimeline } from "@/lib/story-progress";
import { LoaderProps } from "./shared";

/**
 * ★ Final – der Loader, der in /create-story läuft (1A ohne zweiten Countdown).
 * Hier speist die Simulation den echten Fortschritts-Speicher: Zeichen der
 * Geschichte, dann die Stimme mit der Schätzung aus der Textlänge.
 * "Wait 75 s / 150 s" zeigt, wie er reagiert, wenn es länger dauert als erwartet.
 */
export default function FinalLoader({ figure, phase, voiceName, elapsed, phaseElapsed }: LoaderProps) {
  useEffect(() => {
    const now = Date.now();
    const startedAt = now - elapsed * 1000;
    if (phase === "text") {
      const writing = Math.max(0, elapsed - 1.5);
      storyTimeline.preview({
        textStartedAt: startedAt,
        firstCharAt: writing > 0 ? startedAt + 1500 : null,
        textChars: Math.min(EXPECTED_STORY_CHARS - 50, Math.round(writing * 110)),
      });
    } else {
      const textDoneAt = now - phaseElapsed * 1000;
      storyTimeline.preview({
        textStartedAt: startedAt,
        firstCharAt: startedAt + 1500,
        textChars: EXPECTED_STORY_CHARS,
        textDoneAt,
        storyChars: EXPECTED_STORY_CHARS,
        audioStartedAt: textDoneAt,
      });
    }
  }, [phase, elapsed, phaseElapsed]);

  return (
    <div className="story-stage-center" style={{ minHeight: "calc(100dvh - 180px)" }}>
      <StoryGenerationLoader figure={figure} voiceName={voiceName} ready={phase === "ready"} />
    </div>
  );
}
