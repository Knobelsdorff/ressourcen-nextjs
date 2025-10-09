"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { motion } from "framer-motion";

export default function UserProfile() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!user) return;
    
    setIsSubmitting(true);
    setMessage('');

    try {
      const { error } = await updateProfile({ full_name: fullName });
      
      if (error) {
        setMessage(`Fehler: ${error.message}`);
      } else {
        setMessage('Profil erfolgreich aktualisiert!');
        setIsEditing(false);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      setMessage('Ein unerwarteter Fehler ist aufgetreten');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6 max-w-md mx-auto"
    >
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mx-auto mb-4 flex items-center justify-center">
          <span className="text-white text-3xl">
            {fullName ? fullName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-amber-900">Mein Profil</h2>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.includes('Fehler') 
            ? 'bg-red-50 border border-red-200 text-red-700' 
            : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            E-Mail
          </label>
          <input
            type="email"
            value={user.email || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vollständiger Name
          </label>
          {isEditing ? (
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              placeholder="Dein Name"
            />
          ) : (
            <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              {fullName || 'Nicht angegeben'}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mitglied seit
          </label>
          <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
            {new Date(user.created_at).toLocaleDateString('de-DE')}
          </div>
        </div>

        <div className="flex space-x-3 pt-4">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300 disabled:opacity-50"
              >
                {isSubmitting ? 'Wird gespeichert...' : 'Speichern'}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFullName(user?.user_metadata?.full_name || '');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
              >
                Abbrechen
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300"
            >
              Bearbeiten
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
