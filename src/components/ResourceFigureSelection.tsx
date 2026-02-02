"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { realFigures, fictionalFigures } from '@/data/figures';
import { ResourceFigure } from '@/lib/types/story';
import IdealFamilyIconFinal from './IdealFamilyIconFinal';
import JesusIconFinal from './JesusIconFinal';
import ArchangelMichaelIconFinal from './ArchangelMichaelIconFinal';
import AngelIconFinal from './AngelIconFinal';
import SuperheroIconFinal from './SuperheroIconFinal';

interface ResourceFigureSelectionProps {
  selectedFigure: ResourceFigure | null;
  onFigureSelect: (figure: ResourceFigure) => void;
  onNext?: () => void;
}

// Die 5 initialen fiktiven Figuren für den Fiktiv-Tab
const INITIAL_FICTIONAL_FIGURES = [
  'angel',
  'archangel-michael',
  'godmother',
  'animal-spirit',
  'wise-wizard'
];

// Spezifische Texte für die ersten drei Figuren
const FICTIONAL_FIGURE_TEXTS: Record<string, string> = {
  'angel': 'Sanft, mitfühlend und ruhig an deiner Seite',
  'archangel-michael': 'Starker Beschützer – gibt dir Halt und klare Ausrichtung',
  'godmother': 'Nährend, haltend und tief verbunden mit allem Leben'
};

// Ambivalente Figuren, die eine Pronomen-Auswahl benötigen
const ambivalentFigures = [
  'partner',
  'teacher', 
  'sibling',
  'best-friend',
  'pet-dog',
  'pet-cat'
];

