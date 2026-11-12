"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import { scrollToAnchor } from "@/lib/navigation-helpers";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Menu, X, UserCircle, ChevronDown, ChevronRight, Home, Settings,
  Sparkles, KeyRound, LogOut, Plus, ArrowRight,
} from "lucide-react";
import type { CSSProperties } from "react";

// Gestaffeltes Hereingleiten der Drawer-Einträge (siehe .drawer-anim).
const staggerDelay = (index: number) => ({ "--i": index } as CSSProperties);
import { TOUR_ANCHORS } from "@/components/onboarding/firstStoryTour";
import { openSettings } from "@/components/dashboard/settings-events";

// useSearchParams() im Root-Layout braucht eine Suspense-Grenze, sonst
// scheitert `next build` beim statischen Rendern jeder Seite. Der Fallback
// rendert den normalen Header, damit er weiterhin im statischen HTML steht.
export default function Header() {
  return (
    <Suspense fallback={<HeaderContent isFirstStoryFlow={false} />}>
      <HeaderWithSearchParams />
    </Suspense>
  );
}

function HeaderWithSearchParams() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstStoryFlow = pathname === '/create-story' && searchParams.get('first') === 'true';
  return <HeaderContent isFirstStoryFlow={isFirstStoryFlow} />;
}

function HeaderContent({ isFirstStoryFlow }: { isFirstStoryFlow: boolean }) {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // All hooks must be called before any conditional returns
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const firstMenuItemRef = useRef<HTMLElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const profileName = user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Mein Zugang';
  const profileInitials = profileName
    .split(/\s+/)
    .map((part: string) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

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

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    hamburgerButtonRef.current?.focus();
  };

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
      router.push("/create-story?first=true");
    }, 100);
  };

  // Handler für "Mein Zugang"
  const handleAccessClick = () => {
    setIsMobileMenuOpen(false);
    router.push("/zugang");
  };

  // "Neue Power Story erstellen" / "Weitere Power Storys freischalten" –
  // dieselbe Regel wie der Knopf unter den Storys im Dashboard (Usability-Test
  // Punkt 6): Wer eine Story erstellen darf (aktives Abo, Paket, erste Story
  // noch frei) → /create-story. Sonst → das Abo-Angebot (SubscriptionOffer).
  const [canCreateStory, setCanCreateStory] = useState<boolean | null>(null);
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setCanCreateStory(null);
      return;
    }
    let cancelled = false;
    import("@/lib/access")
      .then(({ canCreateResource }) => canCreateResource(userId))
      .then((allowed) => { if (!cancelled) setCanCreateStory(allowed); })
      .catch(() => { if (!cancelled) setCanCreateStory(false); });
    return () => { cancelled = true; };
    // Bei jedem Seitenwechsel neu prüfen: Story erstellt, Abo abgeschlossen …
  }, [userId, pathname]);

  const createLabel = canCreateStory === false ? "Weitere Power Storys freischalten" : "Neue Power Story erstellen";

  const handleCreateStory = async () => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);

    // Nur eingeloggte Nutzer haben ein Abo-Konzept. Anonyme Nutzer folgen dem bestehenden Flow.
    if (user) {
      // Beim Klick frisch prüfen – der angezeigte Stand kann veraltet sein.
      let allowed = false;
      try {
        const { canCreateResource } = await import("@/lib/access");
        allowed = await canCreateResource(user.id);
      } catch (error) {
        // Im Zweifel das Angebot zeigen, nicht /create-story ohne klaren Zugang.
        console.warn("[Header] Zugang für neue Story nicht prüfbar:", error);
      }
      setCanCreateStory(allowed);

      if (!allowed) {
        // Auf dem Dashboard: Angebot direkt öffnen. Sonst dorthin, es öffnet sich dort.
        if (pathname === "/dashboard") window.dispatchEvent(new CustomEvent("dashboard-open-paywall"));
        else router.push("/dashboard?paywall=1");
        return;
      }
    }

    router.push("/create-story");
  };

  const handleOpenSettings = () => {
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    openSettings(pathname, (url) => router.push(url));
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    setIsMobileMenuOpen(false);
    // Beim Abmelden meldet signOut() den User sofort als "nicht eingeloggt".
    // Die Dashboard-Seite zeigt dann ihren Ladekreis und startet eine eigene
    // Weiterleitung – die soft-navigierte router.push('/') konnte dagegen
    // hängen bleiben. Ein harter Seitenwechsel beendet das zuverlässig; die
    // Zeitgrenze verhindert, dass ein hängender Netzwerkaufruf ihn blockiert.
    try {
      await Promise.race([
        signOut(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch (error) {
      console.error('Logout failed, leaving the page anyway:', error);
    }
    window.location.assign('/');
  };

  if (isFirstStoryFlow) {
    return null;
  }

  if (loading) {
    return (
      <header data-landing={pathname === '/' || undefined} className="bg-white border-b border-orange-100">
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
      <header data-tour-offset data-dashboard={(pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin') || pathname === '/auth/set-password' || pathname === '/create-story') || undefined} data-landing={pathname === '/' || undefined} className="bg-white border-b border-amber-100/60 lg:sticky lg:top-0 lg:z-50">
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
                {/* Handlung: CTA klar vom Text getrennt. Erst nach der Zugangsprüfung,
                    sonst stünde kurz die falsche Beschriftung da. */}
                {canCreateStory !== null && (
                  <button
                    onClick={handleCreateStory}
                    data-dashboard-action="create"
                    className="bg-amber-600/90 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:ring-offset-2 ml-2 self-center mt-0.5"
                  >
                    {canCreateStory ? "+ Neue Power Story erstellen" : createLabel}
                  </button>
                )}
                <div ref={profileMenuRef} className="relative ml-2">
                  <button
                    type="button"
                    data-tour={TOUR_ANCHORS.account}
                    onClick={() => setIsProfileMenuOpen((open) => !open)}
                    aria-expanded={isProfileMenuOpen}
                    aria-haspopup="menu"
                    className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-amber-900 shadow-sm transition-colors hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-800">
                      {profileInitials || <UserCircle className="h-4 w-4" aria-hidden="true" />}
                    </span>
                    <span className="max-w-28 truncate text-sm font-medium">{profileName}</span>
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>

                  {isProfileMenuOpen && (
                    <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-amber-100 bg-white p-2 shadow-xl">
                      <div className="border-b border-amber-100 px-3 pb-3 pt-2">
                        <p className="text-sm font-semibold text-amber-950">{profileName}</p>
                        <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p>
                      </div>
                      <div className="py-2">
                        <Link role="menuitem" href="/dashboard" onClick={() => setIsProfileMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm text-amber-900 hover:bg-amber-50">Mein Raum</Link>
                        <button role="menuitem" type="button" onClick={handleOpenSettings} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-amber-900 hover:bg-amber-50">Einstellungen</button>
                        <button role="menuitem" type="button" onClick={handleCreateStory} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-amber-900 hover:bg-amber-50">{createLabel}</button>
                      </div>
                      <div className="border-t border-amber-100 pt-2">
                        <button role="menuitem" type="button" onClick={handleLogout} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-amber-800/60 hover:bg-amber-50 hover:text-amber-900">Abmelden</button>
                      </div>
                    </div>
                  )}
                </div>
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
                  data-analytics-cta="header" onClick={handleDiscoverPowerStory}
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
              data-tour={TOUR_ANCHORS.account}
              onClick={() => setIsMobileMenuOpen(true)}
              className="header-menu-button"
              aria-label="Menü öffnen"
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="dialog"
            >
              <Menu className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer – Wellness-Palette, Stile in globals.css */}
      <div
        className={`mobile-drawer-wrapper ${isMobileMenuOpen ? 'is-open' : ''}`}
        // Geschlossen: nicht fokussierbar und für Screenreader unsichtbar.
        inert={!isMobileMenuOpen}
      >
        {/* Backdrop - Klick schließt Menü */}
        <div
          className="mobile-drawer-backdrop"
          onClick={closeMobileMenu}
        />

        <div
          className="mobile-drawer-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Menü"
        >
          {/* Kopfbereich mit Logo und Close-Button */}
          <div className="drawer-head">
            <Image
              src="/images/power-storys_logo.webp"
              alt="Power Storys Logo"
              width={160}
              height={48}
              className="h-10 w-auto object-contain"
            />
            <button
              type="button"
              onClick={closeMobileMenu}
              className="drawer-close"
              aria-label="Menü schließen"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {user ? (
            <>
              <div className="drawer-body">
                {/* Konto */}
                <div className="drawer-profile drawer-anim" style={staggerDelay(0)}>
                  <span className="drawer-avatar">
                    {profileInitials || <UserCircle className="h-5 w-5" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0">
                    <p className="drawer-profile-name truncate">{profileName}</p>
                    <p className="drawer-profile-email truncate">{user.email}</p>
                  </div>
                </div>

                <nav aria-label="Hauptnavigation" className="drawer-list">
                  <Link
                    ref={firstMenuItemRef as React.Ref<HTMLAnchorElement>}
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={pathname === '/dashboard' ? 'page' : undefined}
                    className="drawer-link drawer-anim"
                    style={staggerDelay(1)}
                  >
                    <span className="drawer-icon drawer-icon--sage"><Home aria-hidden="true" /></span>
                    <span className="drawer-link-label">Mein Raum</span>
                    <ChevronRight className="drawer-chevron" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="drawer-link drawer-anim"
                    style={staggerDelay(2)}
                  >
                    <span className="drawer-icon drawer-icon--lavender"><Settings aria-hidden="true" /></span>
                    <span className="drawer-link-label">Einstellungen</span>
                    <ChevronRight className="drawer-chevron" aria-hidden="true" />
                  </button>
                </nav>
              </div>

              <div className="drawer-footer">
                {/* Wie am Desktop: erst nach der Zugangsprüfung zeigen. */}
                {canCreateStory !== null && (
                  <button
                    type="button"
                    onClick={handleCreateStory}
                    className="drawer-cta drawer-anim"
                    style={staggerDelay(3)}
                  >
                    {canCreateStory ? <Plus aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                    {createLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="drawer-logout drawer-anim"
                  style={staggerDelay(4)}
                >
                  <LogOut aria-hidden="true" />
                  Abmelden
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Nicht eingeloggte User */}
              <nav aria-label="Hauptnavigation" className="drawer-body">
                <div className="drawer-list">
                  <button
                    type="button"
                    onClick={handleWhatIsPowerStory}
                    className="drawer-link drawer-anim"
                    style={staggerDelay(0)}
                  >
                    <span className="drawer-icon drawer-icon--sage"><Sparkles aria-hidden="true" /></span>
                    <span className="drawer-link-label">Was ist eine Power Story?</span>
                    <ChevronRight className="drawer-chevron" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleAccessClick}
                    className="drawer-link drawer-anim"
                    style={staggerDelay(1)}
                  >
                    <span className="drawer-icon drawer-icon--peach"><KeyRound aria-hidden="true" /></span>
                    <span className="drawer-link-label">Mein Zugang</span>
                    <ChevronRight className="drawer-chevron" aria-hidden="true" />
                  </button>
                </div>
              </nav>

              {/* Haupt-CTA unten – im Daumenbereich */}
              <div className="drawer-footer">
                <button
                  ref={firstMenuItemRef as React.Ref<HTMLButtonElement>}
                  type="button"
                  data-analytics-cta="header-mobile"
                  onClick={handleDiscoverPowerStory}
                  className="drawer-cta drawer-anim"
                  style={staggerDelay(2)}
                >
                  Eine Power Story entdecken
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </>
  );
}
