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
    const origin = process.env.APP_BASE_URL ?? new URL(request.url).origin

    // Hole Stripe Customer ID aus Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: userAccess, error: accessError } = await supabase
      .from('user_access')
      .select('stripe_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (accessError || !userAccess?.stripe_subscription_id) {
      console.error('Customer Portal API: No active subscription found for user:', userId)
      return NextResponse.json({ 
        error: 'Kein aktives Abo gefunden. Bitte erstelle zuerst ein Abo.' 
      }, { status: 404 })
    }

    // Hole Subscription von Stripe, um Customer ID zu bekommen
    const subscription = await stripe.subscriptions.retrieve(userAccess.stripe_subscription_id)
    const customerId = subscription.customer as string

    if (!customerId) {
      console.error('Customer Portal API: No customer ID found in subscription')
      return NextResponse.json({ 
        error: 'Fehler beim Laden der Abo-Informationen.' 
      }, { status: 500 })
    }

    console.log('Customer Portal API: Creating portal session for customer:', customerId)

    // Erstelle Customer Portal Session
    // Optional: Falls du eine spezifische Business Profile Configuration verwenden möchtest,
    // füge 'configuration' hinzu: configuration: 'bpc_1STSOzRaXC7JrsWo3lskpmTL'
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard?tab=profile`,
      // Optional: Spezifische Konfiguration verwenden (falls mehrere Business Profiles vorhanden)
      // configuration: process.env.STRIPE_CUSTOMER_PORTAL_CONFIG_ID || undefined,
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

