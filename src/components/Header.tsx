"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { motion, AnimatePresence } from "framer-motion";
import { createSPAClient } from "@/lib/supabase/client";

export default function Header() {
  const { user, signIn, signUp, signOut, loading } = useAuth();
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

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen) {
        const target = event.target as Element;
        if (!target.closest('.mobile-menu-container')) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

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
          // Bessere Fehlermeldungen
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
          // Erfolgreiche Registrierung - zeige Erfolgsmeldung
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
      
      console.log('Sending password reset email to:', email);
      console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      // Bestimme Redirect-URL und hänge die E-Mail als Fallback-Parameter an
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.ressourcen.app';
      const redirectTo = `${origin}/auth/reset?email=${encodeURIComponent(email)}`;

      // Sende Reset-Mail mit explizitem redirectTo (inkl. email)
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      console.log('Reset email response:', { data, error });
      
      if (error) {
        setError(error.message);
        console.error('Reset email error:', error);
      } else {
        setSuccess('Reset-Link wurde per E-Mail gesendet. Bitte öffne den Link aus der E-Mail.');
      }
    } catch (e) {
      setError('Senden des Reset-Links ist fehlgeschlagen.');
      console.error('Reset email exception:', e);
    } finally {
      setIsSendingReset(false);
    }
  };


  if (loading) {
    return (
      <header className="bg-white border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg animate-pulse"></div>
            <div className="w-32 h-6 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Header - Global auf allen Seiten */}
      <header className="bg-white border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button 
              className="flex items-center space-x-2 hover:opacity-80 transition-opacity cursor-pointer"
              onClick={() => {
                // Robuste Navigation zur Startseite
                if (typeof window !== 'undefined') {
                  // Lösche alle gespeicherten Zustände
                  localStorage.removeItem('appState');
                  localStorage.removeItem('currentStep');
                  localStorage.removeItem('questionAnswers');
                  localStorage.removeItem('resourceFigure');
                  
                  // Navigiere zur Startseite
                  window.location.href = '/';
                }
              }}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">🤗</span>
              </div>
              <span className="text-xl font-light text-amber-900">Ressourcen App</span>
            </button>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center">
                {/* Desktop Menu */}
                <div className="hidden lg:flex items-center space-x-3">
                  <Link
                    href="/dashboard"
                    className="text-amber-900 font-medium hover:text-amber-700 transition-colors px-4 py-2 rounded-lg hover:bg-amber-50"
                  >
                    Dashboard
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="text-amber-900 font-medium hover:text-amber-700 transition-colors px-4 py-2 rounded-lg hover:bg-amber-50"
                  >
                    Abmelden
                  </button>
                </div>

                {/* Mobile Hamburger Menu */}
                <div className="lg:hidden mobile-menu-container relative">
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-lg text-amber-900 hover:bg-amber-50 transition-colors"
                    aria-label="Menü öffnen"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                      />
                    </svg>
                  </button>

                  {/* Mobile Dropdown Menu */}
                  <AnimatePresence>
                    {isMobileMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-4 top-16 bg-white rounded-lg shadow-lg border border-amber-100 py-2 z-50 min-w-[160px]"
                      >
                        <Link
                          href="/dashboard"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block px-4 py-3 text-amber-900 hover:bg-amber-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
                          </svg>
                          Dashboard
                        </Link>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-3 text-amber-900 hover:bg-amber-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Abmelden
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="text-amber-900 font-medium hover:text-amber-700 transition-colors px-4 py-2 rounded-lg hover:bg-amber-50"
              >
                Anmelden
              </button>
            )}
          </div>
        </div>
      </header>

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
                      className="text-sm text-amber-600 hover:text-amber-800 disabled:opacity-50"
                    >
                      {isSendingReset ? 'Sende Link…' : 'Passwort vergessen?'}
                    </button>
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-4 rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Wird verarbeitet...' : (authMode === 'login' ? 'Anmelden' : 'Registrieren')}
                </button>
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
