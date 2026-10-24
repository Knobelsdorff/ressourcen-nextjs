/**
 * Die Gratis-Story (Engel-Erststory oder erste Story aus dem normalen Flow)
 * wurde bis zum Ende gehört (oder ans Ende gespult).
 *
 * Zwei Aufrufe, damit das Abo-Angebot nie "verbrennt", ohne gezeigt worden zu sein:
 *   { storyId }               → Antwort { showOffer, reason }: Soll es jetzt kommen?
 *   { storyId, shown: true }  → Es wurde angezeigt; ab jetzt nicht mehr.
 *
 * Gezeigt wird es nur bei Gratis-Storys des eigenen Accounts ohne aktiven
 * Zugang (Admins ausgenommen) – und genau einmal pro Account.
 *
 * Fehlt die Spalte first_completed_at (Migration noch nicht eingespielt), wird
 * das Angebot trotzdem gezeigt; der Browser verhindert dann Wiederholungen.
 * Jede Absage nennt ihren Grund (reason) und steht im Server-Log.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { getSessionUser } from '@/lib/first-story/server';
import { loadUserAccessState } from '@/lib/story-access/server';

export const dynamic = 'force-dynamic';

function answer(storyId: string, showOffer: boolean, reason: string) {
  if (!showOffer) console.info(`[FirstStory/completed] story=${storyId} kein Angebot: ${reason}`);
  return NextResponse.json({ showOffer, reason });
}

export async function POST(request: NextRequest) {
  let storyId = '?';
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ showOffer: false, reason: 'not_signed_in' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (typeof body.storyId !== 'string') return NextResponse.json({ showOffer: false, reason: 'story_id_missing' }, { status: 400 });
    storyId = body.storyId;

    const admin = await createServerAdminClient();
    const { data: story } = await (admin as any)
      .from('saved_stories')
      .select('id, user_id, first_story_draft_id, access_policy')
      .eq('id', storyId)
      .maybeSingle();

    if (!story || story.user_id !== user.id) return answer(storyId, false, 'story_not_found_or_not_yours');
    if (!story.first_story_draft_id && story.access_policy !== 'trial') {
      return answer(storyId, false, `not_a_free_story (access_policy=${story.access_policy ?? 'none'})`);
    }

    // Wo "Angebot gezeigt" steht: am Engel-Entwurf, sonst an der Story selbst.
    const markerTable = story.first_story_draft_id ? 'first_story_drafts' : 'saved_stories';
    const markerId = story.first_story_draft_id ?? story.id;
    const { data: marker, error: markerError } = await (admin as any)
      .from(markerTable)
      .select('first_completed_at')
      .eq('id', markerId)
      .maybeSingle();
    if (markerError) {
      console.warn(`[FirstStory/completed] ${markerTable}.first_completed_at nicht lesbar (Migration eingespielt?):`, markerError.message);
    }
    const alreadyShown = !!marker?.first_completed_at;

    if (body.shown === true) {
      if (!alreadyShown && !markerError) {
        const { error } = await (admin as any)
          .from(markerTable)
          .update({ first_completed_at: new Date().toISOString() })
          .eq('id', markerId)
          .is('first_completed_at', null);
        if (error) console.error('[FirstStory/completed] Konnte "Angebot gezeigt" nicht speichern:', error.message);
      }
      return NextResponse.json({ showOffer: false, reason: 'marked' });
    }

    if (alreadyShown) return answer(storyId, false, 'already_shown');

    const access = await loadUserAccessState(admin, user.id, user.email);
    if (access.isAdmin) return answer(storyId, false, 'admin_account');
    if (access.hasActiveAccess) return answer(storyId, false, 'has_active_access');

    return NextResponse.json({ showOffer: true, reason: 'ok' });
  } catch (e) {
    console.error(`[FirstStory/completed] story=${storyId} Fehler:`, e);
    return NextResponse.json({ showOffer: false, reason: 'server_error' });
  }
}
