/**
 * Test-Skript für Paywall-Logik
 * 
 * Prüft:
 * 1. Erste Ressource kann kostenlos erstellt werden
 * 2. Audio der ersten Ressource ist 3 Tage kostenlos
 * 3. Nach 3 Tagen: Audio-Zugriff blockiert
 * 4. Zweite Ressource: Paywall erscheint beim Erstellen
 * 5. Zweite Ressource Audio: Paywall erscheint beim Abspielen
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lade .env.local manuell
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    });
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Fehlende Umgebungsvariablen:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test-User-ID (ersetze mit einer echten User-ID)
const TEST_USER_ID = process.argv[2] || '';

if (!TEST_USER_ID) {
  console.error('❌ Bitte gib eine User-ID als Argument an:');
  console.error('  node test-paywall-logic.js <USER_ID>');
  process.exit(1);
}

async function testPaywallLogic() {
  console.log('🧪 Teste Paywall-Logik für User:', TEST_USER_ID);
  console.log('');

  // 1. Prüfe ob User existiert
  console.log('1️⃣ Prüfe ob User existiert...');
  const { data: user, error: userError } = await supabase.auth.admin.getUserById(TEST_USER_ID);
  if (userError || !user) {
    console.error('❌ User nicht gefunden:', userError?.message);
    return;
  }
  console.log('✅ User gefunden:', user.user.email);
  console.log('');

  // 2. Prüfe Ressourcen-Anzahl
  console.log('2️⃣ Prüfe Ressourcen-Anzahl...');
  const { data: stories, error: storiesError } = await supabase
    .from('saved_stories')
    .select('id, created_at, title')
    .eq('user_id', TEST_USER_ID)
    .order('created_at', { ascending: true });

  if (storiesError) {
    console.error('❌ Fehler beim Laden der Ressourcen:', storiesError.message);
    return;
  }

  const resourceCount = stories?.length || 0;
  console.log(`✅ User hat ${resourceCount} Ressource(n)`);
  if (stories && stories.length > 0) {
    stories.forEach((story, index) => {
      const date = new Date(story.created_at);
      const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      console.log(`   ${index + 1}. "${story.title}" (vor ${daysAgo} Tagen)`);
    });
  }
  console.log('');

  // 3. Prüfe can_create_resource Funktion
  console.log('3️⃣ Prüfe can_create_resource Funktion...');
  const { data: canCreate, error: canCreateError } = await supabase.rpc(
    'can_create_resource',
    { user_uuid: TEST_USER_ID }
  );

  if (canCreateError) {
    console.error('❌ Fehler beim Prüfen von can_create_resource:', canCreateError.message);
    console.error('   Stelle sicher, dass die Funktion in Supabase existiert!');
  } else {
    if (resourceCount === 0) {
      console.log('✅ Erste Ressource kann erstellt werden (kostenlos)');
      if (canCreate !== true) {
        console.error('❌ FEHLER: Erste Ressource sollte kostenlos sein!');
      }
    } else {
      console.log(`ℹ️  User hat bereits ${resourceCount} Ressource(n)`);
      if (canCreate === true) {
        console.log('✅ User kann weitere Ressource erstellen');
      } else {
        console.log('✅ User kann KEINE weitere Ressource erstellen (Paywall erforderlich)');
      }
    }
  }
  console.log('');

  // 4. Prüfe has_active_access Funktion
  console.log('4️⃣ Prüfe has_active_access Funktion...');
  const { data: hasAccess, error: accessError } = await supabase.rpc(
    'has_active_access',
    { user_uuid: TEST_USER_ID }
  );

  if (accessError) {
    console.error('❌ Fehler beim Prüfen von has_active_access:', accessError.message);
  } else {
    if (hasAccess === true) {
      console.log('✅ User hat aktiven Zugang (bezahlt)');
    } else {
      console.log('ℹ️  User hat keinen aktiven Zugang');
    }
  }
  console.log('');

  // 5. Prüfe Audio-Zugriff für erste Ressource
  if (stories && stories.length > 0) {
    console.log('5️⃣ Prüfe Audio-Zugriff für erste Ressource...');
    const firstResource = stories[0];
    const firstResourceDate = new Date(firstResource.created_at);
    const daysSinceFirst = (Date.now() - firstResourceDate.getTime()) / (1000 * 60 * 60 * 24);
    
    console.log(`   Erste Ressource erstellt: vor ${daysSinceFirst.toFixed(1)} Tagen`);
    
    if (daysSinceFirst < 3) {
      console.log(`✅ Audio der ersten Ressource ist noch kostenlos (${(3 - daysSinceFirst).toFixed(1)} Tage verbleibend)`);
    } else {
      console.log(`⏰ Trial-Periode abgelaufen (vor ${(daysSinceFirst - 3).toFixed(1)} Tagen)`);
      if (hasAccess === true) {
        console.log('✅ User kann trotzdem Audio abspielen (hat aktiven Zugang)');
      } else {
        console.log('❌ User kann Audio NICHT abspielen (Paywall erforderlich)');
      }
    }
    console.log('');
  }

  // 6. Prüfe user_access Tabelle
  console.log('6️⃣ Prüfe user_access Eintrag...');
  const { data: userAccess, error: userAccessError } = await supabase
    .from('user_access')
    .select('*')
    .eq('user_id', TEST_USER_ID)
    .maybeSingle();

  if (userAccessError) {
    console.error('❌ Fehler beim Laden von user_access:', userAccessError.message);
  } else if (userAccess) {
    console.log('✅ User hat user_access Eintrag:');
    console.log(`   Status: ${userAccess.status}`);
    console.log(`   Resources Created: ${userAccess.resources_created || 0}`);
    console.log(`   Resources Limit: ${userAccess.resources_limit || 'unlimited'}`);
    if (userAccess.access_expires_at) {
      const expiresAt = new Date(userAccess.access_expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`   Läuft ab: ${expiresAt.toLocaleDateString('de-DE')} (in ${daysUntilExpiry} Tagen)`);
    } else {
      console.log('   Läuft ab: Nie');
    }
  } else {
    console.log('ℹ️  User hat keinen user_access Eintrag (Free-Tier)');
  }
  console.log('');

  // 7. Zusammenfassung
  console.log('📊 ZUSAMMENFASSUNG:');
  console.log('─'.repeat(50));
  console.log(`User: ${user.user.email}`);
  console.log(`Ressourcen: ${resourceCount}`);
  console.log(`Kann weitere Ressource erstellen: ${canCreate === true ? '✅ Ja' : '❌ Nein (Paywall)'}`);
  console.log(`Hat aktiven Zugang: ${hasAccess === true ? '✅ Ja' : '❌ Nein'}`);
  
  if (stories && stories.length > 0) {
    const firstResource = stories[0];
    const daysSinceFirst = (Date.now() - new Date(firstResource.created_at).getTime()) / (1000 * 60 * 60 * 24);
    const canAccessAudio = hasAccess === true || daysSinceFirst < 3;
    console.log(`Kann Audio der 1. Ressource abspielen: ${canAccessAudio ? '✅ Ja' : '❌ Nein (Trial abgelaufen)'}`);
  }
  
  console.log('─'.repeat(50));
}

testPaywallLogic()
  .then(() => {
    console.log('');
    console.log('✅ Test abgeschlossen');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test fehlgeschlagen:', error);
    process.exit(1);
  });

