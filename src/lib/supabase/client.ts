import {createBrowserClient} from '@supabase/ssr'
import {Database} from "@/lib/types/database.types";

// Singleton pattern to avoid multiple client instances
let supabaseClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSPAClient() {
    if (!supabaseClient) {
        supabaseClient = createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
    }
    return supabaseClient;
}
