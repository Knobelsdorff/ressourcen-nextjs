"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import AudioRecorder from "./AudioRecorder";

interface ClientResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ClientResourceModal({
  isOpen,
  onClose,
  onSuccess
}: ClientResourceModalProps) {
  const [resourceName, setResourceName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRecordingComplete = (blob: Blob) => {
    setAudioBlob(blob);
    setError("");
  };

  const handleSubmit = async () => {
    if (!resourceName.trim()) {
      setError("Bitte gib einen Namen für die Ressource ein.");
      return;
    }

    if (!audioBlob) {
      setError("Bitte nimm zuerst eine Audio-Aufnahme auf.");
      return;
    }

    setIsUploading(true);
    setError("");
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append("resourceName", resourceName.trim());
      formData.append("audioFile", audioBlob, `recording-${Date.now()}.webm`);
      if (clientEmail.trim()) {
        formData.append("clientEmail", clientEmail.trim());
      }

      const response = await fetch("/api/resources/client/create", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error:", data);
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || "Fehler beim Erstellen der Ressource.";
        throw new Error(errorMessage);
      }

      // Zeige Erfolgsmeldung basierend auf Email-Versand
      if (data.emailSent) {
        setSuccess(true);
        // Erfolgsmeldung wird automatisch nach 2 Sekunden geschlossen
      } else {
        setSuccess(true);
      }
      
      // Reset form
      setTimeout(() => {
        setResourceName("");
        setClientEmail("");
        setAudioBlob(null);
        setSuccess(false);
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      }, 2000);

    } catch (err: any) {
      console.error("Error creating client resource:", err);
      setError(err.message || "Fehler beim Erstellen der Ressource. Bitte versuche es erneut.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return; // Verhindere Schließen während Upload
    
    setResourceName("");
    setClientEmail("");
    setAudioBlob(null);
    setError("");
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              Ressource für Klienten erstellen
            </h2>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Erfolgs-Meldung */}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border-2 border-green-300 rounded-xl"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-800 font-medium">
                    Ressource erfolgreich erstellt!
                  </span>
                </div>
                {clientEmail && (
                  <p className="text-green-700 text-sm mt-2">
                    Eine Email wurde an {clientEmail} verschickt. Die Ressource erscheint nicht in deinem Dashboard, sondern wird dem Klienten nach Login/Registrierung zugeordnet.
                  </p>
                )}
              </motion.div>
            )}

            {/* Fehler-Meldung */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-center space-x-3"
              >
                <AlertCircle className="w-6 h-6 text-red-600" />
                <span className="text-red-800">{error}</span>
              </motion.div>
            )}

            {/* Schritt 1: Name der Ressource */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                1. Name der Ressource
              </h3>
              <input
                type="text"
                value={resourceName}
                onChange={(e) => {
                  setResourceName(e.target.value);
                  setError("");
                }}
                placeholder="z.B. Oma, Engel, Krafttier..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-lg"
              />
              <p className="mt-2 text-sm text-gray-600">
                Gib einen Namen für die Ressourcenfigur ein (z.B. "Oma", "Engel", "Krafttier").
              </p>
            </div>

            {/* Schritt 2: Audio aufnehmen */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                2. Audio aufnehmen
              </h3>
              <AudioRecorder
                onRecordingComplete={handleRecordingComplete}
                onError={(err) => setError(err)}
                maxDuration={600}
              />
            </div>

            {/* Schritt 3: Klienten-Email (optional) */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                3. Klienten-Email (optional)
              </h3>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="klient@beispiel.de"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="mt-2 text-sm text-gray-600">
                Wenn du die Email angibst, kann die Ressource später automatisch dem Klienten zugeordnet werden.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t bg-gray-50">
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="px-6 py-3 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSubmit}
              disabled={!resourceName.trim() || !audioBlob || isUploading}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Wird erstellt...</span>
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Ressource erstellen</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

