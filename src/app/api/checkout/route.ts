import Stripe from 'stripe'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PLAN_CONFIG = {
  'subscription': {
    price: 3900, // 39€ für monatliches Abo
    productName: 'Ressourcen-App: Monatliches Abo',
    description: 'Unbegrenzte Ressourcen, monatlich kündbar',
    mode: 'subscription' as const,
  },
} as const

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const priceId = body?.priceId as string | undefined
    const planType = (body?.planType as 'subscription' | undefined) ?? 'subscription'
    const userId = body?.userId as string | undefined
    const mode = 'subscription' as const // Immer Subscription-Modus für Abo

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = process.env.APP_BASE_URL ?? new URL(request.url).origin

    // Verwende Price-ID aus Parameter oder Environment Variable
    const subscriptionPriceId = priceId || process.env.STRIPE_SUBSCRIPTION_PRICE_ID

    if (!subscriptionPriceId) {
      console.error('Checkout API: No subscription price ID found. Please set STRIPE_SUBSCRIPTION_PRICE_ID in environment variables.')
      return NextResponse.json({ 
        error: 'Subscription price ID not configured. Please contact support.' 
      }, { status: 500 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('Checkout API: Creating subscription session with priceId', { 
      userId, 
      planType,
      priceId: subscriptionPriceId,
      source: priceId ? 'parameter' : 'environment'
    })

    // Verwende Price-ID direkt (empfohlen für Production)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: subscriptionPriceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
      client_reference_id: userId,
      metadata: {
        userId,
        planType: 'subscription',
      },
    })

    return NextResponse.json({ sessionId: session.id, url: session.url })
  } catch (e: any) {
    console.error('Checkout API error', {
      message: e?.message,
      type: e?.type,
      code: e?.code,
      stack: e?.stack,
    })
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status: 400 })
  }
}
