import { Headphones, Loader2, X } from 'lucide-react';
import AngelIconFinal from '@/components/AngelIconFinal';

export type FirstStoryWelcomeState = 'preparing-text' | 'preparing-audio' | 'failed' | 'ready';

interface FirstStoryWelcomeProps {
  state: FirstStoryWelcomeState;
  /** Erste persönliche Story des Accounts (sonst: "neue" Story). */
  isFirstStory: boolean;
  onListen?: () => void;
  onDismiss?: () => void;
  onRetry?: () => void;
}

/** Hinweis im Dashboard nach dem Erststory-Flow: "Das ist deine erste Power Story". */
export default function FirstStoryWelcome({ state, isFirstStory, onListen, onDismiss, onRetry }: FirstStoryWelcomeProps) {
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

        {state === 'ready' && (
          <>
            <h2 id="dashboard-first-story-title">
              {isFirstStory ? 'Willkommen! Das ist deine erste Power Story.' : 'Deine neue Power Story ist da.'}
            </h2>
            <p>
              Dein Engel hat eine persönliche Geschichte für dich – gesprochen von Kerstin.
              Nimm dir ein paar ruhige Minuten, setz am besten Kopfhörer auf und hör einfach zu.
            </p>
            <div className="dashboard-first-story-actions">
              <button type="button" className="dashboard-primary-button" onClick={onListen}>
                <Headphones className="w-5 h-5" aria-hidden="true" />
                Jetzt anhören
              </button>
            </div>
          </>
        )}
      </div>

      {state === 'ready' && onDismiss && (
        <button type="button" className="dashboard-first-story-close" onClick={onDismiss} aria-label="Hinweis schließen">
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}