export default function ResourceFigureSelection({
  selectedFigure,
  onFigureSelect,
  onNext
}: ResourceFigureSelectionProps) {
  const [activeSection, setActiveSection] = useState<'fictional' | 'real' | 'custom'>('fictional');
  const [showMoreFictional, setShowMoreFictional] = useState(false);
  const [showMoreReal, setShowMoreReal] = useState(false);
  const [showMorePlaces, setShowMorePlaces] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showPronounSelection, setShowPronounSelection] = useState(false);
  const [pendingFigure, setPendingFigure] = useState<ResourceFigure | null>(null);
  const [customFigure, setCustomFigure] = useState({ 
    name: '', 
    pronouns: 'sie/ihr', 
    description: '', 
    placeType: '', 
    safetyFeatures: '' 
  });

  const handleSectionChange = (section: 'real' | 'fictional' | 'custom') => {
    setActiveSection(section);
    setShowCustomForm(false);
    setCustomFigure({ name: '', pronouns: 'sie/ihr', description: '', placeType: '', safetyFeatures: '' });
  };

  const handleFigureClick = (figure: ResourceFigure) => {
    if (ambivalentFigures.includes(figure.id)) {
      setPendingFigure(figure);
      setShowPronounSelection(true);
    } else {
      onFigureSelect(figure);
    }
  };

  const handlePronounSelection = (pronouns: string) => {
    if (pendingFigure) {
      const figureWithPronouns = {
        ...pendingFigure,
        pronouns: pronouns
      };
      onFigureSelect(figureWithPronouns);
      setShowPronounSelection(false);
      setPendingFigure(null);
    }
  };

  const handleCustomFigureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customFigure.name.trim() && customFigure.pronouns.trim()) {
      const newFigure: ResourceFigure = {
        id: `custom-${Date.now()}`,
        name: customFigure.name,
        emoji: '✨',
        description: customFigure.description,
        category: 'custom',
        pronouns: customFigure.pronouns,
        isCustom: true
      };
      onFigureSelect(newFigure);
      setCustomFigure({ name: '', pronouns: 'sie/ihr', description: '', placeType: '', safetyFeatures: '' });
      setShowCustomForm(false);
    }
  };

  // Hole die initialen 5 fiktiven Figuren
  const getInitialFictionalFigures = (): ResourceFigure[] => {
    const figures: ResourceFigure[] = [];
    for (const id of INITIAL_FICTIONAL_FIGURES) {
      const figure = fictionalFigures.find(f => f.id === id);
      if (figure) {
        // Überschreibe den Text für die ersten drei Figuren
        const customText = FICTIONAL_FIGURE_TEXTS[id];
        figures.push({
          ...figure,
          description: customText || figure.description
        });
      }
    }
    return figures;
  };

  // Hole zusätzliche fiktive Figuren
  const getAdditionalFictionalFigures = (): ResourceFigure[] => {
    return fictionalFigures.filter(f => !INITIAL_FICTIONAL_FIGURES.includes(f.id));
  };

  // Hole initiale reale Personen (max 5)
  const getInitialRealFigures = (): ResourceFigure[] => {
    return realFigures.slice(0, 5);
  };

  // Hole zusätzliche reale Personen
  const getAdditionalRealFigures = (): ResourceFigure[] => {
    return realFigures.slice(5);
  };

  // Place figures
  const placeFigures: ResourceFigure[] = [
    {
      id: 'place-safe',
      name: 'Sicherer Ort',
      emoji: '🏠',
      description: 'Ein Ort voller Geborgenheit und Schutz',
      category: 'place',
      pronouns: 'es/sein',
      isCustom: false
    },
    {
      id: 'place-healing',
      name: 'Heilungsraum',
      emoji: '✨',
      description: 'Ein Raum für Heilung und Regeneration',
      category: 'place',
      pronouns: 'es/sein',
      isCustom: false
    },
    {
      id: 'place-garden',
      name: 'Innerer Garten',
      emoji: '🌱',
      description: 'Ein Garten voller Wachstum und Leben',
      category: 'place',
      pronouns: 'es/sein',
      isCustom: false
    },
    {
      id: 'place-power',
      name: 'Kraftplatz',
      emoji: '⚡',
      description: 'Ein Ort voller Energie und Stärke',
      category: 'place',
      pronouns: 'es/sein',
      isCustom: false
    },
    {
      id: 'place-temple',
      name: 'Innerer Tempel',
      emoji: '🕍',
      description: 'Ein heiliger Raum der Stille',
      category: 'place',
      pronouns: 'es/sein',
      isCustom: false
    },
    {
      id: 'place-harbor',
      name: 'Mein sicherer Hafen',
      emoji: '⚓',
      description: 'Ein sicherer Ankerplatz für deine Seele',
      category: 'place',
      pronouns: 'es/sein',
      isCustom: false
    },
    {
      id: 'place-soul',
      name: 'Mein Seelenplatz',
      emoji: '💫',
      description: 'Ein Ort der tiefen Verbindung',
      category: 'place',
      pronouns: 'es/sein',
      isCustom: false
    }
  ];

  const getInitialPlaceFigures = (): ResourceFigure[] => {
    return placeFigures.slice(0, 5);
  };

  const getAdditionalPlaceFigures = (): ResourceFigure[] => {
    return placeFigures.slice(5);
  };

  const renderFigureCard = (figure: ResourceFigure) => {
    const isSelected = selectedFigure?.id === figure.id;
    
    return (
      <motion.div
        key={figure.id}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleFigureClick(figure)}
        className={`w-full h-52 sm:h-[17rem] relative cursor-pointer transition-all ${
          isSelected ? 'ring-4 ring-amber-500 ring-offset-2' : ''
        }`}
      >
        <div className={`w-full h-full rounded-2xl shadow-lg border-2 ${
          isSelected 
            ? 'border-amber-500 bg-gradient-to-br from-amber-100 to-orange-100' 
            : 'border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 hover:border-amber-400'
        }`}>
          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
            {/* Fixed-size icon container for visual normalization */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-3 flex-shrink-0">
              {figure.id === 'ideal-family' ? (
                <IdealFamilyIconFinal size={60} className="w-full h-full object-contain" />
              ) : figure.id === 'jesus' ? (
                <JesusIconFinal size={60} className="w-full h-full object-contain" />
              ) : figure.id === 'archangel-michael' ? (
                <ArchangelMichaelIconFinal size={60} className="w-full h-full object-contain" />
              ) : figure.id === 'angel' ? (
                <AngelIconFinal size={60} className="w-full h-full object-contain" />
              ) : figure.id === 'superhero' ? (
                <SuperheroIconFinal size={60} className="w-full h-full object-contain" />
              ) : (
                <span className="text-4xl sm:text-5xl">{figure.emoji}</span>
              )}
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-amber-900 mb-2 flex-shrink-0">
              {figure.name}
            </h3>
            <p className="text-xs sm:text-sm text-amber-700 leading-snug h-10 sm:h-12 overflow-hidden flex-shrink-0" style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {figure.description}
            </p>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="text-center py-0 lg:py-16 px-0 lg:px-4 bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="sm:text-2xl text-xl lg:text-3xl font-light text-amber-800 sm:mb-4 mb-2 px-3">
            Welche Figur möchtest du für deine Power Story wählen?
          </h2>
        </motion.div>
      </div>

      {/* Section Tabs */}
      <div className="bg-white">
        <div className="flex justify-center sm:pt-8 pb-0">
          <div className="sm:w-96 w-80 sm:h-16 h-12 relative">
            <div className="sm:w-96 w-80 sm:h-16 h-12 left-0 top-0 absolute bg-gray-100 rounded-[45px]" />
            <div className={`sm:w-28 w-[86px] sm:h-16 h-12 sm:left-[128px] left-[116px] top-0 absolute bg-amber-500 rounded-tl-2xl rounded-tr-2xl transition-all duration-300 ${
              activeSection === 'real' ? 'opacity-100' : 'opacity-0'
            }`} style={{boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 2px -3px 6px 0px rgba(0, 0, 0, 0.25)'}} />
            <div className={`sm:w-28 w-[86px] sm:h-16 h-12 sm:left-[8px] left-[20px] top-0 absolute bg-amber-500 rounded-tl-2xl rounded-tr-2xl transition-all duration-300 ${
              activeSection === 'fictional' ? 'opacity-100' : 'opacity-0'
            }`} style={{boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 2px -3px 6px 0px rgba(0, 0, 0, 0.25)'}} />
            <div className={`sm:w-28 w-[86px] sm:h-16 h-12 sm:left-[248px] left-[212px] top-0 absolute bg-amber-500 rounded-tl-2xl rounded-tr-2xl transition-all duration-300 ${
              activeSection === 'custom' ? 'opacity-100' : 'opacity-0'
            }`} style={{boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 2px -3px 6px 0px rgba(0, 0, 0, 0.25)'}} />
            {/* REVERSIBLE: Subtle hover feedback for inactive tabs */}
            <div className={`sm:w-28 w-[86px] sm:h-16 h-12  sm:left-[128px] left-[116px] top-0 absolute rounded-tl-2xl rounded-tr-2xl transition-all duration-300 cursor-pointer ${
              activeSection === 'real' ? 'opacity-0' : 'opacity-100'
            } hover:bg-gray-100`} style={{backgroundColor: '#EEEEF0'}} onClick={() => handleSectionChange('real')} />
            <div className={`sm:w-28 w-[86px] sm:h-16 h-12 sm:left-[8px] left-[20px] top-0 absolute rounded-tl-2xl rounded-tr-2xl transition-all duration-300 cursor-pointer ${
              activeSection === 'fictional' ? 'opacity-0' : 'opacity-100'
            } hover:bg-gray-100`} style={{backgroundColor: '#EEEEF0'}} onClick={() => handleSectionChange('fictional')} />
            <div className={`sm:w-28 w-[86px] sm:h-16 h-12 sm:left-[248px] left-[212px] top-0 absolute rounded-tl-2xl rounded-tr-2xl transition-all duration-300 cursor-pointer ${
              activeSection === 'custom' ? 'opacity-0' : 'opacity-100'
            } hover:bg-gray-100`} style={{backgroundColor: '#EEEEF0'}} onClick={() => handleSectionChange('custom')} />
            <div className={`sm:w-28 w-[86px] sm:h-16 h-12 sm:left-[128px] left-[116px] top-0 absolute flex items-center justify-center sm:text-lg text-sm font-bold cursor-pointer transition-all duration-300 ${
              activeSection === 'real' ? 'opacity-100' : 'opacity-100'
            }`} style={{color: activeSection === 'real' ? 'white' : '#B6B5B6'}} onClick={() => handleSectionChange('real')}>Real</div>
            <div className={`sm:w-28 w-[86px] sm:h-16 h-12 sm:left-[8px] left-[20px] top-0 absolute flex items-center justify-center sm:text-lg text-sm font-bold cursor-pointer transition-all duration-300 ${
              activeSection === 'fictional' ? 'text-white opacity-100' : 'opacity-100'
            }`} style={{color: activeSection === 'fictional' ? 'white' : '#B6B5B6'}} onClick={() => handleSectionChange('fictional')}>Fiktiv</div>
            <div className={`sm:w-28 w-24 sm:h-16 h-12 sm:left-[248px] left-[204px] top-0 absolute flex items-center justify-center sm:text-lg text-sm font-bold cursor-pointer transition-all duration-300 ${
              activeSection === 'custom' ? 'text-white opacity-100' : 'opacity-100'
            }`} style={{color: activeSection === 'custom' ? 'white' : '#B6B5B6'}} onClick={() => handleSectionChange('custom')}>Orte</div>
          </div>
        </div>
        
        {/* Orange Linie */}
        <div className="w-full h-0.5 bg-amber-500"></div>
      </div>

      {/* Content Area */}
      <div className="bg-white pt-10 sm:pt-12 sm:px-6 px-4 pb-6">
        <AnimatePresence mode="wait">
          {/* Fiktiv Tab */}
          {activeSection === 'fictional' && (
            <motion.div
              key="fictional"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Initial 5 Fictional Figures */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto sm:px-4 mb-2 mt-2">
                {getInitialFictionalFigures().map(figure => renderFigureCard(figure))}
              </div>

              {/* Weitere fiktive Figuren anzeigen */}
              {!showMoreFictional && getAdditionalFictionalFigures().length > 0 && (
                <div className="text-center mb-6">
                  <button
                    onClick={() => setShowMoreFictional(true)}
                    className="text-amber-700 hover:text-amber-800 text-sm sm:text-base underline decoration-amber-400 hover:decoration-amber-500 transition-colors"
                  >
                    Weitere fiktive Figuren anzeigen
                  </button>
                </div>
              )}

              {/* Additional Fictional Figures */}
              <AnimatePresence>
                {showMoreFictional && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto sm:px-4">
                      {getAdditionalFictionalFigures().map(figure => renderFigureCard(figure))}
                      {/* Custom Figure Card */}
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCustomForm(true)}
                        className="w-full h-52 sm:h-[17rem] relative cursor-pointer transition-all"
                      >
                        <div className="w-full h-full rounded-2xl shadow-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400">
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-3 flex-shrink-0">
                              <span className="text-4xl sm:text-5xl">➕</span>
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2 flex-shrink-0">
                              Eigene Figur
                            </h3>
                            <p className="text-xs sm:text-sm text-blue-700 leading-snug h-10 sm:h-12 overflow-hidden flex-shrink-0" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              Erstelle deine eigene, personalisierte Figur
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Figure Form for Fictional Tab */}
              {showCustomForm && activeSection === 'fictional' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-md mx-auto mt-8"
                >
                  <form onSubmit={handleCustomFigureSubmit} className="bg-white rounded-2xl p-6 shadow-lg border border-amber-200">
                    <h3 className="text-lg font-semibold text-amber-900 mb-4 text-center">
                      Eigene Figur erstellen
                    </h3>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Name der Figur"
                        value={customFigure.name}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                      <select
                        value={customFigure.pronouns}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, pronouns: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      >
                        <option value="sie/ihr">sie/ihr</option>
                        <option value="er/ihm">er/ihm</option>
                        <option value="es/sein">es/sein</option>
                      </select>
                      <textarea
                        placeholder="Beschreibung (optional)"
                        value={customFigure.description}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent h-24"
                      />
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="flex-1 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
                        >
                          Erstellen
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCustomForm(false)}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Real Tab */}
          {activeSection === 'real' && (
            <motion.div
              key="real"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Initial Real Figures */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto sm:px-4 mb-4 mt-2">
                {getInitialRealFigures().map(figure => renderFigureCard(figure))}
              </div>

              {/* Weitere reale Personen anzeigen */}
              {!showMoreReal && getAdditionalRealFigures().length > 0 && (
                <div className="text-center mb-6">
                  <button
                    onClick={() => setShowMoreReal(true)}
                    className="text-amber-700 hover:text-amber-800 text-sm sm:text-base underline decoration-amber-400 hover:decoration-amber-500 transition-colors"
                  >
                    Weitere reale Personen anzeigen
                  </button>
                </div>
              )}

              {/* Additional Real Figures */}
              <AnimatePresence>
                {showMoreReal && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto sm:px-4">
                      {getAdditionalRealFigures().map(figure => renderFigureCard(figure))}
                      {/* Custom Figure Card */}
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCustomForm(true)}
                        className="w-full h-52 sm:h-[17rem] relative cursor-pointer transition-all"
                      >
                        <div className="w-full h-full rounded-2xl shadow-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400">
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-3 flex-shrink-0">
                              <span className="text-4xl sm:text-5xl">➕</span>
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2 flex-shrink-0">
                              Eigene Figur
                            </h3>
                            <p className="text-xs sm:text-sm text-blue-700 leading-snug h-10 sm:h-12 overflow-hidden flex-shrink-0" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              Erstelle deine eigene, personalisierte Figur
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Figure Form for Real Tab */}
              {showCustomForm && activeSection === 'real' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-md mx-auto mt-8"
                >
                  <form onSubmit={handleCustomFigureSubmit} className="bg-white rounded-2xl p-6 shadow-lg border border-amber-200">
                    <h3 className="text-lg font-semibold text-amber-900 mb-4 text-center">
                      Eigene Figur erstellen
                    </h3>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Name der Figur"
                        value={customFigure.name}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                      <select
                        value={customFigure.pronouns}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, pronouns: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      >
                        <option value="sie/ihr">sie/ihr</option>
                        <option value="er/ihm">er/ihm</option>
                        <option value="es/sein">es/sein</option>
                      </select>
                      <textarea
                        placeholder="Beschreibung (optional)"
                        value={customFigure.description}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent h-24"
                      />
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="flex-1 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
                        >
                          Erstellen
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCustomForm(false)}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Orte Tab */}
          {activeSection === 'custom' && (
            <motion.div
              key="custom"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {/* Initial Place Figures */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto sm:px-4 mb-4 mt-2">
                {getInitialPlaceFigures().map(figure => renderFigureCard(figure))}
              </div>

              {/* Weitere Orte anzeigen */}
              {!showMorePlaces && getAdditionalPlaceFigures().length > 0 && (
                <div className="text-center mb-6">
                  <button
                    onClick={() => setShowMorePlaces(true)}
                    className="text-amber-700 hover:text-amber-800 text-sm sm:text-base underline decoration-amber-400 hover:decoration-amber-500 transition-colors"
                  >
                    Weitere Orte anzeigen
                  </button>
                </div>
              )}

              {/* Additional Place Figures */}
              <AnimatePresence>
                {showMorePlaces && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto sm:px-4">
                      {getAdditionalPlaceFigures().map(figure => renderFigureCard(figure))}
                      {/* Custom Place Card */}
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowCustomForm(true)}
                        className="w-full h-52 sm:h-[17rem] relative cursor-pointer transition-all"
                      >
                        <div className="w-full h-full rounded-2xl shadow-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-blue-400">
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mb-3 flex-shrink-0">
                              <span className="text-4xl sm:text-5xl">➕</span>
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-blue-900 mb-2 flex-shrink-0">
                              Eigenen Ort
                            </h3>
                            <p className="text-xs sm:text-sm text-blue-700 leading-snug h-10 sm:h-12 overflow-hidden flex-shrink-0" style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}>
                              Erstelle deinen eigenen sicheren Ort
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Place Form */}
              {showCustomForm && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="max-w-md mx-auto mt-8"
                >
                  <form onSubmit={handleCustomFigureSubmit} className="bg-white rounded-2xl p-6 shadow-lg border border-amber-200">
                    <h3 className="text-lg font-semibold text-amber-900 mb-4 text-center">
                      Eigenen sicheren Ort erstellen
                    </h3>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Name des Ortes"
                        value={customFigure.name}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                      <input
                        type="text"
                        placeholder="Art des Ortes (z.B. Strand, Berg, Garten)"
                        value={customFigure.placeType || ''}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, placeType: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                      />
                      <textarea
                        placeholder="Beschreibung des Ortes (optional)"
                        value={customFigure.description}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent h-24"
                      />
                      <textarea
                        placeholder="Was macht diesen Ort besonders sicher für dich? (optional)"
                        value={customFigure.safetyFeatures || ''}
                        onChange={(e) => setCustomFigure(prev => ({ ...prev, safetyFeatures: e.target.value }))}
                        className="w-full px-4 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent h-24"
                      />
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          className="flex-1 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all"
                        >
                          Erstellen
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCustomForm(false)}
                          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
                        >
                          Abbrechen
                        </button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Figure Display - Fixed Position */}
      <AnimatePresence>
        {selectedFigure && (
          <motion.div
            initial={{ y: 30, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -30, opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-0 max-w-2xl left-0 right-0 z-30 w-full m-auto pb-2 sm:px-6 px-2"
          >
            <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-200 shadow-lg rounded-2xl lg:rounded-3xl overflow-hidden">
              <CardContent className="p-2 lg:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
                    >
                      <Check className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-green-800 font-medium block sm:mb-2 sm:text-sm text-xs lg:text-base"
                      >
                        ✨ Deine Figur:
                      </motion.span>
                      <div className="flex items-center sm:gap-3 gap-1">
                        <motion.span 
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                          className="text-2xl lg:text-4xl flex-shrink-0"
                        >
                          {selectedFigure.id === 'ideal-family' ? (
                            <IdealFamilyIconFinal size={48} className="w-8 h-8 lg:w-12 lg:h-12" />
                          ) : selectedFigure.id === 'jesus' ? (
                            <JesusIconFinal size={48} className="w-8 h-8 lg:w-12 lg:h-12" />
                          ) : selectedFigure.id === 'archangel-michael' ? (
                            <ArchangelMichaelIconFinal size={48} className="w-8 h-8 lg:w-12 lg:h-12" />
                          ) : selectedFigure.id === 'angel' ? (
                            <AngelIconFinal size={48} className="w-8 h-8 lg:w-12 lg:h-12" />
                          ) : selectedFigure.id === 'superhero' ? (
                            <SuperheroIconFinal size={48} className="w-8 h-8 lg:w-12 lg:h-12" />
                          ) : (
                            selectedFigure.emoji
                          )}
                        </motion.span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg lg:text-2xl font-semibold text-amber-900 leading-tight">
                            {selectedFigure.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Weiter Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onNext}
                    className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 max-sm:text-sm"
                  >
                    Weiter
                    <span className="text-white">→</span>
                  </motion.button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pronomen-Auswahl Modal */}
      <AnimatePresence>
        {showPronounSelection && pendingFigure && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPronounSelection(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center sm:mb-6 mb-4">
                <div className="text-4xl mb-3">{pendingFigure.emoji}</div>
                <h3 className="text-xl font-semibold text-amber-900 mb-2">
                  {pendingFigure.name}
                </h3>
                <p className="text-amber-700 max-sm:text-sm">
                  Wähle die Pronomen für {pendingFigure.id === 'pet-dog' ? 'deinen' : pendingFigure.id === 'pet-cat' ? 'deine' : 'deine'} {pendingFigure.name}:
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handlePronounSelection('sie/ihr')}
                  className="w-full sm:p-4 max-sm:py-2 max-sm:px-4 border-2 border-amber-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all duration-200 text-left"
                >
                  <div className="font-semibold text-amber-900">sie/ihr ({pendingFigure.id === 'sibling' ? 'schwester' : 'weiblich'})</div>
                  <div className="text-sm text-amber-700">Für {pendingFigure.id === 'pet-dog' ? 'einen weiblichen' : pendingFigure.id === 'pet-cat' ? 'eine weibliche' : 'eine weibliche'} {pendingFigure.name}</div>
                </button>
                
                <button
                  onClick={() => handlePronounSelection('er/ihm')}
                  className="w-full sm:p-4 max-sm:py-2 max-sm:px-4 border-2 border-amber-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all duration-200 text-left"
                >
                  <div className="font-semibold text-amber-900">er/ihm ({pendingFigure.id === 'sibling' ? 'bruder' : 'männlich'})</div>
                  <div className="text-sm text-amber-700">Für {pendingFigure.id === 'pet-dog' ? 'einen männlichen' : pendingFigure.id === 'pet-cat' ? 'einen männlichen' : 'einen männlichen'} {pendingFigure.name}</div>
                </button>
              </div>
              
              <button
                onClick={() => setShowPronounSelection(false)}
                className="w-full max-sm:text-sm sm:mt-6 mt-4 p-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all duration-200"
              >
                Abbrechen
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
