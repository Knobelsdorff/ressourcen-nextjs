import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/lib/types/database.types';
import { createServerAdminClient } from '@/lib/supabase/serverAdminClient';

export async function POST(request: NextRequest) {
  console.log('[API/account/delete] POST request received');

  try {
    // 1️⃣ Create server client to identify current user
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
          },
        },
      }
    );

    // 2️⃣ Check authentication (same as music delete)
    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('[API/account/delete] Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log('[API/account/delete] Deleting account for user:', userId);

    // 3️⃣ Admin client (bypass RLS + auth admin)
    const adminSupabase = await createServerAdminClient();

    // 4️⃣ Delete user-owned data (adapt to YOUR schema)
    await adminSupabase.from('profiles').delete().eq('id', userId);
    // await adminSupabase.from('user_access').delete().eq('user_id', userId);
    // await adminSupabase.from('stories').delete().eq('user_id', userId);

    // (Add other tables here if needed)

    // 5️⃣ Delete auth account (THIS is the actual account deletion)
    await adminSupabase.auth.admin.deleteUser(userId);

    console.log('[API/account/delete] Account deleted successfully');

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[API/account/delete] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
