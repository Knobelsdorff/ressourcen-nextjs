/**
 * Email-Service für benutzerdefinierte Emails
 * Verwendet Supabase SMTP (wenn konfiguriert) oder nodemailer mit SMTP
 */

interface SendResourceReadyEmailParams {
  to: string;
  resourceName: string;
  magicLink: string;
}

const getEmailHTML = (resourceName: string, magicLink: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Deine Ressource ist bereit!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      Hallo,
    </p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      Deine persönliche Ressource <strong>"${resourceName}"</strong> wurde für dich erstellt und ist jetzt verfügbar.
    </p>
    
    <p style="font-size: 16px; margin-bottom: 30px;">
      Klicke auf den Button unten, um dich anzumelden und auf deine Ressource zuzugreifen:
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

export async function sendResourceReadyEmail({
  to,
  resourceName,
  magicLink,
}: SendResourceReadyEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Option 1: Nodemailer mit SMTP (für Supabase SMTP oder andere SMTP-Server)
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER; // Username für SMTP-Authentifizierung (kann anders sein als Email)
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM_EMAIL || 'noreply@ressourcen.app'; // Absender-Email (wird in Email angezeigt)

    if (smtpHost && smtpPort && smtpUser && smtpPassword) {
      try {
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

        const info = await transporter.sendMail({
          from: `"Ressourcen App" <${smtpFrom}>`,
          to: to,
          subject: 'Deine Ressource ist bereit!',
          html: getEmailHTML(resourceName, magicLink),
        });

        console.log('Email sent via SMTP:', info.messageId);
        return { success: true };
      } catch (smtpError: any) {
        console.error('SMTP email error:', smtpError);
        // Fallback zu Logging
      }
    }

    // Option 2: Fallback - Logge Email-Details (für Development/Testing)
    console.log('\n=== 📧 EMAIL VERSENDEN (Development/Testing Mode) ===');
    console.log('An:', to);
    console.log('Betreff: Deine Ressource ist bereit!');
    console.log('Ressource:', resourceName);
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
      console.log('\n📧 EMAIL-VORSCHAU:');
      console.log(`Betreff: Deine Ressource ist bereit!`);
      console.log(`\nHallo,\n\nDeine persönliche Ressource "${resourceName}" wurde für dich erstellt und ist jetzt verfügbar.\n\nKlicke auf diesen Link, um dich anzumelden:\n${magicLink}\n\nDieser Link ist 24 Stunden gültig.\n`);
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending resource ready email:', error);
    return { success: false, error: error.message };
  }
}

