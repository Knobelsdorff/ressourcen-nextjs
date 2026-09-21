import { Headphones, Leaf, Sparkles } from 'lucide-react';

export default function DashboardWelcome({ firstVisit }: { firstVisit: boolean }) {
  return (
    <section className="dashboard-welcome" aria-labelledby="dashboard-title">
      <div className="dashboard-welcome-copy">
        <span className="dashboard-eyebrow"><span /> DEIN PERSÖNLICHER RUHEPOL</span>
        <h1 id="dashboard-title">{firstVisit ? 'Willkommen in deinem Raum.' : 'Ein Moment. Nur für dich.'}</h1>
        <p>Ankommen, durchatmen und neue Kraft schöpfen. Deine Power Storys begleiten dich dabei.</p>
        <div className="dashboard-intentions" aria-label="Raum für dein Wohlbefinden">
          <span><Leaf size={15} aria-hidden="true" /> Zur Ruhe kommen</span>
          <span><Sparkles size={15} aria-hidden="true" /> Kraft schöpfen</span>
          <span><Headphones size={15} aria-hidden="true" /> Bei dir sein</span>
        </div>
      </div>
      <div className="dashboard-garden" aria-hidden="true">
        <div className="garden-sun" />
        <div className="garden-arch"><div className="garden-face"><i /><i /><b /></div></div>
        <div className="garden-leaf" />
        <div className="garden-pebble" />
        <Sparkles className="garden-sparkle" size={30} strokeWidth={1.5} />
        <span className="garden-caption">Schön, dass du da bist.</span>
      </div>
    </section>
  );
}
