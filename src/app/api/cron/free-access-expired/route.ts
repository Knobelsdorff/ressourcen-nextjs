/**
 * Funnel: free_access_expired – die 7 kostenlosen Tage einer Gratis-Story sind
 * abgelaufen, ohne dass ein Abo besteht.
 *
 * Das passiert ohne Zutun der Person (oft ist sie gar nicht auf der Seite),
 * deshalb ein täglicher Vercel-Cron (vercel.json). Geprüft werden die letzten
 * 3 Tage; jedes Event hat eine feste UUID und als Zeitpunkt das Ende der
 * Testphase – wiederholte Läufe zählen also nicht doppelt.
 *
 * Gesendet nur mit Einwilligung: am Account gespeichert (app_metadata) oder –
 * bei der Engel-Story – über die analytics_id des Entwurfs.
 *
 * Schutz: Vercel schickt "Authorization: Bearer $CRON_SECRET". Ohne gesetztes
 * CRON_SECRET antwortet die Route immer mit 401.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';
import { loadDraftAnalyticsId } from '@/lib/first-story/server';
import { captureServerEvent, isServerAnalyticsConfigured, userIdHasConsent } from '@/lib/product-analytics/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LOOKBACK_DAYS = 3;
const MAX_STORIES_PER_RUN = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

interface TrialStory {
  id: string;
  user_id: string;
  created_at: string;
  trial_ends_at: string;
  first_story_draft_id: string | null;
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isServerAnalyticsConfigured()) return NextResponse.json({ skipped: 'PostHog nicht konfiguriert' });

  const admin = await createServerAdminClient();
  const now = new Date();
  const { data, error } = await (admin as any)
    .from('saved_stories')
    .select('id, user_id, created_at, trial_ends_at, first_story_draft_id')
    .eq('access_policy', 'trial')
    .gte('trial_ends_at', new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS).toISOString())
    .lte('trial_ends_at', now.toISOString())
    .limit(MAX_STORIES_PER_RUN);
  if (error) {
    console.error('[Cron/free-access-expired] Abfrage fehlgeschlagen:', error.message);
    return NextResponse.json({ error: 'Abfrage fehlgeschlagen' }, { status: 500 });
  }

  const stories = (data ?? []) as TrialStory[];
  const userIds = [...new Set(stories.map((story) => story.user_id).filter(Boolean))];

  // Wer inzwischen ein aktives Abo hat, hat keinen "abgelaufenen" Zugang.
  const subscribed = new Set<string>();
  if (userIds.length > 0) {
    const { data: access } = await (admin as any)
      .from('user_access')
      .select('user_id')
      .in('user_id', userIds)
      .eq('status', 'active')
      .eq('subscription_status', 'active');
    for (const row of access ?? []) subscribed.add(row.user_id);
  }

  let sent = 0;
  for (const story of stories) {
    if (!story.user_id || subscribed.has(story.user_id)) continue;
    const consent =
      (story.first_story_draft_id && (await loadDraftAnalyticsId(admin, story.first_story_draft_id))) ||
      (await userIdHasConsent(story.user_id));
    if (!consent) continue;

    await captureServerEvent(
      'free_access_expired',
      {
        access: 'trial',
        trial_days: Math.round((new Date(story.trial_ends_at).getTime() - new Date(story.created_at).getTime()) / DAY_MS),
      },
      {
        distinctId: story.user_id,
        timestamp: story.trial_ends_at,
        dedupeKey: `free_access_expired:${story.id}`,
        $set: { free_access_expired: true },
      }
    );
    sent++;
  }

  console.log('[Cron/free-access-expired]', { checked: stories.length, sent });
  return NextResponse.json({ checked: stories.length, sent });
}
