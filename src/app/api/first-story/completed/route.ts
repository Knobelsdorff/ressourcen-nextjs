/**
 * Die Erststory wurde zum ersten Mal vollständig angehört.
 *
 * Merkt sich den Zeitpunkt am Entwurf (nur der Server kann ihn schreiben) und
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
      .select('id, user_id, first_story_draft_id')
      .eq('id', body.storyId)
      .maybeSingle();

    // Nur die Erststory des eigenen Accounts zählt.
    if (!story || story.user_id !== user.id || !story.first_story_draft_id) {
      return NextResponse.json({ showOffer: false });
    }

    const { data: marked, error } = await (admin as any)
      .from('first_story_drafts')
      .update({ first_completed_at: new Date().toISOString() })
      .eq('id', story.first_story_draft_id)
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
