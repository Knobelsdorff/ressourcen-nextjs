import type { Metadata } from 'next';
import '../../dashboard/dashboard.css';
import '../../create-story/story-flow.css';
import '../../create-story/story-stage.css';

// Prüfseite für den Story-Player: echte Komponenten, echter Audio-Motor,
// Kostprobe der Startseite statt echter Storys. Keine Funnel-Events, nicht indexieren.
export const metadata: Metadata = {
  title: 'Player QA',
  robots: { index: false, follow: false },
};

export default function PlayerQaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
