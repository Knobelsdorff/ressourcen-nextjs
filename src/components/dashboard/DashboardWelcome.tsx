import Image from 'next/image';
import { Heart, Leaf, Sparkles } from 'lucide-react';
import { T, useText } from "@/components/site-text/T";
import { dashboard } from "@/content/texts/dashboard";

export default function DashboardWelcome({ firstVisit }: { firstVisit: boolean }) {
  const intentionsLabel = useText(dashboard["welcome.intentionsLabel"]);
  return (
    <section className="dashboard-welcome" aria-labelledby="dashboard-title">
      <div className="dashboard-welcome-copy">
        <span className="dashboard-eyebrow"><span /> <T t={dashboard["welcome.eyebrow"]} /></span>
        <h1 id="dashboard-title"><T t={firstVisit ? dashboard["welcome.titleFirstVisit"] : dashboard["welcome.title"]} /></h1>
        <p><T t={dashboard["welcome.text"]} /></p>
        <div className="dashboard-intentions" aria-label={intentionsLabel}>
          <span><Leaf size={15} aria-hidden="true" /> <T t={dashboard["welcome.intention1"]} /></span>
          <span><Sparkles size={15} aria-hidden="true" /> <T t={dashboard["welcome.intention2"]} /></span>
          <span><Heart size={15} aria-hidden="true" /> <T t={dashboard["welcome.intention3"]} /></span>
        </div>
      </div>
      <div className="dashboard-garden" aria-hidden="true">
        <div className="garden-backdrop" />
        <div className="garden-sun" />
        <div className="garden-pebble" />
        <div className="garden-photo">
          <Image
            src="/images/Innere Ruhe aktivieren_Herosection.webp"
            alt=""
            fill
            sizes="240px"
            className="object-cover"
            priority
          />
        </div>
        <span className="garden-caption"><T t={dashboard["welcome.caption"]} /></span>
      </div>
    </section>
  );
}
