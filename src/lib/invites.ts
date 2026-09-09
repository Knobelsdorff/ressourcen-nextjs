/**
 * Langzeit-Zugangslinks für Klienten.
 *
 * Ein Invite bleibt 60 Tage gültig und überlebt beliebig viele Öffnungen.
 * Er endet nur, wenn ein Passwort gesetzt wurde, die Frist abgelaufen ist
 * oder ein Admin ihn widerrufen hat.
 *
 * Gespeichert wird ausschließlich der SHA-256-Hash. Der Klartext wird genau
 * einmal zurückgegeben – für die E-Mail – und ist danach nicht mehr
 * rekonstruierbar.
 */

import { randomBytes, createHash } from 'crypto';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { appUrl } from '@/lib/app-url';

/** Cookie, das eine per Invite aufgebaute Session markiert. */
export const INVITE_COOKIE_NAME = 'ps_invite';

export const DEFAULT_INVITE_DAYS = 60;

export interface CreateInviteParams {
  email: string;
  userId?: string | null;
  resourceId?: string | null;
  createdBy?: string | null;
  /** Abweichende Gültigkeit in Tagen. Ohne Angabe gilt der Spalten-Default (60 Tage). */
  expiresInDays?: number;
}

export interface CreatedInvite {
  id: string;
  /** Klartext-Token – existiert nur hier und in der versendeten E-Mail. */
  token: string;
  /** Fertiger Link für die E-Mail. */
  url: string;
  expiresAt: Date;
}

export interface RedeemedInvite {
  inviteId: string;
  email: string;
  userId: string | null;
  resourceId: string | null;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 32 zufällige Bytes, base64url-kodiert (43 Zeichen, URL-sicher). */
function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function inviteUrlForToken(token: string): string {
  return appUrl(`/zugang/${token}`);
}

/**
 * Erstellt einen neuen Zugangslink und gibt den Klartext-Token zurück.
 * Wirft bei Datenbankfehlern – die Aufrufer fangen das ab und fallen auf den
 * bisherigen Supabase-Link zurück, damit kein Versand komplett scheitert.
 */
export async function createInvite({
  email,
  userId = null,
  resourceId = null,
  createdBy = null,
  expiresInDays,
}: CreateInviteParams): Promise<CreatedInvite> {
  const supabaseAdmin = await createServerAdminClient();

  const token = generateToken();
  const normalizedEmail = email.trim().toLowerCase();

  const row: Record<string, unknown> = {
    token_hash: hashToken(token),
    email: normalizedEmail,
    user_id: userId,
    resource_id: resourceId,
    created_by: createdBy,
  };

  // Ohne explizite Angabe gilt der Spalten-Default (60 Tage),
  // damit die Frist ohne Deployment änderbar bleibt.
  if (typeof expiresInDays === 'number') {
    const expires = new Date();
    expires.setDate(expires.getDate() + expiresInDays);
    row.expires_at = expires.toISOString();
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('power_story_invites')
    .insert(row)
    .select('id, expires_at')
    .single();

  if (error || !data) {
    throw new Error(`Invite konnte nicht erstellt werden: ${error?.message ?? 'unbekannter Fehler'}`);
  }

  return {
    id: data.id,
    token,
    url: inviteUrlForToken(token),
    expiresAt: new Date(data.expires_at),
  };
}

/**
 * Löst einen Token ein. Gibt null zurück, wenn er unbekannt, widerrufen,
 * verbraucht oder abgelaufen ist. Zählt die Nutzung mit, begrenzt sie aber nicht.
 */
export async function redeemInvite(token: string, ip?: string | null): Promise<RedeemedInvite | null> {
  if (!token) return null;

  const supabaseAdmin = await createServerAdminClient();

  const { data, error } = await (supabaseAdmin as any).rpc('redeem_power_story_invite', {
    p_token_hash: hashToken(token),
    p_ip: ip ?? null,
  });

  if (error) {
    console.error('[Invites] redeem_power_story_invite error:', error.message);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    inviteId: row.invite_id,
    email: row.invite_email,
    userId: row.invite_user_id ?? null,
    resourceId: row.invite_resource_id ?? null,
  };
}

/** Entwertet alle offenen Invites einer Person – sobald ein Passwort gesetzt wurde. */
export async function consumeInvitesForUser(userId: string): Promise<number> {
  const supabaseAdmin = await createServerAdminClient();

  const { data, error } = await (supabaseAdmin as any).rpc('consume_power_story_invites', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[Invites] consume_power_story_invites error:', error.message);
    return 0;
  }

  return typeof data === 'number' ? data : 0;
}

/** Verknüpft einen Invite nachträglich mit einem User (z.B. nach createUser). */
export async function attachInviteToUser(inviteId: string, userId: string): Promise<void> {
  const supabaseAdmin = await createServerAdminClient();
  await (supabaseAdmin as any)
    .from('power_story_invites')
    .update({ user_id: userId })
    .eq('id', inviteId);
}
