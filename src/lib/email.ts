/**
 * Email-Service für benutzerdefinierte Emails
 * Verwendet Supabase SMTP (wenn konfiguriert) oder nodemailer mit SMTP
 */

interface SendResourceReadyEmailParams {
  to: string;
  resourceName?: string; // Für Rückwärtskompatibilität
  resourceNames?: string[]; // Array von Ressourcennamen
  magicLink: string;
}

const getEmailHTML = (resourceNames: string[], magicLink: string) => {
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
    <h1 style="color: white; margin: 0; font-size: 28px;">${isMultiple ? 'Deine Ressourcen sind bereit!' : 'Deine Ressource ist bereit!'}</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hallo,
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      ${isMultiple 
        ? `Die folgenden ${resourceNames.length} Ressourcen wurden für dich erstellt und sind jetzt verfügbar:`
        : `Deine persönliche Ressource <strong>"${resourceNames[0]}"</strong> wurde für dich erstellt und ist jetzt verfügbar.`
      }
    </p>
    
    ${isMultiple ? `
    <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px; list-style-type: disc;">
      ${resourceNamesList}
    </ul>
    ` : ''}
    
    <p style="font-size: 16px; margin-bottom: 30px;">
      Klicke auf den Button unten, um dich anzumelden und auf ${isMultiple ? 'deine Ressourcen' : 'deine Ressource'} zuzugreifen:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLink}" 
         style="display: inline-block; background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
        Zur Ressource
      </a>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
      <a href="${magicLink}" style="color: #f59e0b; word-break: break-all;">${magicLink}</a>
    </p>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
      Dieser Link ist 24 Stunden gültig.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Ressourcen App - Andreas von Knobelsdorff</p>
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
    });
    
    // Option 1: Nodemailer mit SMTP (für Supabase SMTP oder andere SMTP-Server)
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER; // Username für SMTP-Authentifizierung (kann anders sein als Email)
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM_EMAIL || 'noreply@ressourcen.app'; // Absender-Email (wird in Email angezeigt)

    console.log('[Email] SMTP configuration check:', {
      hasHost: !!smtpHost,
      hasPort: !!smtpPort,
      hasUser: !!smtpUser,
      hasPassword: !!smtpPassword,
      fromEmail: smtpFrom,
    });

    if (smtpHost && smtpPort && smtpUser && smtpPassword) {
      try {
        console.log('[Email] Attempting to send email via SMTP...');
        const nodemailer = await import('nodemailer');
        
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: parseInt(smtpPort) === 465, // true for 465, false for andere Ports
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });

        // Teste SMTP-Verbindung
        console.log('[Email] Verifying SMTP connection...');
        await transporter.verify();
        console.log('[Email] ✅ SMTP connection verified');

        console.log('[Email] Sending email...');
        const isMultiple = names.length > 1;
        const info = await transporter.sendMail({
          from: `"Ressourcen App" <${smtpFrom}>`,
          to: to,
          subject: isMultiple ? `Deine ${names.length} Ressourcen sind bereit!` : 'Deine Ressource ist bereit!',
          html: getEmailHTML(names, magicLink),
        });

        console.log('[Email] ✅ Email sent via SMTP:', {
          messageId: info.messageId,
          response: info.response,
          accepted: info.accepted,
          rejected: info.rejected,
        });
        return { success: true };
      } catch (smtpError: any) {
        console.error('[Email] ❌ SMTP email error:', {
          message: smtpError?.message,
          code: smtpError?.code,
          command: smtpError?.command,
          response: smtpError?.response,
          responseCode: smtpError?.responseCode,
          stack: smtpError?.stack,
        });
        // Fallback zu Logging
        return { success: false, error: smtpError?.message || 'SMTP error' };
      }
    } else {
      console.warn('[Email] ⚠️ SMTP not configured - missing environment variables');
    }

    // Option 2: Fallback - Logge Email-Details (für Development/Testing)
    const isMultiple = names.length > 1;
    console.log('\n=== 📧 EMAIL VERSENDEN (Development/Testing Mode) ===');
    console.log('An:', to);
    console.log('Betreff:', isMultiple ? `Deine ${names.length} Ressourcen sind bereit!` : 'Deine Ressource ist bereit!');
    console.log('Ressourcen:', names);
    console.log('Magic Link:', magicLink);
    console.log('\n⚠️  HINWEIS: Email wird nicht wirklich versendet.');
    console.log('   Um Emails zu versenden, konfiguriere SMTP in .env.local:');
    console.log('   SMTP_HOST=smtp.gmail.com (oder dein SMTP-Server)');
    console.log('   SMTP_PORT=587');
    console.log('   SMTP_USER=deine-email@gmail.com');
    console.log('   SMTP_PASSWORD=dein-app-passwort');
    console.log('   SMTP_FROM_EMAIL=noreply@ressourcen.app');
    console.log('==================================================\n');
    
    // In Development: Magic Link in Console ausgeben
    if (process.env.NODE_ENV === 'development') {
      const isMultiple = names.length > 1;
      console.log('\n📧 EMAIL-VORSCHAU:');
      console.log(`Betreff: ${isMultiple ? `Deine ${names.length} Ressourcen sind bereit!` : 'Deine Ressource ist bereit!'}`);
      if (isMultiple) {
        console.log(`\nHallo,\n\nDie folgenden ${names.length} Ressourcen wurden für dich erstellt:\n${names.map(n => `- "${n}"`).join('\n')}\n\nKlicke auf diesen Link, um dich anzumelden:\n${magicLink}\n\nDieser Link ist 24 Stunden gültig.\n`);
      } else {
        console.log(`\nHallo,\n\nDeine persönliche Ressource "${names[0]}" wurde für dich erstellt und ist jetzt verfügbar.\n\nKlicke auf diesen Link, um dich anzumelden:\n${magicLink}\n\nDieser Link ist 24 Stunden gültig.\n`);
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
      Beim Versenden der Ressourcen an <strong>${clientEmail}</strong> ist ein Fehler aufgetreten.
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
    <h1 style="color: white; margin: 0; font-size: 28px;">✅ Ressourcen erfolgreich versendet</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Die folgenden ${isMultiple ? `${resourceNames.length} Ressourcen` : 'Ressource'} wurde${isMultiple ? 'n' : ''} erfolgreich an <strong>${clientEmail}</strong> versendet:
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
      Der Klient hat eine E-Mail mit Magic Link erhalten und kann sich nun anmelden, um auf ${isMultiple ? 'seine Ressourcen' : 'seine Ressource'} zuzugreifen.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Ressourcen App - Andreas von Knobelsdorff</p>
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
    
    // SMTP-Konfiguration (gleiche wie für Klienten-Emails)
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM_EMAIL || 'noreply@ressourcen.app';

    if (smtpHost && smtpPort && smtpUser && smtpPassword) {
      try {
        console.log('[Email] Attempting to send admin confirmation email via SMTP...');
        const nodemailer = await import('nodemailer');
        
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(smtpPort),
          secure: parseInt(smtpPort) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPassword,
          },
        });

        await transporter.verify();
        console.log('[Email] ✅ SMTP connection verified for admin confirmation');

        const isMultiple = resourceNames.length > 1;
        const info = await transporter.sendMail({
          from: `"Ressourcen App" <${smtpFrom}>`,
          to: to,
          subject: success 
            ? `✅ ${isMultiple ? `${resourceNames.length} Ressourcen` : 'Ressource'} erfolgreich an ${clientEmail} versendet`
            : `⚠️ Fehler beim Versenden an ${clientEmail}`,
          html: getAdminConfirmationEmailHTML(clientEmail, resourceNames, success, error),
        });

        console.log('[Email] ✅ Admin confirmation email sent via SMTP:', {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
        });
        return { success: true };
      } catch (smtpError: any) {
        console.error('[Email] ❌ SMTP error sending admin confirmation:', {
          message: smtpError?.message,
          code: smtpError?.code,
        });
        return { success: false, error: smtpError?.message || 'SMTP error' };
      }
    } else {
      console.warn('[Email] ⚠️ SMTP not configured - admin confirmation email not sent');
      // Fallback: Logge in Development
      const isMultiple = resourceNames.length > 1;
      console.log('\n=== 📧 ADMIN-BESTÄTIGUNG (Development Mode) ===');
      console.log('An:', to);
      console.log('Betreff:', success 
        ? `✅ ${isMultiple ? `${resourceNames.length} Ressourcen` : 'Ressource'} erfolgreich an ${clientEmail} versendet`
        : `⚠️ Fehler beim Versenden an ${clientEmail}`);
      console.log('Klient:', clientEmail);
      console.log('Ressourcen:', resourceNames);
      console.log('Erfolg:', success);
      if (error) console.log('Fehler:', error);
      console.log('==================================================\n');
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Email] Error sending admin confirmation email:', error);
    return { success: false, error: error.message };
  }
}

