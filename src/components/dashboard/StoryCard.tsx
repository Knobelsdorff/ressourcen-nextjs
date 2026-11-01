"use client";

/**
 * Eine Power Story als Karte.
 *
 * Aus der 3.945-Zeilen-Dashboard-Seite herausgelöst. Zeigt jetzt auch, wann
 * die Story entstanden ist – vorher wurde created_at nur zum Sortieren
 * benutzt und nirgends angezeigt, obwohl genau das die Frage ist, die
 * Klient:innen an eine Liste stellen: „Welche ist die von letzter Woche?"
 */

import { motion } from "framer-motion";
import { Lock, Volume2 } from "lucide-react";
import AudioPlayer from "@/components/audio/AudioPlayer";
import ButterflyHugExercise from "@/components/audio/ButterflyHugExercise";
import EditableTitle from "@/components/EditableTitle";
import EditableSubtitle from "@/components/EditableSubtitle";
import StoryActionsMenu from "@/components/StoryActionsMenu";
import { formatDateWithTitle } from "@/lib/format-date";
import { StoryAccess, StoryLockReason, trialDaysLeft } from "@/lib/story-access/shared";

export interface StoryCardStory {
  id: string;
  title: string;
  audio_url?: string | null;
  resource_figure: any;
  created_at: string;
  is_audio_only?: boolean;
  client_email?: string | null;
  auto_subtitle?: string | null;
  custom_subtitle?: string | null;
  /** Vom Server berechnet (/api/resources/mine). Fehlt = wie bisher abspielbar. */
  access?: StoryAccess;
  /** Erstes vollständiges Anhören (Migration 20261018200000) – für "erneut gehört". */
  first_completed_at?: string | null;
}

const LOCKED_COPY: Record<StoryLockReason, { title: string; text: string; cta: string }> = {
  trial_ended: {
    title: "Deine 7 kostenlosen Tage sind vorbei.",
    text: "Deine Power Story bleibt hier für dich gespeichert. Mit Power Storys kannst du sie jederzeit wieder anhören.",
    cta: "Power Storys freischalten",
  },
  subscription_inactive: {
    title: "Dein Abo ist beendet.",
    text: "Deine Power Story bleibt für dich gespeichert. Sobald du Power Storys wieder freischaltest, kannst du sie sofort anhören.",
    cta: "Power Storys freischalten",
  },
  payment_failed: {
    title: "Deine letzte Zahlung hat nicht geklappt.",
    text: "Deine Power Storys pausieren, bis die Zahlung erfolgreich ist. Aktualisiere deine Zahlungsmethode – danach kannst du sofort weiterhören.",
    cta: "Zahlungsmethode aktualisieren",
  },
};

interface StoryCardProps {
  story: StoryCardStory;
  subtitle: string | null;
  isRenaming: boolean;
  onStartRename: () => void;
  onSaveTitle: (title: string) => Promise<void>;
  onCancelRename: () => void;
  onSaveSubtitle: (value: string | null) => Promise<void>;
  onDelete: () => void;
  canDelete: boolean;
  isGeneratingAudio?: boolean;
  onGenerateAudio?: () => void;
  /** Gesperrte Story: Freischalten bzw. Zahlungsmethode aktualisieren. */
  onUnlock?: (reason: StoryLockReason) => void;
  /** Story hat ihr Ende erreicht (siehe useAudioPlayer). */
  onCompleted?: () => void;
  /** data-tour-Anker für Einführungen (src/components/onboarding). */
  tour?: { card?: string; player?: string; trial?: string };
}

