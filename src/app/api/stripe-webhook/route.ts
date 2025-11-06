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
// Body-Size-Limit für Webhooks
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  console.log('Stripe Webhook: Request received');
  console.log('Stripe Webhook: Environment:', process.env.NODE_ENV);
  console.log('Stripe Webhook: Request headers:', {
    contentType: request.headers.get('content-type'),
    userAgent: request.headers.get('user-agent'),
    hasStripeSignature: !!request.headers.get('stripe-signature'),
  });
  
  // WICHTIG: In Vercel könnte der Body bereits geparst sein
  // Stripe Webhooks benötigen den RAW Body für Signatur-Verifikation
  // Versuche zuerst als Text zu lesen (für Stripe direkt)
  let body: string;
  
  try {
    // Methode 1: Als Text lesen (Standard für Stripe Webhooks)
    // In Next.js 15 sollte request.text() den raw body zurückgeben
    body = await request.text();
    console.log('Stripe Webhook: Body read as text, length:', body.length);
    
    // Prüfe ob Body gültig ist
    if (!body || body.length === 0) {
      throw new Error('Body is empty');
    }
    
    // Prüfe ob Body bereits ein leeres JSON-Objekt ist (durch Vercel geparst)
    if (body === '{}' || body.trim() === '{}') {
      throw new Error('Body is empty JSON object');
    }
    
    console.log('Stripe Webhook: Body preview (first 200 chars):', body.substring(0, 200));
    console.log('Stripe Webhook: Body is valid JSON string:', body.startsWith('{'));
  } catch (error) {
    console.error('Stripe Webhook: Error reading body as text:', error);
    
    // Fallback: Versuche als ArrayBuffer zu lesen und dann zu String zu konvertieren
    // Dies könnte notwendig sein, wenn Vercel den Body anders behandelt
    try {
      console.log('Stripe Webhook: Trying to read body as ArrayBuffer...');
      const arrayBuffer = await request.arrayBuffer();
      body = Buffer.from(arrayBuffer).toString('utf-8');
      console.log('Stripe Webhook: Body read as ArrayBuffer and converted to string, length:', body.length);
      
      if (!body || body.length === 0) {
        throw new Error('Body from ArrayBuffer is empty');
      }
    } catch (arrayBufferError) {
      console.error('Stripe Webhook: ArrayBuffer reading also failed:', arrayBufferError);
      return NextResponse.json({ 
        error: 'Failed to read request body',
        details: 'Body could not be read as text or ArrayBuffer. This might be a Vercel-specific issue.'
      }, { status: 400 });
    }
  }
  
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  
  console.log('Stripe Webhook: Signature check', {
    hasSignature: !!signature,
    hasWebhookSecret: !!webhookSecret,
    signatureLength: signature?.length,
    webhookSecretLength: webhookSecret?.length,
    webhookSecretPreview: webhookSecret.substring(0, 10) + '...' + webhookSecret.substring(webhookSecret.length - 5),
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
    // Prüfe ob Body JSON ist (könnte bereits geparst sein)
    let bodyToVerify = body;
    
    // Falls Body bereits JSON-String ist, verwende ihn direkt
    // Falls Body bereits geparst wurde, müssen wir ihn wieder zu JSON stringifizieren
    if (typeof body === 'object') {
      bodyToVerify = JSON.stringify(body);
      console.log('Stripe Webhook: Body was object, stringified to length:', bodyToVerify.length);
    }
    
    console.log('Stripe Webhook: Attempting signature verification with body length:', bodyToVerify.length);
    event = stripe.webhooks.constructEvent(bodyToVerify, signature, webhookSecret);
    console.log('Stripe Webhook: Event verified:', event.type);
  } catch (err: any) {
    console.error('Stripe Webhook: Signature verification failed:', err.message);
    console.error('Stripe Webhook: Error details:', {
      message: err.message,
      bodyLength: body.length,
      bodyType: typeof body,
      bodyPreview: typeof body === 'string' ? body.substring(0, 100) : 'object',
      signatureLength: signature?.length,
      webhookSecretLength: webhookSecret?.length,
    });
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


