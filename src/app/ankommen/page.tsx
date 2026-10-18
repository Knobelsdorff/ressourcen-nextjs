import { redirect } from 'next/navigation';

// Die frühere Ankommen-Seite ist ersetzt: Die Kostprobe läuft im Startseiten-Hero
// und unter "Zum Ankommen" im Dashboard. Alte Links führen zur Startseite.
export default function AnkommenRedirect() {
  redirect('/');
}
