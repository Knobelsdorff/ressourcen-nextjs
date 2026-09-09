/**
 * Zentrale Auflösung der öffentlichen App-Basis-URL.
 *
 * Wichtig: `new URL(request.url).origin` ist auf dem Server NICHT die öffentliche
 * URL, sondern das Interface, an das der Prozess gebunden ist (z.B. http://0.0.0.0:3000).
 * Solche Origins sind in Emails gelandet und haben die Links unbrauchbar gemacht.
 * Deshalb ist APP_BASE_URL immer die Quelle der Wahrheit.
 */

const DEFAULT_APP_BASE_URL = 'https://www.power-storys.de';

/** Origins, die niemals in einer Email landen dürfen. */
function isUnroutableOrigin(origin: string): boolean {
  return /^https?:\/\/(0\.0\.0\.0|127\.0\.0\.1|\[::\]|\[::1\]|localhost)(:|$)/i.test(origin);
}

/**
 * Öffentliche Basis-URL der App, ohne abschließenden Slash.
 * Reihenfolge: APP_BASE_URL → NEXT_PUBLIC_APP_URL → Vercel-URL → Default.
 */
export function getAppBaseUrl(): string {
  const configured =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');

  const base = configured || DEFAULT_APP_BASE_URL;
  return base.replace(/\/+$/, '');
}

/**
 * Basis-URL für alles, was in einer Email verschickt wird.
 *
 * In der lokalen Entwicklung darf der Request-Origin gewinnen, damit Links auf
 * dem Dev-Server funktionieren – aber nur, wenn er tatsächlich erreichbar ist.
 * In Produktion zählt ausschließlich APP_BASE_URL.
 */
export function getEmailBaseUrl(requestOrigin?: string | null): string {
  if (
    process.env.NODE_ENV !== 'production' &&
    requestOrigin &&
    requestOrigin !== 'null' &&
    !isUnroutableOrigin(requestOrigin)
  ) {
    return requestOrigin.replace(/\/+$/, '');
  }

  return getAppBaseUrl();
}

/** Absolute URL auf Basis der öffentlichen App-URL. */
export function appUrl(path: string): string {
  return `${getAppBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Ersetzt den `redirect_to`-Parameter eines Supabase-Action-Links durch eine
 * URL auf Basis der öffentlichen App-URL.
 */
export function withRedirectTo(actionLink: string, redirectUrl: string): string {
  try {
    const linkUrl = new URL(actionLink);
    linkUrl.searchParams.set('redirect_to', redirectUrl);
    return linkUrl.toString();
  } catch {
    return actionLink;
  }
}
