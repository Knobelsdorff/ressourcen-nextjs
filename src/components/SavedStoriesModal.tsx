// components/SavedStoriesModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Clock, User, Trash2, Download, Volume2, Play, Pause, RotateCcw, ChevronLeft } from "lucide-react";
import { ResourceFigure, AudioState } from "@/lib/types/story";
import { QuestionAnswer } from "@/components/RelationshipSelection";
import { useAuth } from "@/components/providers/auth-provider";

interface SavedStory {
  id: string;
  timestamp: number;
  resourceFigure: ResourceFigure;
  questionAnswers: QuestionAnswer[];
  generatedStory: string;
  audioState: AudioState | null;
  createdAt: string;
  title?: string;
}

interface SavedStoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SavedStoriesModal({ isOpen, onClose }: SavedStoriesModalProps) {
  const { user } = useAuth();
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [selectedStory, setSelectedStory] = useState<SavedStory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioLoading, setAudioLoading] = useState(false);
  const [showMobileDetails, setShowMobileDetails] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedStories();
      setShowMobileDetails(false);
      setSelectedStory(null);
    }
  }, [isOpen]);

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleLoadStart = () => setAudioLoading(true);
    const handleCanPlay = () => setAudioLoading(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [selectedStory?.audioState?.audioUrl]);

  const loadSavedStories = () => {
    const storiesJson = localStorage.getItem('ressourcen_stories');
    if (storiesJson) {
      try {
        const stories: SavedStory[] = JSON.parse(storiesJson);
        setSavedStories(stories);
      } catch (error) {
        console.error('Error loading stories:', error);
        setSavedStories([]);
      }
    }
  };

  const deleteStory = (storyId: string) => {
    if (confirm('Bist du sicher, dass du diese Geschichte löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      const updatedStories = savedStories.filter(story => story.id !== storyId);
      setSavedStories(updatedStories);
      localStorage.setItem('ressourcen_stories', JSON.stringify(updatedStories));
      if (selectedStory?.id === storyId) {
        setSelectedStory(null);
        setShowMobileDetails(false);
      }
    }
  };

  const handleStorySelect = (story: SavedStory) => {
    setSelectedStory(story);
    setShowMobileDetails(true);
  };

  const handleBackToList = () => {
    setShowMobileDetails(false);
    setSelectedStory(null);
  };

  const downloadStory = (story: SavedStory) => {
    const content = `
${story.title}
Erstellt: ${story.createdAt}
Ressourcenfigur: ${story.resourceFigure.name} ${story.resourceFigure.emoji}

Geschichte:
"${story.generatedStory}"

Fragen & Antworten:
${story.questionAnswers.map((qa:any, index) => 
  `${index + 1}. ${qa.question}\nAntwort: ${qa.answer || 'Blockauswahl: ' + qa.selectedBlocks.join(', ')}`
).join('\n\n')}

${story.audioState?.audioUrl ? `Audio-URL: ${story.audioState.audioUrl}` : 'Kein Audio verfügbar'}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${story.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'geschichte'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download-Funktion entfernt - Streaming only für bessere Kundenbindung
  const downloadAudio = async (story: SavedStory) => {
    // Downloads sind deaktiviert - nur Streaming verfügbar
    alert('Downloads sind aktuell nicht verfügbar. Bitte nutze das Streaming-Feature.');
  };

  const toggleAudioPlayback = () => {
    const audio = audioRef.current;
    if (!audio || !selectedStory?.audioState?.audioUrl) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const restartAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = 0;
    setCurrentTime(0);
    if (isPlaying) {
      audio.play();
    }
  };

  const formatDuration = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl sm:rounded-2xl w-full h-full sm:max-w-6xl sm:w-full sm:max-h-[90vh] sm:h-auto overflow-hidden shadow-2xl border border-orange-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Layout */}
        <div className="flex flex-col h-full sm:hidden">
          {/* Mobile Header */}
          <div className="flex-shrink-0 p-4 border-b border-orange-100">
            <div className="flex items-center justify-between">
              {showMobileDetails && selectedStory ? (
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-2 text-amber-600 hover:text-amber-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Zurück</span>
                </button>
              ) : (
                <h2 className="text-lg font-medium text-amber-900">Gespeicherte Geschichten</h2>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-amber-600" />
              </button>
            </div>
            {!showMobileDetails && (
              <p className="text-amber-600 text-sm mt-1">{savedStories.length} Geschichten gespeichert</p>
            )}
          </div>

          {/* Mobile Content */}
          <div className="flex-1 overflow-hidden">
            {showMobileDetails && selectedStory ? (
              <MobileStoryDetails
                story={selectedStory}
                onDelete={deleteStory}
                onDownload={downloadStory}
                onDownloadAudio={downloadAudio}
                audioRef={audioRef as any}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                audioLoading={audioLoading}
                progressPercentage={progressPercentage}
                onTogglePlayback={toggleAudioPlayback}
                onRestart={restartAudio}
                formatDuration={formatDuration}
              />
            ) : (
              <MobileStoriesList
                stories={savedStories}
                onSelectStory={handleStorySelect}
              />
            )}
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex h-full">
          {/* Stories List */}
          <div className="w-full sm:w-1/3 lg:w-2/5 xl:w-1/3 border-r border-orange-100 flex flex-col min-h-0">
            <div className="flex-shrink-0 p-4 lg:p-6 border-b border-orange-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg lg:text-xl font-medium text-amber-900">Gespeicherte Geschichten</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-amber-600" />
                </button>
              </div>
              <p className="text-amber-600 text-sm mt-1">{savedStories.length} Geschichten gespeichert</p>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent" style={{maxHeight: 'calc(100vh - 250px)'}}>
              {savedStories.length === 0 ? (
                <div className="p-4 lg:p-6 text-center">
                  <div className="text-3xl lg:text-4xl mb-4">📖</div>
                  <p className="text-amber-600">Noch keine gespeicherten Geschichten</p>
                  <p className="text-amber-500 text-sm mt-2">Schließe eine Reise ab, um deine erste Geschichte zu speichern</p>
                </div>
              ) : (
                <div className="p-3 lg:p-4 space-y-2">
                  {savedStories.map((story) => (
                    <motion.div
                      key={story.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedStory(story)}
                      className={`p-3 lg:p-4 rounded-xl cursor-pointer transition-all ${
                        selectedStory?.id === story.id
                          ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200'
                          : 'bg-orange-50 hover:bg-amber-50 border border-orange-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl lg:text-2xl flex-shrink-0">{story.resourceFigure.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-amber-900 truncate text-sm lg:text-base">{story.title}</h3>
                          <p className="text-amber-600 text-xs lg:text-sm truncate">{story.resourceFigure.name}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-amber-500">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{new Date(story.timestamp).toLocaleDateString()}</span>
                            {story.audioState?.audioUrl && (
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Volume2 className="w-3 h-3" />
                                <span>Audio</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Story Details */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedStory ? (
              <DesktopStoryDetails
                story={selectedStory}
                onDelete={deleteStory}
                onDownload={downloadStory}
                onDownloadAudio={downloadAudio}
                audioRef={audioRef as any}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                audioLoading={audioLoading}
                progressPercentage={progressPercentage}
                onTogglePlayback={toggleAudioPlayback}
                onRestart={restartAudio}
                formatDuration={formatDuration}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl lg:text-6xl mb-4">📚</div>
                  <p className="text-amber-600">Wähle eine Geschichte aus, um Details anzuzeigen</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Mobile Stories List Component
function MobileStoriesList({ stories, onSelectStory }: {
  stories: SavedStory[];
  onSelectStory: (story: SavedStory) => void;
}) {
  if (stories.length === 0) {
    return (
      <div className="p-6 text-center h-full flex flex-col items-center justify-center">
        <div className="text-4xl mb-4">📖</div>
        <p className="text-amber-600">Noch keine gespeicherten Geschichten</p>
        <p className="text-amber-500 text-sm mt-2 text-center">Schließe eine Reise ab, um deine erste Geschichte zu speichern</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent">
      <div className="p-4 space-y-3">
        {stories.map((story) => (
          <motion.div
            key={story.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectStory(story)}
            className="p-4 rounded-xl cursor-pointer bg-orange-50 hover:bg-amber-50 border border-orange-100 active:bg-amber-100 transition-all"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">{story.resourceFigure.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-amber-900 line-clamp-2">{story.title}</h3>
                <p className="text-amber-600 text-sm truncate">{story.resourceFigure.name}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-amber-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(story.timestamp).toLocaleDateString()}</span>
                  </div>
                  {story.audioState?.audioUrl && (
                    <div className="flex items-center gap-1">
                      <Volume2 className="w-3 h-3" />
                      <span>Audio</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Mobile Story Details Component
function MobileStoryDetails({ story, onDelete, onDownload, onDownloadAudio, audioRef, isPlaying, currentTime, duration, audioLoading, progressPercentage, onTogglePlayback, onRestart, formatDuration }: {
  story: SavedStory;
  onDelete: (id: string) => void;
  onDownload: (story: SavedStory) => void;
  onDownloadAudio: (story: SavedStory) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioLoading: boolean;
  progressPercentage: number;
  onTogglePlayback: () => void;
  onRestart: () => void;
  formatDuration: (seconds: number) => string;
}) {
  return (
    <div className="overflow-y-auto h-full scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent">
      <div className="p-4 space-y-6">
        {/* Story Header */}
        <div className="flex items-start gap-3">
          <span className="text-3xl flex-shrink-0">{story.resourceFigure.emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium text-amber-900 line-clamp-2">{story.title}</h3>
            <p className="text-amber-600">mit {story.resourceFigure.name}</p>
            <p className="text-amber-500 text-sm">{story.createdAt}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => onDownload(story)}
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Herunterladen</span>
          </button>
          <button
            onClick={() => onDelete(story.id)}
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-sm">Löschen</span>
          </button>
        </div>

        {/* Audio Player */}
        {story.audioState?.audioUrl && (
          <div>
            <h4 className="font-medium text-amber-900 mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Audio-Wiedergabe
            </h4>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-orange-100 rounded-full h-2 mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-amber-600">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={onRestart}
                  className="p-2 bg-orange-100 text-amber-700 rounded-full hover:bg-orange-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                
                <button
                  onClick={onTogglePlayback}
                  disabled={audioLoading}
                  className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
                >
                  {audioLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                
                {/* Download-Button entfernt - Streaming only für bessere Kundenbindung */}
              </div>

              <div className="mt-4 text-center">
                <p className="text-amber-800 font-medium text-sm">
                  Stimme: {story.audioState.voiceId}
                </p>
                <p className="text-amber-600 text-xs">
                  Dauer: {formatDuration(story.audioState.duration)}
                </p>
              </div>

              {/* Hidden Audio Element */}
              <audio 
                ref={audioRef} 
                src={story.audioState.audioUrl} 
                preload="metadata"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        )}

        {/* Story Text */}
        <div>
          <h4 className="font-medium text-amber-900 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Deine Geschichte
          </h4>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <p className="text-amber-800 leading-relaxed italic text-sm">
              "{story.generatedStory}"
            </p>
          </div>
        </div>

       
      </div>
    </div>
  );
}

// Desktop Story Details Component
function DesktopStoryDetails({ story, onDelete, onDownload, onDownloadAudio, audioRef, isPlaying, currentTime, duration, audioLoading, progressPercentage, onTogglePlayback, onRestart, formatDuration }: {
  story: SavedStory;
  onDelete: (id: string) => void;
  onDownload: (story: SavedStory) => void;
  onDownloadAudio: (story: SavedStory) => void; // Wird nicht mehr verwendet, aber für Kompatibilität behalten
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioLoading: boolean;
  progressPercentage: number;
  onTogglePlayback: () => void;
  onRestart: () => void;
  formatDuration: (seconds: number) => string;
}) {
  return (
    <>
      <div className="flex-shrink-0 p-4 lg:p-6 border-b border-orange-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl lg:text-3xl">{story.resourceFigure.emoji}</span>
            <div>
              <h3 className="text-lg lg:text-xl font-medium text-amber-900">{story.title}</h3>
              <p className="text-amber-600">mit {story.resourceFigure.name}</p>
              <p className="text-amber-500 text-sm">{story.createdAt}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onDownload(story)}
              className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
              title="Geschichte herunterladen"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(story.id)}
              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              title="Geschichte löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-200 scrollbar-track-transparent p-4 lg:p-6 space-y-6" style={{maxHeight: 'calc(100vh - 250px)'}}>
        {/* Audio Player */}
        {story.audioState?.audioUrl && (
          <div>
            <h4 className="font-medium text-amber-900 mb-3 flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Audio-Wiedergabe
            </h4>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 lg:p-6 border border-amber-200">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="w-full bg-orange-100 rounded-full h-2 mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-amber-600">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={onRestart}
                  className="p-2 bg-orange-100 text-amber-700 rounded-full hover:bg-orange-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                
                <button
                  onClick={onTogglePlayback}
                  disabled={audioLoading}
                  className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full hover:from-amber-600 hover:to-orange-600 transition-all disabled:opacity-50"
                >
                  {audioLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                
                {/* Download-Button entfernt - Streaming only für bessere Kundenbindung */}
              </div>

              <div className="mt-4 text-center">
                <p className="text-amber-800 font-medium">
                  Stimme: {story.audioState.voiceId}
                </p>
                <p className="text-amber-600 text-sm">
                  Dauer: {formatDuration(story.audioState.duration)}
                </p>
              </div>

              {/* Hidden Audio Element */}
              <audio 
                ref={audioRef} 
                src={story.audioState.audioUrl} 
                preload="metadata"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        )}

        {/* Story Text */}
        <div>
          <h4 className="font-medium text-amber-900 mb-3 flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Deine Geschichte
          </h4>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <p className="text-amber-800 leading-relaxed italic">
              "{story.generatedStory}"
            </p>
          </div>
        </div>

     
      </div>
    </>
  );
}