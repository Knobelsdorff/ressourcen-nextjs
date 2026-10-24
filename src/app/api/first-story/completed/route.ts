/**
 * Die Gratis-Story (Engel-Erststory oder erste Story aus dem normalen Flow)
 * wurde zum ersten Mal vollständig angehört.
 *
 * Merkt sich den Zeitpunkt am Entwurf bzw. an der Story (nur der Server kann
 * ihn schreiben) und
 * antwortet genau einmal pro Account mit showOffer = true – und nur, wenn noch
 * kein aktiver Zugang besteht. Mehrfache Aufrufe, andere Geräte oder ein
 * Neuladen zeigen das Angebot nicht noch einmal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { getSessionUser } from '@/lib/first-story/server';
import { loadUserAccessState } from '@/lib/story-access/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser(request);
    if (!user) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    if (typeof body.storyId !== 'string') return NextResponse.json({ error: 'storyId fehlt' }, { status: 400 });

    const admin = await createServerAdminClient();
    const { data: story } = await (admin as any)
      .from('saved_stories')
      .select('id, user_id, first_story_draft_id, access_policy')
      .eq('id', body.storyId)
      .maybeSingle();

    // Nur die Gratis-Story des eigenen Accounts zählt: Engel-Erststory oder
    // die erste Story aus dem normalen Flow (access_policy 'trial').
    if (!story || story.user_id !== user.id || (!story.first_story_draft_id && story.access_policy !== 'trial')) {
      return NextResponse.json({ showOffer: false });
    }

    const now = new Date().toISOString();
    const { data: marked, error } = story.first_story_draft_id
      ? await (admin as any)
          .from('first_story_drafts')
          .update({ first_completed_at: now })
          .eq('id', story.first_story_draft_id)
          .is('first_completed_at', null)
          .select('id')
      : await (admin as any)
          .from('saved_stories')
          .update({ first_completed_at: now })
          .eq('id', story.id)
          .is('first_completed_at', null)
          .select('id');
    if (error) {
      console.error('[FirstStory/completed] Konnte Durchlauf nicht speichern:', error.message);
      return NextResponse.json({ showOffer: false });
    }
    if (!marked?.length) return NextResponse.json({ showOffer: false });

    const access = await loadUserAccessState(admin, user.id, user.email);
    return NextResponse.json({ showOffer: !access.hasActiveAccess && !access.isAdmin });
  } catch (e) {
    console.error('[FirstStory/completed] Fehler:', e);
    return NextResponse.json({ showOffer: false });
  }
}
