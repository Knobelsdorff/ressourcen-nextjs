"use client";

import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useStartFirstStory } from '@/hooks/useStartFirstStory';
import AudioPlayer from '@/components/audio/AudioPlayer';
import { T, useText } from "@/components/site-text/T";
import { landing } from "@/content/texts/landing";

export default function LandingStoryPreview() {
  const startFirstStory = useStartFirstStory();
  const imageAlt = useText(landing["preview.imageAlt"]);
  const defaultTitle = useText(landing["preview.defaultTitle"]);
  const [story, setStory] = useState<{ title: string; audioUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPreview() {
      try {
        const sampleResponse = await fetch('/api/homepage-sample', { signal: controller.signal });
        const sampleData = await sampleResponse.json();
        if (sampleResponse.ok && sampleData.success && sampleData.sample?.audio_url) {
          setStory({
            title: sampleData.sample.title || '',
            audioUrl: sampleData.sample.audio_url,
          });
        }
      } catch {
        // Ohne Kostprobe (/admin/kostprobe) zeigt der Hero einfach kein Audio.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadPreview();
    return () => controller.abort();
  }, []);

  return (
    <div className="landing-story-scene">
      {/* Andreas' Hero-Bild (Zielzustand), gerahmt in der Bogenform des Wellness-Themes. */}
      <div className="landing-scene-photo">
        <div className="scene-backdrop" aria-hidden="true" />
        <div className="scene-sun" aria-hidden="true" />
        <div className="scene-pebble" aria-hidden="true" />
        <div className="scene-photo-frame">
          <Image
            src="/images/Innere Ruhe aktivieren_Herosection.webp"
            alt={imageAlt}
            fill
            sizes="(max-width: 1023px) 92vw, 520px"
            className="object-cover"
            priority
          />
        </div>
      </div>
      <div className="landing-audio-preview">
        {/* Text aus dem Usability-Test (2026-11): klar als kostenlose Hörgeschichte erkennbar, nicht als Podcast. */}
        <div className="preview-kicker"><span><Volume2 size={15} /> <T t={landing["preview.kicker"]} /></span><span><T t={landing["preview.kickerNote"]} /></span></div>
        <h2><T t={landing["preview.title"]} /></h2>
        <p><T t={landing["preview.text"]} /></p>
        <div className="preview-wave" aria-hidden="true">
          {[12, 22, 16, 30, 42, 24, 36, 52, 32, 44, 58, 38, 26, 46, 34, 54, 40, 24, 34, 20, 28, 14, 22, 12].map((height, index) => (
            <span key={index} style={{ height, animationDelay: `${index * 45}ms` }} />
          ))}
        </div>
        {story ? <AudioPlayer audioUrl={story.audioUrl} title={story.title || defaultTitle} variant="compact" /> : loading ? (
          <p className="preview-status" role="status"><T t={landing["preview.loading"]} /></p>
        ) : (
          <div className="preview-status">
            <p><T t={landing["preview.unavailable"]} /></p>
            <Link href="/create-story?first=true" onClick={startFirstStory} data-analytics-cta="story-preview" className="landing-secondary-button"><T t={landing["preview.fallbackCta"]} /></Link>
          </div>
        )}
      </div>
    </div>
  );
}
