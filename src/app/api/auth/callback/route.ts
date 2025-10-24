import { createSSRClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard?confirmed=true'
  const isLocal = searchParams.get('local') === 'true'

  console.log('Auth callback:', { code: !!code, next, origin, isLocal })

  if (code) {
    try {
      const supabase = await createSSRClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      console.log('Auth exchange result:', { error: error?.message })
      
      if (!error) {
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
          } else {
            redirectUrl = `${origin}${next}`
          }
        }
        
        console.log('Final redirect to:', redirectUrl)
        return NextResponse.redirect(redirectUrl)
      } else {
        console.error('Auth exchange error:', error)
      }
    } catch (err) {
      console.error('Auth callback error:', err)
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
  console.log('Auth failed, redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}