import React from 'react';
import Link from 'next/link';

export default function Impressum() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-900 mb-4">Impressum</h1>
            <p className="text-amber-700 text-lg">Angaben gemäß § 5 TMG</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
            <h2 className="text-2xl font-semibold mb-6 text-amber-900">Angaben gemäß § 5 TMG</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-amber-800">Verantwortlich für den Inhalt</h3>
                <p className="text-gray-700 leading-relaxed">
                  <strong>Andreas von Knobelsdorff</strong><br/>
                  Egerlandweg 38<br/>
                  70736 Fellbach<br/>
                  Deutschland
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-amber-800">Kontakt</h3>
                <p className="text-gray-700 leading-relaxed">
                  E-Mail: heilung@knobelsdorff-therapie.de<br/>
                  Website: <a href="https://www.knobelsdorff-therapie.de/" className="text-amber-600 hover:text-amber-800 underline" target="_blank" rel="noopener">www.knobelsdorff-therapie.de</a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-amber-800">Umsatzsteuer-ID</h3>
                <p className="text-gray-700 leading-relaxed">
                  Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br/>
                  DE281054688
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-amber-800">Redaktionell verantwortlich</h3>
                <p className="text-gray-700 leading-relaxed">
                  Andreas von Knobelsdorff<br/>
                  Egerlandweg 38<br/>
                  70736 Fellbach
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-amber-800">EU-Streitschlichtung</h3>
                <p className="text-gray-700 leading-relaxed">
                  Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: 
                  <a href="https://ec.europa.eu/consumers/odr/" className="text-amber-600 hover:text-amber-800 underline ml-1">
                    https://ec.europa.eu/consumers/odr/
                  </a>
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 text-amber-800">Verbraucherstreitbeilegung/Universalschlichtungsstelle</h3>
                <p className="text-gray-700 leading-relaxed">
                  Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer 
                  Verbraucherschlichtungsstelle teilzunehmen.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link 
              href="/" 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}