import { createServerClient } from '@supabase/ssr'
import {Database} from "@/lib/types/database.types";

export async function createServerAdminClient() {
    // Fallback für lokale Entwicklung
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wfnvjmockhcualjgymyl.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PRIVATE_SUPABASE_SERVICE_KEY;

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    return createServerClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
            cookies: {
                getAll: () => [],
                setAll: () => {},
            },
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
            db: {
                schema: 'public'
            },
        }
    )
}