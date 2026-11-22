import { Loader2 } from 'lucide-react';
import AngelIconFinal from '@/components/AngelIconFinal';
import { T } from "@/components/site-text/T";
import { dashboard } from "@/content/texts/dashboard";

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
        <span className="dashboard-eyebrow"><span /> <T t={isFirstStory ? dashboard["firstStory.eyebrowFirst"] : dashboard["firstStory.eyebrowNew"]} /></span>

        {preparing && (
          <>
            <h2 id="dashboard-first-story-title"><T t={dashboard["firstStory.preparingTitle"]} /></h2>
            <p>
              <T t={state === 'preparing-audio' ? dashboard["firstStory.preparingAudio"] : dashboard["firstStory.preparingText"]} />{' '}
              <T t={dashboard["firstStory.duration"]} />
            </p>
            <div className="dashboard-first-story-status" role="status">
              <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <T t={state === 'preparing-audio' ? dashboard["firstStory.statusAudio"] : dashboard["firstStory.statusText"]} />
            </div>
          </>
        )}

        {state === 'failed' && (
          <>
            <h2 id="dashboard-first-story-title"><T t={dashboard["firstStory.failedTitle"]} /></h2>
            <p><T t={dashboard["firstStory.failedText"]} /></p>
            <div className="dashboard-first-story-actions">
              <button type="button" className="dashboard-primary-button" onClick={onRetry}><T t={dashboard["firstStory.retry"]} /></button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
