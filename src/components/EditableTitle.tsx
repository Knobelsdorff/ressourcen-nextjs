"use client";

import { useState, useRef, useEffect } from "react";

interface EditableTitleProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  autoEdit?: boolean; // Wenn true, startet automatisch im Edit-Modus
}

export default function EditableTitle({
  value,
  onSave,
  placeholder = "Neuer Name für diese Power Story",
  maxLength = 40,
  className = "",
  autoEdit = false
}: EditableTitleProps) {
  const [isEditing, setIsEditing] = useState(autoEdit);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Aktualisiere editValue wenn value sich ändert
  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // Starte Edit-Modus wenn autoEdit true wird, beende wenn false
  useEffect(() => {
    if (autoEdit && !isEditing) {
      setIsEditing(true);
    } else if (!autoEdit && isEditing) {
      setIsEditing(false);
      setEditValue(value); // Setze Wert zurück
    }
  }, [autoEdit, isEditing, value]);

  // Fokussiere Input beim Start des Editierens und setze Cursor ans Ende
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const length = inputRef.current.value.length;
      inputRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  const handleBlur = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    const trimmedValue = editValue.trim();
    
    // Wenn leer, setze auf vorherigen Wert zurück
    if (trimmedValue === "") {
      setEditValue(value);
      setIsEditing(false);
      setIsSaving(false);
      return;
    }
    
    // Wenn unverändert, einfach schließen
    if (trimmedValue === value) {
      setIsEditing(false);
      setIsSaving(false);
      return;
    }
    
    try {
      await onSave(trimmedValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving title:", error);
      // Bei Fehler: Wert zurücksetzen
      setEditValue(value);
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
      setEditValue(value);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => {
          const newValue = e.target.value;
          if (newValue.length <= maxLength) {
            setEditValue(newValue);
          }
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`bg-transparent border-b-2 border-amber-400 focus:outline-none focus:border-amber-600 text-amber-900 font-semibold text-lg ${className}`}
      />
    );
  }

  return (
    <h3 
      className={`text-lg font-semibold text-amber-900 ${className}`}
    >
      {value}
    </h3>
  );
}
