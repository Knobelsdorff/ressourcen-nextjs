/**
 * Filter-Funktionen für Analytics-Einträge
 * Filtert bestimmte E-Mail-Adressen und Temp-Mail-Domains
 */

/**
 * Liste der zu filternden E-Mail-Adressen
 */
const FILTERED_EMAILS = [
  'andreas@knobelsdorff-therapie.de',
  'evilmuelli@gmx.de',
  'heilung@knobelsdorff-therapie',
];

/**
 * Liste der zu filternden E-Mail-Domains (Temp-Mail-Services)
 */
const FILTERED_DOMAINS = [
  '@limtu.com',
  '@temp-mail.org',
  '@tempmail.com',
  '@guerrillamail.com',
  '@mailinator.com',
  '@10minutemail.com',
  '@throwaway.email',
  '@disposable.email',
  '@fakeinbox.com',
  '@mohmal.com',
  '@yopmail.com',
  '@maildrop.cc',
  '@getnada.com',
  '@mintemail.com',
  '@sharklasers.com',
  '@spamgourmet.com',
  '@trashmail.com',
  '@tempinbox.com',
  '@mytrashmail.com',
];

/**
 * Prüft, ob eine E-Mail-Adresse gefiltert werden soll
 * @param email Die zu prüfende E-Mail-Adresse
 * @returns true, wenn die E-Mail gefiltert werden soll
 */
export function shouldFilterEmail(email: string | null | undefined): boolean {
  if (!email) {
    return false; // Keine E-Mail = nicht filtern (wird bereits durch Auth abgefangen)
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Prüfe exakte E-Mail-Adressen
  if (FILTERED_EMAILS.includes(normalizedEmail)) {
    return true;
  }

  // Prüfe Domains
  for (const domain of FILTERED_DOMAINS) {
    if (normalizedEmail.endsWith(domain)) {
      return true;
    }
  }

  return false;
}

/**
 * Gibt eine Liste aller gefilterten E-Mail-Adressen und Domains zurück (für Debugging)
 */
export function getFilteredEmailsAndDomains(): { emails: string[]; domains: string[] } {
  return {
    emails: [...FILTERED_EMAILS],
    domains: [...FILTERED_DOMAINS],
  };
}

