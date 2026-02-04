import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface FeedbackFormData {
  name: string;
  message: string;
  rating: number;
  userEmail: string;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const getAdminEmailHTML = (data: FeedbackFormData) => {
  const stars = '⭐'.repeat(data.rating);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⭐ Neues Feedback erhalten</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <div style="background: #faf5ff; border-left: 4px solid #a855f7; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="font-size: 15px; margin: 0; color: #6b21a8;">
        <strong>Von:</strong> ${data.name} (${data.userEmail})
      </p>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #6b21a8; margin-bottom: 10px;">Bewertung:</h3>
      <div style="font-size: 32px; margin: 10px 0;">
        ${stars}
      </div>
      <p style="color: #6b7280; font-size: 14px; margin: 5px 0;">${data.rating} von 5 Sternen</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #6b21a8; margin-bottom: 10px;">Feedback:</h3>
      <div style="background: #f9fafb; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
        ${data.message}
      </div>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 14px; color: #6b7280;">
        Dieses Feedback wurde über das Feedback-Formular der Ressourcen App gesendet.
      </p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Ressourcen App - Andreas von Knobelsdorff</p>
  </div>
</body>
</html>
`;
};

const getUserConfirmationHTML = (name: string, rating: number) => {
  const stars = '⭐'.repeat(rating);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Feedback erhalten</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hallo ${name},
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Vielen Dank für Ihr wertvolles Feedback! Ihre Bewertung von ${stars} (${rating}/5) wurde erfolgreich übermittelt.
    </p>

    <div style="background: #faf5ff; border-left: 4px solid #a855f7; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-size: 15px; margin: 0; color: #6b21a8;">
        Ihr Feedback hilft uns, die Ressourcen App kontinuierlich zu verbessern. Wir schätzen Ihre Meinung sehr!
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      Falls Sie weitere Anregungen haben, können Sie uns jederzeit über das Feedback-Formular erreichen.
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Ressourcen App - Andreas von Knobelsdorff</p>
  </div>
</body>
</html>
`;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const message = formData.get('message') as string;
    const ratingStr = formData.get('rating') as string;
    const userEmail = formData.get('userEmail') as string;

    if (!name || !message || !ratingStr || !userEmail) {
      return NextResponse.json(
        { error: 'Name, Nachricht, Bewertung und E-Mail sind erforderlich' },
        { status: 400 }
      );
    }

    const rating = parseInt(ratingStr, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Bewertung muss zwischen 1 und 5 liegen' },
        { status: 400 }
      );
    }

    const { error: dbError, data: savedFeedback } = await supabase
      .from('feedback_messages')
      .insert({
        name,
        message,
        user_email: userEmail,
        rating,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Feedback API] Database error:', dbError);
    } else {
      console.log('[Feedback API] Feedback saved:', savedFeedback?.id);
    }

    const adminEmailsString = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
    const adminEmails = adminEmailsString
      .split(',')
      .map(email => email.trim())
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.error('[Feedback API] No admin emails configured');
      return NextResponse.json(
        { error: 'Keine Admin-E-Mails konfiguriert' },
        { status: 500 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'andreas@power-storys.de';

    if (!resendApiKey) {
      console.error('[Feedback API] Resend API key not configured');
      return NextResponse.json(
        { error: 'E-Mail-Service nicht konfiguriert' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    console.log('[Feedback API] Sending to admins:', adminEmails);

    const adminEmailPromises = adminEmails.map(async (adminEmail) => {
      try {
        const { data, error } = await resend.emails.send({
          from: `Ressourcen App <${resendFromEmail}>`,
          to: [adminEmail],
          subject: `Neues Feedback von ${name} (${rating}⭐)`,
          html: getAdminEmailHTML({ name, message, rating, userEmail }),
        });

        if (error) {
          console.error(`[Feedback API] Error sending to admin ${adminEmail}:`, error);
          return { success: false, email: adminEmail, error };
        }

        console.log(`[Feedback API] Email sent to admin ${adminEmail}:`, data?.id);
        return { success: true, email: adminEmail, id: data?.id };
      } catch (err) {
        console.error(`[Feedback API] Exception sending to admin ${adminEmail}:`, err);
        return { success: false, email: adminEmail, error: err };
      }
    });

    console.log('[Feedback API] Sending confirmation to user:', userEmail);

    const userEmailPromise = resend.emails.send({
      from: `Ressourcen App <${resendFromEmail}>`,
      to: [userEmail],
      subject: 'Ihr Feedback wurde erhalten',
      html: getUserConfirmationHTML(name, rating),
    });

    const [adminResults, userResult] = await Promise.all([
      Promise.all(adminEmailPromises),
      userEmailPromise.catch(err => {
        console.error('[Feedback API] Error sending user confirmation:', err);
        return { error: err };
      }),
    ]);

    const successfulAdminEmails = adminResults.filter(result => result.success);

    if (successfulAdminEmails.length === 0) {
      console.error('[Feedback API] Failed to send to any admin emails');
      return NextResponse.json(
        { error: 'Fehler beim Senden der E-Mails an Admins' },
        { status: 500 }
      );
    }

    if ('error' in userResult && userResult.error) {
      console.warn('[Feedback API] User confirmation email failed, but admin emails sent');
    } else if ('data' in userResult) {
      console.log('[Feedback API] User confirmation email sent:', userResult.data?.id);
    }

    console.log('[Feedback API] Feedback submitted successfully:', {
      adminEmailsSent: successfulAdminEmails.length,
      totalAdminEmails: adminEmails.length,
      userConfirmationSent: !('error' in userResult),
    });

    return NextResponse.json({
      success: true,
      message: 'Feedback erfolgreich gesendet',
      adminEmailsSent: successfulAdminEmails.length,
    });
  } catch (error: any) {
    console.error('[Feedback API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Senden des Feedbacks' },
      { status: 500 }
    );
  }
}