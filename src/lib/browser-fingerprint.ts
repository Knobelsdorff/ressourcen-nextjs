// Browser-Fingerprint-Generierung für Rate-Limiting
// Erstellt einen eindeutigen Fingerprint basierend auf Browser-Eigenschaften

export interface FingerprintData {
  canvas: string;
  webgl: string;
  fonts: string[];
  screen: string;
  timezone: string;
  language: string;
  platform: string;
}

/**
 * Generiert einen Browser-Fingerprint
 * Kombiniert mehrere Browser-Eigenschaften für eindeutige Identifikation
 */
export async function generateBrowserFingerprint(): Promise<string> {
  try {
    const data: Partial<FingerprintData> = {};

    // 1. Canvas Fingerprint
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px "Arial"';
        ctx.fillText('Browser fingerprint 🔒', 2, 2);
        data.canvas = canvas.toDataURL();
      }
    } catch (e) {
      data.canvas = 'canvas-not-supported';
    }

    // 2. WebGL Fingerprint
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          data.webgl = `${vendor}-${renderer}`;
        } else {
          data.webgl = 'webgl-not-supported';
        }
      } else {
        data.webgl = 'webgl-not-available';
      }
    } catch (e) {
      data.webgl = 'webgl-error';
    }

    // 3. Font Detection (vereinfacht)
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
      'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
      'Impact', 'Monaco', 'Menlo', 'Consolas', 'Courier'
    ];
    const availableFonts: string[] = [];
    
    // Font-Detection über Canvas (vereinfacht)
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const baseFont = 'monospace';
        const baseSize = '72px';
        const testString = 'mmmmmmmmmmlli';
        const baseWidth = ctx.measureText(testString).width;
        
        testFonts.forEach(font => {
          ctx.font = `${baseSize} ${font}, ${baseFont}`;
          const width = ctx.measureText(testString).width;
          if (width !== baseWidth) {
            availableFonts.push(font);
          }
        });
      }
    } catch (e) {
      // Font detection failed
    }
    data.fonts = availableFonts;

    // 4. Screen Properties
    data.screen = `${screen.width}x${screen.height}x${screen.colorDepth}`;

    // 5. Timezone
    data.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // 6. Language
    data.language = navigator.language || 'unknown';

    // 7. Platform
    data.platform = navigator.platform || 'unknown';

    // Kombiniere alle Daten zu einem Hash
    const fingerprintString = JSON.stringify(data);
    
    // Erstelle Hash (einfacher Hash-Algorithmus)
    let hash = 0;
    for (let i = 0; i < fingerprintString.length; i++) {
      const char = fingerprintString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `fp_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
  } catch (error) {
    console.error('Error generating browser fingerprint:', error);
    // Fallback: Verwende zufälligen String mit Timestamp
    return `fp_fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Speichert Browser-Fingerprint im localStorage
 */
export function saveBrowserFingerprint(fingerprint: string): void {
  try {
    localStorage.setItem('browser_fingerprint', fingerprint);
  } catch (e) {
    console.warn('Could not save fingerprint to localStorage:', e);
  }
}

/**
 * Lädt Browser-Fingerprint aus localStorage
 */
export function loadBrowserFingerprint(): string | null {
  try {
    return localStorage.getItem('browser_fingerprint');
  } catch (e) {
    return null;
  }
}

/**
 * Generiert oder lädt Browser-Fingerprint
 */
export async function getOrCreateBrowserFingerprint(): Promise<string> {
  // Versuche zuerst aus localStorage zu laden
  const saved = loadBrowserFingerprint();
  if (saved) {
    return saved;
  }
  
  // Generiere neuen Fingerprint
  const fingerprint = await generateBrowserFingerprint();
  saveBrowserFingerprint(fingerprint);
  return fingerprint;
}

