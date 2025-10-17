export function isEnabled(flag: string): boolean {
  const key = `NEXT_PUBLIC_${flag}`;
  
  // Try multiple ways to get the environment variable
  let val: string | undefined;
  
  // Method 1: process.env (works in both client and server)
  if (typeof process !== 'undefined' && process.env) {
    val = process.env[key];
  }
  
  // Method 2: window.__NEXT_DATA__ (client-side fallback)
  if (typeof window !== 'undefined' && window.__NEXT_DATA__) {
    const nextData = window.__NEXT_DATA__ as any;
    const env = nextData.env || nextData.runtimeConfig;
    if (env && env[key] !== undefined) {
      val = env[key];
    }
  }
  
  // Method 3: Direct access to window object (client-side)
  if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
    const nextData = (window as any).__NEXT_DATA__;
    if (nextData && nextData.env && nextData.env[key] !== undefined) {
      val = nextData.env[key];
    }
  }
  
  // Method 4: Hardcoded fallback for development
  if (val === undefined && key === 'NEXT_PUBLIC_FEATURE_USER_NAME') {
    console.log(`Using hardcoded fallback for ${key}`);
    val = '1';
  }
  
  console.log(`Feature flag check: ${key} = ${val} (type: ${typeof val})`);
  
  if (val === undefined) {
    console.log(`Feature flag ${key} not found, returning false`);
    return false;
  }
  
  const result = String(val).trim() === '1' || String(val).toLowerCase().trim() === 'true';
  console.log(`Feature flag result: ${key} = ${result}`);
  return result;
}

export function getFlag<T = string>(flag: string, fallback?: T): T | string | undefined {
  const key = `NEXT_PUBLIC_${flag}`;
  const val = process.env[key];
  return (val !== undefined ? val : fallback) as T | string | undefined;
}


