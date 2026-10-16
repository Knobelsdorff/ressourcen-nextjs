import { Check, Sparkles } from 'lucide-react';

export default function StoryFlowProgress({ currentStep, showNameStep, firstFlow = false }: { currentStep: number; showNameStep: boolean; firstFlow?: boolean }) {
  const steps = firstFlow
    ? [
      { step: 2, label: 'Deine Wünsche' },
      { step: 3, label: 'Dein Account' },
      { step: 5, label: 'Deine Story' },
    ]
    : [
      { step: 1, label: 'Deine Figur' },
      { step: 2, label: 'Deine Wünsche' },
      { step: 3, label: 'Deine Stimme' },
      ...(showNameStep ? [{ step: 4, label: 'Dein Name' }] : []),
      { step: 5, label: 'Deine Story' },
    ];
  const activeIndex = steps.findIndex(item => item.step === Math.min(currentStep, 5));

  return (
    <div className="story-flow-progress">
      <div className="story-flow-intro">
        <span><Sparkles size={15} aria-hidden="true" /> DEINE PERSÖNLICHE POWER STORY</span>
        <span>Schritt {activeIndex + 1} von {steps.length}</span>
      </div>
      <ol aria-label="Schritte zur Power Story">
        {steps.map((item, index) => (
          <li key={item.step} aria-current={index === activeIndex ? 'step' : undefined} data-complete={index < activeIndex}>
            <span className="story-step-dot" aria-hidden="true">{index < activeIndex ? <Check size={15} /> : index + 1}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
