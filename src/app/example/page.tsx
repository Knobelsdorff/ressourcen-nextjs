import { redirect } from 'next/navigation';

// Alter Link auf die frühere Ankommen-Seite – führt jetzt zur Startseite.
export default function ExampleRedirect() {
  redirect('/');
}
