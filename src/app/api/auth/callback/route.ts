import { createSSRClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams, origin, hash } = url
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/dashboard?confirmed=true'
  const firstStoryAuth = next === '/create-story?first=true'
  const forwardedHost = request.headers.get('x-forwarded-host')
  const requestHost = forwardedHost ?? request.headers.get('host')
  const localRequest = requestHost && /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestHost)
  const publicForwardedHost = forwardedHost && /^[a-z0-9.-]+(:\d+)?$/i.test(forwardedHost)
  const firstStoryOrigin = localRequest
    ? `http://${requestHost}`
    : publicForwardedHost
      ? `${request.headers.get('x-forwarded-proto') === 'http' ? 'http' : 'https'}://${forwardedHost}`
      : origin
  const firstStoryErrorUrl = `${firstStoryOrigin}/create-story?first=true&linkError=1`
  const isLocal = searchParams.get('local') === 'true'

  console.log('Auth callback:', { 
    code: !!code, 
    codeLength: code?.length,
    error,
    errorDescription,
    next, 
    origin, 
    isLocal,
    fullUrl: request.url.substring(0, 200) // Erste 200 Zeichen der URL für Debugging
  })

  // Prüfe auf Fehler in URL-Parametern
  if (error) {
    console.error('Auth error in URL:', { error, errorDescription })
    return NextResponse.redirect(firstStoryAuth ? firstStoryErrorUrl : `${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    try {
      const supabase = await createSSRClient()
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      console.log('Auth exchange result:', { 
        error: exchangeError?.message, 
        errorCode: exchangeError?.status,
        hasSession: !!data?.session,
        hasUser: !!data?.user
      })
      
      if (!exchangeError && data?.session) {
        let redirectUrl: string
        
        if (firstStoryAuth) {
          redirectUrl = `${firstStoryOrigin}${next}`
        } else if (isLocal) {
          // Wenn local=true, leite zu localhost weiter
          redirectUrl = `http://localhost:3000${next}`
          console.log('Local redirect to:', redirectUrl)
        } else {
          // Normale Produktions-Logik
          const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')
          const forwardedHost = request.headers.get('x-forwarded-host')
          
          if (isLocalhost) {
            // Für localhost, verwende immer Port 3000
            redirectUrl = `http://localhost:3000${next}`
            console.log('Localhost redirect to:', redirectUrl)
          } else if (forwardedHost) {
            redirectUrl = `https://${forwardedHost}${next}`
            console.log('Forwarded host redirect to:', redirectUrl)
          } else {
            redirectUrl = `${origin}${next}`
            console.log('Origin redirect to:', redirectUrl)
          }
        }
        
        console.log('Final redirect to:', redirectUrl)
        return NextResponse.redirect(redirectUrl)
      } else {
        console.error('Auth exchange error:', exchangeError)
        return NextResponse.redirect(firstStoryAuth ? firstStoryErrorUrl : `${origin}/auth/auth-code-error?error=${encodeURIComponent(exchangeError?.message || 'exchange_failed')}`)
      }
    } catch (err) {
      console.error('Auth callback error:', err)
      return NextResponse.redirect(firstStoryAuth ? firstStoryErrorUrl : `${origin}/auth/auth-code-error?error=${encodeURIComponent('unexpected_error')}`)
    }
  } else {
    // Wenn kein Code vorhanden ist: nicht fälschlich Fehler anzeigen.
    // Einige Provider/Supabase-Flows liefern Tokens im Hash (#) und sind serverseitig nicht sichtbar.
    // Leite in diesem Fall neutral zum Dashboard mit Marker weiter.
    console.log('No code present in callback; redirecting to dashboard as confirmed=true')
    return NextResponse.redirect(firstStoryAuth ? firstStoryErrorUrl : `${origin}/dashboard?confirmed=true`)
  }
}
