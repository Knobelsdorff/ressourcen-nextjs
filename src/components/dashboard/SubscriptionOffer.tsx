"use client";

/**
 * Ruhiges Abo-Angebot im Dashboard – kein klassischer Paywall-Dialog.
 *
 *   "after-first-story": einmalig, nachdem die Gratis-Story (Engel-Erststory
 *                        oder erste Story aus dem normalen Flow) zum ersten
 *                        Mal vollständig angehört wurde – im Dashboard oder
 *                        direkt auf /create-story.
 *   "locked":            nach Tippen auf eine gesperrte Story.
 *   "more-stories":      über den Knopf "Weitere Power Storys freischalten"
 *                        unter den Storys (ohne Abo) – unabhängig vom Hören.
 *
 * Der Abschluss läuft über den bestehenden Stripe-Checkout.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import AngelIconFinal from "@/components/AngelIconFinal";
import { useAuth } from "@/components/providers/auth-provider";
import { createCheckoutSession } from "@/lib/access";
import { track } from "@/lib/product-analytics/client";
import { T, useTextFn } from "@/components/site-text/T";
import type { TextDef } from "@/lib/site-texts/define";
import { dashboard } from "@/content/texts/dashboard";
import "./subscription-offer.css";

export type SubscriptionOfferVariant = "after-first-story" | "locked" | "more-stories";

// Gesperrte Storys: Weiterhören ist dort nicht mehr möglich, daher nur "Später".
const COPY: Record<SubscriptionOfferVariant, { secondary: TextDef; footnote?: TextDef }> = {
  "after-first-story": {
    secondary: dashboard["offer.secondaryAfterFirst"],
    footnote: dashboard["offer.footnoteAfterFirst"],
  },
  locked: {
    secondary: dashboard["offer.later"],
  },
  // Über "Weitere Power Storys freischalten" unter den Storys – jederzeit, so oft man will.
  "more-stories": {
    secondary: dashboard["offer.later"],
  },
};

interface SubscriptionOfferProps {
  variant: SubscriptionOfferVariant | null;
  onClose: () => void;
  /** Für die Funnel-Analyse: wo das Angebot erscheint. */
  location?: "dashboard" | "create_story";
}

export default function SubscriptionOffer({ variant, onClose, location = "dashboard" }: SubscriptionOfferProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const tx = useTextFn();

  // Funnel: einmal pro Öffnen.
  useEffect(() => {
    if (variant) track("soft_paywall_viewed", { variant, location });
  }, [variant, location]);

  useEffect(() => {
    if (!variant) return;
    setError(null);
    setLoading(false);
    primaryRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [variant, onClose]);

  if (!variant) return null;
  const copy = COPY[variant];

  const startCheckout = async () => {
    if (!user?.id || loading) return;
    track("subscription_cta_clicked", { variant, location }, { beacon: true });
    setLoading(true);
    setError(null);
    const session = await createCheckoutSession(user.id, "subscription");
    if (session?.url) {
      window.location.href = session.url;
      return;
    }
    setLoading(false);
    setError(tx(dashboard["offer.error"]));
  };

  return (
    <div className="subscription-offer-backdrop" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-offer-title"
        aria-describedby="subscription-offer-text"
        className="subscription-offer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="subscription-offer-icon" aria-hidden="true">
          <AngelIconFinal size={60} />
        </div>
        <h2 id="subscription-offer-title"><T t={dashboard["offer.title"]} /></h2>
        <p id="subscription-offer-text"><T t={dashboard["offer.text"]} /></p>

        <div className="subscription-offer-price">
          <span className="subscription-offer-amount"><T t={dashboard["offer.amount"]} /></span>
          <span className="subscription-offer-period"><T t={dashboard["offer.period"]} /></span>
        </div>
        <p className="subscription-offer-note">
          <Check size={15} aria-hidden="true" /> <T t={dashboard["offer.cancel"]} />
        </p>
        <p className="subscription-offer-benefit"><T t={dashboard["offer.benefit"]} /></p>

        {error && <p className="subscription-offer-error" role="alert">{error}</p>}

        <div className="subscription-offer-actions">
          <button ref={primaryRef} type="button" className="subscription-offer-primary" onClick={() => void startCheckout()} disabled={loading}>
            {loading ? <><Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> <T t={dashboard["offer.loading"]} /></> : <T t={dashboard["offer.cta"]} />}
          </button>
          <button type="button" className="subscription-offer-secondary" onClick={onClose}>
            <T t={copy.secondary} />
          </button>
          {copy.footnote && <p className="subscription-offer-footnote"><T t={copy.footnote} /></p>}
        </div>
      </section>
    </div>
  );
}