export default function StoryCard({
  story,
  subtitle,
  isRenaming,
  onStartRename,
  onSaveTitle,
  onCancelRename,
  onSaveSubtitle,
  onDelete,
  canDelete,
  isGeneratingAudio = false,
  onGenerateAudio,
  onUnlock,
  onCompleted,
  tour,
}: StoryCardProps) {
  const created = formatDateWithTitle(story.created_at);
  const lockReason = story.access && !story.access.playable ? story.access.lockReason ?? "trial_ended" : null;
  const freeDaysLeft = story.access?.trialActive ? trialDaysLeft(story.access.trialEndsAt) : 0;

  // Mit Andreas aufgenommen vs. selbst erstellt – nur anzeigen, wenn eindeutig.
  const createdWithAndreas = story.is_audio_only === true || story.client_email !== null;
  const selfCreated = story.is_audio_only !== true && story.client_email === null;

  return (
    <motion.article
      data-tour={tour?.card}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="dashboard-story-card rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md motion-reduce:transition-none sm:p-6"
    >
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isRenaming ? (
            <EditableTitle
              value={story.title}
              autoEdit
              onSave={onSaveTitle}
              onCancel={onCancelRename}
              className="text-lg font-medium md:text-xl"
            />
          ) : (
            <h3 className="truncate text-lg font-medium text-secondary-900 md:text-xl">
              {story.title}
            </h3>
          )}

          <div className="mt-1">
            <EditableSubtitle
              value={subtitle}
              autoSubtitle={story.auto_subtitle ?? null}
              customSubtitle={story.custom_subtitle ?? null}
              onSave={onSaveSubtitle}
              className="text-sm"
            />
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <time
              dateTime={created.dateTime}
              title={created.title}
              className="text-xs text-secondary-500"
            >
              {created.label}
            </time>

            {createdWithAndreas && (
              <span className="dashboard-badge-guided rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-800">
                Mit Andreas erstellt
              </span>
            )}
            {selfCreated && (
              <span className="dashboard-badge-personal rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-700">
                Selbst erstellt
              </span>
            )}
            {freeDaysLeft > 0 && (
              <span data-tour={tour?.trial} className="dashboard-badge-trial rounded-full px-2 py-0.5 text-xs font-medium">
                {freeDaysLeft === 1 ? "Noch heute kostenlos" : `Noch ${freeDaysLeft} Tage kostenlos`}
              </span>
            )}
          </div>
        </div>

        <StoryActionsMenu
          onRename={onStartRename}
          onDelete={onDelete}
          canDelete={canDelete}
        />
      </header>

      {lockReason ? (
        <div className="dashboard-story-locked" role="group" aria-labelledby={`locked-${story.id}`}>
          <span className="dashboard-story-locked-icon" aria-hidden="true">
            <Lock size={18} />
          </span>
          <div className="min-w-0">
            <p id={`locked-${story.id}`} className="dashboard-story-locked-title">
              {LOCKED_COPY[lockReason].title}
            </p>
            <p className="dashboard-story-locked-text">{LOCKED_COPY[lockReason].text}</p>
            {onUnlock && (
              <button type="button" className="dashboard-primary-button mt-4" onClick={() => onUnlock(lockReason)}>
                {LOCKED_COPY[lockReason].cta}
              </button>
            )}
          </div>
        </div>
      ) : story.audio_url ? (
        <>
        {/* Wrapper immer rendern: Würde er nur für die Tour erscheinen, würde
            der Player beim Ende der Tour neu gemountet und laufendes Audio stoppen. */}
        <div data-tour={tour?.player}>
          <AudioPlayer
            audioUrl={story.audio_url}
            title={story.title}
            storyId={story.id}
            resourceFigure={story.resource_figure}
            onCompleted={onCompleted}
            playAnalytics={{
              storyId: story.id,
              access: story.access?.policy ?? "always",
              location: "dashboard",
              createdAt: story.created_at,
              firstCompletedAt: story.first_completed_at ?? null,
            }}
          />
        </div>
        <ButterflyHugExercise className="mt-6" />
        </>
      ) : (
        <div className="rounded-xl bg-secondary-50 px-4 py-6 text-center">
          <p className="mb-4 text-sm text-secondary-600">
            Für diese Power Story ist noch kein Audio vorhanden.
          </p>
          {isGeneratingAudio ? (
            <p
              className="flex items-center justify-center gap-2 text-sm text-secondary-600"
              aria-live="polite"
            >
              <span
                className="block h-4 w-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent motion-reduce:animate-none"
                aria-hidden="true"
              />
              Audio wird erstellt…
            </p>
          ) : (
            onGenerateAudio && (
              <button
                type="button"
                onClick={onGenerateAudio}
                className="inline-flex items-center gap-2 rounded-full bg-primary-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
              >
                <Volume2 className="h-4 w-4" aria-hidden="true" />
                Audio erstellen
              </button>
            )
          )}
        </div>
      )}

    </motion.article>
  );
}
