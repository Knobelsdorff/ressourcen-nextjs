"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface AppResetContextType {
  resetToStart: () => void;
  setResetFunction: (fn: () => void) => void;
}

const AppResetContext = createContext<AppResetContextType | undefined>(undefined);

export function AppResetProvider({ children }: { children: React.ReactNode }) {
  const resetFunctionRef = useRef<(() => void) | null>(null);

  const resetToStart = useCallback(() => {
    if (resetFunctionRef.current) {
      resetFunctionRef.current();
    }
  }, []);

  const setResetFunction = useCallback((fn: () => void) => {
    resetFunctionRef.current = fn;
  }, []);

  return (
    <AppResetContext.Provider value={{ resetToStart, setResetFunction }}>
      {children}
    </AppResetContext.Provider>
  );
}

export function useAppReset() {
  const context = useContext(AppResetContext);
  if (context === undefined) {
    throw new Error('useAppReset must be used within an AppResetProvider');
  }
  return context;
}
