"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface BLSContextType {
  openBLSId: string | null;
  openBLS: (id: string) => void;
  closeBLS: () => void;
  isBLSOpen: (id: string) => boolean;
}

const BLSContext = createContext<BLSContextType | undefined>(undefined);

export function BLSProvider({ children }: { children: ReactNode }) {
  const [openBLSId, setOpenBLSId] = useState<string | null>(null);

  const openBLS = (id: string) => {
    setOpenBLSId(id);
  };

  const closeBLS = () => {
    setOpenBLSId(null);
  };

  const isBLSOpen = (id: string) => {
    return openBLSId === id;
  };

  return (
    <BLSContext.Provider value={{ openBLSId, openBLS, closeBLS, isBLSOpen }}>
      {children}
    </BLSContext.Provider>
  );
}

export function useBLS() {
  const context = useContext(BLSContext);
  if (context === undefined) {
    throw new Error("useBLS must be used within a BLSProvider");
  }
  return context;
}
