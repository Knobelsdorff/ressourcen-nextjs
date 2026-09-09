# Stripe Checkout Session Code Snippet

## Complete Checkout Session Creation Code

```typescript
import Stripe from 'stripe'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const priceId = body?.priceId as string | undefined
    const planType = (body?.planType as 'subscription' | undefined) ?? 'subscription'
    const userId = body?.userId as string | undefined

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    
    // Determine origin: For localhost use Request URL, otherwise APP_BASE_URL
    const requestUrl = new URL(request.url)
    const isLocalhost = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1'
    const origin = isLocalhost 
      ? `${requestUrl.protocol}//${requestUrl.host}` // localhost:3000
      : (process.env.APP_BASE_URL || 'https://www.power-storys.de') // Production

    // Use Price ID from parameter or Environment Variable
    const subscriptionPriceId = priceId || process.env.STRIPE_SUBSCRIPTION_PRICE_ID

    if (!subscriptionPriceId) {
      console.error('Checkout API: No subscription price ID found.')
      return NextResponse.json({ 
        error: 'Subscription price ID not configured.' 
      }, { status: 500 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // DEBUG: Check Price configuration
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
    
    // CURRENT CONFIGURATION: payment_method_types removed - Stripe uses all enabled methods dynamically
    // This works for Klarna, Card, SEPA - but NOT PayPal
    const session = await stripe.checkout.sessions.create({
      // payment_method_types removed - Stripe selects all enabled methods dynamically
      payment_method_collection: 'always',
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
      paymentMethodTypes: session.payment_method_types, // Stripe-selected methods
      paymentMethodCollection: session.payment_method_collection,
      url: session.url,
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
```

## Key Parameters Being Used

```typescript
{
  // payment_method_types: NOT SET (removed for dynamic selection)
  payment_method_collection: 'always',
  line_items: [{ price: subscriptionPriceId, quantity: 1 }],
  mode: 'subscription',
  success_url: `${origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/dashboard?payment=cancelled`,
  client_reference_id: userId,
  metadata: {
    userId,
    planType: 'subscription',
  },
}
```

## What We've Tried

1. **With explicit `payment_method_types`**: `['paypal', 'card', 'sepa_debit']` - PayPal in response but not displayed
2. **Without `payment_method_options`**: PayPal still not displayed
3. **Without `payment_method_types`** (current): Klarna works, PayPal doesn't

## Current Behavior

- ✅ Klarna: Displayed
- ✅ Card: Displayed
- ✅ SEPA: Displayed
- ❌ PayPal: Not displayed (even though enabled in Dashboard and works in Payment Links)

## Environment Variables Used

- `STRIPE_SECRET_KEY`: Live secret key
- `STRIPE_SUBSCRIPTION_PRICE_ID`: `price_1STTTwRbChVRWy02O656rWmA`
- `APP_BASE_URL`: `https://www.power-storys.de` (for production)

## Price Details

- Price ID: `price_1STTTwRbChVRWy02O656rWmA`
- Amount: 15.00 EUR (1500 cents)
- Currency: EUR
- Type: Recurring (subscription)
- Interval: Monthly
