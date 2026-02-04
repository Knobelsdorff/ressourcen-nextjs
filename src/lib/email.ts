/**
 * Email-Service für benutzerdefinierte Emails
 * Verwendet Resend für Email-Versand
 */

import { Resend } from 'resend';

interface SendResourceReadyEmailParams {
  to: string;
  resourceName?: string; // Für Rückwärtskompatibilität
  resourceNames?: string[]; // Array von Ressourcennamen
  magicLink: string;
  isNewUser?: boolean; // Ob der User neu ist und Passwort einrichten muss
}

const getEmailHTML = (resourceNames: string[], magicLink: string, isNewUser: boolean = false) => {
  const isMultiple = resourceNames.length > 1;
  const resourceNamesList = resourceNames.map(name => `<li style="margin-bottom: 8px;"><strong>"${name}"</strong></li>`).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">${isMultiple ? 'Deine Power Story ist bereit!' : 'Deine Power Story ist bereit!'}</h1>
  </div>

  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hallo,
    </p>

    <p style="font-size: 16px; margin-bottom: 20px;">
      ${isMultiple
        ? `Die folgenden ${resourceNames.length} Power Storys wurden für dich erstellt und sind jetzt verfügbar:`
        : `Deine persönliche Power Story <strong>"${resourceNames[0]}"</strong> wurde für dich erstellt und ist jetzt verfügbar.`
      }
    </p>

    ${isMultiple ? `
    <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px; list-style-type: disc;">
      ${resourceNamesList}
    </ul>
    ` : ''}

    ${isNewUser ? `
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="font-size: 15px; margin: 0; color: #92400e;">
        <strong>Wichtig:</strong> Dies ist dein erster Zugang. Bitte klicke auf den Button unten, um ein Passwort einzurichten.
        Danach kannst du dich jederzeit mit deiner E-Mail und deinem Passwort anmelden.
      </p>
    </div>
    ` : ''}

    <p style="font-size: 16px; margin-bottom: 30px;">
      Klicke auf den Button unten, um ${isNewUser ? 'dein Passwort einzurichten und' : 'dich anzumelden und'} auf ${isMultiple ? 'deine Power Storys' : 'deine Power Story'} zuzugreifen:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}"
         style="display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        ${isNewUser ? 'Passwort einrichten' : 'Zur Ressource'}
      </a>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
      <a href="${magicLink}" style="color: #f59e0b; word-break: break-all;">${magicLink}</a>
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      Dieser Link ist 24 Stunden gültig.
    </p>

    ${!isNewUser ? `
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      <strong>Tipp:</strong> Du kannst dich auch jederzeit mit deiner E-Mail und deinem Passwort anmelden.
    </p>
    ` : ''}
  </div>

  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Power Storys - Andreas von Knobelsdorff</p>
    <p><a href="https://www.power-storys.de">www.power-storys.de</a></p>
  </div>
</body>
</html>
`;
};

export async function sendResourceReadyEmail({
  to,
  resourceName,
  resourceNames,
  magicLink,
  isNewUser = false,
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
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@power-storys.de';

    console.log('[Email] Resend configuration check:', {
      hasApiKey: !!resendApiKey,
      fromEmail: resendFromEmail,
    });

    if (resendApiKey) {
      try {
        console.log('[Email] Attempting to send email via Resend...');
        const resend = new Resend(resendApiKey);

        const isMultiple = names.length > 1;
        const subject = isNewUser
          ? (isMultiple ? `Willkommen! ${names.length} Power Storys warten auf dich` : 'Willkommen! Deine Power Story wartet auf dich')
          : (isMultiple ? `Deine ${names.length} Power Storys sind bereit!` : 'Deine Power Story ist bereit!');

        const { data, error } = await resend.emails.send({
          from: `Andreas <${resendFromEmail}>`,
          to: [to],
          subject,
          html: getEmailHTML(names, magicLink, isNewUser),
        });

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
    console.log('   RESEND_FROM_EMAIL=noreply@power-storys.de');
    console.log('==================================================\n');

    // In Development: Magic Link in Console ausgeben
    if (process.env.NODE_ENV === 'development') {
      const isMultiple = names.length > 1;
      console.log('\n📧 EMAIL-VORSCHAU:');
      console.log(`Betreff: ${isMultiple ? `Deine ${names.length} Power Storys sind bereit!` : 'Deine Power Story ist bereit!'}`);
      if (isMultiple) {
        console.log(`\nHallo,\n\nDie folgenden ${names.length} Power Storys wurden für dich erstellt:\n${names.map(n => `- "${n}"`).join('\n')}\n\nKlicke auf diesen Link, um dich anzumelden:\n${magicLink}\n\nDieser Link ist 24 Stunden gültig.\n`);
      } else {
        console.log(`\nHallo,\n\nDeine persönliche Power Story "${names[0]}" wurde für dich erstellt und ist jetzt verfügbar.\n\nKlicke auf diesen Link, um dich anzumelden:\n${magicLink}\n\nDieser Link ist 24 Stunden gültig.\n`);
      }
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
    const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@power-storys.de';

    if (resendApiKey) {
      try {
        console.log('[Email] Attempting to send admin confirmation email via Resend...');
        const resend = new Resend(resendApiKey);

        const isMultiple = resourceNames.length > 1;
        const { data, error: resendError } = await resend.emails.send({
          from: `Andreas <${resendFromEmail}>`,
          to: [to],
          subject: success
            ? `✅ ${isMultiple ? `${resourceNames.length} Power Storys` : 'Power Story'} erfolgreich an ${clientEmail} versendet`
            : `⚠️ Fehler beim Versenden an ${clientEmail}`,
          html: getAdminConfirmationEmailHTML(clientEmail, resourceNames, success, error),
        });

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

