import Link from 'next/link';

export default function DashboardTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-amber-900 mb-4">
          Dashboard Test funktioniert! 🎉
        </h1>
        <p className="text-xl text-amber-700 mb-6">
          Das Routing-Problem wird untersucht!
        </p>
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-amber-900 mb-4">
            Was passiert:
          </h2>
          <ul className="text-left text-gray-700 space-y-2">
            <li>✅ Diese Seite lädt</li>
            <li>🔍 /dashboard leitet auf /auth/login um</li>
            <li>🔄 Problem liegt in der Authentifizierung</li>
            <li>💡 Lösung: Auth-Provider überprüfen</li>
          </ul>
        </div>
        <div className="mt-6 space-y-3">
          <Link
            href="/"
            className="inline-block bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300"
          >
            Zurück zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}
