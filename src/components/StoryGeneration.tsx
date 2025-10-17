"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  RotateCcw, 
  Loader2, 
  Heart, 
  Star, 
  Sparkles, 
  Edit3, 
  Save, 
  X, 
  Wand2,
  Send,
  User,
  Bot
} from "lucide-react";
import { ResourceFigure } from "@/app/page";
import { isEnabled } from "@/lib/featureFlags";
import { useAuth } from "@/components/providers/auth-provider";
import { QuestionAnswer } from "@/components/RelationshipSelection";

interface StoryGenerationProps {
  selectedFigure: ResourceFigure;
  questionAnswers: QuestionAnswer[];
  generatedStory: string;
  onStoryGenerated: (story: string) => void;
  onNext: () => void;
}

export default function StoryGeneration({
  selectedFigure,
  questionAnswers,
  generatedStory,
  onStoryGenerated,
  onNext
}: StoryGenerationProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStory, setEditedStory] = useState("");
  const [editingInstructions, setEditingInstructions] = useState("");
  const [isAIEditing, setIsAIEditing] = useState(false);
  const [editingHistory, setEditingHistory] = useState<string[]>([]);

  // Admin-Erkennung + Sparmodus (früh schaltbar, vor Audio)
  const { user } = useAuth();
  const isAdmin = (() => {
    const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);
    const email = (user?.email || '').toLowerCase();
    return email && list.includes(email);
  })();
  const [adminPreview, setAdminPreview] = useState<boolean>(() => {
    try { return localStorage.getItem('admin_sparmodus') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('admin_sparmodus', adminPreview ? '1' : '0'); } catch {}
  }, [adminPreview]);

  // Debug-Ausgabe zur Admin-Erkennung
  useEffect(() => {
    console.log('Admin check (StoryGeneration):', {
      userEmail: user?.email,
      envAdmins: process.env.NEXT_PUBLIC_ADMIN_EMAILS,
      isAdmin,
      adminPreview
    });
  }, [user?.email, isAdmin, adminPreview]);

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  // Simplified textarea height adjustment for better mobile performance
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.max(120, Math.min(textarea.scrollHeight, 400));
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  // Handle textarea change with debounced height adjustment for mobile
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setEditedStory(newValue);
    
    // Immediate height adjustment without requestAnimationFrame for smoother mobile experience
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  // Initialize textarea height when editing starts
  useEffect(() => {
    if (isEditing && textAreaRef.current) {
      setTimeout(() => {
        adjustTextareaHeight();
      }, 100);
    }
  }, [isEditing, adjustTextareaHeight]);

  // Update editedStory when generatedStory changes
  useEffect(() => {
    if (generatedStory && generatedStory !== editedStory) {
      setEditedStory(generatedStory);
    }
  }, [generatedStory, editedStory]);

  const generateStory = async () => {
    console.log('Starting story generation...', { selectedFigure, questionAnswers });
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedFigure,
          questionAnswers,
          // pass user name only when feature flag is on and a name exists in profile (best effort via auth context if available later)
          // keep undefined here; page-level background generation already passes it
          userName: undefined
        })
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to generate story');
      }

      const { story } = await response.json();
      console.log('Generated story:', story);
      onStoryGenerated(story);
      // Audio-first: automatisch weiter zum nächsten Schritt (Voice/Audio)
      setTimeout(() => {
        onNext();
      }, 300);
    } catch (error) {
      console.error('Error generating story:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    generateStory();
  };

  // Auto-generate story when component mounts if no story exists
  useEffect(() => {
    if (!generatedStory.trim() && !isGenerating) {
      generateStory();
    }
  }, [generatedStory, isGenerating, generateStory]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Save manual edits
      onStoryGenerated(editedStory);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setEditedStory(generatedStory);
    setIsEditing(false);
  };

  const handleAIEdit = async () => {
    if (!editingInstructions.trim()) return;

    setIsAIEditing(true);
    
    try {
      // Add to editing history
      setEditingHistory(prev => [...prev, editingInstructions]);
      
      const response = await fetch('/api/edit-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedFigure,
          questionAnswers,
          currentStory: editedStory,
          editingInstructions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to edit story');
      }

      const { story } = await response.json();
      setEditedStory(story);
      onStoryGenerated(story);
      setEditingInstructions("");
    } catch (error) {
      console.error('Error editing story:', error);
    } finally {
      setIsAIEditing(false);
    }
  };

  // Mobile-friendly: remove keyboard submit, use button instead
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Only handle Enter on desktop
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth >= 768) {
      e.preventDefault();
      handleAIEdit();
    }
  };



 return (
    <div className="p-3 sm:p-4 lg:p-8 min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6 lg:mb-8"
        >
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-lg sm:shadow-xl">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-amber-900 mb-2 sm:mb-3 px-4">
            Deine Heilungsgeschichte
          </h1>
          <p className="text-amber-700 text-base sm:text-lg max-w-full sm:max-w-2xl mx-auto px-4">
            Gestaltet mit <span className="font-semibold text-orange-600">{selectedFigure.name}</span> für emotionale Heilung und innere Sicherheit
          </p>
        </motion.div>

        {/* Resource Figure Card */}
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-4 sm:mb-6"
        >
          <Card className="bg-white/90 sm:bg-white/80 backdrop-blur-sm border-0 shadow-lg sm:shadow-xl rounded-2xl sm:rounded-3xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4 justify-center">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-200 to-orange-200 rounded-xl sm:rounded-2xl flex items-center justify-center text-xl sm:text-2xl shadow-md sm:shadow-lg">
                  {selectedFigure.emoji}
                </div>
                <div className="text-center">
                  <h3 className="text-lg sm:text-xl font-semibold text-amber-900">
                    {selectedFigure.name}
                  </h3>
                  <p className="text-sm sm:text-base text-amber-700 capitalize">
                    Deine {selectedFigure.category} Ressource
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Story Content */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 sm:mb-6"
        >
          <Card className="bg-white/90 sm:bg-white/80 backdrop-blur-sm border-0 shadow-lg sm:shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden">
            <CardContent className="p-0">
              {/* Story Header */}
              <div className="p-4 sm:p-6 bg-gradient-to-r from-amber-100 via-orange-100 to-yellow-100 border-b border-amber-200">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                      <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold text-amber-900 truncate">
                        Therapeutische Geschichte
                      </h2>
                      <p className="text-amber-700 text-xs sm:text-sm">
                        {editedStory.split(' ').length} Wörter
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="text-amber-700 hover:text-amber-900 hover:bg-amber-200/50 rounded-xl text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-auto flex-shrink-0"
                  >
                    <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                    <span className="hidden sm:inline">Neue Geschichte generieren</span>
                    <span className="sm:hidden">Neu</span>
                  </Button>
                </div>
              </div>

              {/* Story Content */}
              <div className="p-4 sm:p-6">
                <AnimatePresence mode="wait">
                  {isGenerating && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="flex flex-col items-center justify-center py-8 sm:py-12"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-400 to-orange-400 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-3 sm:mb-4">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                          </motion.div>
                        </div>
                        <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 text-lg sm:text-2xl animate-pulse">✨</div>
                      </div>
                      <p className="text-amber-800 text-base sm:text-lg font-medium mb-1 sm:mb-2 text-center px-4">
                        Erstelle deine Heilungsgeschichte...
                      </p>
                      <p className="text-amber-600 text-sm text-center px-4">
                        Verwebe deine Verbindung zu {selectedFigure.name}
                      </p>
                    </motion.div>
                  )}

                  {!isGenerating && editedStory.trim() && (
                    <motion.div
                      key="story"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      {/* Admin-Sparmodus Schalter (früh, vor Audio) */}
                      {isAdmin && (
                        <div className="flex items-center justify-center gap-3 text-amber-800">
                          <input
                            id="admin-sparmodus"
                            type="checkbox"
                            checked={adminPreview}
                            onChange={(e) => setAdminPreview(e.target.checked)}
                            className="w-4 h-4"
                          />
                          <label htmlFor="admin-sparmodus" className="text-sm">
                            Sparmodus (nur erster Satz, kein unnötiger Credit-Verbrauch)
                          </label>
                        </div>
                      )}
                      {/* Story Text */}
                      <div className="relative">
                        {/* Mobile-friendly Edit Controls */}
                        <div className="flex justify-end mb-3 sm:mb-0 sm:absolute sm:-top-2 sm:-right-2 z-10">
                          <Button
                            onClick={isEditing ? handleCancelEdit : handleEditToggle}
                            className={`min-h-[44px] min-w-[44px] sm:w-12 sm:h-12 rounded-full shadow-lg sm:shadow-xl transition-all duration-200 active:scale-95 ${
                              isEditing 
                                ? "bg-gradient-to-r from-red-400 to-pink-400 hover:from-red-500 hover:to-pink-500" 
                                : "bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500"
                            } text-white border-2 border-white touch-manipulation`}
                            size="sm"
                          >
                            {isEditing ? (
                              <X className="w-5 h-5" />
                            ) : (
                              <Edit3 className="w-5 h-5" />
                            )}
                          </Button>
                        </div>

                        {isEditing ? (
                          <div className="space-y-3 sm:space-y-4">
                            <div className="relative">
                              <textarea
                                ref={textAreaRef}
                                value={editedStory}
                                onChange={handleTextareaChange}
                                className="w-full p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-xl sm:rounded-2xl text-amber-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-base sm:text-lg touch-manipulation"
                                placeholder="Bearbeite deine Geschichte..."
                                style={{
                                  minHeight: '120px',
                                  maxHeight: '400px',
                                  height: 'auto'
                                }}
                                inputMode="text"
                              />
                              <div className="absolute bottom-2 right-2 text-xs text-amber-500 pointer-events-none bg-white/80 px-1 rounded">
                                {editedStory.length}
                              </div>
                            </div>
                            <div className="flex gap-2 sm:gap-3">
                              <Button
                                onClick={handleEditToggle}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl shadow-lg min-h-[44px] touch-manipulation"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Änderungen speichern
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* AI Editing Section */}
                      <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-orange-200">
                        <div className="flex items-center gap-2 mb-3 sm:mb-4">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-400 to-red-400 rounded-lg sm:rounded-xl flex items-center justify-center">
                            <Wand2 className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-amber-900">
                            KI-Geschichten-Editor
                          </h3>
                        </div>
                        
                        <div className="space-y-3 sm:space-y-4">
                          <div className="space-y-3 sm:space-y-0 sm:flex sm:gap-3">
                            <div className="flex-1 relative">
                              <textarea
                                value={editingInstructions}
                                onChange={(e) => setEditingInstructions(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Sage der KI, wie sie deine Geschichte verbessern soll... (z.B. 'Mache sie emotionaler', 'Füge mehr Wärme hinzu')"
                                className="w-full h-20 sm:h-24 p-3 sm:p-4 bg-white border border-amber-200 rounded-xl sm:rounded-2xl text-amber-900 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-base touch-manipulation"
                                inputMode="text"
                              />
                              <div className="absolute bottom-2 right-2 text-xs text-amber-500 bg-white/80 px-1 rounded hidden sm:block">
                                Enter drücken zum Senden
                              </div>
                            </div>
                            <Button
                              onClick={handleAIEdit}
                              disabled={!editingInstructions.trim() || isAIEditing}
                              className="bg-gradient-to-r from-orange-400 to-red-400 hover:from-orange-500 hover:to-red-500 text-white px-4 sm:px-6 py-3 rounded-xl sm:rounded-2xl shadow-lg w-full sm:w-auto sm:self-end min-h-[44px] touch-manipulation"
                            >
                              {isAIEditing ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  <span className="sm:hidden">Bearbeitet...</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-4 h-4 sm:mr-2" />
                                  <span className="sm:hidden ml-2">An KI senden</span>
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Editing History */}
                          {editingHistory.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs sm:text-sm text-amber-700 font-medium">Letzte Bearbeitungen:</p>
                              <div className="space-y-1 max-h-16 sm:max-h-20 overflow-y-auto">
                                {editingHistory.slice(-3).map((instruction, index) => (
                                  <div key={index} className="flex items-start gap-2 text-xs sm:text-sm">
                                    <Bot className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-amber-700 break-words">{instruction}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4">
                        <Button
                          onClick={onNext}
                          className="bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 hover:from-amber-500 hover:via-orange-500 hover:to-red-500 text-white px-6 sm:px-8 py-3 rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl text-base sm:text-lg font-semibold flex items-center gap-2 min-h-[44px] touch-manipulation w-full sm:w-auto"
                        >
                          Weiter zur Stimmenauswahl
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}