import Link from 'next/link';
import { ArrowRight, Leaf } from 'lucide-react';

export default function LandingClosingSection() {
  return (
    <section className="landing-closing" aria-labelledby="landing-closing-title">
      <div className="closing-decoration" aria-hidden="true"><i /><b /><Leaf size={58} strokeWidth={1.3} /></div>
      <span className="landing-eyebrow">EIN KLEINER MOMENT FÜR DICH</span>
      <h2 id="landing-closing-title">Du darfst es dir<br />ein bisschen leichter machen.</h2>
      <p>Du hörst zu – mehr ist nicht nötig.<br />Kostenlos ausprobieren. In deinem Tempo.</p>
      <Link href="/create-story?first=true" data-analytics-cta="closing" className="landing-secondary-button">Meine Power Story erstellen <ArrowRight size={18} aria-hidden="true" /></Link>
    </section>
  );
}
