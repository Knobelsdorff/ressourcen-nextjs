/**
 * Datumsanzeige für Klient:innen.
 *
 * Bewusst warm und alltagsnah statt technisch: „Heute", „Gestern",
 * „vor 3 Tagen" – erst danach das konkrete Datum. Für Menschen, die ihre
 * Power Story zwischen zwei Sitzungen wiederfinden wollen, ist das die
 * hilfreichere Information.
 */

const MS_PER_DAY = 86_400_000;

/** Kalendertage zwischen zwei Zeitpunkten (Uhrzeit ignoriert). */
function daysBetween(a: Date, b: Date): number {
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((startB - startA) / MS_PER_DAY);
}

/** "4. September 2026" */
export function formatDateLong(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** "4. Sept. 2026" – für enge Stellen. */
export function formatDateShort(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * "Heute" · "Gestern" · "vor 3 Tagen" · "vor 2 Wochen" · sonst das Datum.
 * Für Zeitpunkte in der Zukunft wird auf das Datum zurückgefallen.
 */
export function formatDateRelative(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date.getTime())) return "";

  const days = daysBetween(date, new Date());

  if (days < 0) return formatDateLong(date);
  if (days === 0) return "Heute";
  if (days === 1) return "Gestern";
  if (days < 7) return `vor ${days} Tagen`;
  if (days < 14) return "vor einer Woche";
  if (days < 31) return `vor ${Math.floor(days / 7)} Wochen`;
  return formatDateLong(date);
}

/**
 * Kombiniert beides: relativ als Anzeige, absolut als Tooltip/Vorlesetext –
 * so bleibt „vor 3 Tagen" lesbar, ohne die genaue Angabe zu verlieren.
 */
export function formatDateWithTitle(input: string | Date): {
  label: string;
  title: string;
  dateTime: string;
} {
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date.getTime())) return { label: "", title: "", dateTime: "" };

  return {
    label: formatDateRelative(date),
    title: `Erstellt am ${formatDateLong(date)}`,
    dateTime: date.toISOString(),
  };
}
