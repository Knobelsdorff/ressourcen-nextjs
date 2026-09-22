"use client";

import { useEffect, useState } from 'react';
import { Headphones, Leaf, Sparkles } from 'lucide-react';
import Link from 'next/link';
import AudioPlayer from '@/components/audio/AudioPlayer';

export default function LandingStoryPreview() {
  const [story, setStory] = useState<{ title: string; audioUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadPreview() {
      try {
        const response = await fetch('/api/example-resource', { signal: controller.signal });
        const data = await response.json();
        if (response.ok && data.success && data.resource?.audio_url) {
          setStory({ title: data.resource.title || 'Ein Moment zum Ankommen', audioUrl: data.resource.audio_url });
        }
      } catch {
        // The existing arrival flow remains available when the preview is unavailable.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadPreview();
    return () => controller.abort();
  }, []);

  return (
    <div className="landing-story-scene">
      <div className="landing-scene-art" aria-hidden="true">
        <div className="scene-sun" />
        <div className="scene-arch"><i /><i /><b /></div>
        <div className="scene-leaf" /><div className="scene-pebble" />
        <Sparkles className="scene-sparkle" size={32} strokeWidth={1.5} />
        <span className="scene-caption"><Leaf size={15} /> Ein bisschen mehr bei dir.</span>
      </div>
      <div className="landing-audio-preview">
        <div className="preview-kicker"><span><Headphones size={15} /> EINFACH MAL REINHÖREN</span><span>Kostenlos</span></div>
        <h2>{story?.title || 'Ein Moment zum Ankommen'}</h2>
        <p>Augen schließen. Zuhören. Durchatmen.</p>
        <div className="preview-wave" aria-hidden="true">
          {[12, 22, 16, 30, 42, 24, 36, 52, 32, 44, 58, 38, 26, 46, 34, 54, 40, 24, 34, 20, 28, 14, 22, 12].map((height, index) => (
            <span key={index} style={{ height, animationDelay: `${index * 45}ms` }} />
          ))}
        </div>
        {story ? <AudioPlayer audioUrl={story.audioUrl} title={story.title} variant="compact" /> : loading ? (
          <p className="preview-status" role="status">Hörprobe wird geladen …</p>
        ) : (
          <div className="preview-status">
            <p>Die Hörprobe ist gerade nicht verfügbar.</p>
            <Link href="/ankommen" className="landing-secondary-button">Zum Ankommen</Link>
          </div>
        )}
      </div>
      <span className="scene-bottom-note">Dein Tempo. Dein Moment.</span>
    </div>
  );
}
