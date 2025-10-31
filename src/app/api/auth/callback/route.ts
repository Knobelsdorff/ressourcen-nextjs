import { createSSRClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { searchParams, origin, hash } = url
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  const next = searchParams.get('next') ?? '/dashboard?confirmed=true'
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
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(error)}`)
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
        
        if (isLocal) {
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
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent(exchangeError?.message || 'exchange_failed')}`)
      }
    } catch (err) {
      console.error('Auth callback error:', err)
      return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('unexpected_error')}`)
    }
  } else {
    // Wenn kein Code vorhanden ist, aber wir auf localhost sind, leite trotzdem weiter
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1')
    if (isLocalhost) {
      console.log('No code but localhost detected, redirecting anyway')
      // Für localhost ohne Code, leite direkt zum Dashboard weiter
      return NextResponse.redirect(`${origin}/dashboard?confirmed=true`)
    }
  }

  // return the user to an error page with instructions
  console.log('Auth failed, redirecting to error page - no code found')
  return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${encodeURIComponent('no_code')}`)
}