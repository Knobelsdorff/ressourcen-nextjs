/**
 * Email-Service für benutzerdefinierte Emails
 * Verwendet Resend für Email-Versand
 */

import { Resend } from 'resend';
import { getAppBaseUrl } from './app-url';

interface SendResourceReadyEmailParams {
  to: string;
  resourceName?: string; // Für Rückwärtskompatibilität
  resourceNames?: string[]; // Array von Ressourcennamen
  magicLink: string;
  isNewUser?: boolean; // Ob der User neu ist und Passwort einrichten muss
  /** Ablaufdatum des Zugangslinks – wird in der E-Mail als Datum genannt. */
  expiresAt?: Date;
}

/** Formatiert ein Datum als "4. November 2026". */
const formatGermanDate = (date: Date): string =>
  new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

/**
 * Gestaltung folgt der App: warmes Amber/Orange, weiche Rundungen, viel Luft.
 * Tabellen-Layout und Inline-Styles, weil Outlook & Co. weder Flexbox noch
 * <style>-Blöcke zuverlässig unterstützen.
 */
const getEmailHTML = (
  resourceNames: string[],
  magicLink: string,
  isNewUser: boolean = false,
  expiresAt?: Date
) => {
  const appBaseUrl = getAppBaseUrl();
  const zugangUrl = `${appBaseUrl}/zugang`;
  const isMultiple = resourceNames.length > 1;

  const resourceItems = resourceNames
    .map(
      (name) => `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #fde9c8;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="26" valign="top" style="font-size: 15px; line-height: 24px; color: #d97706;">&#9834;</td>
                      <td style="font-size: 16px; line-height: 24px; color: #7c2d12; font-weight: 600;">${name}</td>
                    </tr>
                  </table>
                </td>
              </tr>`
    )
    .join('');

  const gueltigkeit = expiresAt
    ? `Dieser Link bleibt bis zum <strong style="color: #7c2d12;">${formatGermanDate(expiresAt)}</strong> gültig &ndash; du kannst ihn so oft öffnen, wie du magst.`
    : `Bewahre diese E-Mail auf &ndash; über den Link kommst du jederzeit zu deiner Power Story.`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Deine Power Story</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fffbf5; -webkit-font-smoothing: antialiased;">

  <!-- Preheader: erscheint in der Inbox-Vorschau, bleibt im Text unsichtbar -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
    ${isMultiple ? `${resourceNames.length} Power Storys warten auf dich.` : `Deine Power Story „${resourceNames[0]}" wartet auf dich.`}
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fffbf5; padding: 32px 16px;">
    <tr>
      <td align="center">

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 560px; margin: 0 auto;">

          <!-- Kopf -->
          <tr>
            <td style="background: linear-gradient(135deg, #fb923c 0%, #f59e0b 100%); background-color: #f59e0b; padding: 44px 40px 40px; border-radius: 20px 20px 0 0; text-align: center;">
              <div style="font-size: 34px; line-height: 34px; margin-bottom: 14px;">&#10024;</div>
              <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 27px; line-height: 34px; font-weight: 400; color: #ffffff;">
                ${isMultiple ? 'Deine Power Storys sind bereit' : 'Deine Power Story ist bereit'}
              </h1>
            </td>
          </tr>

          <!-- Inhalt -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #fde9c8; border-right: 1px solid #fde9c8;">

              <p style="margin: 0 0 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 17px; line-height: 27px; color: #7c2d12;">
                Hallo,
              </p>

              <p style="margin: 0 0 26px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 17px; line-height: 27px; color: #92400e;">
                ${
                  isMultiple
                    ? `die folgenden ${resourceNames.length} Power Storys, die wir gemeinsam erstellt haben, sind jetzt für dich hinterlegt:`
                    : `deine persönliche Power Story, die wir gemeinsam erstellt haben, ist jetzt für dich hinterlegt und jederzeit abrufbar.`
                }
              </p>

              <!-- Ressourcen -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fde9c8; border-radius: 14px; padding: 6px 22px; margin-bottom: 30px;">
                ${
                  isMultiple
                    ? resourceItems
                    : `
                <tr>
                  <td style="padding: 16px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="30" valign="top" style="font-size: 17px; line-height: 26px; color: #d97706;">&#9834;</td>
                        <td style="font-family: Georgia, 'Times New Roman', serif; font-size: 19px; line-height: 26px; color: #7c2d12;">${resourceNames[0]}</td>
                      </tr>
                    </table>
                  </td>
                </tr>`
                }
              </table>

              <!-- Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 26px;">
                    <a href="${magicLink}"
                       style="display: inline-block; background-color: #d97706; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: 600; line-height: 20px; text-decoration: none; padding: 17px 44px; border-radius: 999px;">
                      ${isNewUser ? 'Power Story öffnen' : 'Zu deiner Power Story'}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Gültigkeit -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid #fef3c7; padding-top: 22px;">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 23px; color: #a16207;">
                    ${gueltigkeit}
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 23px; color: #a16207;">
                    Wenn du magst, kannst du dir im Bereich <a href="${zugangUrl}" style="color: #d97706; text-decoration: underline;">Zugang</a> ein Passwort einrichten &ndash; dann kommst du auch ohne diese E-Mail hinein. Nötig ist das nicht.
                  </td>
                </tr>
              </table>

              <p style="margin: 30px 0 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 17px; line-height: 27px; color: #7c2d12;">
                Herzliche Grüße<br>
                <strong style="font-weight: 600;">Andreas</strong>
              </p>

            </td>
          </tr>

          <!-- Ersatz-Link -->
          <tr>
            <td style="background-color: #ffffff; padding: 0 40px 34px; border-left: 1px solid #fde9c8; border-right: 1px solid #fde9c8; border-bottom: 1px solid #fde9c8; border-radius: 0 0 20px 20px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-top: 1px solid #fef3c7; padding-top: 22px;">
                <tr>
                  <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 21px; color: #b45309;">
                    Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
                    <a href="${magicLink}" style="color: #d97706; word-break: break-all; text-decoration: none;">${magicLink}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fuß -->
          <tr>
            <td align="center" style="padding: 26px 20px 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 20px; color: #c2954a;">
              Power Storys &middot; Andreas von Knobelsdorff<br>
              <a href="${appBaseUrl}" style="color: #c2954a; text-decoration: none;">${appBaseUrl.replace(/^https?:\/\//, '')}</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/** Text-Variante – verbessert die Zustellbarkeit und hilft Screenreadern. */
const getEmailText = (
  resourceNames: string[],
  magicLink: string,
  expiresAt?: Date
): string => {
  const appBaseUrl = getAppBaseUrl();
  const isMultiple = resourceNames.length > 1;

  const intro = isMultiple
    ? `die folgenden ${resourceNames.length} Power Storys, die wir gemeinsam erstellt haben, sind jetzt für dich hinterlegt:\n\n${resourceNames.map((n) => `  - ${n}`).join('\n')}`
    : `deine persönliche Power Story "${resourceNames[0]}", die wir gemeinsam erstellt haben, ist jetzt für dich hinterlegt und jederzeit abrufbar.`;

  const gueltigkeit = expiresAt
    ? `Dieser Link bleibt bis zum ${formatGermanDate(expiresAt)} gültig - du kannst ihn so oft öffnen, wie du magst.`
    : `Bewahre diese E-Mail auf - über den Link kommst du jederzeit zu deiner Power Story.`;

  return `Hallo,

${intro}

Hier geht es zu deiner Power Story:
${magicLink}

${gueltigkeit}

Wenn du magst, kannst du dir unter ${appBaseUrl}/zugang ein Passwort einrichten -
dann kommst du auch ohne diese E-Mail hinein. Nötig ist das nicht.

Herzliche Grüße
Andreas

--
Power Storys - Andreas von Knobelsdorff
${appBaseUrl.replace(/^https?:\/\//, '')}
`;
};

export async function sendResourceReadyEmail({
  to,
  resourceName,
  resourceNames,
  magicLink,
  isNewUser = false,
  expiresAt,
}: SendResourceReadyEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalisiere resourceNames Array (für Rückwärtskompatibilität)
    const names = resourceNames || (resourceName ? [resourceName] : []);

    if (names.length === 0) {
      console.error('[Email] ❌ No resource names provided');
      return { success: false, error: 'Keine Ressourcennamen angegeben' };
    }

    console.log('[Email] sendResourceReadyEmail called:', {
      to,
      resourceNames: names,
      count: names.length,
      hasMagicLink: !!magicLink,
      isNewUser,
    });

    // Verwende Resend für Email-Versand
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'andreas@power-storys.de';
    const resendBccEmail = process.env.RESEND_BCC_EMAIL;
    const resendReplyTo = process.env.RESEND_REPLY_TO;

    console.log('[Email] Resend configuration check:', {
      hasApiKey: !!resendApiKey,
      fromEmail: resendFromEmail,
      bccEmail: resendBccEmail,
      replyTo: resendReplyTo,
    });

    if (resendApiKey) {
      try {
        console.log('[Email] Attempting to send email via Resend...');
        const resend = new Resend(resendApiKey);

        const isMultiple = names.length > 1;
        const subject = isNewUser
          ? (isMultiple ? `Willkommen! ${names.length} Power Storys warten auf dich` : 'Willkommen! Deine Power Story wartet auf dich')
          : (isMultiple ? `Deine ${names.length} Power Storys sind bereit!` : 'Deine Power Story ist bereit!');

        const emailOptions: any = {
          from: `Andreas <${resendFromEmail}>`,
          to: [to],
          subject,
          html: getEmailHTML(names, magicLink, isNewUser, expiresAt),
          text: getEmailText(names, magicLink, expiresAt),
        };

        // Füge BCC hinzu, falls konfiguriert
        if (resendBccEmail) {
          emailOptions.bcc = [resendBccEmail];
        }

        // Füge Reply-To hinzu, falls konfiguriert
        if (resendReplyTo) {
          emailOptions.replyTo = resendReplyTo;
        }

        const { data, error } = await resend.emails.send(emailOptions);

        if (error) {
          console.error('[Email] ❌ Resend email error:', error);
          return { success: false, error: error.message || 'Resend error' };
        }

        console.log('[Email] ✅ Email sent via Resend:', {
          id: data?.id,
        });
        return { success: true };
      } catch (resendError: any) {
        console.error('[Email] ❌ Resend email error:', {
          message: resendError?.message,
          stack: resendError?.stack,
        });
        return { success: false, error: resendError?.message || 'Resend error' };
      }
    } else {
      console.warn('[Email] ⚠️ Resend not configured - missing RESEND_API_KEY');
    }

    // Fallback - Logge Email-Details (für Development/Testing)
    const isMultiple = names.length > 1;
    console.log('\n=== 📧 EMAIL VERSENDEN (Development/Testing Mode) ===');
    console.log('An:', to);
    console.log('Betreff:', isMultiple ? `Deine ${names.length} Power Storys sind bereit!` : 'Deine Power Story ist bereit!');
    console.log('Ressourcen:', names);
    console.log('Magic Link:', magicLink);
    console.log('\n⚠️  HINWEIS: Email wird nicht wirklich versendet.');
    console.log('   Um Emails zu versenden, konfiguriere Resend in .env.local:');
    console.log('   RESEND_API_KEY=your-api-key');
    console.log('   RESEND_FROM_EMAIL=andreas@power-storys.de');
    console.log('==================================================\n');

    // In Development: Email-Text in Console ausgeben (identisch zur Text-Variante)
    if (process.env.NODE_ENV === 'development') {
      const isMultiple = names.length > 1;
      console.log('\n📧 EMAIL-VORSCHAU:');
      console.log(`Betreff: ${isMultiple ? `Deine ${names.length} Power Storys sind bereit!` : 'Deine Power Story ist bereit!'}`);
      console.log(getEmailText(names, magicLink, expiresAt));
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending resource ready email:', error);
    return { success: false, error: error.message };
  }
}

interface SendAdminConfirmationEmailParams {
  to: string; // Admin-Email
  clientEmail: string; // Klienten-Email
  resourceNames: string[];
  success: boolean;
  error?: string;
}

const getAdminConfirmationEmailHTML = (
  clientEmail: string,
  resourceNames: string[],
  success: boolean,
  error?: string
) => {
  const isMultiple = resourceNames.length > 1;
  const resourceNamesList = resourceNames.map(name => `<li style="margin-bottom: 8px;"><strong>"${name}"</strong></li>`).join('');
  
  if (!success) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⚠️ Fehler beim Versenden</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Beim Versenden der Power Storys an <strong>${clientEmail}</strong> ist ein Fehler aufgetreten.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px; color: #ef4444;">
      <strong>Fehler:</strong> ${error || 'Unbekannter Fehler'}
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      Bitte prüfe die Server-Logs für weitere Details.
    </p>
  </div>
</body>
</html>
`;
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Power Storys erfolgreich versendet</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Die folgenden ${isMultiple ? `${resourceNames.length} Power Storys` : 'Power Story'} wurde${isMultiple ? 'n' : ''} erfolgreich an <strong>${clientEmail}</strong> versendet:
    </p>
    
    ${isMultiple ? `
    <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px; list-style-type: disc;">
      ${resourceNamesList}
    </ul>
    ` : `
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>"${resourceNames[0]}"</strong>
    </p>
    `}
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      Der Klient hat eine E-Mail mit Magic Link erhalten und kann sich nun anmelden, um auf ${isMultiple ? 'seine Power Storys' : 'seine Power Story'} zuzugreifen.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Power Storys - Andreas von Knobelsdorff</p>
  </div>
</body>
</html>
`;
};

export async function sendAdminConfirmationEmail({
  to,
  clientEmail,
  resourceNames,
  success,
  error,
}: SendAdminConfirmationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    if (resourceNames.length === 0) {
      console.error('[Email] ❌ No resource names provided for admin confirmation');
      return { success: false, error: 'Keine Ressourcennamen angegeben' };
    }

    console.log('[Email] sendAdminConfirmationEmail called:', {
      to,
      clientEmail,
      resourceNames,
      count: resourceNames.length,
      success,
    });

    // Verwende Resend für Email-Versand
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'andreas@power-storys.de';
    const resendBccEmail = process.env.RESEND_BCC_EMAIL;
    const resendReplyTo = process.env.RESEND_REPLY_TO;

    if (resendApiKey) {
      try {
        console.log('[Email] Attempting to send admin confirmation email via Resend...');
        const resend = new Resend(resendApiKey);

        const isMultiple = resourceNames.length > 1;
        const emailOptions: any = {
          from: `Andreas <${resendFromEmail}>`,
          to: [to],
          subject: success
            ? `✅ ${isMultiple ? `${resourceNames.length} Power Storys` : 'Power Story'} erfolgreich an ${clientEmail} versendet`
            : `⚠️ Fehler beim Versenden an ${clientEmail}`,
          html: getAdminConfirmationEmailHTML(clientEmail, resourceNames, success, error),
        };

        // Füge BCC hinzu, falls konfiguriert
        if (resendBccEmail) {
          emailOptions.bcc = [resendBccEmail];
        }

        // Füge Reply-To hinzu, falls konfiguriert
        if (resendReplyTo) {
          emailOptions.replyTo = resendReplyTo;
        }

        const { data, error: resendError } = await resend.emails.send(emailOptions);

        if (resendError) {
          console.error('[Email] ❌ Resend error sending admin confirmation:', resendError);
          return { success: false, error: resendError.message || 'Resend error' };
        }

        console.log('[Email] ✅ Admin confirmation email sent via Resend:', {
          id: data?.id,
        });
        return { success: true };
      } catch (resendError: any) {
        console.error('[Email] ❌ Resend error sending admin confirmation:', {
          message: resendError?.message,
        });
        return { success: false, error: resendError?.message || 'Resend error' };
      }
    } else {
      console.warn('[Email] ⚠️ Resend not configured - admin confirmation email not sent');
      // Fallback: Logge in Development
      const isMultiple = resourceNames.length > 1;
      console.log('\n=== 📧 ADMIN-BESTÄTIGUNG (Development Mode) ===');
      console.log('An:', to);
      console.log('Betreff:', success
        ? `✅ ${isMultiple ? `${resourceNames.length} Power Storys` : 'Power Story'} erfolgreich an ${clientEmail} versendet`
        : `⚠️ Fehler beim Versenden an ${clientEmail}`);
      console.log('Klient:', clientEmail);
      console.log('Power Storys:', resourceNames);
      console.log('Erfolg:', success);
      if (error) console.log('Fehler:', error);
      console.log('==================================================\n');
      
      // WICHTIG: Wenn SMTP nicht konfiguriert ist, wurde die E-Mail NICHT versendet
      return { success: false, error: 'SMTP nicht konfiguriert - E-Mail wurde nicht versendet' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Email] Error sending admin confirmation email:', error);
    return { success: false, error: error.message };
  }
}

