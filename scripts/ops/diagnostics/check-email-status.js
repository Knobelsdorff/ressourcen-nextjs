// Script zum Prüfen des E-Mail-Status
// Führe aus mit: node check-email-status.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase-Konfiguration fehlt in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkEmailStatus() {
  console.log('\n🔍 Prüfe E-Mail-Versand-Status...\n');

  // Prüfe SMTP-Konfiguration
  console.log('📧 SMTP-Konfiguration:');
  const smtpConfig = {
    SMTP_HOST: process.env.SMTP_HOST ? '✅ Gesetzt' : '❌ Nicht gesetzt',
    SMTP_PORT: process.env.SMTP_PORT ? '✅ Gesetzt' : '❌ Nicht gesetzt',
    SMTP_USER: process.env.SMTP_USER ? '✅ Gesetzt' : '❌ Nicht gesetzt',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '✅ Gesetzt' : '❌ Nicht gesetzt',
    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@ressourcen.app',
  };
  console.table(smtpConfig);

  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.log('\n⚠️  WARNUNG: SMTP ist nicht vollständig konfiguriert!');
    console.log('   E-Mails werden nur geloggt, aber nicht wirklich versendet.\n');
  }

  // Prüfe letzte Ressourcen mit client_email
  console.log('\n📦 Letzte Ressourcen mit client_email (letzte 24 Stunden):');
  const { data: resources, error } = await supabase
    .from('saved_stories')
    .select('id, title, client_email, created_at, audio_url, is_audio_only, user_id')
    .not('client_email', 'is', null)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ Fehler beim Abrufen der Ressourcen:', error);
    return;
  }

  if (resources && resources.length > 0) {
    console.table(
      resources.map(r => ({
        Titel: r.title,
        'Klientin': r.client_email,
        'Erstellt': new Date(r.created_at).toLocaleString('de-DE'),
        'Audio': r.audio_url ? '✅' : '❌',
        'Status': r.user_id ? '✅ Zugeordnet' : '⏳ Pending',
      }))
    );

    // Gruppiere nach Klientin
    console.log('\n📊 Zusammenfassung nach Klientin:');
    const byClient = {};
    resources.forEach(r => {
      if (!byClient[r.client_email]) {
        byClient[r.client_email] = {
          total: 0,
          pending: 0,
          assigned: 0,
          latest: null,
        };
      }
      byClient[r.client_email].total++;
      if (r.user_id) {
        byClient[r.client_email].assigned++;
      } else {
        byClient[r.client_email].pending++;
      }
      if (!byClient[r.client_email].latest || new Date(r.created_at) > new Date(byClient[r.client_email].latest)) {
        byClient[r.client_email].latest = r.created_at;
      }
    });

    console.table(
      Object.entries(byClient).map(([email, stats]) => ({
        'Klientin': email,
        'Gesamt': stats.total,
        'Pending': stats.pending,
        'Zugeordnet': stats.assigned,
        'Letzte Erstellung': new Date(stats.latest).toLocaleString('de-DE'),
      }))
    );
  } else {
    console.log('ℹ️  Keine Ressourcen mit client_email in den letzten 24 Stunden gefunden.');
  }

  console.log('\n✅ Prüfung abgeschlossen.\n');
}

checkEmailStatus().catch(console.error);

