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
import { Volume2 } from "lucide-react";
import AudioPlayer from "@/components/audio/AudioPlayer";
import EditableTitle from "@/components/EditableTitle";
import EditableSubtitle from "@/components/EditableSubtitle";
import StoryActionsMenu from "@/components/StoryActionsMenu";
import { formatDateWithTitle } from "@/lib/format-date";

export interface StoryCardStory {
  id: string;
  title: string;
  audio_url?: string;
  resource_figure: any;
  created_at: string;
  is_audio_only?: boolean;
  client_email?: string | null;
  auto_subtitle?: string | null;
  custom_subtitle?: string | null;
}

interface StoryCardProps {
  story: StoryCardStory;
  subtitle: string | null;
  /** Pro-Nutzer bekommen zusätzlich die bilaterale Stimulation. */
  withBLS?: boolean;
  blsExpanded?: boolean;
  onToggleBLS?: () => void;
  isRenaming: boolean;
  onStartRename: () => void;
  onSaveTitle: (title: string) => Promise<void>;
  onCancelRename: () => void;
  onSaveSubtitle: (value: string | null) => Promise<void>;
  onDelete: () => void;
  canDelete: boolean;
  isGeneratingAudio?: boolean;
  onGenerateAudio?: () => void;
  /** Admin: diese Story als Beispiel auf der Startseite zeigen. */
  adminExampleControl?: {
    isSelected: boolean;
    isSaving: boolean;
    onSelect: () => void;
  };
}

export default function StoryCard({
  story,
  subtitle,
  withBLS = false,
  blsExpanded = false,
  onToggleBLS,
  isRenaming,
  onStartRename,
  onSaveTitle,
  onCancelRename,
  onSaveSubtitle,
  onDelete,
  canDelete,
  isGeneratingAudio = false,
  onGenerateAudio,
  adminExampleControl,
}: StoryCardProps) {
  const created = formatDateWithTitle(story.created_at);

  // Mit Andreas aufgenommen vs. selbst erstellt – nur anzeigen, wenn eindeutig.
  const createdWithAndreas = story.is_audio_only === true || story.client_email !== null;
  const selfCreated = story.is_audio_only !== true && story.client_email === null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-secondary-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md motion-reduce:transition-none sm:p-6"
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
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-800">
                Mit Andreas erstellt
              </span>
            )}
            {selfCreated && (
              <span className="rounded-full bg-secondary-100 px-2 py-0.5 text-xs font-medium text-secondary-700">
                Selbst erstellt
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

      {story.audio_url ? (
        <AudioPlayer
          audioUrl={story.audio_url}
          title={story.title}
          storyId={story.id}
          resourceFigure={story.resource_figure}
          variant={withBLS ? "bls" : "standard"}
          blsExpanded={blsExpanded}
          onToggleBLS={onToggleBLS}
        />
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

      {adminExampleControl && story.audio_url && (
        <div className="mt-4 border-t border-secondary-100 pt-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-secondary-600">
            <input
              type="radio"
              name="example-resource"
              checked={adminExampleControl.isSelected}
              onChange={adminExampleControl.onSelect}
              disabled={adminExampleControl.isSaving}
              className="h-4 w-4 cursor-pointer accent-primary-600 disabled:opacity-50"
            />
            Als Beispiel-Ressource auf der Startseite zeigen
          </label>
        </div>
      )}
    </motion.article>
  );
}
