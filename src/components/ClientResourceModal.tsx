"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, CheckCircle, AlertCircle, Plus, Trash2, Send, Mail, RefreshCw } from "lucide-react";
import AudioRecorder from "./AudioRecorder";

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

interface SentResource {
  id: string;
  title: string;
  client_email: string;
  created_at: string;
  audio_url?: string;
  resource_figure?: any;
}

export default function ClientResourceModal({
  isOpen,
  onClose,
  onSuccess
}: ClientResourceModalProps) {
  // Tab-Navigation
  const [activeTab, setActiveTab] = useState<'create' | 'resend'>('create');
  
  // Erstellen-Tab States
  const [currentResourceName, setCurrentResourceName] = useState("");
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [recordedResources, setRecordedResources] = useState<RecordedResource[]>([]);
  const [clientEmail, setClientEmail] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Versendete Ressourcen Tab States
  const [sentResources, setSentResources] = useState<SentResource[]>([]);
  const [loadingSentResources, setLoadingSentResources] = useState(false);
  const [resendingResourceId, setResendingResourceId] = useState<string | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [confirmResourceId, setConfirmResourceId] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

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
      const formData = new FormData();
      formData.append("clientEmail", clientEmail.trim());
      
      // Füge alle Ressourcen zum FormData hinzu
      recordedResources.forEach((resource, index) => {
        formData.append(`resourceName_${index}`, resource.name);
        formData.append(`audioFile_${index}`, resource.audioBlob, `recording-${resource.id}.webm`);
      });

      const response = await fetch("/api/resources/client/create-batch", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

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

  // Lade versendete Ressourcen
  const loadSentResources = async () => {
    setLoadingSentResources(true);
    setError("");
    
    try {
      const response = await fetch("/api/admin/resources/list-sent");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Laden der Ressourcen");
      }
      
      setSentResources(data.resources || []);
    } catch (err: any) {
      console.error("Error loading sent resources:", err);
      setError(err.message || "Fehler beim Laden der versendeten Ressourcen.");
    } finally {
      setLoadingSentResources(false);
    }
  };

  // Lade Ressourcen wenn Tab gewechselt wird
  useEffect(() => {
    if (isOpen && activeTab === 'resend') {
      loadSentResources();
    }
  }, [isOpen, activeTab]);

  // Öffne Bestätigungsdialog
  const handleResendClick = (resourceId: string) => {
    setConfirmResourceId(resourceId);
    setShowResendConfirm(true);
  };

  // Erneut versenden nach Bestätigung
  const handleConfirmResend = async () => {
    if (!confirmResourceId) return;
    
    setResendingResourceId(confirmResourceId);
    setShowResendConfirm(false);
    setError("");
    setResendSuccess(null);
    
    try {
      const response = await fetch("/api/admin/resources/resend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId: confirmResourceId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Fehler beim erneuten Versenden");
      }
      
      setResendSuccess(data.resourceName || "Ressource");
      
      // Lade Ressourcen neu
      await loadSentResources();
      
      // Verstecke Erfolgsmeldung nach 3 Sekunden
      setTimeout(() => {
        setResendSuccess(null);
      }, 3000);
      
    } catch (err: any) {
      console.error("Error resending resource:", err);
      setError(err.message || "Fehler beim erneuten Versenden der E-Mail.");
    } finally {
      setResendingResourceId(null);
      setConfirmResourceId(null);
    }
  };

  const handleClose = () => {
    if (isUploading || resendingResourceId) return; // Verhindere Schließen während Upload/Versand
    
    setCurrentResourceName("");
    setCurrentAudioBlob(null);
    setRecordedResources([]);
    setClientEmail("");
    setError("");
    setSuccess(false);
    setActiveTab('create');
    setSentResources([]);
    setResendSuccess(null);
    setShowResendConfirm(false);
    setConfirmResourceId(null);
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
          <div className="border-b">
            <div className="flex items-center justify-between p-6">
              <h2 className="text-2xl font-bold text-gray-900">
                Ressource für Klienten
              </h2>
              <button
                onClick={handleClose}
                disabled={isUploading || !!resendingResourceId}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Tab-Navigation */}
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Neue Ressource erstellen
              </button>
              <button
                onClick={() => setActiveTab('resend')}
                className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'resend'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Versendete Ressourcen
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Erfolgs-Meldung (Erstellen) */}
            {success && activeTab === 'create' && (
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

            {/* Erfolgs-Meldung (Erneut versenden) */}
            {resendSuccess && activeTab === 'resend' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-green-50 border-2 border-green-300 rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-green-800 font-medium">
                    E-Mail für "{resendSuccess}" wurde erfolgreich erneut versendet!
                  </span>
                </div>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-lg"
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
                  className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Zur Liste hinzufügen</span>
                </button>
              </div>
            </div>

            {/* Klienten-Email (nur wenn Ressourcen vorhanden) */}
            {recordedResources.length > 0 && activeTab === 'create' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
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

            {/* Versendete Ressourcen Tab */}
            {activeTab === 'resend' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Versendete Ressourcen
                  </h3>
                  <button
                    onClick={loadSentResources}
                    disabled={loadingSentResources}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                    title="Aktualisieren"
                  >
                    <RefreshCw className={`w-5 h-5 ${loadingSentResources ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loadingSentResources ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : sentResources.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>Noch keine Ressourcen versendet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentResources.map((resource) => (
                      <div
                        key={resource.id}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {resource.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {resource.client_email}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(resource.created_at).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleResendClick(resource.id)}
                          disabled={resendingResourceId === resource.id || !!resendingResourceId}
                          className="ml-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                        >
                          {resendingResourceId === resource.id ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Wird gesendet...</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              <span>E-Mail erneut senden</span>
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Erstellen Tab Content - nur wenn create Tab aktiv */}
            {activeTab === 'create' && (
              <>
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors text-lg"
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
                      className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Zur Liste hinzufügen</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {activeTab === 'create' && (
            <div className="flex items-center justify-between p-6 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                {recordedResources.length > 0 && (
                  <span>{recordedResources.length} Ressource{recordedResources.length > 1 ? 'n' : ''} bereit zum Versenden</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  disabled={isUploading}
                  className="px-6 py-3 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
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
                  <div className="text-sm text-gray-500 italic">
                    Füge Ressourcen hinzu, um sie zu versenden
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'resend' && (
            <div className="flex items-center justify-end p-6 border-t bg-gray-50">
              <button
                onClick={handleClose}
                disabled={!!resendingResourceId}
                className="px-6 py-3 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors disabled:opacity-50"
              >
                Schließen
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bestätigungsdialog */}
      <AnimatePresence>
        {showResendConfirm && confirmResourceId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                E-Mail erneut senden?
              </h3>
              {(() => {
                const resource = sentResources.find(r => r.id === confirmResourceId);
                return resource ? (
                  <>
                    <p className="text-gray-700 mb-6">
                      Möchtest du die Ressource <strong>"{resource.title}"</strong> erneut an <strong>{resource.client_email}</strong> senden?
                    </p>
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => {
                          setShowResendConfirm(false);
                          setConfirmResourceId(null);
                        }}
                        className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleConfirmResend}
                        className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Erneut senden
                      </button>
                    </div>
                  </>
                ) : null;
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

