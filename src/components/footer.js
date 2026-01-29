"use client";

import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  
  // Hide footer on /ankommen, /zugang, or /zugang-erhalten pages
  if (pathname === '/ankommen' || pathname === '/zugang' || pathname === '/zugang-erhalten') {
    return null;
  }
  
  return (
    <footer className="bg-white border-t border-orange-100 sm:py-8 py-4">
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
        </div>
      </div>
    </footer>
  );
}