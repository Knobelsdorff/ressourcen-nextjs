// Token-System für temporäre Audio-URLs
import crypto from 'crypto';

const TOKEN_SECRET = process.env.AUDIO_TOKEN_SECRET || 'default-secret-change-in-production';
const TOKEN_EXPIRY_HOURS = 1; // Token ist 1 Stunde gültig

export interface AudioTokenPayload {
  filename: string;
  resourceId?: string;
  userId?: string;
  expiresAt: number;
}

/**
 * Generiert einen signierten Token für Audio-Zugriff
 */
export function generateAudioToken(
  filename: string,
  resourceId?: string,
  userId?: string
): string {
  const expiresAt = Date.now() + (TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  
  const payload: AudioTokenPayload = {
    filename,
    resourceId,
    userId,
    expiresAt,
  };

  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', TOKEN_SECRET)
    .update(payloadString)
    .digest('hex');

  const token = Buffer.from(`${payloadString}:${signature}`).toString('base64url');
  return token;
}

/**
 * Validiert einen Audio-Token
 */
export function validateAudioToken(token: string): {
  valid: boolean;
  payload?: AudioTokenPayload;
  error?: string;
} {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf-8');
    const [payloadString, signature] = decoded.split(':');

    if (!payloadString || !signature) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Validiere Signatur
    const expectedSignature = crypto
      .createHmac('sha256', TOKEN_SECRET)
      .update(payloadString)
      .digest('hex');

    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid token signature' };
    }

    // Parse Payload
    const payload: AudioTokenPayload = JSON.parse(payloadString);

    // Prüfe Ablaufzeit
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, payload };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Token validation failed' };
  }
}

/**
 * Extrahiert Filename aus Supabase Storage URL
 */
export function extractFilenameFromUrl(url: string): string | null {
  try {
    // Supabase Storage URL Format: https://xxx.supabase.co/storage/v1/object/public/audio-files/filename.mp3
    const match = url.match(/audio-files\/([^/?]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

