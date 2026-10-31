import { Loader2 } from 'lucide-react';
import AngelIconFinal from '@/components/AngelIconFinal';

export type FirstStoryWelcomeState = 'preparing-text' | 'preparing-audio' | 'failed';

interface FirstStoryWelcomeProps {
  state: FirstStoryWelcomeState;
  /** Erste persönliche Story des Accounts (sonst: "neue" Story). */
  isFirstStory: boolean;
  onRetry?: () => void;
}

/**
 * Hinweis im Dashboard, solange die Erststory nach dem E-Mail-Link noch entsteht.
 * Ist sie fertig, übernimmt FirstStoryReadyDialog.
 */
export default function FirstStoryWelcome({ state, isFirstStory, onRetry }: FirstStoryWelcomeProps) {
  const preparing = state === 'preparing-text' || state === 'preparing-audio';

  return (
    <section
      className="dashboard-first-story"
      aria-labelledby="dashboard-first-story-title"
      aria-live="polite"
    >
      <div className="dashboard-first-story-icon" aria-hidden="true">
        <AngelIconFinal size={52} />
      </div>

      <div className="dashboard-first-story-copy">
        <span className="dashboard-eyebrow"><span /> {isFirstStory ? 'DEINE ERSTE POWER STORY' : 'DEINE NEUE POWER STORY'}</span>

        {preparing && (
          <>
            <h2 id="dashboard-first-story-title">Willkommen! Dein Engel ist fast bereit.</h2>
            <p>
              {state === 'preparing-audio'
                ? 'Dein Text ist fertig – Kerstins Stimme wird gerade aufgenommen.'
                : 'Wir erstellen gerade deine persönliche Power Story aus deinen Antworten.'}{' '}
              Das dauert etwa eine Minute. Sie erscheint hier automatisch.
            </p>
            <div className="dashboard-first-story-status" role="status">
              <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              {state === 'preparing-audio' ? 'Stimme wird aufgenommen …' : 'Geschichte entsteht …'}
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <h2 id="dashboard-first-story-title">Deine Story braucht noch einen Moment.</h2>
            <p>Beim Erstellen ist etwas schiefgelaufen. Deine Antworten sind gespeichert – versuche es einfach noch einmal.</p>
            <div className="dashboard-first-story-actions">
              <button type="button" className="dashboard-primary-button" onClick={onRetry}>Erneut versuchen</button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
