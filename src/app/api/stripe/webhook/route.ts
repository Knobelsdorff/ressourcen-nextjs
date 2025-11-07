import Stripe from 'stripe'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase Client für Webhook-Verarbeitung
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  console.log('[stripe/webhook] Request received')
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[stripe/webhook] STRIPE_SECRET_KEY not configured')
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const headerList = await headers()
  const sig = headerList.get('stripe-signature')

  if (!sig) {
    console.error('[stripe/webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log('[stripe/webhook] STRIPE EVENT RECEIVED', event.type)
  } catch (err: any) {
    console.error('[stripe/webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('[stripe/webhook] HANDLING', event.type)
        const session = event.data.object as Stripe.Checkout.Session
        console.log('[stripe/webhook] SESSION COMPLETED', {
          sessionId: session.id,
          customerEmail: session.customer_email,
          customerId: session.customer,
          clientReferenceId: session.client_reference_id,
          metadata: session.metadata,
          paymentIntent: session.payment_intent,
        })

        // Hole userId aus Metadata oder client_reference_id
        const userId = session.metadata?.userId || session.client_reference_id

        if (!userId) {
          console.error('[stripe/webhook] No userId found in session metadata or client_reference_id')
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }

        // Hole planType aus Metadata (Standard: 'standard')
        const planType = session.metadata?.planType || 'standard'
        console.log('[stripe/webhook] Creating access for user:', userId, 'planType:', planType)

        // Erstelle/aktualisiere Zugang in Supabase
        const { data, error } = await supabase.rpc('create_access_after_payment', {
          user_uuid: userId,
          payment_intent_id: session.payment_intent as string,
          checkout_session_id: session.id,
          plan_type: planType,
        })

        if (error) {
          console.error('[stripe/webhook] Error creating access:', error)
          return NextResponse.json({ error: 'Failed to create access' }, { status: 500 })
        }

        console.log('[stripe/webhook] Access created successfully for user', userId, { accessId: data })
        break

      case 'customer.subscription.updated':
        console.log('[stripe/webhook] HANDLING', event.type)
        // Abo aktualisiert
        break

      case 'customer.subscription.deleted':
        console.log('[stripe/webhook] HANDLING', event.type)
        // Abo beendet
        break

      default:
        console.log('[stripe/webhook] Unhandled event type:', event.type)
        break
    }
    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('[stripe/webhook] Error processing webhook:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

