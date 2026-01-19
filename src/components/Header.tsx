"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import { scrollToAnchor } from "@/lib/navigation-helpers";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

export default function Header() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // All hooks must be called before any conditional returns
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);

  // ESC-Taste zum Schließen des Mobile-Menüs
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        hamburgerButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMobileMenuOpen]);

  // Fokus-Handling: Fokus ins Menü beim Öffnen
  useEffect(() => {
    if (isMobileMenuOpen && firstMenuItemRef.current) {
      setTimeout(() => {
        firstMenuItemRef.current?.focus();
      }, 100);
    }
  }, [isMobileMenuOpen]);

  // Handler für "Was ist eine Power Story?" - Smooth-Scroll
  const handleWhatIsPowerStory = () => {
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      scrollToAnchor('was-ist-eine-power-story');
    }, 100);
  };

  // Handler für "Eine Power Story entdecken" - Weiterleitung zu Ankommen-Seite
  const handleDiscoverPowerStory = () => {
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      router.push("/ankommen");
    }, 100);
  };

  // Handler für "Mein Zugang"
  const handleAccessClick = () => {
    setIsMobileMenuOpen(false);
    router.push("/zugang");
  };

  const handleLogout = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <header className="bg-white border-b border-orange-100">
        <div className="max-w-7xl mx-auto sm:p-4 p-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>
    );
  }

  // Hide header on /ankommen and /zugang pages (after loading check)
  if (pathname === '/ankommen' || pathname === '/zugang' || pathname === '/zugang-erhalten') {
    return null;
  }

  return (
    <>
      {/* Header - Global auf allen Seiten */}
      <header className="bg-white border-b border-amber-100/60 lg:sticky lg:top-0 lg:z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-5 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <button 
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('appState');
                  localStorage.removeItem('currentStep');
                  localStorage.removeItem('questionAnswers');
                  localStorage.removeItem('resourceFigure');
                  window.location.href = '/';
                }
              }}
            >
              <Image
                src="/images/power-storys_logo.webp"
                alt="Power Storys Logo"
                width={200}
                height={60}
                className="h-12 md:h-14 w-auto object-contain"
                priority
              />
            </button>
          </div>

          {/* Desktop Navigation (ab md) - Ruhig und therapeutisch-sanft */}
          <nav className="hidden md:flex items-center gap-6 md:gap-8">
            {user ? (
              <>
                {/* Eingeloggte User: Navigation + Dashboard/Logout */}
                <button
                  onClick={handleWhatIsPowerStory}
                  className="text-amber-900/80 font-medium hover:text-amber-900 hover:underline transition-colors py-2"
                >
                  Was ist eine Power Story?
                </button>
                <button
                  onClick={handleDiscoverPowerStory}
                  className="bg-[#ce7106] hover:bg-amber-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:ring-offset-2"
                >
                  Eine Power Story entdecken
                </button>
                <Link
                  href="/dashboard"
                  className="text-amber-900/80 font-medium hover:text-amber-900 hover:underline transition-colors py-2"
                >
                  Dashboard
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-amber-900/80 font-normal hover:text-amber-900 hover:underline transition-colors py-2"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                {/* Nicht eingeloggte User: Navigation + Anmelden */}
                <button
                  onClick={handleWhatIsPowerStory}
                  className="text-amber-900/80 font-medium hover:text-amber-900 hover:underline transition-colors py-2"
                >
                  Was ist eine Power Story?
                </button>
                <button
                  onClick={handleDiscoverPowerStory}
                  className="bg-[#ce7106] hover:bg-amber-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:ring-offset-2"
                >
                  Eine Power Story entdecken
                </button>
                <button 
                  onClick={handleAccessClick}
                  className="text-amber-900/80 font-normal hover:text-amber-900 hover:underline transition-colors py-2"
                >
                  Mein Zugang
                </button>
              </>
            )}
          </nav>

          {/* Mobile Navigation (unter md) */}
          <div className="md:hidden flex items-center">
            <button
              ref={hamburgerButtonRef}
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-lg text-amber-900 hover:bg-amber-50 transition-colors"
              aria-label="Menü öffnen"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:w-[400px] p-0 flex flex-col [&>button]:hidden"
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
        >
          {/* Header mit Logo und Close-Button */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100">
            <Image
              src="/images/power-storys_logo.webp"
              alt="Power Storys Logo"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
            />
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                hamburgerButtonRef.current?.focus();
              }}
              className="p-2 rounded-lg text-amber-900 hover:bg-amber-50 transition-colors"
              aria-label="Menü schließen"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menü-Inhalte */}
          <div className="flex-1 px-6 py-6 space-y-4">
            {user ? (
              <>
                {/* Eingeloggte User */}
                <button
                  ref={firstMenuItemRef}
                  onClick={handleDiscoverPowerStory}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-4 px-6 rounded-[20px] transition-colors text-center"
                >
                  Eine Power Story entdecken
                </button>
                <button
                  onClick={handleWhatIsPowerStory}
                  className="w-full text-left text-amber-900 font-medium hover:text-amber-700 transition-colors py-3 px-4 rounded-lg hover:bg-amber-50"
                >
                  Was ist eine Power Story?
                </button>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full text-left text-amber-900 font-medium hover:text-amber-700 transition-colors py-3 px-4 rounded-lg hover:bg-amber-50"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left text-amber-900/80 font-normal hover:text-amber-700 transition-colors py-3 px-4 rounded-lg hover:bg-amber-50"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                {/* Nicht eingeloggte User */}
                <button
                  ref={firstMenuItemRef}
                  onClick={handleDiscoverPowerStory}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-4 px-6 rounded-[20px] transition-colors text-center"
                >
                  Eine Power Story entdecken
                </button>
                <button
                  onClick={handleWhatIsPowerStory}
                  className="w-full text-left text-amber-900 font-medium hover:text-amber-700 transition-colors py-3 px-4 rounded-lg hover:bg-amber-50"
                >
                  Was ist eine Power Story?
                </button>
                <button
                  onClick={handleAccessClick}
                  className="w-full text-left text-amber-900/80 font-normal hover:text-amber-700 transition-colors py-3 px-4 rounded-lg hover:bg-amber-50"
                >
                  Mein Zugang
                </button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

    </>
  );
}
