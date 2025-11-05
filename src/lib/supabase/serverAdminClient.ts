import { createClient } from '@supabase/supabase-js'
import {Database} from "@/lib/types/database.types";

export async function createServerAdminClient() {
    // Fallback für lokale Entwicklung
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wfnvjmockhcualjgymyl.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PRIVATE_SUPABASE_SERVICE_KEY;

    if (!serviceRoleKey) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
    }

    // Verwende createClient für Service Role Key (umgeht RLS)
    return createClient<Database>(
        supabaseUrl,
        serviceRoleKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    )
}