/**
 * Gratis-Story aus dem normalen Flow (ohne Engel-Entwurf): Testphase an die
 * eingestellte Dauer anpassen.
 *
 * Der Datenbank-Trigger (20261018200000_free_story_trial.sql) macht die erste
 * Story eines Accounts ohne Zugang zur 'trial'-Story mit 7 Tagen. Hier wird
 * trial_ends_at auf created_at + FIRST_STORY_TRIAL_MINUTES gesetzt – dieselbe
 * Dauer wie bei der Engel-Erststory. Ohne Variable (Produktion) bleibt es bei
 * 7 Tagen. Idempotent; verlängert nie über die eingestellte Dauer hinaus.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { firstStoryTrialSeconds, getSessionUser } from '@/lib/first-story/server';

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
      .select('id, user_id, created_at, access_policy, trial_ends_at, first_story_draft_id')
      .eq('id', body.storyId)
      .maybeSingle();

    if (!story || story.user_id !== user.id || story.access_policy !== 'trial' || story.first_story_draft_id) {
      return NextResponse.json({ trialEndsAt: null });
    }

    const trialEndsAt = new Date(new Date(story.created_at).getTime() + firstStoryTrialSeconds() * 1000).toISOString();
    if (story.trial_ends_at && new Date(story.trial_ends_at).getTime() === new Date(trialEndsAt).getTime()) {
      return NextResponse.json({ trialEndsAt });
    }

    const { error } = await (admin as any).from('saved_stories').update({ trial_ends_at: trialEndsAt }).eq('id', story.id);
    if (error) {
      console.error('[FreeStoryTrial] trial_ends_at konnte nicht gesetzt werden:', error.message);
      return NextResponse.json({ trialEndsAt: story.trial_ends_at });
    }
    return NextResponse.json({ trialEndsAt });
  } catch (e) {
    console.error('[FreeStoryTrial] Fehler:', e);
    return NextResponse.json({ trialEndsAt: null });
  }
}
