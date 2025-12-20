"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Send } from "lucide-react";
import AudioRecorder from "./AudioRecorder";
import { createSPAClient } from "@/lib/supabase/client";

interface ClientResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface RecordedResource {
  id: string;
  name: string;
  audioBlob: Blob;
}

interface StoredResource {
  id: string;
  name: string;
  audioBlobBase64: string;
  mimeType: string;
}

const STORAGE_KEY = "client_resources_draft";
const STORAGE_EMAIL_KEY = "client_email_draft";

export default function ClientResourceModal({
  isOpen,
  onClose,
  onSuccess
}: ClientResourceModalProps) {
  const [currentResourceName, setCurrentResourceName] = useState("");
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [recordedResources, setRecordedResources] = useState<RecordedResource[]>([]);
  const [clientEmail, setClientEmail] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Lade gespeicherte Ressourcen beim Öffnen des Modals
  useEffect(() => {
    if (isOpen) {
      const loadStoredResources = async () => {
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          const storedEmail = localStorage.getItem(STORAGE_EMAIL_KEY);
          
          console.log('[ClientResourceModal] Loading from localStorage:', {
            hasStored: !!stored,
            hasEmail: !!storedEmail,
            storedLength: stored?.length || 0
          });
          
          if (storedEmail) {
            setClientEmail(storedEmail);
          }
          
          if (stored) {
            const storedResources: StoredResource[] = JSON.parse(stored);
            console.log('[ClientResourceModal] Found stored resources:', storedResources.length);
            
            const restoredResources: RecordedResource[] = await Promise.all(
              storedResources.map(async (sr) => {
                // Konvertiere Base64 zurück zu Blob
                const byteCharacters = atob(sr.audioBlobBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: sr.mimeType });
                
                return {
                  id: sr.id,
                  name: sr.name,
                  audioBlob: blob,
                };
              })
            );
            
            if (restoredResources.length > 0) {
              console.log('[ClientResourceModal] Restored resources:', restoredResources.length);
              setRecordedResources(restoredResources);
            } else {
              console.log('[ClientResourceModal] No resources to restore');
            }
          } else {
            console.log('[ClientResourceModal] No stored data found in localStorage');
          }
        } catch (err) {
          console.error("Error loading stored resources:", err);
          // Bei Fehler: Lösche ungültige Daten
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_EMAIL_KEY);
        }
      };
      
      loadStoredResources();
    }
  }, [isOpen]);

  // Speichere Ressourcen automatisch bei Änderungen
  useEffect(() => {
    if (isOpen && recordedResources.length > 0) {
      try {
        // Konvertiere Blobs zu Base64 für localStorage
        Promise.all(
          recordedResources.map(async (resource) => {
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                resolve(base64String);
              };
              reader.onerror = reject;
              reader.readAsDataURL(resource.audioBlob);
            });
            
            return {
              id: resource.id,
              name: resource.name,
              audioBlobBase64: base64,
              mimeType: resource.audioBlob.type || 'audio/webm',
            } as StoredResource;
          })
        ).then((storedResources) => {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(storedResources));
        });
      } catch (err) {
        console.error("Error saving resources to localStorage:", err);
      }
    }
    // WICHTIG: localStorage wird NICHT gelöscht, wenn recordedResources leer ist,
    // damit die Daten nach Browser-Reload erhalten bleiben
    // localStorage wird nur gelöscht nach erfolgreichem Versand (siehe handleSendAll)
  }, [recordedResources, isOpen]);

  // Speichere Email bei Änderungen
  useEffect(() => {
    if (isOpen && clientEmail.trim()) {
      localStorage.setItem(STORAGE_EMAIL_KEY, clientEmail.trim());
    } else if (!clientEmail.trim()) {
      localStorage.removeItem(STORAGE_EMAIL_KEY);
    }
  }, [clientEmail, isOpen]);

  const handleRecordingComplete = (blob: Blob) => {
    setCurrentAudioBlob(blob);
    setError("");
  };

  const handleAddToQueue = () => {
    if (!currentResourceName.trim()) {
      setError("Bitte gib einen Namen für die Ressource ein.");
      return;
    }

    if (!currentAudioBlob) {
      setError("Bitte nimm zuerst eine Audio-Aufnahme auf.");
      return;
    }

    const newResource: RecordedResource = {
      id: Date.now().toString(),
      name: currentResourceName.trim(),
      audioBlob: currentAudioBlob,
    };

    setRecordedResources([...recordedResources, newResource]);
    setCurrentResourceName("");
    setCurrentAudioBlob(null);
    setError("");
  };

  const handleRemoveFromQueue = (id: string) => {
    setRecordedResources(recordedResources.filter(r => r.id !== id));
  };

  const handleSendAll = async () => {
    if (recordedResources.length === 0) {
      setError("Bitte füge mindestens eine Ressource hinzu.");
      return;
    }

    if (!clientEmail.trim()) {
      setError("Bitte gib eine Klienten-Email ein.");
      return;
    }

    setIsUploading(true);
    setError("");
    setSuccess(false);

    try {
      const supabaseClient = createSPAClient();
      const uploadedResources: Array<{ name: string; audioUrl: string }> = [];

      // Lade alle Dateien direkt zu Supabase Storage hoch
      for (const resource of recordedResources) {
        try {
          // Generiere eindeutigen Dateinamen
          const timestamp = Date.now();
          const randomId = Math.random().toString(36).substr(2, 9);
          const sanitizedResourceName = resource.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const fileName = `client_${sanitizedResourceName}_${timestamp}_${randomId}.webm`;

          // Upload zu Supabase Storage
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('audio-files')
            .upload(fileName, resource.audioBlob, {
              contentType: 'audio/webm',
              cacheControl: '3600',
              upsert: false,
            });

          if (uploadError) {
            console.error(`Storage upload error for ${resource.name}:`, uploadError);
            throw new Error(`Fehler beim Hochladen von "${resource.name}": ${uploadError.message}`);
          }

          // Hole öffentliche URL
          const { data: { publicUrl } } = supabaseClient.storage
            .from('audio-files')
            .getPublicUrl(fileName);

          uploadedResources.push({
            name: resource.name,
            audioUrl: publicUrl,
          });
        } catch (uploadErr: any) {
          throw new Error(`Fehler beim Hochladen von "${resource.name}": ${uploadErr.message}`);
        }
      }

      // Sende nur Metadaten (URLs) an die API-Route
      const response = await fetch("/api/resources/client/create-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientEmail: clientEmail.trim(),
          resources: uploadedResources,
        }),
      });

      // Prüfe Content-Type bevor JSON-Parsing
      const contentType = response.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch (jsonError) {
          // Fallback: Versuche Antwort als Text zu lesen
          const text = await response.text();
          console.error("JSON parsing failed, response text:", text);
          throw new Error(`Server-Fehler: ${response.status} ${response.statusText}. Antwort: ${text.substring(0, 200)}`);
        }
      } else {
        // Wenn kein JSON, lese als Text für bessere Fehlermeldung
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Server-Fehler: ${response.status} ${response.statusText}. ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error("API Error:", data);
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}`
          : data.error || "Fehler beim Versenden der Ressourcen.";
        throw new Error(errorMessage);
      }

      // Zeige Erfolgsmeldung
      if (data.emailSent) {
        setSuccess(true);
        setRecordedResources([]);
        setClientEmail("");
        // Lösche gespeicherte Daten nach erfolgreichem Versand
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_EMAIL_KEY);
        
        setTimeout(() => {
          setSuccess(false);
          if (onSuccess) {
            onSuccess();
          }
          onClose();
        }, 3000);
      } else {
        throw new Error("E-Mail konnte nicht versendet werden.");
      }

    } catch (err: any) {
      console.error("Error sending resources:", err);
      setError(err.message || "Fehler beim Versenden der Ressourcen. Bitte versuche es erneut.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return; // Verhindere Schließen während Upload
    
    // Setze nur temporäre State-Variablen zurück
    // Die Ressourcen bleiben in localStorage gespeichert für später
    setCurrentResourceName("");
    setCurrentAudioBlob(null);
    setError("");
    setSuccess(false);
    // recordedResources und clientEmail bleiben erhalten (werden beim nächsten Öffnen aus localStorage geladen)
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
          className="bg-white sm:rounded-2xl rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between sm:p-6 p-3 border-b">
            <h2 className="sm:text-2xl text-xl font-bold text-gray-900">
              Ressource für Klienten erstellen
            </h2>
            <button
              onClick={handleClose}
              disabled={isUploading}
              className="sm:p-2 p-1.5 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <X className="sm:w-6 sm:h-6 w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto sm:p-6 p-3 sm:space-y-6 space-y-3">
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
                    {recordedResources.length > 0 ? `${recordedResources.length} Ressourcen erfolgreich erstellt!` : "Ressource erfolgreich erstellt!"}
                  </span>
                </div>
                {clientEmail && (
                  <p className="text-green-700 text-sm mt-2">
                    Eine Email wurde an {clientEmail} verschickt. Die Ressourcen erscheinen nicht in deinem Dashboard, sondern werden dem Klienten nach Login/Registrierung zugeordnet.
                  </p>
                )}
              </motion.div>
            )}

            {/* Fehler-Meldung */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="sm:p-4 p-3 max-sm:flex-col max-sm:gap-2 max-sm:items-start bg-red-50 border-2 border-red-300 rounded-xl flex items-center sm:space-x-3"
              >
                <AlertCircle className="w-6 h-6 text-red-600" />
                <span className="text-red-800 max-sm:text-sm">{error}</span>
              </motion.div>
            )}

            {/* Liste der aufgenommenen Ressourcen */}
            {recordedResources.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4"
              >
                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Aufgenommene Ressourcen ({recordedResources.length})
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recordedResources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-100"
                    >
                      <span className="font-medium text-gray-900">{resource.name}</span>
                      <button
                        onClick={() => handleRemoveFromQueue(resource.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                        title="Entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Aktuelle Ressource aufnehmen */}
            <div>
              <h3 className="sm:text-lg text-base font-semibold text-gray-900 sm:mb-4 mb-3">
                {recordedResources.length > 0 ? "Weitere Ressource hinzufügen" : "1. Ressource aufnehmen"}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name der Ressource
                  </label>
                  <input
                    type="text"
                    value={currentResourceName}
                    onChange={(e) => {
                      setCurrentResourceName(e.target.value);
                      setError("");
                    }}
                    placeholder="z.B. Oma, Engel, Krafttier..."
                    className="w-full sm:px-4 px-3 sm:py-3 py-2 border-2 border-gray-200 sm:rounded-xl rounded-lg focus:outline-none focus:border-blue-500 transition-colors sm:text-lg text-sm"
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    Gib einen Namen für die Ressourcenfigur ein (z.B. "Oma", "Engel", "Krafttier").
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Audio aufnehmen
                  </label>
                  <AudioRecorder
                    key={`recorder-${recordedResources.length}`}
                    onRecordingComplete={handleRecordingComplete}
                    onError={(err) => setError(err)}
                    maxDuration={600}
                  />
                </div>

                <button
                  onClick={handleAddToQueue}
                  disabled={!currentResourceName.trim() || !currentAudioBlob}
                  className="w-full sm:px-4 px-3 sm:py-3 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 max-sm:text-sm"
                >
                  <Plus className="w-5 h-5" />
                  <span>Zur Liste hinzufügen</span>
                </button>
              </div>
            </div>

            {/* Klienten-Email (nur wenn Ressourcen vorhanden) */}
            {recordedResources.length > 0 && (
              <div>
                <h3 className="sm:text-lg text-base font-semibold text-gray-900 sm:mb-4 mb-3">
                  2. Klienten-Email
                </h3>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="klient@beispiel.de"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="mt-2 text-sm text-gray-600">
                  Hinweis: Es wird nur eine E‑Mail versendet, wenn hier eine Klienten‑Email eingetragen ist. In diesem Fall erscheinen die Ressourcen nicht in deinem Dashboard, sondern der Klient erhält eine E‑Mail mit Zugangslink und die Ressourcen werden nach dem Login automatisch seinem Account zugeordnet.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center max-sm:flex-col-reverse justify-between sm:p-6 p-3 border-t bg-gray-50">
            <div className="text-sm text-gray-600">
              {recordedResources.length > 0 && (
                <span>{recordedResources.length} Ressource{recordedResources.length > 1 ? 'n' : ''} bereit zum Versenden</span>
              )}
            </div>
            <div className="flex sm:items-center max-sm:flex-col sm:gap-3 gap-1">
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="sm:px-6 sm:py-3 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              {recordedResources.length > 0 ? (
                <button
                  onClick={handleSendAll}
                  disabled={!clientEmail.trim() || isUploading}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Wird versendet...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Alle {recordedResources.length} Ressource{recordedResources.length > 1 ? 'n' : ''} versenden</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="sm:text-sm text-xs text-gray-500 italic">
                  Füge Ressourcen hinzu, um sie zu versenden
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

