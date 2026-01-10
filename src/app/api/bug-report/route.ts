import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface BugReportFormData {
  name: string;
  description: string;
  screenshotUrls: string[];
  userEmail: string;
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const getAdminEmailHTML = (data: BugReportFormData) => {
  const screenshotsList = data.screenshotUrls.length > 0
    ? data.screenshotUrls.map((url, index) =>
        `<div style="margin-bottom: 10px;">
          <a href="${url}" target="_blank" style="color: #ea580c; text-decoration: underline;">
            Screenshot ${index + 1}
          </a>
        </div>`
      ).join('')
    : '<p style="color: #6b7280; font-style: italic;">Keine Screenshots hochgeladen</p>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🐛 Neuer Bug-Report</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
      <p style="font-size: 15px; margin: 0; color: #9a3412;">
        <strong>Von:</strong> ${data.name} (${data.userEmail})
      </p>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="color: #9a3412; margin-bottom: 10px;">Beschreibung:</h3>
      <div style="background: #f9fafb; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
        ${data.description}
      </div>
    </div>

    ${data.screenshotUrls.length > 0 ? `
    <div style="margin-top: 20px;">
      <h3 style="color: #9a3412; margin-bottom: 10px;">Screenshots (${data.screenshotUrls.length}):</h3>
      ${screenshotsList}
    </div>
    ` : ''}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 14px; color: #6b7280;">
        Dieser Bug-Report wurde über das Bug-Meldeformular der Ressourcen App gesendet.
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

const getUserConfirmationHTML = (name: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Bug-Report erhalten</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hallo ${name},
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      Vielen Dank für Ihren Bug-Report! Wir haben Ihre Meldung erhalten und werden uns so schnell wie möglich darum kümmern.
    </p>

    <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-size: 15px; margin: 0; color: #9a3412;">
        Unser Team wird den gemeldeten Bug prüfen und versuchen, ihn in der nächsten Version zu beheben. Vielen Dank für Ihre Hilfe bei der Verbesserung der App!
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      Falls Sie weitere Bugs finden, können Sie diese jederzeit über das Bug-Meldeformular melden.
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
    const description = formData.get('description') as string;
    const userEmail = formData.get('userEmail') as string;
    const files = formData.getAll('screenshots') as File[];

    if (!name || !description || !userEmail) {
      return NextResponse.json(
        { error: 'Name, Beschreibung und E-Mail sind erforderlich' },
        { status: 400 }
      );
    }

    const screenshotUrls: string[] = [];

    for (const file of files) {
      if (!file || file.size === 0) continue;

      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: 'Nur Bilddateien sind erlaubt' },
          { status: 400 }
        );
      }

      const maxFileSize = 5 * 1024 * 1024;
      if (file.size > maxFileSize) {
        return NextResponse.json(
          { error: 'Dateigröße darf maximal 5MB betragen' },
          { status: 400 }
        );
      }

      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 11);
      const fileName = `bug-reports/${userEmail}/${timestamp}_${randomId}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('contact-screenshots')
        .upload(fileName, arrayBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('[Bug Report API] Upload error:', uploadError);
        return NextResponse.json(
          { error: 'Fehler beim Hochladen der Screenshots' },
          { status: 500 }
        );
      }

      const { data: { publicUrl } } = supabase.storage
        .from('contact-screenshots')
        .getPublicUrl(fileName);

      screenshotUrls.push(publicUrl);
    }

    const { error: dbError, data: savedBugReport } = await supabase
      .from('bug_reports')
      .insert({
        name,
        description,
        user_email: userEmail,
        screenshot_urls: screenshotUrls,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Bug Report API] Database error:', dbError);
    } else {
      console.log('[Bug Report API] Bug report saved:', savedBugReport?.id);
    }

    const adminEmailsString = process.env.NEXT_PUBLIC_ADMIN_EMAILS || '';
    const adminEmails = adminEmailsString
      .split(',')
      .map(email => email.trim())
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.error('[Bug Report API] No admin emails configured');
      return NextResponse.json(
        { error: 'Keine Admin-E-Mails konfiguriert' },
        { status: 500 }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@power-storys.de';

    if (!resendApiKey) {
      console.error('[Bug Report API] Resend API key not configured');
      return NextResponse.json(
        { error: 'E-Mail-Service nicht konfiguriert' },
        { status: 500 }
      );
    }

    const resend = new Resend(resendApiKey);

    console.log('[Bug Report API] Sending to admins:', adminEmails);

    const adminEmailPromises = adminEmails.map(async (adminEmail) => {
      try {
        const { data, error } = await resend.emails.send({
          from: `Ressourcen App <${resendFromEmail}>`,
          to: [adminEmail],
          subject: `🐛 Neuer Bug-Report von ${name}`,
          html: getAdminEmailHTML({ name, description, screenshotUrls, userEmail }),
        });

        if (error) {
          console.error(`[Bug Report API] Error sending to admin ${adminEmail}:`, error);
          return { success: false, email: adminEmail, error };
        }

        console.log(`[Bug Report API] Email sent to admin ${adminEmail}:`, data?.id);
        return { success: true, email: adminEmail, id: data?.id };
      } catch (err) {
        console.error(`[Bug Report API] Exception sending to admin ${adminEmail}:`, err);
        return { success: false, email: adminEmail, error: err };
      }
    });

    console.log('[Bug Report API] Sending confirmation to user:', userEmail);

    const userEmailPromise = resend.emails.send({
      from: `Ressourcen App <${resendFromEmail}>`,
      to: [userEmail],
      subject: 'Ihr Bug-Report wurde erhalten',
      html: getUserConfirmationHTML(name),
    });

    const [adminResults, userResult] = await Promise.all([
      Promise.all(adminEmailPromises),
      userEmailPromise.catch(err => {
        console.error('[Bug Report API] Error sending user confirmation:', err);
        return { error: err };
      }),
    ]);

    const successfulAdminEmails = adminResults.filter(result => result.success);

    if (successfulAdminEmails.length === 0) {
      console.error('[Bug Report API] Failed to send to any admin emails');
      return NextResponse.json(
        { error: 'Fehler beim Senden der E-Mails an Admins' },
        { status: 500 }
      );
    }

    if ('error' in userResult && userResult.error) {
      console.warn('[Bug Report API] User confirmation email failed, but admin emails sent');
    } else if ('data' in userResult) {
      console.log('[Bug Report API] User confirmation email sent:', userResult.data?.id);
    }

    console.log('[Bug Report API] Bug report submitted successfully:', {
      adminEmailsSent: successfulAdminEmails.length,
      totalAdminEmails: adminEmails.length,
      userConfirmationSent: !('error' in userResult),
    });

    return NextResponse.json({
      success: true,
      message: 'Bug-Report erfolgreich gesendet',
      adminEmailsSent: successfulAdminEmails.length,
    });
  } catch (error: any) {
    console.error('[Bug Report API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Unerwarteter Fehler beim Senden des Bug-Reports' },
      { status: 500 }
    );
  }
}