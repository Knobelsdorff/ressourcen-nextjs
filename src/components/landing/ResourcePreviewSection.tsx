import Link from 'next/link';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { realFigures, fictionalFigures } from '@/data/figures';

const figures = ['angel', 'grandma', 'wise-wizard'].map(id => [...realFigures, ...fictionalFigures].find(figure => figure.id === id)).filter(figure => figure !== undefined);

export default function ResourcePreviewSection() {
  return (
    <section className="landing-resource-section px-4 py-20" aria-labelledby="resource-preview-title">
      <div className="max-w-6xl mx-auto">
        <div className="resource-preview-heading">
          <div>
            <span className="landing-eyebrow"><span /> GANZ PERSÖNLICH</span>
            <h2 id="resource-preview-title">Wer darf dich begleiten?</h2>
            <p>Eine vertraute Figur. Eine neue Perspektive. Wähle, was sich für dich stimmig anfühlt.</p>
          </div>
          <Link href="/figur" className="resource-all-link">Alle Figuren entdecken <ArrowRight size={18} /></Link>
        </div>
        <div className="landing-resource-grid">
          {figures.map(figure => (
            <Link key={figure.id} href={`/create-story?figure=${encodeURIComponent(figure.id)}`} className="landing-resource-card">
              <div className="resource-card-art" aria-hidden="true"><span>{figure.emoji}</span><i /><b /></div>
              <div className="resource-card-copy"><div><h3>{figure.name}</h3><p>{figure.description}</p></div><ArrowUpRight size={21} aria-hidden="true" /></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
