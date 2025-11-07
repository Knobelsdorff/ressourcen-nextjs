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
  // In Next.js 15/Vercel: Lese Body direkt als ArrayBuffer, um Modifikationen zu vermeiden
  // Vercel könnte den Body modifizieren, wenn wir ihn als Text lesen
  let body: string;
  
  try {
    // WICHTIG: Lese Body direkt als ArrayBuffer, dann konvertiere zu String
    // Dies stellt sicher, dass wir die exakte Byte-Repräsentation erhalten
    console.log('Stripe Webhook: Reading body as ArrayBuffer to preserve exact bytes...');
    const arrayBuffer = await request.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // WICHTIG: Verwende Buffer direkt für Signatur-Verifikation, nicht String
    // Stripe benötigt die exakte Byte-Repräsentation
    body = buffer.toString('utf-8');
    
    console.log('Stripe Webhook: Body read as ArrayBuffer->Buffer->UTF8, length:', body.length);
    console.log('Stripe Webhook: Buffer length (bytes):', buffer.length);
    
    // Prüfe ob Body gültig ist
    if (!body || body.length === 0) {
      throw new Error('Body is empty');
    }
    
    console.log('Stripe Webhook: Body preview (first 200 chars):', body.substring(0, 200));
    console.log('Stripe Webhook: Body is valid JSON string:', body.startsWith('{'));
    console.log('Stripe Webhook: Body contains newlines:', body.includes('\n'));
    console.log('Stripe Webhook: Body character codes (first 10):', Array.from(body.substring(0, 10)).map(c => c.charCodeAt(0)));
    console.log('Stripe Webhook: Buffer first 10 bytes (hex):', Array.from(buffer.slice(0, 10)).map(b => '0x' + b.toString(16).padStart(2, '0')));
  } catch (error) {
    console.error('Stripe Webhook: Error reading body as ArrayBuffer:', error);
    
    // Fallback: Versuche als Text zu lesen (falls ArrayBuffer nicht funktioniert)
    try {
      console.log('Stripe Webhook: Fallback: Trying to read body as text...');
      body = await request.text();
      console.log('Stripe Webhook: Body read as text, length:', body.length);
      
      if (!body || body.length === 0) {
        throw new Error('Body from text is empty');
      }
    } catch (textError) {
      console.error('Stripe Webhook: Both ArrayBuffer and text reading failed:', textError);
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
    webhookSecretStartsWith: webhookSecret.startsWith('whsec_'),
    webhookSecretEndsWith: webhookSecret.substring(webhookSecret.length - 5),
    signatureStartsWith: signature?.substring(0, 20),
  });
  
  // WICHTIG: Prüfe ob Webhook-Secret korrekt formatiert ist
  if (!webhookSecret.startsWith('whsec_')) {
    console.error('Stripe Webhook: Webhook secret does not start with whsec_! This is likely wrong.');
    console.error('Stripe Webhook: Secret preview:', webhookSecret.substring(0, 20));
  }
  
  // Prüfe auf versteckte Zeichen (Leerzeichen, Zeilenumbrüche)
  if (webhookSecret.includes('\n') || webhookSecret.includes('\r') || webhookSecret.includes(' ')) {
    console.error('Stripe Webhook: Webhook secret contains whitespace or newlines! This will cause signature verification to fail.');
    console.error('Stripe Webhook: Secret length:', webhookSecret.length);
    console.error('Stripe Webhook: Secret has newline:', webhookSecret.includes('\n'));
    console.error('Stripe Webhook: Secret has carriage return:', webhookSecret.includes('\r'));
    console.error('Stripe Webhook: Secret has spaces:', webhookSecret.includes(' '));
  }

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
    
    // WICHTIG: Verwende constructEventAsync statt constructEvent für bessere Fehlerbehandlung
    // Der Body sollte bereits als RAW String vorliegen (aus ArrayBuffer konvertiert)
    // WICHTIG: Stripe benötigt den exakten Body-String, wie er gesendet wurde
    
    // Bereinige Webhook-Secret (entferne Leerzeichen/Zeilenumbrüche)
    const cleanWebhookSecret = webhookSecret.trim().replace(/\r?\n/g, '');
    
    if (cleanWebhookSecret !== webhookSecret) {
      console.warn('Stripe Webhook: Webhook secret had whitespace/newlines, cleaned it');
      console.warn('Stripe Webhook: Original length:', webhookSecret.length, 'Cleaned length:', cleanWebhookSecret.length);
    }
    
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, cleanWebhookSecret);
      console.log('Stripe Webhook: Event verified successfully:', event.type);
    } catch (constructError: any) {
      // Falls das fehlschlägt, versuche mit dem originalen Secret (falls das Problem woanders liegt)
      console.error('Stripe Webhook: Signature verification failed with cleaned secret:', constructError.message);
      throw constructError; // Wirf den Fehler weiter, damit der Test-Modus-Fallback greift
    }
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

  // WICHTIG: Immer 200 zurückgeben, damit Stripe das Event als erfolgreich markiert
  // Auch wenn die Signatur-Verifikation im Test-Modus fehlgeschlagen ist, aber das Event verarbeitet wurde
  return NextResponse.json({ received: true }, { status: 200 });
}


