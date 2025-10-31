import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

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
    
    // Dashboard ohne Authentifizierung erlauben
    if (request.nextUrl.pathname === '/dashboard') {
        return
    }
    
    return await updateSession(request)
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}