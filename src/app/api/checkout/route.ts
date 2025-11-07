import Stripe from 'stripe'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const PLAN_CONFIG = {
  standard: {
    price: 4900, // Early Adopter: 49€ (später 99€)
    productName: 'Ressourcen-App: Standard 3-Monats-Paket (Early Adopter)',
    description: '3 Ressourcen, 3 Monate Zugang - Early Adopter Preis (50% Rabatt)',
    resourcesLimit: '3',
    originalPrice: 9900, // Späterer Preis für Grandfathering
  },
  premium: {
    price: 7900, // Early Adopter: 79€ (später 149€)
    productName: 'Ressourcen-App: Premium 3-Monats-Paket (Early Adopter)',
    description: '5 Ressourcen, 6 Monate Zugang, Exklusive Features - Early Adopter Preis (47% Rabatt)',
    resourcesLimit: '5', // Premium: Mehr Ressourcen
    originalPrice: 14900, // Späterer Preis für Grandfathering
  },
} as const

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const priceId = body?.priceId as string | undefined
    const planType = (body?.planType as 'standard' | 'premium' | undefined) ?? 'standard'
    const userId = body?.userId as string | undefined
    const mode = (body?.mode as 'subscription' | 'payment' | undefined) ?? 'subscription'

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const origin = process.env.APP_BASE_URL ?? new URL(request.url).origin

    // Variante 1: Price-ID wurde explizit übergeben
    if (priceId) {
      console.log('Checkout API: Creating session using priceId', { priceId, mode })

      const session = await stripe.checkout.sessions.create({
        mode,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel`,
      })

      return NextResponse.json({ id: session.id, url: session.url })
    }

    // Variante 2: Fallback über planType (bestehende Frontend-Logik)
    const planConfig = PLAN_CONFIG[planType]

    if (!planConfig) {
      return NextResponse.json({ error: `Invalid plan type: ${planType}` }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required when using planType' }, { status: 400 })
    }

    console.log('Checkout API: Creating session using planType fallback', { userId, planType })

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: planConfig.productName,
              description: planConfig.description,
            },
            unit_amount: planConfig.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
      client_reference_id: userId,
      metadata: {
        userId,
        planType,
        resourcesLimit: planConfig.resourcesLimit,
        originalPrice: planConfig.originalPrice.toString(), // Für Grandfathering
        isEarlyAdopter: 'true', // Markiere als Early Adopter
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
