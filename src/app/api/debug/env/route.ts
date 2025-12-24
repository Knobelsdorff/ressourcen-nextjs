import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cwd = process.cwd()
  const manifestPath = path.join(cwd, '.next', 'server', 'app-paths-manifest.json')

  let routeDebug:
    | {
        manifestPath: string
        routeCount: number
        hasLanding: boolean
        hasLandingpage: boolean
        sample: string[]
      }
    | { manifestPath: string; error: string }

  try {
    const raw = await fs.readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(raw) as Record<string, string>
    const routes = Object.keys(manifest).sort()
    routeDebug = {
      manifestPath,
      routeCount: routes.length,
      hasLanding: routes.includes('/landing'),
      hasLandingpage: routes.includes('/landingpage'),
      sample: routes.filter((r) => r.startsWith('/land')),
    }
  } catch (e: any) {
    routeDebug = {
      manifestPath,
      error: e?.message || 'Failed to read app-paths-manifest.json',
    }
  }

  return NextResponse.json({
    BUILD_MARKER: 'landing-visual-editor-enabled',
    CWD: cwd,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY_SET: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET_SET: !!process.env.STRIPE_WEBHOOK_SECRET,
    ROUTES_DEBUG: routeDebug,
  })
}

