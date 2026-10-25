import type { Metadata } from 'next';
import LabShell from './_components/LabShell';
import '../../create-story/story-flow.css';
import '../../create-story/story-stage.css';
import './loader-lab.css';
import './calm-loaders.css';

// Reine Design-Testseite: keine Logik, keine API-Aufrufe, nicht indexieren.
export const metadata: Metadata = {
  title: 'Loader Lab',
  robots: { index: false, follow: false },
};

export default function LoaderLabLayout({ children }: { children: React.ReactNode }) {
  return <LabShell>{children}</LabShell>;
}
