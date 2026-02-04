import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// GET Handler für Health Check
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Resend webhook endpoint is reachable',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const forwardToEmail = process.env.RESEND_FORWARD_TO_EMAIL;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'andreas@power-storys.de';
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (!resendApiKey) {
      console.error('[Resend Webhook] RESEND_API_KEY not configured');
      return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 });
    }

    if (!forwardToEmail) {
      console.error('[Resend Webhook] RESEND_FORWARD_TO_EMAIL not configured');
      return NextResponse.json({ error: 'Forward email address not configured' }, { status: 500 });
    }

    // Lese raw body für Signatur-Verifizierung
    let body: string;
    try {
      const arrayBuffer = await request.arrayBuffer();
      const decoder = new TextDecoder('utf-8');
      body = decoder.decode(arrayBuffer);
      
      if (!body || body.length === 0) {
        throw new Error('Body is empty');
      }
    } catch (error) {
      console.error('[Resend Webhook] Error reading body:', error);
      return NextResponse.json({ 
        error: 'Failed to read request body'
      }, { status: 400 });
    }

    // Extrahiere Svix-Header für Signatur-Verifizierung
    const svixId = request.headers.get('svix-id');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixSignature = request.headers.get('svix-signature');

    // Verifiziere Signatur, falls Webhook-Secret konfiguriert ist
    let event: any;
    if (webhookSecret) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('[Resend Webhook] Missing Svix headers for signature verification');
        return NextResponse.json({ error: 'Missing Svix headers' }, { status: 400 });
      }

      try {
        const resend = new Resend(resendApiKey);
        event = resend.webhooks.verify({
          payload: body,
          headers: {
            id: svixId,
            timestamp: svixTimestamp,
            signature: svixSignature,
          },
          webhookSecret: webhookSecret.trim(),
        });
        console.log('[Resend Webhook] ✅ Signature verified successfully');
      } catch (err: any) {
        console.error('[Resend Webhook] ❌ Signature verification failed:', err.message);
        return NextResponse.json({ 
          error: `Webhook signature verification failed: ${err.message}` 
        }, { status: 400 });
      }
    } else {
      // Fallback: Parse JSON ohne Verifizierung (nur für Entwicklung)
      console.warn('[Resend Webhook] ⚠️ RESEND_WEBHOOK_SECRET not configured, skipping signature verification');
      try {
        event = JSON.parse(body);
      } catch (parseError) {
        console.error('[Resend Webhook] Failed to parse body as JSON:', parseError);
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }

    console.log('[Resend Webhook] Received event:', event.type);

    // Prüfe ob es ein email.received Event ist
    if (event.type === 'email.received') {
      const emailId = event.data?.email_id;
      
      if (!emailId) {
        console.error('[Resend Webhook] Missing email_id in event data');
        return NextResponse.json({ error: 'Missing email_id' }, { status: 400 });
      }

      console.log('[Resend Webhook] Forwarding email:', emailId, 'to:', forwardToEmail);

      const resend = new Resend(resendApiKey);

      // Manuelle Weiterleitung: Verwende Resend REST API direkt
      try {
        // Hole E-Mail-Metadaten über REST API
        const resendApiUrl = 'https://api.resend.com';
        const getEmailResponse = await fetch(`${resendApiUrl}/emails/receiving/${emailId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!getEmailResponse.ok) {
          const errorText = await getEmailResponse.text();
          console.error('[Resend Webhook] Error fetching email:', getEmailResponse.status, errorText);
          return NextResponse.json({ 
            error: `Failed to fetch email: ${getEmailResponse.status}` 
          }, { status: getEmailResponse.status });
        }

        const emailData = await getEmailResponse.json();
        
        if (!emailData || !emailData.data) {
          console.error('[Resend Webhook] Invalid email data:', emailData);
          return NextResponse.json({ error: 'Invalid email data' }, { status: 500 });
        }

        const email = emailData.data;
        const htmlContent = email.html || '';
        const textContent = email.text || '';

        // Sende weitergeleitete E-Mail
        const { data: sendData, error: sendError } = await resend.emails.send({
          from: resendFromEmail,
          to: [forwardToEmail],
          subject: email.subject ? `Fwd: ${email.subject}` : '(no subject)',
          html: htmlContent || undefined,
          text: textContent || undefined,
          replyTo: email.from || undefined,
        });

        if (sendError) {
          console.error('[Resend Webhook] Error forwarding email:', sendError);
          return NextResponse.json({ error: sendError.message || 'Failed to forward email' }, { status: 500 });
        }

        console.log('[Resend Webhook] Email forwarded successfully:', sendData?.id);
        return NextResponse.json({ success: true, id: sendData?.id });
      } catch (forwardError: any) {
        console.error('[Resend Webhook] Error in forwarding process:', forwardError);
        return NextResponse.json({ 
          error: forwardError.message || 'Failed to forward email' 
        }, { status: 500 });
      }
    }

    // Ignoriere andere Event-Typen
    console.log('[Resend Webhook] Ignoring event type:', event.type);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Resend Webhook] Error processing webhook:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
