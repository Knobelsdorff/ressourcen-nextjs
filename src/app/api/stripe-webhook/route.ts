import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  console.log('Stripe Webhook: Request received');
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature || !webhookSecret) {
    console.error('Stripe Webhook: Missing signature or webhook secret', {
      hasSignature: !!signature,
      hasWebhookSecret: !!webhookSecret,
    });
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('Stripe Webhook: Event verified:', event.type);
  } catch (err: any) {
    console.error('Stripe Webhook: Signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    console.log('Stripe Webhook: Processing checkout.session.completed');
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || session.client_reference_id;

    console.log('Stripe Webhook: Session data:', {
      sessionId: session.id,
      userId,
      hasMetadata: !!session.metadata,
      hasClientReferenceId: !!session.client_reference_id,
      paymentIntent: session.payment_intent,
    });

    if (!userId) {
      console.error('Stripe Webhook: No userId in session metadata or client_reference_id');
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
      // Erstelle/aktualisiere Zugang in Supabase
      console.log('Stripe Webhook: Calling create_access_after_payment for user:', userId);
      const { data, error } = await supabase.rpc('create_access_after_payment', {
        user_uuid: userId,
        payment_intent_id: session.payment_intent as string,
        checkout_session_id: session.id,
      });

      if (error) {
        console.error('Stripe Webhook: Error creating access:', error);
        console.error('Stripe Webhook: Error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        return NextResponse.json({ error: 'Failed to create access' }, { status: 500 });
      }

      console.log(`Stripe Webhook: Access created successfully for user ${userId}`, {
        accessId: data,
      });
    } catch (error: any) {
      console.error('Stripe Webhook: Exception processing webhook:', error);
      console.error('Stripe Webhook: Exception stack:', error.stack);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    console.log('Stripe Webhook: Event type not handled:', event.type);
  }

  return NextResponse.json({ received: true });
}


