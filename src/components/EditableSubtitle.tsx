"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface EditableSubtitleProps {
  value: string | null | undefined;
  autoSubtitle: string | null | undefined;
  customSubtitle: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  className?: string;
}

export default function EditableSubtitle({
  value,
  autoSubtitle,
  customSubtitle,
  onSave,
  placeholder = "Wofür ist diese Geschichte für dich?",
  className = ""
}: EditableSubtitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Aktualisiere editValue wenn value sich ändert
  useEffect(() => {
    setEditValue(value || "");
  }, [value]);

  // Fokussiere Input beim Start des Editierens
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = () => {
    setIsEditing(true);
    setEditValue(value || "");
  };

  const handleBlur = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    const trimmedValue = editValue.trim();
    
    // Wenn leer, setze auf null (löscht customSubtitle)
    const valueToSave = trimmedValue === "" ? null : trimmedValue;
    
    try {
      await onSave(valueToSave || "");
      setIsEditing(false);
    } catch (error: any) {
      console.error("[EditableSubtitle] Error saving subtitle:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        fullError: error
      });
      // Bei Fehler: Wert zurücksetzen
      setEditValue(value || "");
      // Zeige dem User eine sanfte Fehlermeldung (optional)
      // Für jetzt nur Console-Log, da es ein Fallback gibt
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await handleBlur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(value || "");
    }
  };

  const displayValue = value || placeholder;
  const isPlaceholder = !value;

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className={`w-full bg-transparent border-b-2 border-amber-400 focus:outline-none focus:border-amber-600 text-amber-700 text-sm ${className}`}
        placeholder={placeholder}
      />
    );
  }

  return (
    <motion.div
      onClick={handleClick}
      className={`cursor-text ${isPlaceholder ? "text-amber-500/70" : "text-amber-700"} text-sm hover:text-amber-900 transition-colors ${className}`}
      whileHover={{ opacity: 0.8 }}
    >
      {displayValue}
    </motion.div>
  );
}
