import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createSSRClient } from '@/lib/supabase/server'

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
    const planType = (body?.planType as 'subscription' | undefined) ?? 'subscription'
    const mode = 'subscription' as const // Immer Subscription-Modus für Abo

    // Der Account kommt aus der Session, nicht aus dem Request-Body – sonst
    // ließe sich ein Abo auf einen fremden Account abschließen.
    const authClient = await createSSRClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Bitte melde dich zuerst an.' }, { status: 401 })
    }
    if (body?.userId && body.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const userId = user.id

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    
    // Bestimme origin: Für localhost verwende Request-URL, sonst APP_BASE_URL
    const requestUrl = new URL(request.url)
    const isLocalhost = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1'
    const origin = isLocalhost 
      ? `${requestUrl.protocol}//${requestUrl.host}` // localhost:3000
      : (process.env.APP_BASE_URL || 'https://www.power-storys.de') // Production

    // Preis nur aus der Konfiguration – nie aus dem Request.
    const subscriptionPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID

    if (!subscriptionPriceId) {
      console.error('Checkout API: No subscription price ID found. Please set STRIPE_SUBSCRIPTION_PRICE_ID in environment variables.')
      return NextResponse.json({ 
        error: 'Subscription price ID not configured. Please contact support.' 
      }, { status: 500 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // TEST: payment_method_types komplett weglassen (Support-Empfehlung)
    // Support sagt: Wenn payment_method_types weggelassen wird, wählt Stripe alle aktivierten Methoden dynamisch aus
    // Dies entspricht dem Verhalten von Payment Links
    // const paymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] = [
    //   'paypal',      // PayPal (sehr beliebt in DE, funktioniert gut für Abos)
    //   'card',        // Kredit-/Debitkarten (universell, sofort)
    //   'sepa_debit',  // SEPA Lastschrift (günstig, perfekt für Subscriptions)
    //   // 'klarna',   // Klarna (Buy Now Pay Later) - Aktiviert, aber wird nicht im Checkout angezeigt (siehe Support-Ticket)
    // ]

    console.log('Checkout API: Creating subscription session', { 
      userId, 
      planType,
      priceId: subscriptionPriceId,
      paymentMethodTypes: 'DYNAMIC (not set - Stripe will use all enabled methods)',
      mode: 'subscription',
      origin,
      success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
    })

    // Verwende Price-ID direkt (empfohlen für Production)
    // payment_method_types weggelassen - Stripe verwendet alle aktivierten Methoden dynamisch
    
    // DEBUG: Prüfe Price-Konfiguration
    try {
      const price = await stripe.prices.retrieve(subscriptionPriceId)
      console.log('Checkout API: Price details', {
        priceId: price.id,
        currency: price.currency,
        type: price.type,
        recurring: price.recurring,
        active: price.active,
      })
    } catch (priceError) {
      console.error('Checkout API: Error retrieving price', priceError)
    }
    
    // TEST: payment_method_types komplett weggelassen (Support-Empfehlung)
    // Stripe wählt dann alle aktivierten Methoden dynamisch aus (wie Payment Links)
    const session = await stripe.checkout.sessions.create({
      // payment_method_types weggelassen - Stripe verwendet alle aktivierten Methoden
      payment_method_collection: 'always', // WICHTIG: Erzwingt Payment Method Collection für Subscriptions
      // payment_method_options komplett entfernt (Support-Empfehlung)
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
      paymentMethodTypes: session.payment_method_types, // Stripe-seitig ausgewählte Methoden
      paymentMethodCollection: session.payment_method_collection,
      url: session.url,
      // Debug: Prüfe welche Methoden Stripe dynamisch ausgewählt hat
      actualPaymentMethods: session.payment_method_types,
      paypalIncluded: session.payment_method_types?.includes('paypal'),
      klarnaIncluded: session.payment_method_types?.includes('klarna'),
      note: 'payment_method_types was not set - Stripe selected methods dynamically',
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
