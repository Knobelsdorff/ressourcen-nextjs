import Stripe from 'stripe'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  const headerList = await headers()
  const sig = headerList.get('stripe-signature')

  if (!sig) return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })

  const rawBody = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
    console.log('STRIPE EVENT RECEIVED', event.type)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('HANDLING', event.type)
        console.log('SESSION COMPLETED', event.data.object)
        // hier kannst du später Zugriff freischalten
        break
      case 'customer.subscription.updated':
        console.log('HANDLING', event.type)
        // Abo aktualisiert
        break
      case 'customer.subscription.deleted':
        console.log('HANDLING', event.type)
        // Abo beendet
        break
      default:
        break
    }
    return NextResponse.json({ received: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

