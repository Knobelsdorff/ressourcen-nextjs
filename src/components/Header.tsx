"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import { scrollToAnchor } from "@/lib/navigation-helpers";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export default function Header() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // All hooks must be called before any conditional returns
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLElement>(null);

  // Body scroll lock beim Öffnen des Menüs
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

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

  // Handler für "Was ist eine Power Story?" - Smooth-Scroll oder Navigation
  const handleWhatIsPowerStory = () => {
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      // Prüfe, ob das Element auf der aktuellen Seite existiert
      const element = document.getElementById('was-ist-eine-power-story');
      if (element) {
        // Element existiert - direkt scrollen
        scrollToAnchor('was-ist-eine-power-story');
      } else {
        // Element existiert nicht - zur Homepage mit Hash navigieren
        router.push('/#was-ist-eine-power-story');
      }
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

  // Handler für "Neue Power Story erstellen"
  const handleCreateStory = async () => {
    setIsMobileMenuOpen(false);
    if (user) {
      const { canCreateResource } = await import('@/lib/access');
      const canCreate = await canCreateResource(user.id);
      
      if (!canCreate) {
        // Falls Paywall benötigt wird, könnte hier ein Modal geöffnet werden
        // Für jetzt navigieren wir einfach zum Dashboard, wo die Paywall-Logik ist
        router.push('/dashboard');
        return;
      }
    }
    router.push('/create-story');
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
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
          {/* Logo – eingeloggt: /dashboard, sonst Startseite */}
          <div className="flex items-center space-x-2">
            {user ? (
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
              >
                <Image
                  src="/images/power-storys_logo.webp"
                  alt="Power Storys Logo"
                  width={200}
                  height={60}
                  className="h-12 md:h-14 w-auto object-contain"
                  priority
                />
              </Link>
            ) : (
              <button
                type="button"
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
            )}
          </div>

          {/* Desktop Navigation (ab md) – Public vs. App Header */}
          <nav className="hidden md:flex items-center gap-6 md:gap-8">
            {user ? (
              <>
                {/* Orientierung: Textlinks */}
                <Link
                  href="/dashboard"
                  className="text-amber-900/90 font-medium hover:text-amber-900 transition-colors py-2"
                >
                  Mein Raum
                </Link>
                <Link
                  href="/dashboard/profil"
                  className="text-amber-900/90 font-medium hover:text-amber-900 transition-colors py-2"
                >
                  Profil
                </Link>
                {/* Handlung: CTA klar vom Text getrennt */}
                <button
                  onClick={handleCreateStory}
                  className="bg-amber-600/90 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:ring-offset-2 ml-2 self-center mt-0.5"
                >
                  + Neue Power Story
                </button>
                {/* Sekundäre Aktion: bewusst aus dem Fokus */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-amber-800/50 font-normal hover:text-amber-800/75 transition-colors py-2 ml-5"
                  aria-label="Abmelden"
                >
                  Abmelden
                </button>
              </>
            ) : (
              <>
                {/* Nicht eingeloggte User: erklärend + sanfter Einstieg */}
                <button
                  type="button"
                  onClick={handleWhatIsPowerStory}
                  className="text-amber-800/65 text-sm hover:text-amber-900/80 transition-colors py-2"
                >
                  Was ist eine Power Story?
                </button>
                <button
                  type="button"
                  onClick={handleDiscoverPowerStory}
                  className="bg-amber-600/90 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:ring-offset-2"
                >
                  Eine Power Story entdecken
                </button>
                <Link
                  href="/zugang"
                  className="text-amber-900/90 font-medium hover:text-amber-900 transition-colors py-2"
                >
                  Mein Zugang
                </Link>
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

      {/* Mobile Menu Drawer - Custom Implementation */}
      <div
        className={`mobile-drawer-wrapper ${isMobileMenuOpen ? 'is-open' : ''}`}
      >
        {/* Backdrop - Klick schließt Menü */}
        <div 
          className="mobile-drawer-backdrop"
          onClick={() => {
            setIsMobileMenuOpen(false);
            hamburgerButtonRef.current?.focus();
          }}
        />

        {/* Drawer Panel */}
        <div 
          className="mobile-drawer-panel"
          onClick={(e) => {
            // Verhindere, dass Klicks innerhalb des Panels das Menü schließen
            e.stopPropagation();
          }}
        >
          {/* Kopfbereich mit Logo und Close-Button */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-amber-100/50">
            <Image
              src="/images/power-storys_logo.webp"
              alt="Power Storys Logo"
              width={140}
              height={42}
              className="h-8 w-auto object-contain opacity-90"
            />
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                hamburgerButtonRef.current?.focus();
              }}
              className="min-h-[48px] min-w-[48px] p-2.5 rounded-lg text-amber-900/60 hover:text-amber-900/80 hover:bg-amber-50/40 transition-colors flex items-center justify-center"
              aria-label="Menü schließen"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Menü-Inhalte */}
          <div className="flex-1 px-6 py-8 flex flex-col overflow-y-auto">
            {user ? (
              <>
                {/* Hauptnavigation */}
                <div className="space-y-1">
                  {/* Primärer Menüpunkt: Mein Raum */}
                  <Link
                    ref={firstMenuItemRef as React.Ref<HTMLAnchorElement>}
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-left text-amber-900 text-lg font-medium hover:text-amber-800 transition-colors min-h-[48px] py-4 px-4 rounded-lg hover:bg-amber-50/30 flex items-center"
                  >
                    Mein Raum
                  </Link>
                  
                  {/* Sekundärer Menüpunkt: Profil */}
                  <Link
                    href="/dashboard/profil"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block w-full text-left text-amber-900/80 text-base font-normal hover:text-amber-900 transition-colors min-h-[48px] py-4 px-4 rounded-lg hover:bg-amber-50/30 flex items-center"
                  >
                    Profil
                  </Link>
                </div>

                {/* Trennlinie */}
                <div className="py-6">
                  <div className="border-t border-amber-200/40"></div>
                </div>

                {/* Konto-Info */}
                <div className="pb-6">
                  <p className="text-xs text-gray-400/80 px-4 mb-1.5">
                    Angemeldet als
                  </p>
                  <p className="text-xs text-gray-400/70 px-4 break-all">
                    {user?.email}
                  </p>
                </div>

                {/* Trennlinie */}
                <div className="py-4">
                  <div className="border-t border-amber-200/30"></div>
                </div>

                {/* Abmelden */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left text-amber-900/60 text-sm font-normal hover:text-amber-900/75 transition-colors min-h-[48px] py-4 px-4 rounded-lg hover:bg-amber-50/30 flex items-center"
                  >
                    Abmelden
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Nicht eingeloggte User */}
                <div className="space-y-3">
                  <button
                    ref={firstMenuItemRef as React.Ref<HTMLButtonElement>}
                    onClick={handleDiscoverPowerStory}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-4 px-6 rounded-xl transition-colors text-center"
                  >
                    Eine Power Story entdecken
                  </button>
                  <button
                    onClick={handleWhatIsPowerStory}
                    className="w-full text-left text-amber-900 font-medium hover:text-amber-700 transition-colors py-3 px-4 rounded-lg hover:bg-amber-50/50"
                  >
                    Was ist eine Power Story?
                  </button>
                  <button
                    onClick={handleAccessClick}
                    className="w-full text-left text-amber-900/80 font-normal hover:text-amber-700 transition-colors py-3 px-4 rounded-lg hover:bg-amber-50/50"
                  >
                    Mein Zugang
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

    </>
  );
}
