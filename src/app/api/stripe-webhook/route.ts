import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Supabase kann beim Build initialisiert werden, da NEXT_PUBLIC_ Variablen verfügbar sind
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// WICHTIG: Deaktiviere Body-Parsing für Webhook-Route
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('Stripe Webhook: Request received');
  
  // WICHTIG: Lese den Body als Text, bevor er geparst wird
  // Verwende request.body als Stream, falls request.text() nicht funktioniert
  let body: string;
  try {
    body = await request.text();
    console.log('Stripe Webhook: Body received, length:', body.length);
  } catch (error) {
    console.error('Stripe Webhook: Error reading body:', error);
    return NextResponse.json({ error: 'Failed to read request body' }, { status: 400 });
  }
  
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  
  console.log('Stripe Webhook: Signature check', {
    hasSignature: !!signature,
    hasWebhookSecret: !!webhookSecret,
    signatureLength: signature?.length,
    webhookSecretLength: webhookSecret?.length,
  });

  // Stripe erst zur Laufzeit initialisieren (nicht beim Build)
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('Stripe Webhook: STRIPE_SECRET_KEY not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover',
  });

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
      // Hole planType aus Metadata (Standard: 'standard')
      const planType = session.metadata?.planType || 'standard';
      console.log('Stripe Webhook: Plan type from metadata:', planType);
      
      // Erstelle/aktualisiere Zugang in Supabase
      console.log('Stripe Webhook: Calling create_access_after_payment for user:', userId, 'planType:', planType);
      const { data, error } = await supabase.rpc('create_access_after_payment', {
        user_uuid: userId,
        payment_intent_id: session.payment_intent as string,
        checkout_session_id: session.id,
        plan_type: planType, // 'standard' oder 'premium'
      });

      if (error) {
        console.error('Stripe Webhook: Error creating access:', error);
        console.error('Stripe Webhook: Error details:', {
          message: (error as any)?.message,
          code: (error as any)?.code,
          details: (error as any)?.details,
          hint: (error as any)?.hint,
        });
        return NextResponse.json({ error: 'Failed to create access' }, { status: 500 });
      }

      console.log(`Stripe Webhook: Access created successfully for user ${userId}`, {
        accessId: data,
      });
    } catch (error: any) {
      console.error('Stripe Webhook: Exception processing webhook:', error);
      console.error('Stripe Webhook: Exception stack:', (error as any)?.stack);
      return NextResponse.json({ error: (error as any)?.message }, { status: 500 });
    }
  } else {
    console.log('Stripe Webhook: Event type not handled:', event.type);
  }

  return NextResponse.json({ received: true });
}


