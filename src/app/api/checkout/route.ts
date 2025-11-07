import Stripe from 'stripe'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const priceId = body?.priceId

    if (!priceId) return NextResponse.json({ error: 'Missing priceId' }, { status: 400 })

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', // oder 'payment'
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://www.ressourcen.app/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://www.ressourcen.app/cancel',
    })

    return NextResponse.json({ id: session.id, url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
