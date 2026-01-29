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
  const origin = process.env.APP_BASE_URL;

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

    const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [
      'card',        // Kredit-/Debitkarten (universell, sofort)
      'sepa_debit',  // SEPA Lastschrift (günstig, perfekt für Subscriptions)
      'paypal',      // PayPal (sehr beliebt in DE, funktioniert gut für Abos)
    ]

    console.log('Checkout API: Creating subscription session', { 
      userId, 
      planType,
      priceId: subscriptionPriceId,
      source: priceId ? 'parameter' : 'environment',
      paymentMethodTypes,
      mode: 'subscription'
    })

    // Verwende Price-ID direkt (empfohlen für Production)
    // payment_method_types erzwingt explizit die angegebenen Methoden
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      payment_method_options: {
        sepa_debit: {
          // SEPA Direct Debit für Subscriptions
        },
      },
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

    console.log('Checkout API: Session created successfully', {
      sessionId: session.id,
      paymentMethodTypes: session.payment_method_types,
      url: session.url,
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
