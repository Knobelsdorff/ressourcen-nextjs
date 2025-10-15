export function isEnabled(flag: string): boolean {
  const key = `NEXT_PUBLIC_${flag}`;
  if (typeof process === 'undefined') return false;
  const val = (process.env as any)[key];
  if (val === undefined) return false;
  return String(val).trim() === '1' || String(val).toLowerCase().trim() === 'true';
}

export function getFlag<T = string>(flag: string, fallback?: T): T | string | undefined {
  const key = `NEXT_PUBLIC_${flag}`;
  const val = (process.env as any)[key];
  return (val !== undefined ? val : fallback) as T | string | undefined;
}


