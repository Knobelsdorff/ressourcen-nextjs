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
          mode: session.mode,
          customerEmail: session.customer_email,
          customerId: session.customer,
          clientReferenceId: session.client_reference_id,
          metadata: session.metadata,
          subscription: session.subscription,
          paymentIntent: session.payment_intent,
        })

        // Hole userId aus Metadata oder client_reference_id
        const userId = session.metadata?.userId || session.client_reference_id

        if (!userId) {
          console.error('[stripe/webhook] No userId found in session metadata or client_reference_id')
          return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
        }

        // Prüfe ob es eine Subscription ist
        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = session.subscription as string
          console.log('[stripe/webhook] Creating subscription access for user:', userId, 'subscriptionId:', subscriptionId)

          // Erstelle Abo-Zugang
          const { data, error } = await supabase.rpc('create_subscription_access', {
            user_uuid: userId,
            subscription_id: subscriptionId,
            checkout_session_id: session.id,
          })

          if (error) {
            console.error('[stripe/webhook] Error creating subscription access:', error)
            return NextResponse.json({ error: 'Failed to create subscription access' }, { status: 500 })
          }

          console.log('[stripe/webhook] Subscription access created successfully for user', userId, { accessId: data })
        } else {
          console.log('[stripe/webhook] Session is not a subscription, skipping')
        }
        break

      case 'customer.subscription.created':
        console.log('[stripe/webhook] HANDLING', event.type)
        const createdSubscription = event.data.object as Stripe.Subscription
        console.log('[stripe/webhook] SUBSCRIPTION CREATED', {
          subscriptionId: createdSubscription.id,
          customerId: createdSubscription.customer,
          status: createdSubscription.status,
        })
        // Subscription wird bereits bei checkout.session.completed erstellt
        break

      case 'customer.subscription.updated':
        console.log('[stripe/webhook] HANDLING', event.type)
        const updatedSubscription = event.data.object as Stripe.Subscription
        console.log('[stripe/webhook] SUBSCRIPTION UPDATED', {
          subscriptionId: updatedSubscription.id,
          status: updatedSubscription.status,
          cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
        })

        // Aktualisiere Subscription-Status in Datenbank
        const { error: updateError } = await supabase
          .from('user_access')
          .update({
            subscription_status: updatedSubscription.status,
            status: updatedSubscription.status === 'active' ? 'active' : 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', updatedSubscription.id)

        if (updateError) {
          console.error('[stripe/webhook] Error updating subscription status:', updateError)
        } else {
          console.log('[stripe/webhook] Subscription status updated successfully')
        }
        break

      case 'customer.subscription.deleted':
        console.log('[stripe/webhook] HANDLING', event.type)
        const deletedSubscription = event.data.object as Stripe.Subscription
        console.log('[stripe/webhook] SUBSCRIPTION DELETED', {
          subscriptionId: deletedSubscription.id,
          status: deletedSubscription.status,
        })

        // Deaktiviere Abo-Zugang
        const { error: deleteError } = await supabase
          .from('user_access')
          .update({
            subscription_status: 'canceled',
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', deletedSubscription.id)

        if (deleteError) {
          console.error('[stripe/webhook] Error canceling subscription access:', deleteError)
        } else {
          console.log('[stripe/webhook] Subscription access canceled successfully')
        }
        break

      case 'customer.subscription.paused':
        console.log('[stripe/webhook] HANDLING', event.type)
        const pausedSubscription = event.data.object as Stripe.Subscription
        console.log('[stripe/webhook] SUBSCRIPTION PAUSED', {
          subscriptionId: pausedSubscription.id,
          status: pausedSubscription.status,
        })

        // Setze Subscription auf paused
        const { error: pauseError } = await supabase
          .from('user_access')
          .update({
            subscription_status: 'paused',
            status: 'canceled', // Zugang deaktivieren wenn pausiert
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', pausedSubscription.id)

        if (pauseError) {
          console.error('[stripe/webhook] Error pausing subscription access:', pauseError)
        } else {
          console.log('[stripe/webhook] Subscription access paused successfully')
        }
        break

      case 'customer.subscription.resumed':
        console.log('[stripe/webhook] HANDLING', event.type)
        const resumedSubscription = event.data.object as Stripe.Subscription
        console.log('[stripe/webhook] SUBSCRIPTION RESUMED', {
          subscriptionId: resumedSubscription.id,
          status: resumedSubscription.status,
        })

        // Reaktiviere Subscription
        const { error: resumeError } = await supabase
          .from('user_access')
          .update({
            subscription_status: 'active',
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', resumedSubscription.id)

        if (resumeError) {
          console.error('[stripe/webhook] Error resuming subscription access:', resumeError)
        } else {
          console.log('[stripe/webhook] Subscription access resumed successfully')
        }
        break

      case 'invoice.payment_succeeded':
        console.log('[stripe/webhook] HANDLING', event.type)
        const succeededInvoice = event.data.object as Stripe.Invoice
        const subscriptionId = typeof (succeededInvoice as any).subscription === 'string' 
          ? (succeededInvoice as any).subscription 
          : (succeededInvoice as any).subscription?.id
        
        console.log('[stripe/webhook] INVOICE PAYMENT SUCCEEDED', {
          invoiceId: succeededInvoice.id,
          subscriptionId,
          customerId: succeededInvoice.customer,
        })

        // Stelle sicher, dass Subscription aktiv ist
        if (subscriptionId) {
          const { error: invoiceError } = await supabase
            .from('user_access')
            .update({
              subscription_status: 'active',
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId)

          if (invoiceError) {
            console.error('[stripe/webhook] Error updating subscription after payment:', invoiceError)
          } else {
            console.log('[stripe/webhook] Subscription reactivated after successful payment')
          }
        }
        break

      case 'invoice.payment_failed':
        console.log('[stripe/webhook] HANDLING', event.type)
        const failedInvoice = event.data.object as Stripe.Invoice
        const failedSubscriptionId = typeof (failedInvoice as any).subscription === 'string' 
          ? (failedInvoice as any).subscription 
          : (failedInvoice as any).subscription?.id
        
        console.log('[stripe/webhook] INVOICE PAYMENT FAILED', {
          invoiceId: failedInvoice.id,
          subscriptionId: failedSubscriptionId,
          customerId: failedInvoice.customer,
        })

        // Setze Subscription auf past_due
        if (failedSubscriptionId) {
          const { error: invoiceError } = await supabase
            .from('user_access')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', failedSubscriptionId)

          if (invoiceError) {
            console.error('[stripe/webhook] Error updating subscription after failed payment:', invoiceError)
          } else {
            console.log('[stripe/webhook] Subscription marked as past_due after failed payment')
          }
        }
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

