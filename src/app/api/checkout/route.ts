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
    
    // Bestimme origin: Für localhost verwende Request-URL, sonst APP_BASE_URL
    const requestUrl = new URL(request.url)
    const isLocalhost = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1'
    const origin = isLocalhost 
      ? `${requestUrl.protocol}//${requestUrl.host}` // localhost:3000
      : (process.env.APP_BASE_URL || 'https://www.power-storys.de') // Production

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
      'paypal',      // PayPal (sehr beliebt in DE, funktioniert gut für Abos) - ZUERST für bessere Sichtbarkeit
      'card',        // Kredit-/Debitkarten (universell, sofort)
      'sepa_debit',  // SEPA Lastschrift (günstig, perfekt für Subscriptions)
    ]

    console.log('Checkout API: Creating subscription session', { 
      userId, 
      planType,
      priceId: subscriptionPriceId,
      source: priceId ? 'parameter' : 'environment',
      paymentMethodTypes,
      mode: 'subscription',
      origin,
      success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?payment=cancelled`,
    })

    // Verwende Price-ID direkt (empfohlen für Production)
    // payment_method_types erzwingt explizit die angegebenen Methoden
    // WICHTIG: payment_method_options nur für SEPA setzen, PayPal-Optionen weglassen
    // (PayPal funktioniert besser ohne explizite Optionen, ähnlich wie Payment Links)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: paymentMethodTypes,
      payment_method_collection: 'always', // WICHTIG: Erzwingt Payment Method Collection für Subscriptions (benötigt für PayPal)
      payment_method_options: {
        sepa_debit: {
          // SEPA Direct Debit für Subscriptions
        },
        // PayPal-Optionen weglassen - Stripe verwendet Standard-Konfiguration
        // Dies entspricht dem Verhalten von Payment Links
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
      paymentMethodCollection: session.payment_method_collection,
      url: session.url,
      // Debug: Prüfe ob PayPal gefiltert wurde
      requestedPaymentMethods: paymentMethodTypes,
      actualPaymentMethods: session.payment_method_types,
      paypalIncluded: session.payment_method_types?.includes('paypal'),
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
