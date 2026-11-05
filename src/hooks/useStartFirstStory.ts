import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FIRST_STORY_URL = "/create-story?first=true";

/**
 * Für die CTAs der Landingpage: Eingeloggte landen im Dashboard, alle anderen
 * im Erststory-Flow.
 *
 * Absichtlich am CTA und nicht als Redirect auf /create-story?first=true: Der
 * E-Mail-Link bringt frisch Eingeloggte genau dorthin zurück
 * (api/auth/callback), damit ihre Erststory fertig wird.
 *
 * Die Session wird erst beim Klick gelesen, weil useAuth() während des Ladens
 * noch keinen User meldet – ein schneller Klick ginge sonst in den Flow.
 */
export function useStartFirstStory() {
  const router = useRouter();

  return useCallback(
    async (event?: { preventDefault(): void }) => {
      event?.preventDefault();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      router.push(session ? "/dashboard" : FIRST_STORY_URL);
    },
    [router],
  );
}
