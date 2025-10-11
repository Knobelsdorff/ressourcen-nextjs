"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { realFigures, fictionalFigures } from '@/data/figures';
import { ResourceFigure } from '@/app/page';

interface ResourceFigureSelectionProps {
  selectedFigure: ResourceFigure | null;
  onFigureSelect: (figure: ResourceFigure) => void;
  onNext?: () => void;
}

// Ambivalente Figuren, die eine Pronomen-Auswahl benötigen
const ambivalentFigures = [
  'partner',
  'teacher', 
  'sibling',
  'best-friend'
];

export default function ResourceFigureSelection({
  selectedFigure,
  onFigureSelect,
  onNext
}: ResourceFigureSelectionProps) {
  const [activeSection, setActiveSection] = useState<'real' | 'fictional' | 'custom'>('real');
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
    // Prüfe, ob es eine ambivalente Figur ist
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Hero Section */}
      <div className="text-center py-16 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Main Image */}
          <div className="mb-8">
            <div className="relative max-w-2xl mx-auto">
              {/* Main Image */}
            <img 
              src="/images/innere-ressource.webp" 
              alt="Innere Ressource" 
                className="w-full max-w-md lg:max-w-2xl object-contain mx-auto" 
            />
            </div>
          </div>
          
          <h2 className="text-2xl lg:text-3xl font-light text-amber-800 mb-4">
            Erschaffe deine innere Ressource
          </h2>
          <p className="text-amber-700 text-lg lg:text-xl leading-relaxed max-w-3xl mx-auto mb-8">
            Ob schützende Figur oder sicherer Ort - finde das, was dir in deinem Inneren Geborgenheit, Kraft und Ruhe schenkt.
          </p>
        </motion.div>
      </div>

      {/* Section Tabs - Exakt wie in Figma */}
      <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
        <div className="flex justify-center pt-8 pb-0">
          <div className="w-72 h-11 relative">
            <div className="w-72 h-11 left-0 top-0 absolute bg-amber-50 rounded-[35px]" />
            <div className={`w-20 h-11 left-[6px] top-0 absolute bg-amber-500 rounded-tl-2xl rounded-tr-2xl transition-all duration-300 ${
              activeSection === 'real' ? 'opacity-100' : 'opacity-0'
            }`} style={{boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 2px -3px 6px 0px rgba(0, 0, 0, 0.25)'}} />
            <div className={`w-20 h-11 left-[95px] top-0 absolute bg-amber-500 rounded-tl-2xl rounded-tr-2xl transition-all duration-300 ${
              activeSection === 'fictional' ? 'opacity-100' : 'opacity-0'
            }`} style={{boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 2px -3px 6px 0px rgba(0, 0, 0, 0.25)'}} />
            <div className={`w-20 h-11 left-[184px] top-0 absolute bg-amber-500 rounded-tl-2xl rounded-tr-2xl transition-all duration-300 ${
              activeSection === 'custom' ? 'opacity-100' : 'opacity-0'
            }`} style={{boxShadow: 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), 2px -3px 6px 0px rgba(0, 0, 0, 0.25)'}} />
            <div className={`w-20 h-11 left-[6px] top-0 absolute rounded-tl-2xl rounded-tr-2xl transition-all duration-300 cursor-pointer ${
              activeSection === 'real' ? 'opacity-0' : 'opacity-100'
            }`} style={{backgroundColor: '#EEEEF0'}} onClick={() => handleSectionChange('real')} />
            <div className={`w-20 h-11 left-[95px] top-0 absolute rounded-tl-2xl rounded-tr-2xl transition-all duration-300 cursor-pointer ${
              activeSection === 'fictional' ? 'opacity-0' : 'opacity-100'
            }`} style={{backgroundColor: '#EEEEF0'}} onClick={() => handleSectionChange('fictional')} />
            <div className={`w-20 h-11 left-[184px] top-0 absolute rounded-tl-2xl rounded-tr-2xl transition-all duration-300 cursor-pointer ${
              activeSection === 'custom' ? 'opacity-0' : 'opacity-100'
            }`} style={{backgroundColor: '#EEEEF0'}} onClick={() => handleSectionChange('custom')} />
            <div className={`w-7 h-4 left-[33px] top-[14.62px] absolute text-center justify-start text-xs font-normal font-['Inter'] cursor-pointer transition-all duration-300 ${
              activeSection === 'real' ? 'opacity-100' : 'opacity-100'
            }`} style={{color: activeSection === 'real' ? 'white' : '#B6B5B6'}} onClick={() => handleSectionChange('real')}>Real</div>
            <div className={`w-14 h-5 left-[107px] top-[14px] absolute text-center justify-start text-xs font-normal font-['Inter'] cursor-pointer transition-all duration-300 ${
              activeSection === 'fictional' ? 'text-white opacity-100' : 'opacity-100'
            }`} style={{color: activeSection === 'fictional' ? 'white' : '#B6B5B6'}} onClick={() => handleSectionChange('fictional')}>Fiktiv</div>
            <div className={`w-14 h-5 left-[196px] top-[14px] absolute text-center justify-start text-xs font-normal font-['Inter'] cursor-pointer transition-all duration-300 ${
              activeSection === 'custom' ? 'text-white opacity-100' : 'opacity-100'
            }`} style={{color: activeSection === 'custom' ? 'white' : '#B6B5B6'}} onClick={() => handleSectionChange('custom')}>Orte</div>
          </div>
        </div>
        
        {/* Orange Linie - direkt an den Tabs ohne Lücke */}
        <div className="w-full h-0.5 bg-amber-500"></div>
      </div>

      {/* Content Area */}
      <div className="bg-white pt-8 px-6 pb-8">
        <AnimatePresence mode="wait">
          {/* Custom Form - wird angezeigt, wenn showCustomForm true ist */}
          {showCustomForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-8"
            >
              <h2 className="text-2xl font-light text-amber-900 mb-4">
                {activeSection === 'custom' ? 'Eigenen sicheren Ort erstellen' : 'Eigene Ressourcenfigur erstellen'}
              </h2>
              <p className="text-amber-700 text-lg leading-relaxed max-w-3xl mx-auto mb-8">
                {activeSection === 'custom' 
                  ? 'Erstelle deinen eigenen sicheren Ort mit Name, Beschreibung und besonderen Eigenschaften.'
                  : 'Erstelle deine eigene, personalisierte Ressource mit Name, Pronomen und Beschreibung.'
                }
              </p>
              
              <motion.form
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleCustomFigureSubmit}
                className="max-w-md mx-auto space-y-4"
              >
                <input
                  type="text"
                  placeholder={activeSection === 'custom' ? "Name des Ortes" : "Name der Ressource"}
                  value={customFigure.name}
                  onChange={(e) => setCustomFigure(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                />
                
                {activeSection !== 'custom' && (
                  <select
                    value={customFigure.pronouns}
                    onChange={(e) => setCustomFigure(prev => ({ ...prev, pronouns: e.target.value }))}
                    className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pronomen auswählen</option>
                    <option value="sie/ihr">sie/ihr (weiblich)</option>
                    <option value="er/ihm">er/ihm (männlich)</option>
                    <option value="es/sein">es/sein (neutral)</option>
                  </select>
                )}
                
                {activeSection === 'custom' && (
                  <input
                    type="text"
                    placeholder="Art des Ortes (z.B. Strand, Berg, Garten)"
                    value={customFigure.placeType || ''}
                    onChange={(e) => setCustomFigure(prev => ({ ...prev, placeType: e.target.value }))}
                    className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                )}
                
                <textarea
                  placeholder={activeSection === 'custom' ? "Beschreibung des Ortes (optional)" : "Beschreibung (optional)"}
                  value={customFigure.description}
                  onChange={(e) => setCustomFigure(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent h-24"
                />
                
                {activeSection === 'custom' && (
                  <textarea
                    placeholder="Was macht diesen Ort besonders sicher für dich? (optional)"
                    value={customFigure.safetyFeatures || ''}
                    onChange={(e) => setCustomFigure(prev => ({ ...prev, safetyFeatures: e.target.value }))}
                    className="w-full px-4 py-3 border border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent h-24"
                  />
                )}
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300"
                  >
                    Erstellen
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(false)}
                    className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all duration-300"
                  >
                    Abbrechen
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}

          {/* Tab Content - wird nur angezeigt, wenn showCustomForm false ist */}
          {!showCustomForm && (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              {activeSection === 'real' && (
                <>
                  <h2 className="text-2xl font-light text-amber-900 mb-4">
                    Echte Menschen & Haustiere
                  </h2>
                  <p className="text-amber-700 text-lg leading-relaxed max-w-3xl mx-auto mb-8">
                    Wähle eine vertraute Person oder ein geliebtes Tier, das dir einmal Sicherheit, Liebe oder Unterstützung gegeben hat.
                  </p>
                  
                  {/* Resource Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto px-4">
                    {realFigures.map((figure) => (
                      <motion.div
                        key={figure.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleFigureClick(figure)}
                        className="w-full h-56 sm:h-64 md:h-64 lg:h-64 relative cursor-pointer"
                      >
                        <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-2 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                            <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl">{figure.emoji}</span>
                          </div>
                          <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 pt-0 sm:pt-8 md:pt-9 lg:pt-10 pb-20 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-yellow-900 text-xs sm:text-base md:text-sm lg:text-base font-bold">
                            {figure.name}
                          </div>
                          <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 left-0 top-24 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-yellow-800 text-xs leading-tight">
                            {figure.description}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Custom Resource Card */}
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCustomForm(true)}
                      className="w-full h-56 sm:h-64 md:h-64 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-2 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl">➕</span>
                        </div>
                        <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 pt-0 sm:pt-8 md:pt-9 lg:pt-10 pb-20 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-blue-900 text-xs sm:text-base md:text-sm lg:text-base font-bold">
                          Custom
                        </div>
                        <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 left-0 top-24 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-blue-800 text-xs leading-tight">
                          Erstelle deine eigene, personalisierte Ressource
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}

              {activeSection === 'fictional' && (
                <>
                                     <h2 className="text-2xl font-light text-amber-900 mb-4">
                     Fiktive Figuren
                   </h2>
                  <p className="text-amber-700 text-lg leading-relaxed max-w-3xl mx-auto mb-8">
                    Entdecke imaginäre Wesen, die dir in deiner Fantasie Kraft und Schutz geben können.
                  </p>
                  
                  {/* Resource Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto px-4">
                    {fictionalFigures.map((figure) => (
                      <motion.div
                        key={figure.id}
                        whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
                        onClick={() => handleFigureClick(figure)}
                        className="w-full h-56 sm:h-64 md:h-64 lg:h-64 relative cursor-pointer"
                      >
                        <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
                          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-2 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                            <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl">{figure.emoji}</span>
                          </div>
                          <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 pt-0 sm:pt-8 md:pt-9 lg:pt-10 pb-20 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-yellow-900 text-xs sm:text-base md:text-sm lg:text-base font-bold">
                            {figure.name}
                          </div>
                          <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 left-0 top-24 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-yellow-800 text-xs leading-tight">
                            {figure.description}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Custom Resource Card */}
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCustomForm(true)}
                      className="w-full h-56 sm:h-64 md:h-64 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-2 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl">➕</span>
                        </div>
                        <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 pt-0 sm:pt-8 md:pt-9 lg:pt-10 pb-20 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-blue-900 text-xs sm:text-base md:text-sm lg:text-base font-bold">
                          Custom
                        </div>
                        <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 left-0 top-24 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-blue-800 text-xs leading-tight">
                          Erstelle deine eigene, personalisierte Ressource
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </>
              )}

              {activeSection === 'custom' && (
                <>
                  <h2 className="text-2xl font-light text-amber-900 mb-4">
                    Sichere Orte
                  </h2>
                  <p className="text-amber-700 text-lg leading-relaxed max-w-3xl mx-auto mb-8">
                    Finde deinen inneren Zufluchtsort, wo du dich geborgen und sicher fühlst.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 max-w-7xl mx-auto px-4">
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFigureClick({
                        id: 'place-safe',
                        name: 'Sicherer Ort',
                        emoji: '🏠',
                        description: 'Ein Ort voller Geborgenheit und Schutz',
                        category: 'place',
                        pronouns: 'es/sein',
                        isCustom: false
                      })}
                      className="w-full h-56 sm:h-64 md:h-64 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
                        <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-2 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl">🏠</span>
                        </div>
                        <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 pt-0 sm:pt-8 md:pt-9 lg:pt-10 pb-20 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-yellow-900 text-xs sm:text-base md:text-sm lg:text-base font-bold">
                          Sicherer Ort
                        </div>
                        <div className="w-full px-2 sm:px-4 md:px-5 lg:px-6 left-0 top-24 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-yellow-800 text-xs leading-tight">
                          Ein Ort voller Geborgenheit und Schutz
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFigureClick({
                        id: 'place-healing',
                        name: 'Heilungsraum',
                        emoji: '✨',
                        description: 'Ein Raum für Heilung und Regeneration',
                        category: 'place',
                        pronouns: 'es/sein',
                        isCustom: false
                      })}
                      className="w-full h-72 sm:h-64 md:h-64 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-3 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">✨</span>
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 pt-7 sm:pt-8 md:pt-9 lg:pt-10 pb-4 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-yellow-900 text-sm sm:text-base md:text-sm lg:text-base font-bold">
                          Heilungsraum
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 left-0 top-32 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-yellow-800 text-xs leading-tight">
                          Ein Raum für Heilung und Regeneration
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFigureClick({
                        id: 'place-garden',
                        name: 'Innerer Garten',
                        emoji: '🌱',
                        description: 'Ein Garten voller Wachstum und Leben',
                        category: 'place',
                        pronouns: 'es/sein',
                        isCustom: false
                      })}
                      className="w-full h-72 sm:h-64 md:h-64 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-3 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">🌱</span>
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 pt-7 sm:pt-8 md:pt-9 lg:pt-10 pb-4 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-yellow-900 text-sm sm:text-base md:text-sm lg:text-base font-bold">
                          Innerer Garten
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 left-0 top-32 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-yellow-800 text-xs leading-tight">
                          Ein Garten voller Wachstum und Leben
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFigureClick({
                        id: 'place-power',
                        name: 'Kraftplatz',
                        emoji: '⚡',
                        description: 'Ein Ort voller Energie und Stärke',
                        category: 'place',
                        pronouns: 'es/sein',
                        isCustom: false
                      })}
                      className="w-full h-72 sm:h-64 md:h-64 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-3 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">⚡</span>
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 pt-7 sm:pt-8 md:pt-9 lg:pt-10 pb-4 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-yellow-900 text-sm sm:text-base md:text-sm lg:text-base font-bold">
                          Kraftplatz
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 left-0 top-32 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-yellow-800 text-xs leading-tight">
                          Ein Ort voller Energie und Stärke
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFigureClick({
                        id: 'place-temple',
                        name: 'Innerer Tempel',
                        emoji: '🕍',
                        description: 'Ein heiliger Raum der Stille',
                        category: 'place',
                        pronouns: 'es/sein',
                        isCustom: false
                      })}
                      className="w-40 h-64 sm:w-44 sm:h-64 md:w-48 md:h-64 lg:w-52 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-3 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">🕍</span>
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 pt-7 sm:pt-8 md:pt-9 lg:pt-10 pb-4 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-yellow-900 text-sm sm:text-base md:text-sm lg:text-base font-bold">
                          Innerer Tempel
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 left-0 top-32 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-yellow-800 text-xs leading-tight">
                          Ein heiliger Raum der Stille
                        </div>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFigureClick({
                        id: 'place-harbor',
                        name: 'Mein sicherer Hafen',
                        emoji: '⚓',
                        description: 'Ein sicherer Ankerplatz für deine Seele',
                        category: 'place',
                        pronouns: 'es/sein',
                        isCustom: false
                      })}
                      className="w-40 h-64 sm:w-44 sm:h-64 md:w-48 md:h-64 lg:w-52 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-3 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">⚓</span>
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 pt-7 sm:pt-8 md:pt-9 lg:pt-10 pb-4 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-yellow-900 text-sm sm:text-base md:text-sm lg:text-base font-bold">
                          Mein sicherer Hafen
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 left-0 top-32 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-yellow-800 text-xs leading-tight">
                          Ein sicherer Ankerplatz für deine Seele
    </div>
  </div>
                    </motion.div>
                    
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleFigureClick({
                        id: 'place-soul',
                        name: 'Mein Seelenplatz',
                        emoji: '💫',
                        description: 'Ein Ort der tiefen Verbindung',
                        category: 'place',
                        pronouns: 'es/sein',
                        isCustom: false
                      })}
                      className="w-40 h-64 sm:w-44 sm:h-64 md:w-48 md:h-64 lg:w-52 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-3 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">💫</span>
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 pt-7 sm:pt-8 md:pt-9 lg:pt-10 pb-4 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-yellow-900 text-sm sm:text-base md:text-sm lg:text-base font-bold">
                          Mein Seelenplatz
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 left-0 top-32 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-yellow-800 text-xs leading-tight">
                          Ein Ort der tiefen Verbindung
                        </div>
</div>
        </motion.div>

                    {/* Custom Resource Card für Orte */}
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCustomForm(true)}
                      className="w-full h-72 sm:h-64 md:h-64 lg:h-64 relative cursor-pointer"
                    >
                      <div className="w-full h-full left-0 top-0 absolute rounded-2xl shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 left-1/2 top-3 sm:top-4 md:top-5 lg:top-6 transform -translate-x-1/2 absolute flex items-center justify-center">
                          <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">➕</span>
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 pt-7 sm:pt-8 md:pt-9 lg:pt-10 pb-4 sm:pb-5 md:pb-6 lg:pb-7 left-0 top-1/2 transform -translate-y-1/2 absolute text-center justify-start text-blue-900 text-sm sm:text-base md:text-sm lg:text-base font-bold">
                          Custom
                        </div>
                        <div className="w-full px-3 sm:px-4 md:px-5 lg:px-6 left-0 top-32 sm:top-36 md:top-40 lg:top-44 absolute text-center justify-start text-blue-800 text-xs leading-tight">
                          Erstelle deinen eigenen sicheren Ort
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </>
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
            className="fixed bottom-2 sm:bottom-4 left-2 right-2 sm:left-4 sm:right-4 lg:left-0 lg:right-0 lg:mx-auto z-30 w-auto max-w-2xl px-3 sm:px-6"
            >
              <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-green-200 shadow-lg rounded-2xl lg:rounded-3xl overflow-hidden">
              <CardContent className="p-6 lg:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, 5, -5, 0]
                      }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                      className="w-12 h-12 lg:w-16 lg:h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0"
                    >
                      <Check className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-green-800 font-medium block mb-2 text-sm lg:text-base"
                      >
                        ✨ Deine Ressource:
                      </motion.span>
                      <div className="flex items-center gap-3">
                        <motion.span 
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                          className="text-2xl lg:text-4xl flex-shrink-0"
                        >
                          {selectedFigure.emoji}
                        </motion.span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg lg:text-2xl font-semibold text-amber-900 leading-tight">
                            {selectedFigure.name}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Weiter Button - rechts positioniert */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onNext}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 flex-shrink-0"
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

      {/* Pronomen-Auswahl Modal für ambivalente Figuren */}
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
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">{pendingFigure.emoji}</div>
                <h3 className="text-xl font-semibold text-amber-900 mb-2">
                  {pendingFigure.name}
                </h3>
                <p className="text-amber-700">
                  Wähle die Pronomen für deine {pendingFigure.name}:
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => handlePronounSelection('sie/ihr')}
                  className="w-full p-4 border-2 border-amber-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all duration-200 text-left"
                >
                  <div className="font-semibold text-amber-900">sie/ihr (weiblich)</div>
                  <div className="text-sm text-amber-700">Für eine weibliche {pendingFigure.name}</div>
                </button>
                
                <button
                  onClick={() => handlePronounSelection('er/ihm')}
                  className="w-full p-4 border-2 border-amber-200 rounded-xl hover:border-amber-400 hover:bg-amber-50 transition-all duration-200 text-left"
                >
                  <div className="font-semibold text-amber-900">er/ihm (männlich)</div>
                  <div className="text-sm text-amber-700">Für eine männliche {pendingFigure.name}</div>
                </button>
              </div>
              
              <button
                onClick={() => setShowPronounSelection(false)}
                className="w-full mt-6 p-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-all duration-200"
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