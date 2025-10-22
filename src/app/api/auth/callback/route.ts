import { createSSRClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard?confirmed=true'

  console.log('Auth callback:', { code: !!code, next, origin })

  if (code) {
    try {
      const supabase = await createSSRClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      console.log('Auth exchange result:', { error: error?.message })
      
      if (!error) {
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        let redirectUrl: string
        if (isLocalEnv) {
          redirectUrl = `${origin}${next}`
        } else if (forwardedHost) {
          redirectUrl = `https://${forwardedHost}${next}`
        } else {
          redirectUrl = `${origin}${next}`
        }
        
        console.log('Redirecting to:', redirectUrl)
        return NextResponse.redirect(redirectUrl)
      } else {
        console.error('Auth exchange error:', error)
      }
    } catch (err) {
      console.error('Auth callback error:', err)
    }
  }

  // return the user to an error page with instructions
  console.log('Auth failed, redirecting to error page')
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}