"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { openConsentSettings } from "@/lib/product-analytics/consent";

// useSearchParams() im Root-Layout braucht eine Suspense-Grenze, sonst
// scheitert `next build` beim statischen Rendern jeder Seite.
export default function Footer() {
  return (
    <Suspense fallback={<FooterContent isFirstStoryFlow={false} />}>
      <FooterWithSearchParams />
    </Suspense>
  );
}

function FooterWithSearchParams() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <FooterContent isFirstStoryFlow={pathname === '/create-story' && searchParams.get('first') === 'true'} />;
}

function FooterContent({ isFirstStoryFlow }) {
  const pathname = usePathname();
  
  // Hide footer on the isolated first-story flow and access pages.
  if (isFirstStoryFlow || pathname === '/ankommen' || pathname === '/zugang' || pathname === '/zugang-erhalten') {
    return null;
  }
  
  return (
    <footer data-landing={pathname === '/' || undefined} className="bg-white border-t border-orange-100/70 sm:py-9 py-5">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="text-amber-700 mb-6 text-lg">
          Entwickelt mit therapeutischer Erfahrung – für deinen Alltag
        </div>
        <div className="text-amber-900 mb-4">
          © Copyright - Andreas von Knobelsdorff
        </div>
        <div className="flex justify-center space-x-6">
          <a href="/Impressum" className="text-amber-900 hover:text-amber-700 transition-colors underline">
            Impressum
          </a>
          <a href="/Datenschutz" className="text-amber-900 hover:text-amber-700 transition-colors underline">
            Datenschutz
          </a>
          <button type="button" onClick={openConsentSettings} className="text-amber-900 hover:text-amber-700 transition-colors underline">
            Cookie-Einstellungen
          </button>
        </div>
      </div>
    </footer>
  );
}
