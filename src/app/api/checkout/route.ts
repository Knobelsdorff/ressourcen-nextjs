import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Supabase kann beim Build initialisiert werden, da NEXT_PUBLIC_ Variablen verfügbar sind
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    console.log('Checkout API: Request received');
    const { userId, planType = 'standard' } = await request.json();

    if (!userId) {
      console.error('Checkout API: Missing userId');
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validiere planType
    if (planType !== 'standard' && planType !== 'premium') {
      console.error('Checkout API: Invalid planType:', planType);
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 });
    }

    // Stripe erst zur Laufzeit initialisieren (nicht beim Build)
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('Checkout API: STRIPE_SECRET_KEY not configured');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    });

    console.log('Checkout API: Creating Stripe checkout session for user:', userId, 'planType:', planType);

    // Preis und Beschreibung basierend auf Plan-Type
    const isPremium = planType === 'premium';
    const price = isPremium ? 24900 : 17900; // 249€ Premium, 179€ Standard
    const productName = isPremium 
      ? 'Ressourcen-App: Premium 3-Monats-Paket'
      : 'Ressourcen-App: Standard 3-Monats-Paket';
    const description = isPremium
      ? '3 Ressourcen, 3 Monate Zugang, Audio-Downloads inklusive - Statt 1,5 Sitzungen (330€) nur 249€'
      : '3 Ressourcen, 3 Monate Zugang - Statt 1,5 Sitzungen (330€) nur 179€';

    // Erstelle Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: productName,
              description: description,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Einmalzahlung, kein Abo
      success_url: `${request.nextUrl.origin}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/dashboard?payment=cancelled`,
      client_reference_id: userId,
      metadata: {
        userId,
        planType: planType, // 'standard' oder 'premium'
        resourcesLimit: '3',
      },
    });

    console.log('Checkout API: Session created:', {
      sessionId: session.id,
      hasUrl: !!session.url,
      userId,
      planType,
    });

    if (!session.url) {
      console.error('Checkout API: Session created but no URL returned');
      return NextResponse.json({ error: 'Failed to create checkout session URL' }, { status: 500 });
    }

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: (error as any)?.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}


