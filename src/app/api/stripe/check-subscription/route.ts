import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const userId = body?.userId as string | undefined

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Hole User-Email für Stripe-Suche
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    const userEmail = userData?.user?.email

    // Versuche zuerst Subscription-ID aus Datenbank zu holen
    const { data: userAccess } = await supabase
      .from('user_access')
      .select('stripe_subscription_id, subscription_status, plan_type')
      .eq('user_id', userId)
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let subscriptionId: string | null = null
    let subscriptionStatus: string | null = null

    if (userAccess?.stripe_subscription_id) {
      // Subscription-ID in DB gefunden
      subscriptionId = userAccess.stripe_subscription_id
      subscriptionStatus = userAccess.subscription_status || null
      
      // Hole aktuelle Subscription von Stripe, um Status zu aktualisieren
      if (subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          subscriptionStatus = subscription.status
        } catch (error) {
          console.error('Error retrieving subscription from Stripe:', error)
        }
      }
    } else if (userEmail) {
      // Subscription-ID nicht in DB - suche direkt in Stripe
      const customers = await stripe.customers.list({
        email: userEmail,
        limit: 10,
      })

      if (customers.data.length > 0) {
        // Finde aktive Subscription für diesen Customer
        for (const customer of customers.data) {
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.id,
            status: 'all', // Suche auch nach canceled/past_due
            limit: 10,
          })

          if (subscriptions.data.length > 0) {
            // Verwende die neueste Subscription
            const latestSubscription = subscriptions.data.sort(
              (a, b) => b.created - a.created
            )[0]
            
            subscriptionId = latestSubscription.id
            subscriptionStatus = latestSubscription.status
            break
          }
        }
      }
    }

    return NextResponse.json({
      hasSubscription: !!subscriptionId,
      subscriptionId,
      subscriptionStatus,
      planType: subscriptionId ? 'subscription' : null,
    })
  } catch (e: any) {
    console.error('Check subscription API error', {
      message: e?.message,
      type: e?.type,
      code: e?.code,
    })
    return NextResponse.json({ 
      hasSubscription: false,
      error: e.message ?? 'Unknown error' 
    }, { status: 400 })
  }
}

