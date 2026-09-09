# Analytics-Tracking Test

## Test-Anleitung

1. **Öffne die Browser-Konsole** (F12 → Console)
2. **Stelle sicher, dass du eingeloggt bist**
3. **Führe diesen Code in der Konsole aus:**

```javascript
// Test-Funktion für Analytics-Tracking
async function testAnalytics() {
  console.log('=== Testing Analytics Tracking ===');
  
  // Hole Session-Token
  const { createSPAClient } = await import('/src/lib/supabase/client.js');
  const supabase = createSPAClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('❌ Bitte zuerst einloggen!');
    return;
  }
  
  console.log('✅ Session gefunden, starte Tests...\n');
  
  // Test 1: resource_created
  console.log('1. Testing resource_created...');
  const res1 = await fetch('/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    credentials: 'include',
    body: JSON.stringify({
      eventType: 'resource_created',
      resourceFigureName: 'Test Ressourcenfigur',
      voiceId: 'test_voice',
    }),
  });
  console.log(res1.ok ? '✅ resource_created OK' : '❌ resource_created FAILED');
  console.log('Response:', await res1.json());
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Test 2: audio_play
  console.log('\n2. Testing audio_play...');
  const res2 = await fetch('/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    credentials: 'include',
    body: JSON.stringify({
      eventType: 'audio_play',
      resourceFigureName: 'Test Ressourcenfigur',
      voiceId: 'test_voice',
    }),
  });
  console.log(res2.ok ? '✅ audio_play OK' : '❌ audio_play FAILED');
  console.log('Response:', await res2.json());
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Test 3: audio_play_complete
  console.log('\n3. Testing audio_play_complete...');
  const res3 = await fetch('/api/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    credentials: 'include',
    body: JSON.stringify({
      eventType: 'audio_play_complete',
      resourceFigureName: 'Test Ressourcenfigur',
      voiceId: 'test_voice',
      metadata: { completed: true, audioDuration: 120 },
    }),
  });
  console.log(res3.ok ? '✅ audio_play_complete OK' : '❌ audio_play_complete FAILED');
  console.log('Response:', await res3.json());
  
  console.log('\n=== Test Complete ===');
  console.log('Öffne jetzt: http://localhost:3000/admin/analytics');
  console.log('Die neuen Events sollten angezeigt werden!');
}

// Führe Test aus
testAnalytics();
```

## Alternative: Test über die App

1. **Erstelle eine neue Ressource:**
   - Gehe zu `http://localhost:3000`
   - Wähle eine Ressourcenfigur
   - Beantworte die Fragen
   - Speichere die Ressource
   - → Sollte `resource_created` Event erzeugen

2. **Spiele Audio ab:**
   - Nach dem Erstellen der Ressource, spiele das Audio ab
   - → Sollte `audio_play` Event erzeugen
   - Lass das Audio vollständig abspielen
   - → Sollte `audio_play_complete` Event erzeugen

3. **Prüfe Admin Analytics:**
   - Gehe zu `http://localhost:3000/admin/analytics`
   - Die neuen Events sollten angezeigt werden

## Troubleshooting

- **401 Unauthorized:** Bitte zuerst einloggen
- **Keine Events sichtbar:** Prüfe Browser-Konsole für Fehler
- **Events werden nicht getrackt:** Prüfe Terminal-Logs (wo `next dev` läuft)

