import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

/**
 * Kopfzeile des Story-Flows (wie im Engel-Flow): links raus, Mitte Logo,
 * rechts der Schritt als kurze Segmentleiste.
 */
export default function StoryFlowProgress({
  currentStep,
  showNameStep,
  onExit,
  exitLabel,
}: {
  currentStep: number;
  showNameStep: boolean;
  onExit: () => void;
  exitLabel: string;
}) {
  const steps = [
    { step: 1, label: 'Deine Figur' },
    { step: 2, label: 'Deine Wünsche' },
    { step: 3, label: 'Deine Stimme' },
    ...(showNameStep ? [{ step: 4, label: 'Dein Name' }] : []),
    { step: 5, label: 'Deine Story' },
  ];
  const activeIndex = Math.max(0, steps.findIndex((item) => item.step === Math.min(currentStep, 5)));

  return (
    <div className="story-first-flow-header story-flow-topbar">
      <button type="button" className="story-first-flow-back" onClick={onExit} aria-label={exitLabel}>
        <ArrowLeft aria-hidden="true" />
        <span>{exitLabel}</span>
      </button>
      <Image
        src="/images/power-storys_logo.webp"
        alt="Power Storys"
        width={160}
        height={48}
        className="story-first-flow-logo"
        priority
      />
      <div className="story-flow-trail" aria-label={`Schritt ${activeIndex + 1} von ${steps.length}: ${steps[activeIndex].label}`}>
        <span className="story-flow-trail-label" aria-hidden="true">{steps[activeIndex].label}</span>
        <ol aria-hidden="true">
          {steps.map((item, index) => (
            <li key={item.step} data-state={index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'todo'} />
          ))}
        </ol>
      </div>
    </div>
  );
}
