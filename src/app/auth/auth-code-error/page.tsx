"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";

export default function AuthCodeError() {
  const router = useRouter();
  const { user } = useAuth();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (user) {
            router.push('/dashboard');
          } else {
            router.push('/');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-bold text-amber-900 mb-4">
          E-Mail-Bestätigung fehlgeschlagen
        </h1>
        <p className="text-amber-700 mb-6">
          Es gab ein Problem bei der E-Mail-Bestätigung. Du wirst in {countdown} Sekunden weitergeleitet.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
          >
            Zur Startseite
          </button>
          {user && (
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Zum Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
