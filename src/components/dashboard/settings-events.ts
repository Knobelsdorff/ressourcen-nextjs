/**
 * Öffnet den Einstellungen-Dialog im Dashboard ohne Seitenwechsel
 * (z.B. aus dem Profil-Menü im Header). Außerhalb des Dashboards stattdessen
 * nach SETTINGS_URL navigieren.
 */
export const OPEN_SETTINGS_EVENT = 'power-storys:open-settings';
export const SETTINGS_URL = '/dashboard?settings=1';

export function openSettings(pathname: string | null, navigate: (url: string) => void): void {
  if (pathname === '/dashboard') window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
  else navigate(SETTINGS_URL);
}
