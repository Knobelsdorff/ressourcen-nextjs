/**
 * Gratis-Story aus dem normalen Flow (ohne Engel-Entwurf): Testphase festlegen.
 *
 * Regel (dieselbe wie im Datenbank-Trigger aus 20261018200000_free_story_trial.sql):
 * Die erste KI-Story eines Accounts ohne Zugang ist 7 Tage gratis, danach
 * gesperrt. Die Regel wird hier zusätzlich serverseitig angewendet – so greift
 * sie auch dann, wenn die Migration (noch) nicht eingespielt ist.
 *
 * 'trial' bekommt eine Story nur, wenn ALLES zutrifft:
 *   - gehört dem Account, ist keine Engel-Erststory, kein Audio-only,
 *   - hat Antworten (question_answers nicht leer),
 *   - der Account hat keine andere KI-Story. Audio-only-Ressourcen aus der
 *     Therapie zählen nicht mit: Sie bleiben selbst immer 'always', aber die
 *     eine Gratis-Story einer Klient:in läuft wie bei allen nach 7 Tagen ab
 *     (Migration 20261101120000),
 *   - kein aktiver Zugang.
 *
 * trial_ends_at wird auf created_at + FIRST_STORY_TRIAL_MINUTES gesetzt – dieselbe
 * Dauer wie bei der Engel-Erststory. Ohne Variable (Produktion): 7 Tage.
 * Idempotent; antwortet mit { policy, trialEndsAt }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { firstStoryTrialSeconds, getSessionUser } from '@/lib/first-story/server';
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
      .select('id, user_id, created_at, access_policy, trial_ends_at, first_story_draft_id, is_audio_only, question_answers')
      .eq('id', body.storyId)
      .maybeSingle();

    if (!story || story.user_id !== user.id || story.first_story_draft_id) {
      return NextResponse.json({ policy: null, trialEndsAt: null });
    }

    if (story.access_policy === 'always') {
      const looksLikeFirstAiStory =
        story.is_audio_only !== true && Array.isArray(story.question_answers) && story.question_answers.length > 0;
      if (!looksLikeFirstAiStory) return NextResponse.json({ policy: story.access_policy, trialEndsAt: null });

      const { count: otherAiStories, error: countError } = await (admin as any)
        .from('saved_stories')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('id', story.id)
        .not('is_audio_only', 'is', true);
      if (countError || (otherAiStories ?? 0) > 0) return NextResponse.json({ policy: story.access_policy, trialEndsAt: null });

      const access = await loadUserAccessState(admin, user.id, user.email);
      if (access.hasActiveAccess) return NextResponse.json({ policy: story.access_policy, trialEndsAt: null });
    } else if (story.access_policy !== 'trial') {
      return NextResponse.json({ policy: story.access_policy, trialEndsAt: null });
    }

    const trialEndsAt = new Date(new Date(story.created_at).getTime() + firstStoryTrialSeconds() * 1000).toISOString();
    const unchanged =
      story.access_policy === 'trial' &&
      story.trial_ends_at &&
      new Date(story.trial_ends_at).getTime() === new Date(trialEndsAt).getTime();
    if (unchanged) return NextResponse.json({ policy: 'trial', trialEndsAt });

    const { error } = await (admin as any)
      .from('saved_stories')
      .update({ access_policy: 'trial', trial_ends_at: trialEndsAt })
      .eq('id', story.id);
    if (error) {
      console.error('[FreeStoryTrial] Testphase konnte nicht gesetzt werden:', error.message);
      return NextResponse.json({ policy: story.access_policy, trialEndsAt: story.trial_ends_at ?? null });
    }
    return NextResponse.json({ policy: 'trial', trialEndsAt });
  } catch (e) {
    console.error('[FreeStoryTrial] Fehler:', e);
    return NextResponse.json({ policy: null, trialEndsAt: null });
  }
}
