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
    const requestUrl = new URL(request.url)
    const origin = process.env.APP_BASE_URL ?? requestUrl.origin
    
    console.log('Customer Portal API: Request details', {
      origin,
      requestUrl: requestUrl.toString(),
      hasAppBaseUrl: !!process.env.APP_BASE_URL,
    })

    // Hole Stripe Customer ID aus Supabase
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
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('user_id', userId)
      .not('stripe_subscription_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let subscriptionId: string | null = null
    let customerId: string | null = null

    if (userAccess?.stripe_subscription_id) {
      // Subscription-ID in DB gefunden
      subscriptionId = userAccess.stripe_subscription_id
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        customerId = subscription.customer as string
        console.log('Customer Portal API: Found subscription in database:', subscriptionId)
      }
    } else {
      // Subscription-ID nicht in DB - suche direkt in Stripe
      console.log('Customer Portal API: No subscription in database, searching in Stripe...')
      
      if (userEmail) {
        // Suche nach Customer mit dieser Email
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
              customerId = customer.id
              console.log('Customer Portal API: Found subscription in Stripe:', {
                subscriptionId,
                customerId,
                status: latestSubscription.status,
              })
              break
            }
          }
        }
      }
    }

    if (!subscriptionId || !customerId) {
      console.error('Customer Portal API: No subscription found for user:', userId, {
        hasUserAccess: !!userAccess,
        hasEmail: !!userEmail,
      })
      return NextResponse.json({ 
        error: 'Kein Abo gefunden. Bitte erstelle zuerst ein Abo.' 
      }, { status: 404 })
    }

    console.log('Customer Portal API: Creating portal session for customer:', customerId)
    console.log('Customer Portal API: Return URL will be:', `${origin}/dashboard?tab=profile`)

    // Erstelle Customer Portal Session
    // Optional: Falls du eine spezifische Business Profile Configuration verwenden möchtest,
    // füge 'configuration' hinzu: configuration: 'bpc_1STSOzRaXC7JrsWo3lskpmTL'
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard?tab=profile`,
      // Optional: Spezifische Konfiguration verwenden (falls mehrere Business Profiles vorhanden)
      // configuration: process.env.STRIPE_CUSTOMER_PORTAL_CONFIG_ID || undefined,
    })

    console.log('Customer Portal API: Portal session created successfully:', {
      sessionId: portalSession.id,
      url: portalSession.url,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (e: any) {
    console.error('Customer Portal API error', {
      message: e?.message,
      type: e?.type,
      code: e?.code,
      stack: e?.stack,
    })
    return NextResponse.json({ error: e.message ?? 'Unknown error' }, { status: 400 })
  }
}

