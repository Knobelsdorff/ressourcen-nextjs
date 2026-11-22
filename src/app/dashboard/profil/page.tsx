"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import ChangePassword from '@/components/ChangePassword';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { T, useTextFn } from "@/components/site-text/T";
import { account } from "@/content/texts/account";

export default function ProfilPage() {
  const { user } = useAuth();
  const tx = useTextFn();
  const [loading, setLoading] = useState(true);
  
  // Name-Sektion
  const [fullName, setFullName] = useState('');
  const [pronunciationHint, setPronunciationHint] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');
  const [nameError, setNameError] = useState('');
  
  // Feedback-Sektion
  const [feedback, setFeedback] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  
  // Abo-Sektion
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionAmount, setSubscriptionAmount] = useState<string | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [managingPortal, setManagingPortal] = useState(false);
  
  // E-Mail-Änderung
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Lade Name-Daten
  const loadFullName = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, pronunciation_hint')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading full name:', error);
      } else if (data) {
        const profileData = data as { full_name?: string | null; pronunciation_hint?: string | null };
        setFullName(profileData.full_name || '');
        // Parse pronunciation_hint: Format kann sein "AN DI" oder "AN DI|1" oder "AN DI|1|2" oder "AN DI|1|2|true"
        if (profileData.pronunciation_hint) {
          const hintParts = profileData.pronunciation_hint.split('|');
          setPronunciationHint(hintParts[0] || '');
        } else {
          setPronunciationHint('');
        }
      }
    } catch (err) {
      console.error('Error loading full name:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadFullName();
  }, [loadFullName]);

  // Lade Abo-Status
  useEffect(() => {
    const loadSubscription = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/subscription/details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.hasSubscription && data.subscription?.status === 'active') {
            setSubscriptionStatus('active');
            setSubscriptionAmount(data.formatted?.amount || '15 €');
          } else {
            setSubscriptionStatus(null);
          }
        }
      } catch (err) {
        console.error('Error loading subscription:', err);
      } finally {
        setLoadingSubscription(false);
      }
    };

    loadSubscription();
  }, [user]);

  // Abo verwalten (Stripe Customer Portal)
  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      setManagingPortal(true);
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to open customer portal');
      }

      const { url } = await response.json();
      if (!url) throw new Error('No portal URL');
      // Gleicher Tab: window.open nach await wird auf iOS blockiert.
      window.location.assign(url);
    } catch (err) {
      alert(tx(account["profile.access.portalError"]));
    } finally {
      setManagingPortal(false);
    }
  };

  // Name speichern
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSavingName(true);
    setNameError('');
    setNameSuccess('');

    try {
      // Speichere pronunciation_hint im einfachen Format (nur Text, ohne Betonung)
      const pronunciationHintToSave = pronunciationHint.trim() || null;
      
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ 
          full_name: fullName.trim() || null,
          pronunciation_hint: pronunciationHintToSave
        })
        .eq('id', user.id);

      if (error) {
        setNameError(tx(account["profile.saveError"]));
      } else {
        setNameSuccess(tx(account["profile.name.saved"]));
        setTimeout(() => setNameSuccess(''), 3000);
      }
    } catch (err) {
      setNameError(tx(account["profile.saveError"]));
    } finally {
      setSavingName(false);
    }
  };

  // Feedback senden
  const handleSendFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !feedback.trim()) return;

    setSendingFeedback(true);
    setFeedbackError('');
    setFeedbackSuccess('');

    try {
      const formData = new FormData();
      formData.append('name', fullName.trim() || user.email.split('@')[0]);
      formData.append('message', feedback.trim());
      formData.append('rating', '5'); // Standard-Rating für Feedback ohne explizite Bewertung
      formData.append('userEmail', user.email);

      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setFeedbackError(data.error || tx(account["profile.feedback.error"]));
        return;
      }

      setFeedbackSuccess(tx(account["profile.feedback.sent"]));
      setFeedback('');
      setTimeout(() => setFeedbackSuccess(''), 5000);
    } catch (err) {
      setFeedbackError(tx(account["profile.unexpected"]));
    } finally {
      setSendingFeedback(false);
    }
  };

  // E-Mail ändern
  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEmail.trim()) return;

    setChangingEmail(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) {
        setEmailError(error.message || tx(account["profile.email.error"]));
      } else {
        setEmailSuccess(tx(account["profile.email.sent"]));
        setNewEmail('');
        setTimeout(() => {
          setShowEmailDialog(false);
          setEmailSuccess('');
        }, 3000);
      }
    } catch (err) {
      setEmailError(tx(account["profile.unexpected"]));
    } finally {
      setChangingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* 1. SEKTION: Dein Name in den Geschichten */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 md:p-8"
      >
        <h2 className="text-xl font-light text-amber-900 mb-6">
          <T t={account["profile.name.title"]} />
        </h2>

        <form onSubmit={handleSaveName} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              <T t={account["profile.name.label"]} />
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={tx(account["profile.name.placeholder"])}
              className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              <T t={account["profile.pronunciation.label"]} /> <span className="text-gray-400 font-normal"><T t={account["profile.optional"]} /></span>
            </label>
            <input
              type="text"
              value={pronunciationHint}
              onChange={(e) => setPronunciationHint(e.target.value)}
              placeholder={tx(account["profile.pronunciation.placeholder"])}
              className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
            />
          </div>

          <p className="text-sm text-gray-600 leading-relaxed">
            <T t={account["profile.name.note"]} />
          </p>

          {nameError && (
            <div className="flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{nameError}</span>
            </div>
          )}

          {nameSuccess && (
            <div className="flex items-start gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{nameSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={savingName}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <T t={savingName ? account["profile.name.saving"] : account["profile.name.save"]} />
          </button>
        </form>
      </motion.div>

      {/* 2. SEKTION: Kontakt & Zugang */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 md:p-8"
      >
        <h2 className="text-xl font-light text-amber-900 mb-6">
          <T t={account["profile.contact.title"]} />
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              <T t={account["profile.email.label"]} />
            </label>
            <p className="text-base text-gray-700 mb-4">{user?.email}</p>
          </div>

          <button
            onClick={() => {
              setShowEmailDialog(true);
              setNewEmail('');
              setEmailError('');
              setEmailSuccess('');
            }}
            className="px-6 py-3 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors font-medium"
          >
            <T t={account["profile.email.change"]} />
          </button>
          
          {/* E-Mail-Änderungs-Dialog */}
          {showEmailDialog && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              >
                <h3 className="text-xl font-light text-amber-900 mb-4">
                  <T t={account["profile.email.change"]} />
                </h3>
                
                <form onSubmit={handleChangeEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-amber-900 mb-2">
                      <T t={account["profile.email.new"]} />
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder={tx(account["profile.email.placeholder"])}
                      className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base"
                      required
                    />
                  </div>

                  {emailError && (
                    <div className="flex items-start gap-2 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{emailError}</span>
                    </div>
                  )}

                  {emailSuccess && (
                    <div className="flex items-start gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{emailSuccess}</span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailDialog(false);
                        setNewEmail('');
                        setEmailError('');
                        setEmailSuccess('');
                      }}
                      className="flex-1 px-4 py-2 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors font-medium"
                    >
                      <T t={account["profile.email.cancel"]} />
                    </button>
                    <button
                      type="submit"
                      disabled={changingEmail || !newEmail.trim()}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      <T t={changingEmail ? account["profile.email.changing"] : account["profile.email.submit"]} />
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}

          <p className="text-sm text-gray-600 leading-relaxed">
            <T t={account["profile.email.note"]} />
          </p>
        </div>
      </motion.div>

      {/* 3. SEKTION: Sicherheit */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 md:p-8"
      >
        <h2 className="text-xl font-light text-amber-900 mb-6">
          <T t={account["profile.security.title"]} />
        </h2>

        <div className="space-y-4">
          <ChangePassword />
          <p className="text-sm text-gray-600 leading-relaxed">
            <T t={account["profile.security.note"]} />
          </p>
        </div>
      </motion.div>

      {/* 4. SEKTION: Dein Zugang */}
      {user && !loadingSubscription && subscriptionStatus === 'active' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 md:p-8"
        >
          <h2 className="text-xl font-light text-amber-900 mb-6">
            <T t={account["profile.access.title"]} />
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-base text-amber-900 mb-4">
                <T t={account["profile.access.active"]} vars={{ amount: subscriptionAmount }} />
              </p>
            </div>

            <button
              onClick={handleManageSubscription}
              disabled={managingPortal}
              className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {managingPortal ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <T t={account["profile.access.opening"]} />
                </>
              ) : (
                <>
                  <T t={account["profile.access.manage"]} />
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-sm text-gray-600 leading-relaxed">
              <T t={account["profile.access.note"]} />
            </p>
          </div>
        </motion.div>
      )}

      {/* 5. SEKTION: Feedback & Wünsche */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-amber-200 shadow-sm p-6 md:p-8"
      >
        <h2 className="text-xl font-light text-amber-900 mb-6">
          <T t={account["profile.feedback.title"]} />
        </h2>

        <form onSubmit={handleSendFeedback} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-amber-900 mb-2">
              <T t={account["profile.feedback.label"]} />
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={tx(account["profile.feedback.placeholder"])}
              rows={6}
              className="w-full px-4 py-3 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-base resize-none"
            />
          </div>

          {feedbackError && (
            <div className="flex items-start gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{feedbackError}</span>
            </div>
          )}

          {feedbackSuccess && (
            <div className="flex items-start gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{feedbackSuccess}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={sendingFeedback || !feedback.trim()}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <T t={sendingFeedback ? account["profile.feedback.sending"] : account["profile.feedback.send"]} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
