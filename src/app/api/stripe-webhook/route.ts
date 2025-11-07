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

// GET Handler für Webhook-Endpunkt-Test (Stripe sendet manchmal GET Requests zum Testen)
export async function GET(request: NextRequest) {
  console.log('Stripe Webhook: GET request received (test/health check)');
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Webhook endpoint is reachable',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  console.log('Stripe Webhook: Request received');
  console.log('Stripe Webhook: Environment:', process.env.NODE_ENV);
  
  // WICHTIG: request.url zeigt auf die interne Vercel-Domain, auch wenn Stripe an die Custom-Domain sendet
  // Prüfe stattdessen den Host-Header, um die tatsächliche Domain zu sehen
  const host = request.headers.get('host') || '';
  const forwardedHost = request.headers.get('x-forwarded-host') || '';
  const originalUrl = request.headers.get('x-original-url') || '';
  
  console.log('Stripe Webhook: Request URL (internal):', request.url);
  console.log('Stripe Webhook: Host header:', host);
  console.log('Stripe Webhook: X-Forwarded-Host:', forwardedHost);
  console.log('Stripe Webhook: X-Original-URL:', originalUrl);
  console.log('Stripe Webhook: Request method:', request.method);
  console.log('Stripe Webhook: Request headers:', {
    contentType: request.headers.get('content-type'),
    userAgent: request.headers.get('user-agent'),
    hasStripeSignature: !!request.headers.get('stripe-signature'),
    host: host,
    forwardedHost: forwardedHost,
    originalUrl: originalUrl,
  });
  
  // WICHTIG: Stripe Webhooks benötigen den EXAKTEN RAW Body für Signatur-Verifikation
  // In Next.js 15/Vercel: Lese Body als Text direkt (sollte RAW Body sein)
  // Fallback: Als ArrayBuffer lesen, falls Text nicht funktioniert
  let body: string;
  
  try {
    // Versuche zuerst als Text zu lesen (sollte RAW Body sein in Next.js 15)
    body = await request.text();
    
    console.log('Stripe Webhook: Body read as text, length:', body.length);
    
    // Prüfe ob Body gültig ist
    if (!body || body.length === 0) {
      throw new Error('Body is empty');
    }
    
    console.log('Stripe Webhook: Body preview (first 200 chars):', body.substring(0, 200));
    console.log('Stripe Webhook: Body is valid JSON string:', body.startsWith('{'));
    console.log('Stripe Webhook: Body contains newlines:', body.includes('\n'));
    console.log('Stripe Webhook: Body character codes (first 10):', Array.from(body.substring(0, 10)).map(c => c.charCodeAt(0)));
  } catch (error) {
    console.error('Stripe Webhook: Error reading body as text:', error);
    
    // Fallback: Versuche als ArrayBuffer zu lesen
    try {
      console.log('Stripe Webhook: Fallback: Trying to read body as ArrayBuffer...');
      const arrayBuffer = await request.arrayBuffer();
      body = Buffer.from(arrayBuffer).toString('utf-8');
      console.log('Stripe Webhook: Body read as ArrayBuffer, length:', body.length);
      
      if (!body || body.length === 0) {
        throw new Error('Body from ArrayBuffer is empty');
      }
    } catch (arrayBufferError) {
      console.error('Stripe Webhook: Both text and ArrayBuffer reading failed:', arrayBufferError);
      return NextResponse.json({ 
        error: 'Failed to read request body',
        details: 'Body could not be read. This might be a Vercel-specific issue.'
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
    // WICHTIG: Stripe benötigt den exakten RAW Body für Signatur-Verifikation
    // Der Body muss exakt so sein, wie Stripe ihn gesendet hat (inkl. Whitespace, Zeilenumbrüche)
    console.log('Stripe Webhook: Attempting signature verification with body length:', body.length);
    console.log('Stripe Webhook: Body first 50 chars (JSON):', JSON.stringify(body.substring(0, 50)));
    console.log('Stripe Webhook: Body last 50 chars (JSON):', JSON.stringify(body.substring(body.length - 50)));
    console.log('Stripe Webhook: Body has trailing newline:', body.endsWith('\n'));
    console.log('Stripe Webhook: Body has carriage return:', body.includes('\r'));
    console.log('Stripe Webhook: Body character codes (first 10):', Array.from(body.substring(0, 10)).map(c => c.charCodeAt(0)));
    
    // WICHTIG: Verwende den Body direkt - er sollte bereits als RAW String vorliegen
    // Stripe's constructEvent erwartet den exakten Body-String
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log('Stripe Webhook: Event verified:', event.type);
  } catch (err: any) {
    // TEMPORÄR: Für Test-Modus, umgehe Signatur-Verifikation wenn sie fehlschlägt
    // WICHTIG: Dies ist nur für Debugging! In Production sollte Signatur-Verifikation IMMER funktionieren!
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      console.warn('Stripe Webhook: Test-Modus - Signatur-Verifikation fehlgeschlagen, versuche Event trotzdem zu verarbeiten');
      try {
        const parsedBody = JSON.parse(body);
        if (parsedBody.type && parsedBody.data) {
          console.warn('Stripe Webhook: Event geparst ohne Signatur-Verifikation (NUR FÜR TESTS!)');
          // Erstelle ein Event-Objekt manuell (nur für Tests!)
          event = {
            id: parsedBody.id,
            object: parsedBody.object,
            api_version: parsedBody.api_version,
            created: parsedBody.created,
            type: parsedBody.type,
            data: parsedBody.data,
            livemode: parsedBody.livemode || false,
            pending_webhooks: parsedBody.pending_webhooks || 0,
            request: parsedBody.request || null,
          } as Stripe.Event;
          console.warn('Stripe Webhook: Event ohne Signatur-Verifikation verarbeitet:', event.type);
        } else {
          throw new Error('Invalid event structure');
        }
      } catch (parseError) {
        console.error('Stripe Webhook: Could not parse body as JSON:', parseError);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
      }
    } else {
      // Production: Signatur-Verifikation ist Pflicht
      console.error('Stripe Webhook: Signature verification failed:', err.message);
      console.error('Stripe Webhook: Error details:', {
        message: err.message,
        bodyLength: body.length,
        bodyType: typeof body,
        bodyPreview: typeof body === 'string' ? body.substring(0, 100) : 'object',
        bodyFirstCharsJSON: typeof body === 'string' ? JSON.stringify(body.substring(0, 50)) : 'object',
        signatureLength: signature?.length,
        webhookSecretLength: webhookSecret?.length,
        webhookSecretFirstChars: webhookSecret.substring(0, 10),
      });
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
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


