"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreVertical } from "lucide-react";

interface StoryActionsMenuProps {
  onRename: () => void;
  onDelete: () => void;
  canDelete: boolean;
}

export default function StoryActionsMenu({
  onRename,
  onDelete,
  canDelete
}: StoryActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Schließe Menü beim Klick außerhalb
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleRename = () => {
    setIsOpen(false);
    onRename();
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete();
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-amber-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
        aria-label="Story-Aktionen"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-amber-100 py-1 z-50 min-w-[180px]"
          >
            <button
              onClick={handleRename}
              className="w-full text-left px-4 py-2 text-sm text-amber-900 hover:bg-amber-50 transition-colors"
            >
              Umbenennen
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-sm text-amber-900 hover:bg-amber-50 transition-colors"
              >
                Power Story entfernen
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
