"use client";

import { useAuth } from "@/components/providers/auth-provider";

export default function DashboardTest() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-amber-900 mb-8">Dashboard Test</h1>
        
        {user ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-amber-900 mb-4">
              Willkommen, {user.email}!
            </h2>
            <p className="text-gray-600 mb-4">
              Du bist erfolgreich angemeldet.
            </p>
            <div className="bg-amber-50 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-2">Benutzerdaten:</h3>
              <pre className="text-sm text-amber-800 overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Nicht angemeldet
            </h2>
            <p className="text-gray-600">
              Du musst angemeldet sein, um das Dashboard zu nutzen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
