"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Check, ArrowRight } from "lucide-react";
import AudioRecorder from "./AudioRecorder";
import { createSPAClient } from "@/lib/supabase/client";
import { indexedDBHelper } from "@/lib/indexedDB";

// Beschriftung der drei Schritte (links nach rechts)
const STEPS = ["Aufnehmen", "Sammlung", "Versenden"] as const;

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

  // Stepper: 1 = Aufnehmen, 2 = Sammlung prüfen, 3 = Versenden
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Eigener Zähler für den Recorder-Reset. Darf NIE aus recordedResources.length
  // abgeleitet werden – beim Löschen wiederholt sich der Wert sonst und React
  // recycelt die alte Recorder-Instanz (Aufnahme scheint zu verschwinden).
  const [recorderKey, setRecorderKey] = useState(0);
  // Anzahl und Empfänger der versendeten Ressourcen für die Erfolgsmeldung
  // (werden nach dem Versand geleert, daher separat gemerkt)
  const [sentCount, setSentCount] = useState(0);
  const [sentEmail, setSentEmail] = useState("");

  // Lade gespeicherte Ressourcen beim Öffnen des Modals
  useEffect(() => {
    if (isOpen) {
      const loadStoredResources = async () => {
        try {
          // Check if IndexedDB is supported
          if (!indexedDBHelper.isSupported()) {
            console.warn("IndexedDB not supported, draft persistence disabled");
            return;
          }

          // Try to load from IndexedDB first
          let draftData = await indexedDBHelper.loadDraft();

          // Migration: If no IndexedDB data, check localStorage (old storage method)
          if (!draftData) {
            const STORAGE_KEY = "client_resources_draft";
            const STORAGE_EMAIL_KEY = "client_email_draft";
            const storedLS = localStorage.getItem(STORAGE_KEY);
            const storedEmailLS = localStorage.getItem(STORAGE_EMAIL_KEY);

            if (storedLS || storedEmailLS) {
              console.log("Migrating from localStorage to IndexedDB...");
              try {
                const migratedRecordings: any[] = [];

                if (storedLS) {
                  const storedResources = JSON.parse(storedLS);

                  // Convert Base64 back to Blob
                  for (const sr of storedResources) {
                    const byteCharacters = atob(sr.audioBlobBase64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: sr.mimeType });

                    migratedRecordings.push({
                      id: sr.id,
                      name: sr.name,
                      audioBlob: blob,
                      mimeType: sr.mimeType,
                      timestamp: Date.now(),
                    });
                  }
                }

                // Save to IndexedDB
                await indexedDBHelper.saveDraft({
                  recordings: migratedRecordings,
                  clientEmail: storedEmailLS || "",
                  lastUpdated: Date.now(),
                });

                // Clear old localStorage data
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(STORAGE_EMAIL_KEY);

                console.log("Migration completed successfully");

                // Load the migrated data
                draftData = await indexedDBHelper.loadDraft();
              } catch (migrationErr) {
                console.error("Error migrating from localStorage:", migrationErr);
                // Clear localStorage on migration failure
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(STORAGE_EMAIL_KEY);
              }
            }
          }

          // Apply loaded data
          if (draftData) {
            if (draftData.clientEmail) {
              setClientEmail(draftData.clientEmail);
            }

            if (draftData.recordings && draftData.recordings.length > 0) {
              const restoredResources: RecordedResource[] = draftData.recordings.map((sr) => ({
                id: sr.id,
                name: sr.name,
                audioBlob: sr.audioBlob,
              }));

              setRecordedResources(restoredResources);
              // Gespeicherte Aufnahmen sofort sichtbar machen, statt auf
              // Schritt 1 zu starten (sonst wirkt es, als wäre nichts da)
              setStep(2);
            }
          }
        } catch (err) {
          console.error("Error loading stored resources from IndexedDB:", err);
          // Bei Fehler: Lösche ungültige Daten
          try {
            await indexedDBHelper.clearDraft();
          } catch (clearErr) {
            console.error("Error clearing draft:", clearErr);
          }
        }
      };

      loadStoredResources();
    }
  }, [isOpen]);

  // Speichere Ressourcen und Email automatisch bei Änderungen
  useEffect(() => {
    if (isOpen) {
      const saveDraft = async () => {
        try {
          // Check if IndexedDB is supported
          if (!indexedDBHelper.isSupported()) {
            return;
          }

          // Save both recordings and email together
          await indexedDBHelper.saveDraft({
            recordings: recordedResources.map(r => ({
              id: r.id,
              name: r.name,
              audioBlob: r.audioBlob,
              mimeType: r.audioBlob.type || 'audio/webm',
              timestamp: Date.now(),
            })),
            clientEmail: clientEmail.trim(),
            lastUpdated: Date.now(),
          });
        } catch (err) {
          console.error("Error saving draft to IndexedDB:", err);
        }
      };

      // Only save if there's data to save
      if (recordedResources.length > 0 || clientEmail.trim()) {
        saveDraft();
      }
    }
    // WICHTIG: IndexedDB wird NICHT gelöscht, wenn recordedResources leer ist,
    // damit die Daten nach Browser-Reload erhalten bleiben
    // IndexedDB wird nur gelöscht nach erfolgreichem Versand (siehe handleSendAll)
  }, [recordedResources, clientEmail, isOpen]);

  const handleRecordingComplete = (blob: Blob | null) => {
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
    // Recorder für die nächste Aufnahme frisch aufsetzen
    setRecorderKey((k) => k + 1);
    // Nach dem Hinzufügen direkt zur Übersicht
    setStep(2);
  };

  const handleRemoveFromQueue = (id: string) => {
    const remaining = recordedResources.filter(r => r.id !== id);
    setRecordedResources(remaining);
    // Ohne Aufnahmen gibt es nichts zu prüfen oder zu versenden
    if (remaining.length === 0) {
      setStep(1);
    }
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

      const formatApiErrors = (apiErrors?: Array<{ resourceName?: string; error?: string }>) => {
        if (!apiErrors?.length) return null;
        return apiErrors
          .map((e) => (e.resourceName ? `"${e.resourceName}": ${e.error}` : e.error))
          .filter(Boolean)
          .join(" ");
      };

      if (!response.ok) {
        console.error("API Error:", data);
        const apiErrorsText = formatApiErrors(data.errors);
        const errorMessage = apiErrorsText
          ? apiErrorsText
          : data.details
            ? `${data.error}: ${data.details}`
            : data.error || "Fehler beim Versenden der Ressourcen.";
        throw new Error(errorMessage);
      }

      const created = typeof data.created === "number" ? data.created : 0;

      if (created === 0) {
        const apiErrorsText = formatApiErrors(data.errors);
        throw new Error(
          apiErrorsText || "Keine Ressource konnte gespeichert werden. Bitte erneut versuchen."
        );
      }

      // Zeige Erfolgsmeldung nur wenn Ressource(n) angelegt und E-Mail versendet
      if (data.emailSent) {
        // Anzahl vor dem Leeren merken, damit die Erfolgsmeldung stimmt
        setSuccess(true);
        setSentCount(recordedResources.length);
        setSentEmail(clientEmail.trim());
        setRecordedResources([]);
        setClientEmail("");

        // Lösche gespeicherte Daten nach erfolgreichem Versand
        try {
          if (indexedDBHelper.isSupported()) {
            await indexedDBHelper.clearDraft();
          }
        } catch (clearErr) {
          console.error("Error clearing draft after send:", clearErr);
        }

        setTimeout(() => {
          setSuccess(false);
          if (onSuccess) {
            onSuccess();
          }
          onClose();
        }, 3000);
      } else {
        const detail = data.emailError ? ` (${data.emailError})` : "";
        throw new Error(
          `Ressource wurde gespeichert, aber die E-Mail konnte nicht versendet werden${detail}. Bitte prüfe Resend/Vercel-Logs oder sende den Link manuell erneut.`
        );
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
    setStep(1);
    // Recorder beim nächsten Öffnen frisch aufsetzen
    setRecorderKey((k) => k + 1);
    // recordedResources und clientEmail bleiben erhalten (werden beim nächsten Öffnen aus localStorage geladen)
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.99 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="bg-white sm:rounded-2xl rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header mit Stepper */}
          <div className="sm:px-8 sm:pt-7 sm:pb-5 p-4 border-b border-amber-200">
            <div className="flex items-start justify-between sm:mb-6 mb-5">
              <div>
                <h2 className="sm:text-2xl text-lg font-light text-amber-900">
                  Ressource für Klienten erstellen
                </h2>
                <p className="sm:text-sm text-xs text-amber-700 mt-1">
                  Du kannst mehrere Aufnahmen sammeln und gemeinsam versenden.
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isUploading}
                className="sm:p-2 p-1.5 -mr-1 text-amber-700 hover:text-amber-900 hover:bg-amber-50 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stepper: links nach rechts */}
            <nav aria-label="Fortschritt">
              <ol className="flex items-center gap-2">
                {STEPS.map((label, index) => {
                  const stepNumber = (index + 1) as 1 | 2 | 3;
                  const isDone = stepNumber < step;
                  const isCurrent = stepNumber === step;
                  const canGo =
                    stepNumber < step ||
                    (stepNumber === 2 && recordedResources.length > 0);

                  return (
                    <li
                      key={label}
                      className="flex items-center gap-2 flex-1 last:flex-none"
                    >
                      <button
                        type="button"
                        onClick={() => canGo && setStep(stepNumber)}
                        disabled={!canGo && !isCurrent}
                        aria-current={isCurrent ? "step" : undefined}
                        className={`flex items-center gap-2 rounded-md transition-colors ${
                          canGo ? "cursor-pointer" : "cursor-default"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 flex items-center justify-center rounded-full border text-xs tabular-nums transition-colors ${
                            isCurrent
                              ? "bg-amber-700 border-amber-700 text-white"
                              : isDone
                              ? "bg-white border-amber-700 text-amber-800"
                              : "bg-white border-amber-300 text-amber-400"
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : stepNumber}
                        </span>
                        <span
                          className={`text-sm whitespace-nowrap max-sm:hidden ${
                            isCurrent
                              ? "text-amber-900 font-medium"
                              : isDone
                              ? "text-amber-800"
                              : "text-amber-400"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                      {index < STEPS.length - 1 && (
                        <span
                          aria-hidden="true"
                          className={`h-px flex-1 min-w-[12px] ${
                            isDone ? "bg-amber-700" : "bg-amber-200"
                          }`}
                        />
                      )}
                    </li>
                  );
                })}
              </ol>
              {/* Aktueller Schritt auf Mobile als Text */}
              <p className="sm:hidden text-sm text-amber-900 font-medium mt-3">
                {STEPS[step - 1]}
              </p>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto sm:px-8 sm:py-7 p-4">
            {/* Status-Meldungen */}
            <AnimatePresence initial={false}>
              {success && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex sm:items-center items-start gap-3 sm:px-5 px-4 sm:py-4 py-3 mb-6 bg-amber-50 border border-amber-400 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div className="min-w-0">
                      <p className="text-amber-900 max-sm:text-sm">
                        {sentCount > 1
                          ? `${sentCount} Ressourcen erfolgreich versendet`
                          : "Ressource erfolgreich versendet"}
                      </p>
                      {sentEmail && (
                        <p className="text-amber-700 sm:text-sm text-xs mt-1 leading-snug">
                          Eine Email wurde an {sentEmail} verschickt. Die Ressourcen erscheinen nicht in deinem Dashboard, sondern werden dem Klienten nach Login/Registrierung zugeordnet.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-3 sm:px-5 px-4 sm:py-4 py-3 mb-6 bg-amber-50/70 border border-amber-500 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                    <span className="text-amber-900 max-sm:text-sm leading-snug">{error}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ---------- Schritt 1: Aufnehmen ---------- */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="sm:space-y-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="resource-name"
                    className="block text-sm text-amber-700 mb-2"
                  >
                    Name der Ressource
                  </label>
                  <input
                    id="resource-name"
                    type="text"
                    value={currentResourceName}
                    onChange={(e) => {
                      setCurrentResourceName(e.target.value);
                      setError("");
                    }}
                    placeholder="z.B. Oma, Engel, Krafttier..."
                    className="w-full sm:px-4 px-3 sm:py-2.5 py-2 bg-white border border-amber-400 rounded-lg text-amber-900 placeholder:text-amber-500/60 focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 transition-colors max-sm:text-sm"
                  />
                </div>

                <AudioRecorder
                  key={`recorder-${recorderKey}`}
                  onRecordingComplete={handleRecordingComplete}
                  onError={(err) => setError(err)}
                  maxDuration={600}
                />
              </motion.div>
            )}

            {/* ---------- Schritt 2: Sammlung ---------- */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex items-baseline justify-between mb-3">
                  <p className="text-sm text-amber-700">
                    {recordedResources.length} Aufnahme
                    {recordedResources.length !== 1 ? "n" : ""} gesammelt
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-900 font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Weitere aufnehmen
                  </button>
                </div>

                {recordedResources.length > 0 ? (
                  <div className="divide-y divide-amber-200 border border-amber-400 rounded-lg overflow-hidden">
                    <AnimatePresence initial={false}>
                      {recordedResources.map((resource, index) => (
                        <motion.div
                          key={resource.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex items-center justify-between gap-3 sm:px-4 px-3 sm:py-3 py-2.5 bg-white"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-amber-600 tabular-nums flex-shrink-0">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="text-amber-900 truncate max-sm:text-sm">
                              {resource.name}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveFromQueue(resource.id)}
                            className="p-1.5 -mr-1 text-amber-600 hover:text-amber-900 hover:bg-amber-50 rounded-md transition-colors flex-shrink-0"
                            title="Entfernen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="border border-amber-300 border-dashed rounded-lg sm:py-10 py-8 text-center">
                    <p className="text-sm text-amber-700">
                      Noch keine Aufnahmen gesammelt.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* ---------- Schritt 3: Versenden ---------- */}
            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <label
                  htmlFor="client-email"
                  className="block text-sm text-amber-700 mb-2"
                >
                  E-Mail-Adresse des Klienten
                </label>
                <input
                  id="client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="klient@beispiel.de"
                  className="w-full sm:px-4 px-3 sm:py-2.5 py-2 bg-white border border-amber-400 rounded-lg text-amber-900 placeholder:text-amber-500/60 focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 transition-colors max-sm:text-sm"
                />
                <p className="mt-2 sm:text-sm text-xs text-amber-700 leading-snug">
                  Der Klient erhält eine E‑Mail mit Zugangslink. Die Ressourcen
                  erscheinen nicht in deinem Dashboard, sondern werden nach dem
                  Login automatisch seinem Account zugeordnet.
                </p>

                <div className="mt-6 pt-5 border-t border-amber-200">
                  <p className="text-sm text-amber-700 mb-3">Wird versendet</p>
                  <ul className="space-y-1.5">
                    {recordedResources.map((resource, index) => (
                      <li
                        key={resource.id}
                        className="flex items-center gap-3 text-amber-900 max-sm:text-sm"
                      >
                        <span className="text-xs text-amber-600 tabular-nums">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="truncate">{resource.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer: Navigation */}
          <div className="flex items-center justify-between gap-3 sm:px-8 sm:py-5 p-4 border-t border-amber-200">
            <button
              onClick={
                step === 1
                  ? handleClose
                  : () => setStep((s) => (s - 1) as 1 | 2 | 3)
              }
              disabled={isUploading}
              className="sm:px-4 px-3 py-2 text-amber-700 hover:text-amber-900 font-medium transition-colors disabled:opacity-50 max-sm:text-sm"
            >
              {step === 1 ? "Abbrechen" : "Zurück"}
            </button>

            {step === 1 && (
              <button
                onClick={handleAddToQueue}
                disabled={!currentResourceName.trim() || !currentAudioBlob}
                className="sm:px-5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-medium transition-colors disabled:bg-amber-200 disabled:text-amber-500 disabled:cursor-not-allowed flex items-center gap-2 max-sm:text-sm"
              >
                <span>Aufnahme übernehmen</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={recordedResources.length === 0}
                className="sm:px-5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-medium transition-colors disabled:bg-amber-200 disabled:text-amber-500 disabled:cursor-not-allowed flex items-center gap-2 max-sm:text-sm"
              >
                <span>Weiter</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={handleSendAll}
                disabled={
                  recordedResources.length === 0 ||
                  !clientEmail.trim() ||
                  isUploading
                }
                className="sm:px-5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-medium transition-colors disabled:bg-amber-200 disabled:text-amber-500 disabled:cursor-not-allowed flex items-center gap-2 max-sm:text-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Wird versendet...</span>
                  </>
                ) : (
                  <span>
                    Versenden
                    {recordedResources.length > 0 && ` (${recordedResources.length})`}
                  </span>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
