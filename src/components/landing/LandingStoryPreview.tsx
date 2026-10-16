"use client";

import { useEffect, useState } from 'react';
import { Headphones } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import AudioPlayer from '@/components/audio/AudioPlayer';

export default function LandingStoryPreview() {
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
            title: sampleData.sample.title || 'Wohlwollende Präsenz',
            audioUrl: sampleData.sample.audio_url,
          });
          return;
        }

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
      {/* Andreas' Hero-Bild (Zielzustand), gerahmt in der Bogenform des Wellness-Themes. */}
      <div className="landing-scene-photo">
        <div className="scene-backdrop" aria-hidden="true" />
        <div className="scene-sun" aria-hidden="true" />
        <div className="scene-pebble" aria-hidden="true" />
        <div className="scene-photo-frame">
          <Image
            src="/images/Innere Ruhe aktivieren_Herosection.webp"
            alt="Innere Ruhe aktivieren"
            fill
            sizes="(max-width: 1023px) 92vw, 520px"
            className="object-cover"
            priority
          />
        </div>
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
            <Link href="/create-story?first=true" className="landing-secondary-button">Meine Power Story erstellen</Link>
          </div>
        )}
      </div>
    </div>
  );
}
