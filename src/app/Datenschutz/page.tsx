import React from 'react';
import Link from 'next/link';

export default function Datenschutz() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-900 mb-4">Datenschutzerklärung</h1>
            <p className="text-amber-700 text-lg">Schutz Ihrer persönlichen Daten</p>
          </div>
          
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-orange-100">
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-semibold mb-4 text-amber-900">1. Einleitung</h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Diese Datenschutzerklärung informiert Sie über die Art, den Umfang und Zweck der Verarbeitung personenbezogener Daten auf dieser Website. Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst und behandeln diese vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-amber-900">2. Datenerfassung auf dieser Website</h2>
                
                <h3 className="text-lg font-semibold mb-3 text-amber-800">Wer ist verantwortlich für die Datenerfassung?</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Abschnitt „Hinweis zur Verantwortlichen Stelle" in dieser Datenschutzerklärung entnehmen.
                </p>

                <h3 className="text-lg font-semibold mb-3 text-amber-800">Wie erfassen wir Ihre Daten?</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich z. B. um Daten handeln, die Sie in ein Kontaktformular eingeben.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Andere Daten werden automatisch oder nach Ihrer Einwilligung beim Besuch der Website durch unsere IT-Systeme erfasst. Das sind vor allem technische Daten (z. B. Internetbrowser, Betriebssystem oder Uhrzeit des Seitenaufrufs).
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-amber-900">3. Hosting</h2>
                
                <h3 className="text-lg font-semibold mb-3 text-amber-800">Externes Hosting</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Diese Website wird bei einem externen Dienstleister gehostet (Hoster). Die personenbezogenen Daten, die auf dieser Website erfasst werden, werden auf den Servern des Hosters / der Hoster gespeichert. Hierbei kann es sich v. a. um IP-Adressen, Kontaktanfragen, Meta- und Kommunikationsdaten, Vertragsdaten, Kontaktdaten, Namen, Websitezugriffe und sonstige Daten, die über eine Website generiert werden, handeln.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-amber-900">4. Verwendung externer Dienste</h2>
                
                <h3 className="text-lg font-semibold mb-3 text-amber-800">OpenAI (ChatGPT)</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Für die Generierung von personalisierten Geschichten verwenden wir den Dienst von OpenAI. Wenn Sie eine Ressource erstellen, werden Ihre Antworten auf die Fragen an OpenAI gesendet, um eine maßgeschneiderte Geschichte zu generieren.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>Datenschutzerklärung von OpenAI:</strong> <a href="https://openai.com/de-DE/privacy" className="text-amber-600 hover:text-amber-800 underline" target="_blank" rel="noopener">https://openai.com/de-DE/privacy</a>
                </p>

                <h3 className="text-lg font-semibold mb-3 text-amber-800">ElevenLabs</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Für die Sprachsynthese und Audio-Generierung verwenden wir den Dienst von ElevenLabs. Dieser Dienst kann für die Erstellung von Audio-Inhalten verwendet werden.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>Datenschutzerklärung von ElevenLabs:</strong> <a href="https://elevenlabs.io/privacy" className="text-amber-600 hover:text-amber-800 underline" target="_blank" rel="noopener">https://elevenlabs.io/privacy</a>
                </p>

                <h3 className="text-lg font-semibold mb-3 text-amber-800">Supabase</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Für die Datenbank, Authentifizierung und Speicherung Ihrer Geschichten verwenden wir den Dienst von Supabase. Supabase ist ein Backend-as-a-Service-Anbieter, der folgende Daten verarbeitet:
                </p>
                <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4 mb-4">
                  <li><strong>Authentifizierungsdaten:</strong> E-Mail-Adresse, Passwort (verschlüsselt)</li>
                  <li><strong>Profilinformationen:</strong> Name, E-Mail-Adresse, Registrierungsdatum</li>
                  <li><strong>Geschichten:</strong> Ihre erstellten Ressourcen-Geschichten und Antworten auf Fragen</li>
                  <li><strong>Audio-Dateien:</strong> Generierte Audio-Inhalte (falls erstellt)</li>
                </ul>
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>Standort der Datenverarbeitung:</strong> Supabase verarbeitet Ihre Daten in der Europäischen Union (EU) und ist DSGVO-konform.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>Datenschutzerklärung von Supabase:</strong> <a href="https://supabase.com/privacy" className="text-amber-600 hover:text-amber-800 underline" target="_blank" rel="noopener">https://supabase.com/privacy</a>
                </p>

                <h3 className="text-lg font-semibold mb-3 text-amber-800">Weitergabe von Daten</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Beachten Sie, dass bei der Nutzung dieser externen Dienste Ihre Daten an diese Unternehmen weitergegeben werden. Diese Unternehmen haben ihre eigenen Datenschutzrichtlinien und sind für die Verarbeitung Ihrer Daten nach ihren eigenen Richtlinien verantwortlich.
                </p>

                <h3 className="text-lg font-semibold mb-3 text-amber-800">YouTube-Videos</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Auf dieser Website können YouTube-Videos eingebettet werden. YouTube ist ein Dienst von Google und kann beim Abspielen von Videos Cookies setzen und personenbezogene Daten wie Ihre IP-Adresse erfassen.
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>Datenschutzerklärung von Google/YouTube:</strong> <a href="https://policies.google.com/privacy" className="text-amber-600 hover:text-amber-800 underline" target="_blank" rel="noopener">https://policies.google.com/privacy</a>
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-amber-900">5. Allgemeine Hinweise und Pflichtinformationen</h2>
              
                <h3 className="text-lg font-semibold mb-3 text-amber-800">Datenschutz</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                </p>

                <h3 className="text-lg font-semibold mb-3 text-amber-800">Hinweis zur verantwortlichen Stelle</h3>
                <p className="text-gray-700 leading-relaxed mb-4">
                  Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  <strong>Andreas von Knobelsdorff</strong><br/>
                  Egerlandweg 38<br/>
                  70736 Fellbach<br/>
                  Deutschland
                </p>
                <p className="text-gray-700 leading-relaxed mb-4">
                  E-Mail: heilung@knobelsdorff-therapie.de<br/>
                  Website: <a href="https://www.knobelsdorff-therapie.de/" className="text-amber-600 hover:text-amber-800 underline" target="_blank" rel="noopener">www.knobelsdorff-therapie.de</a>
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-amber-900">6. Ihre Rechte</h2>
              
                <p className="text-gray-700 leading-relaxed mb-4">
                  Sie haben folgende Rechte:
                </p>
                <ul className="list-disc list-inside text-gray-700 leading-relaxed space-y-2 ml-4">
                  <li>Recht auf Auskunft über Ihre gespeicherten personenbezogenen Daten</li>
                  <li>Recht auf Berichtigung oder Löschung Ihrer personenbezogenen Daten</li>
                  <li>Recht auf Einschränkung der Verarbeitung</li>
                  <li>Recht auf Widerspruch gegen die Verarbeitung</li>
                  <li>Recht auf Datenübertragbarkeit</li>
                  <li>Recht auf Beschwerde bei einer Aufsichtsbehörde</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-amber-900">7. Speicherdauer</h2>
                
                <p className="text-gray-700 leading-relaxed mb-4">
                  Ihre personenbezogenen Daten werden nur so lange gespeichert, wie es für die genannten Zwecke erforderlich ist oder gesetzliche Aufbewahrungsfristen dies vorschreiben. Nach Ablauf der Speicherfristen werden Ihre Daten gelöscht oder anonymisiert.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-semibold mb-4 text-amber-900">8. Änderungen</h2>
              
                <p className="text-gray-700 leading-relaxed mb-4">
                  Wir behalten uns vor, diese Datenschutzerklärung anzupassen, damit sie stets den aktuellen rechtlichen Anforderungen entspricht oder um Änderungen unserer Leistungen in der Datenschutzerklärung umzusetzen, z. B. bei der Einführung neuer Services.
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