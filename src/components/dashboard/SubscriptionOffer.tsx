"use client";

/**
 * Ruhiges Abo-Angebot im Dashboard – kein klassischer Paywall-Dialog.
 *
 *   "after-first-story": einmalig, nachdem die Gratis-Story (Engel-Erststory
 *                        oder erste Story aus dem normalen Flow) zum ersten
 *                        Mal vollständig angehört wurde – im Dashboard oder
 *                        direkt auf /create-story.
 *   "locked":            nach Tippen auf eine gesperrte Story.
 *
 * Der Abschluss läuft über den bestehenden Stripe-Checkout.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import AngelIconFinal from "@/components/AngelIconFinal";
import { useAuth } from "@/components/providers/auth-provider";
import { createCheckoutSession } from "@/lib/access";
import { track } from "@/lib/product-analytics/client";
import "./subscription-offer.css";

export type SubscriptionOfferVariant = "after-first-story" | "locked";

const TITLE = "Mehr Ruhe. Mehr Sicherheit. Jeden Tag.";
const TEXT = "Erstelle persönliche Power Storys, die dich dabei unterstützen, innere Ruhe, Halt und neue Kraft zu finden.";
const BENEFIT = "Unbegrenzt neue Geschichten erstellen und dauerhaft anhören.";

// Gesperrte Storys: Weiterhören ist dort nicht mehr möglich, daher nur "Später".
const COPY: Record<SubscriptionOfferVariant, { secondary: string; footnote?: string }> = {
  "after-first-story": {
    secondary: "Meine Power Story kostenlos weiter anhören",
    footnote: "Deine erste Power Story bleibt 7 Tage kostenlos – so oft du möchtest.",
  },
  locked: {
    secondary: "Später",
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
    setError("Das hat gerade nicht geklappt. Bitte versuche es gleich noch einmal.");
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
        <h2 id="subscription-offer-title">{TITLE}</h2>
        <p id="subscription-offer-text">{TEXT}</p>

        <div className="subscription-offer-price">
          <span className="subscription-offer-amount">15 €</span>
          <span className="subscription-offer-period">/ Monat</span>
        </div>
        <p className="subscription-offer-note">
          <Check size={15} aria-hidden="true" /> Jederzeit kündbar.
        </p>
        <p className="subscription-offer-benefit">{BENEFIT}</p>

        {error && <p className="subscription-offer-error" role="alert">{error}</p>}

        <div className="subscription-offer-actions">
          <button ref={primaryRef} type="button" className="subscription-offer-primary" onClick={() => void startCheckout()} disabled={loading}>
            {loading ? <><Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Einen Moment …</> : "Meine Power Storys freischalten"}
          </button>
          <button type="button" className="subscription-offer-secondary" onClick={onClose}>
            {copy.secondary}
          </button>
          {copy.footnote && <p className="subscription-offer-footnote">{copy.footnote}</p>}
        </div>
      </section>
    </div>
  );
}
