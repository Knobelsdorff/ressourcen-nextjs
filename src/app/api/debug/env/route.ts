import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY_SET: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET_SET: !!process.env.STRIPE_WEBHOOK_SECRET,
  })
}

