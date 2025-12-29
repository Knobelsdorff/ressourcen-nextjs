import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    // Domain-Weiterleitung: ressourcen.app -> www.ressourcen.app
    const hostname = request.headers.get('host') || ''
    const url = request.nextUrl

    // Prüfe, ob die Anfrage ohne "www." kommt (nur ressourcen.app)
    // Beachte: Dies funktioniert nur, wenn beide Domains DNS-konfiguriert sind
    if (hostname === 'ressourcen.app') {
        // Weiterleitung zu www.ressourcen.app (immer HTTPS in Produktion)
        const redirectUrl = `https://www.ressourcen.app${url.pathname}${url.search}${url.hash}`
        return NextResponse.redirect(redirectUrl, 301) // 301 = Permanent Redirect
    }

    // Stelle sicher, dass die Supabase-Session für alle Routen aktualisiert wird,
    // damit Auth-Cookies korrekt gesetzt werden und API-Routen den User erkennen.
    const response = await updateSession(request)

    // Check if user needs to set password (only for protected routes)
    const protectedPaths = ['/dashboard', '/admin']
    const isProtectedPath = protectedPaths.some(path => url.pathname.startsWith(path))
    const isSetPasswordPage = url.pathname === '/auth/set-password'

    if (isProtectedPath && !isSetPasswordPage) {
        // Create Supabase client to check user session
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value }) =>
                            request.cookies.set(name, value)
                        )
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

        const { data: { user } } = await supabase.auth.getUser()

        // If user is logged in but hasn't set password, redirect to set-password
        // ONLY redirect if password_set is explicitly false (not undefined/null for existing users)
        if (user && user.user_metadata?.password_set === false) {
            console.log('[Middleware] User needs to set password, redirecting to /auth/set-password')
            const setPasswordUrl = new URL('/auth/set-password', request.url)
            // Preserve any query parameters (like resource ID)
            if (url.searchParams.toString()) {
                setPasswordUrl.search = url.searchParams.toString()
            }
            return NextResponse.redirect(setPasswordUrl)
        }
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}