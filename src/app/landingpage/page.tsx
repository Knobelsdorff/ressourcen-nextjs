"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Weiterleitung zu / mit Hash-Parameter falls vorhanden
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    router.replace(`/${hash}`);
  }, [router]);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
      <div className="text-amber-600">Lade...</div>
    </div>
  );
}
