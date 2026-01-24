import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    // Get subscription info from database
    const { data: userAccess, error: dbError } = await supabase
      .from('user_access')
      .select('stripe_subscription_id, stripe_customer_id, subscription_status, status, access_starts_at, plan_type')
      .eq('user_id', userId)
      .maybeSingle()

    if (dbError) {
      console.error('[subscription/details] Database error:', dbError)
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
    }

    if (!userAccess || !userAccess.stripe_subscription_id) {
      return NextResponse.json({
        hasSubscription: false,
        message: 'No active subscription found'
      })
    }

    // Fetch detailed subscription info from Stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    try {
      const subscription :any = await stripe.subscriptions.retrieve(
        userAccess.stripe_subscription_id,
        { expand: ['default_payment_method', 'latest_invoice'] }
      )

      // Extract payment method details
      let paymentMethod = null
      if (subscription.default_payment_method && typeof subscription.default_payment_method === 'object') {
        const pm = subscription.default_payment_method as Stripe.PaymentMethod
        paymentMethod = {
          type: pm.type,
          last4: pm.type === 'card' && pm.card ? pm.card.last4 : null,
          brand: pm.type === 'card' && pm.card ? pm.card.brand : null,
          sepa_last4: pm.type === 'sepa_debit' && pm.sepa_debit ? pm.sepa_debit.last4 : null,
        }
      }

      // Get price information
      const priceAmount = subscription.items.data[0]?.price?.unit_amount || 0
      const priceCurrency = subscription.items.data[0]?.price?.currency || 'eur'

      // Format dates
      const nextBillingDate = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : null

      const startDate = subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : null

      const cancelAtDate = subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : null

      const canceledAtDate = subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          })
        : null

      return NextResponse.json({
        hasSubscription: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          currentPeriodStart: subscription.current_period_start,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          cancelAt: subscription.cancel_at,
          canceledAt: subscription.canceled_at,
          paymentMethod,
          priceAmount: priceAmount / 100,
          priceCurrency,
          createdAt: subscription.created,
        },
        formatted: {
          nextBillingDate,
          startDate,
          cancelAtDate,
          canceledAtDate,
          amount: `${(priceAmount / 100).toFixed(2)} €`,
        },
        databaseInfo: {
          planType: userAccess.plan_type,
          status: userAccess.status,
          subscriptionStatus: userAccess.subscription_status,
          accessStartsAt: userAccess.access_starts_at,
        },
      })
    } catch (stripeError: any) {
      console.error('[subscription/details] Stripe error:', stripeError)

      // Return database info as fallback
      return NextResponse.json({
        hasSubscription: true,
        subscription: null,
        stripeError: 'Failed to fetch details from Stripe',
        databaseInfo: {
          planType: userAccess.plan_type,
          status: userAccess.status,
          subscriptionStatus: userAccess.subscription_status,
          accessStartsAt: userAccess.access_starts_at,
        },
      })
    }
  } catch (error: any) {
    console.error('[subscription/details] Unexpected error:', error)
    return NextResponse.json({
      error: error.message || 'An unexpected error occurred'
    }, { status: 500 })
  }
}
