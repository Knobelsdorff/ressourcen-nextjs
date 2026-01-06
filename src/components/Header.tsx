"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/components/providers/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { createSPAClient } from "@/lib/supabase/client";
import { scrollToAnchor } from "@/lib/navigation-helpers";
import { useRouter, usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

export default function Header() {
  const { user, signIn, signUp, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  // All hooks must be called before any conditional returns
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
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

  // Handler für "Anmelden"
  const handleLoginClick = () => {
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      setShowAuthModal(true);
      setAuthMode('login');
    }, 100);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      if (authMode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwörter stimmen nicht überein');
          return;
        }
        if (password.length < 6) {
          setError('Passwort muss mindestens 6 Zeichen lang sein');
          return;
        }

        const { error } = await signUp(email, password);
        
        if (error) {
          if (error.message.includes('already registered') || 
              error.message.includes('already been registered') ||
              error.message.includes('User already registered') ||
              error.message.includes('already exists')) {
            setError('Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail.');
          } else if (error.message.includes('Invalid email')) {
            setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
          } else {
            setError(`Fehler: ${error.message}`);
          }
        } else {
          setSuccess('Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.');
          setTimeout(() => {
            setShowAuthModal(false);
            setSuccess('');
          }, 3000);
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          setShowAuthModal(false);
          setSuccess('Erfolgreich angemeldet!');
        }
      }
    } catch (err) {
      setError('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setSuccess('Erfolgreich abgemeldet!');
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const switchMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    resetForm();
  };

  const handlePasswordReset = async () => {
    setError('');
    setSuccess('');
    if (!email) {
      setError('Bitte gib zuerst deine E-Mail ein.');
      return;
    }
    try {
      setIsSendingReset(true);
      const supabase = createSPAClient();
      
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.ressourcen.app';
      const redirectTo = `${origin}/auth/reset?email=${encodeURIComponent(email)}`;

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Reset-Link wurde per E-Mail gesendet. Bitte öffne den Link aus der E-Mail.');
      }
    } catch (e) {
      setError('Senden des Reset-Links ist fehlgeschlagen.');
    } finally {
      setIsSendingReset(false);
    }
  };

  if (loading) {
    return (
      <header className="bg-white border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>
    );
  }

  // Hide header on /ankommen page (after loading check)
  if (pathname === '/ankommen') {
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
                  onClick={handleLoginClick}
                  className="text-amber-900/80 font-normal hover:text-amber-900 hover:underline transition-colors py-2"
                >
                  Anmelden
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
                  onClick={handleLoginClick}
                  className="w-full text-left text-amber-900/80 font-normal hover:text-amber-700 transition-colors py-3 px-4 rounded-lg hover:bg-amber-50"
                >
                  Anmelden
                </button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAuthModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-amber-900">
                  {authMode === 'login' ? 'Anmelden' : 'Registrieren'}
                </h2>
                <button 
                  onClick={() => setShowAuthModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {success}
                </div>
              )}
              
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    E-Mail
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="ihre@email.de"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Passwort
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                {authMode === 'register' && (
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Passwort bestätigen
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                )}
                
                {authMode === 'login' && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-amber-600 focus:ring-amber-500" />
                      <span className="ml-2 text-sm text-gray-600">Angemeldet bleiben</span>
                    </label>
                    <button 
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={isSendingReset}
                      className="text-sm text-amber-600 hover:text-amber-800 disabled:opacity-50 font-medium"
                    >
                      {isSendingReset ? 'Sende Link…' : 'Passwort setzen/zurücksetzen'}
                    </button>
                  </div>
                )}
                
                {authMode === 'login' && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Wird verarbeitet...' : 'Anmelden'}
                  </button>
                )}
                
                {authMode === 'register' && (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Wird verarbeitet...' : 'Registrieren'}
                  </button>
                )}
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  {authMode === 'login' ? 'Noch kein Konto?' : 'Bereits ein Konto?'}{" "}
                  <button 
                    type="button"
                    onClick={switchMode}
                    className="text-amber-600 hover:text-amber-800 font-medium"
                  >
                    {authMode === 'login' ? 'Jetzt registrieren' : 'Jetzt anmelden'}
                  </button>
                </p>
              </div>
              {authMode === 'login' && (
                <div className="mt-2 text-center">
                  <button
                    onClick={handlePasswordReset}
                    className="text-sm text-amber-600 hover:text-amber-800"
                    disabled={isSendingReset}
                  >
                    {isSendingReset ? 'Sende Link...' : 'Passwort vergessen?'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
