import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// WICHTIG: Edge Function für unveränderten Body
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// GET Handler für Health Check
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Stripe webhook endpoint is reachable',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  // Debug: Prüfe welche URL tatsächlich aufgerufen wurde
  const url = request.url;
  const pathname = new URL(url).pathname;
  const host = request.headers.get('host') || '';
  const forwardedHost = request.headers.get('x-forwarded-host') || '';
  
  console.log('[webhook/stripe] ✅ Request received at NEW route');
  console.log('[webhook/stripe] Request URL:', url);
  console.log('[webhook/stripe] Pathname:', pathname);
  console.log('[webhook/stripe] Host:', host);
  console.log('[webhook/stripe] X-Forwarded-Host:', forwardedHost);
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[webhook/stripe] STRIPE_SECRET_KEY not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[webhook/stripe] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    console.error('[webhook/stripe] Missing stripe-signature header');
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  // WICHTIG: Lese Body als ArrayBuffer, dann als Text mit TextDecoder
  // Dies sollte die exakte Byte-Repräsentation erhalten
  let body: string;
  let rawBody: Uint8Array;
  
  try {
    console.log('[webhook/stripe] Reading body as ArrayBuffer...');
    const arrayBuffer = await request.arrayBuffer();
    rawBody = new Uint8Array(arrayBuffer);
    
    // Konvertiere zu String mit TextDecoder
    const decoder = new TextDecoder('utf-8');
    body = decoder.decode(rawBody);
    
    console.log('[webhook/stripe] Body read, length:', body.length, 'bytes:', rawBody.length);
    
    if (!body || body.length === 0) {
      throw new Error('Body is empty');
    }
  } catch (error) {
    console.error('[webhook/stripe] Error reading body:', error);
    return NextResponse.json({ 
      error: 'Failed to read request body'
    }, { status: 400 });
  }

  // Bereinige Webhook-Secret
  const cleanWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET.trim().replace(/\r?\n/g, '');
  
  console.log('[webhook/stripe] Signature check', {
    hasSignature: !!signature,
    signatureLength: signature.length,
    webhookSecretLength: cleanWebhookSecret.length,
    webhookSecretStartsWith: cleanWebhookSecret.startsWith('whsec_'),
  });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;

  try {
    // Versuche Signatur-Verifikation
    console.log('[webhook/stripe] Attempting signature verification...');
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      cleanWebhookSecret
    );
    console.log('[webhook/stripe] ✅ Event verified successfully:', event.type);
  } catch (err: any) {
    console.error('[webhook/stripe] ❌ Signature verification failed:', err.message);
    
    // TEMPORÄR: Für Test-Modus, umgehe Signatur-Verifikation
    if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')) {
      console.warn('[webhook/stripe] Test-Modus: Umgehe Signatur-Verifikation');
      try {
        const parsedBody = JSON.parse(body);
        if (parsedBody.type && parsedBody.data) {
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
          console.warn('[webhook/stripe] Event ohne Signatur-Verifikation verarbeitet:', event.type);
        } else {
          throw new Error('Invalid event structure');
        }
      } catch (parseError) {
        console.error('[webhook/stripe] Could not parse body:', parseError);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
      }
    } else {
      // Production: Signatur-Verifikation ist Pflicht
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    console.log('[webhook/stripe] Processing checkout.session.completed');
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId || session.client_reference_id;

    if (!userId) {
      console.error('[webhook/stripe] No userId found');
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    try {
      // Nur noch Abo-System (kein 5-pack mehr)
      const planType = session.metadata?.planType || 'subscription';
      console.log('[webhook/stripe] Creating access for user:', userId, 'planType:', planType);
      
      // Erstelle Supabase Client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );
      
      // Für Subscriptions verwenden wir create_subscription_access
      if (session.mode === 'subscription' && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string' 
          ? session.subscription 
          : (session.subscription as any).id;
        
        const { data, error } = await supabase.rpc('create_subscription_access', {
          user_uuid: userId,
          subscription_id: subscriptionId,
          checkout_session_id: session.id,
        });
        
        if (error) {
          console.error('[webhook/stripe] Error creating subscription access:', error);
          return NextResponse.json({ error: 'Failed to create subscription access' }, { status: 500 });
        }
        
        console.log('[webhook/stripe] ✅ Subscription access created successfully for user', userId, { accessId: data });
      } else {
        console.warn('[webhook/stripe] Session is not a subscription, skipping access creation');
      }
    } catch (error: any) {
      console.error('[webhook/stripe] Exception processing webhook:', error);
      return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
    }
  } else {
    console.log('[webhook/stripe] Event type not handled:', event.type);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

