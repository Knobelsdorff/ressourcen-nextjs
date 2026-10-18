/**
 * Fortschritt der ersten Power Story.
 *
 * GET  ?draftId=…&key=…   – Browser, der den Entwurf angelegt hat
 * GET  (ohne Parameter)    – eingeloggter Account (Dashboard)
 * POST { draftId?, key? }  – "Erneut versuchen" nach einem Fehler
 *
 * Jede Abfrage schiebt eine hängengebliebene Erzeugung wieder an und speichert
 * einen fertigen, zugeordneten Entwurf. Beides ist idempotent.
 *
 * Bleibt bewusst auch bei ausgeschaltetem Feature-Flag aktiv, damit bereits
 * versendete Links weiter zu ihrer Story führen.
 */

import { after, NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import {
  AUTO_ATTEMPTS,
  claimFirstStoryDraft,
  draftNeedsWork,
  draftPhase,
  FirstStoryDraft,
  getSessionUser,
  loadDraft,
  loadLatestDraftForUser,
  MANUAL_RETRY_ATTEMPTS,
  processFirstStoryDraft,
  resumeKeyMatches,
} from '@/lib/first-story/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type Resolved =
  | { draft: FirstStoryDraft | null; ownerId: string | null }
  | { response: NextResponse };

async function resolveDraft(
  request: NextRequest,
  draftId: string | null,
  key: string | null
): Promise<Resolved> {
  const admin = await createServerAdminClient();
  const sessionUser = await getSessionUser(request);

  if (draftId) {
    const draft = await loadDraft(admin, draftId);
    const isOwner = !!(draft && sessionUser && draft.user_id === sessionUser.id);
    if (!draft || (!isOwner && !(key && resumeKeyMatches(key, draft.resume_key_hash)))) {
      return { response: NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 }) };
    }
    return { draft, ownerId: isOwner ? sessionUser!.id : null };
  }

  if (!sessionUser) {
    return { response: NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 }) };
  }
  return { draft: await loadLatestDraftForUser(admin, sessionUser.id), ownerId: sessionUser.id };
}

function respond(draft: FirstStoryDraft | null, ownerId: string | null) {
  let phase = draftPhase(draft);
  // Vor dem Link-Klick verraten wir nicht, dass zu der Adresse schon eine
  // Story existiert (Entwurf direkt auf eine vorhandene Erststory gesetzt).
  if (phase === 'claimed' && !draft?.user_id) phase = 'ready';

  return NextResponse.json({
    phase,
    // Die Story-ID bekommt nur der Account, dem sie gehört.
    storyId: ownerId && draft?.user_id === ownerId ? draft.saved_story_id : null,
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resolved = await resolveDraft(request, searchParams.get('draftId'), searchParams.get('key'));
    if ('response' in resolved) return resolved.response;

    let { draft } = resolved;
    if (draft?.status === 'ready' && draft.user_id) {
      const storyId = await claimFirstStoryDraft(draft.id);
      if (storyId) draft = { ...draft, status: 'claimed', saved_story_id: storyId };
    } else if (draft && draftNeedsWork(draft, AUTO_ATTEMPTS)) {
      const id = draft.id;
      after(() => processFirstStoryDraft(id, AUTO_ATTEMPTS));
    }

    return respond(draft, resolved.ownerId);
  } catch (e) {
    console.error('[FirstStory/status] Fehler:', e);
    return NextResponse.json({ error: 'Status nicht verfügbar' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const draftId = typeof body.draftId === 'string' ? body.draftId : null;
    const key = typeof body.key === 'string' ? body.key : null;
    const resolved = await resolveDraft(request, draftId, key);
    if ('response' in resolved) return resolved.response;

    const { draft } = resolved;
    if (draft && draftNeedsWork(draft, MANUAL_RETRY_ATTEMPTS)) {
      const id = draft.id;
      after(() => processFirstStoryDraft(id, MANUAL_RETRY_ATTEMPTS));
      // Optimistisch: die Anzeige springt zurück auf "wird erstellt".
      return NextResponse.json({ phase: draft.story_text ? 'audio' : 'text', storyId: null });
    }
    return respond(draft, resolved.ownerId);
  } catch (e) {
    console.error('[FirstStory/status] Retry-Fehler:', e);
    return NextResponse.json({ error: 'Erneuter Versuch nicht möglich' }, { status: 500 });
  }
}
