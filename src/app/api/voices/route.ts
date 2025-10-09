import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured' }, { status: 500 });
    }

    // Prüfe, ob nur Collections verwendet werden sollen
    const url = new URL(request.url);
    const collectionsOnly = url.searchParams.get('collections_only') === 'true';

    // Lade Stimmen basierend auf collectionsOnly Parameter
    let voicesData;
    const collectionVoices = [];
    let collectionVoiceIds = new Set();
    
    if (collectionsOnly) {
      // Manuelle Liste der Collection-Stimmen (basierend auf deinem Screenshot)
      const manualCollectionVoiceIds = [
        // Männliche Stimmen
        'oae6GCCzwoEbfc5FHdEu', // William - soothing and calm
        '8TMmdpPgqHKvDOGYP2lN', // Gregory Grumble - Old lovable bedtime bear
        'iMHt6G42evkXunaDU065', // Stefan Rank der Erzähler (Radio-Moderator)
        'fNQuGwgi0iD0nacRyExh', // Timothy Twilight - Reupload
        // Weibliche Stimmen
        'E0OS48T5F0KU7O2NInWS', // Weibliche Stimme 1
        'SaqYcK3ZpDKBAImA8AdW', // Weibliche Stimme 2
        'Z3R5wn05IrDiVCyEkUrK', // Weibliche Stimme 3
        '8N2ng9i2uiUWqstgmWlH'  // Weibliche Stimme 4
      ];
      
      try {
        // Lade alle Stimmen und filtere nach Collection-IDs
        const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': apiKey,
          },
        });

        if (voicesResponse.ok) {
          const allVoicesData = await voicesResponse.json();
          
          // Filtere nur Collection-Stimmen
          const filteredVoices = allVoicesData.voices.filter((voice: any) => 
            manualCollectionVoiceIds.includes(voice.voice_id)
          );
          
          // Setze collectionVoiceIds für spätere Verwendung
          collectionVoiceIds = new Set(manualCollectionVoiceIds);
          
          voicesData = { voices: filteredVoices };
          console.log(`Loaded ${filteredVoices.length} voices from collections (manual list)`);
        } else {
          console.warn(`Voices API error: ${voicesResponse.status}, returning empty list`);
          voicesData = { voices: [] };
        }
      } catch (error) {
        console.warn('Voices API failed, returning empty list:', error);
        voicesData = { voices: [] };
      }
      // Setze collectionVoiceIds auch im Fehlerfall
      collectionVoiceIds = new Set(manualCollectionVoiceIds);
    } else {
      // Lade alle Stimmen (Standard-Verhalten)
      const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKey,
        },
      });

      if (!voicesResponse.ok) {
        throw new Error(`ElevenLabs voices API error: ${voicesResponse.status}`);
      }

      voicesData = await voicesResponse.json();
    }
    
    const data = { voices: voicesData.voices };
    
    // Kategorisiere Stimmen nach Charakteristika und Geschlecht
    const categorizeVoice = (voice: any) => {
      const name = voice.name.toLowerCase();
      const description = voice.description?.toLowerCase() || '';
      
      // Bestimme Geschlecht basierend auf Collection-IDs (manuelle Zuordnung)
      let isFemale = false;
      let isMale = false;
      
      // Collection-Stimmen mit manueller Geschlechtszuordnung
      const femaleCollectionIds = [
        'E0OS48T5F0KU7O2NInWS', // Lucy Fennek - Audiobook & Calm Narration
        'SaqYcK3ZpDKBAImA8AdW', // Jane Doe - Intimate
        'Z3R5wn05IrDiVCyEkUrK', // Arabella
        '8N2ng9i2uiUWqstgmWlH'  // Beth - gentle and nurturing
      ];
      
      const maleCollectionIds = [
        'oae6GCCzwoEbfc5FHdEu', // William - soothing and calm
        '8TMmdpPgqHKvDOGYP2lN', // Gregory Grumble - Old lovable bedtime bear
        'iMHt6G42evkXunaDU065', // Stefan Rank der Erzähler (Radio-Moderator)
        'fNQuGwgi0iD0nacRyExh'  // Timothy Twilight - Reupload
      ];
      
      if (femaleCollectionIds.includes(voice.voice_id)) {
        isFemale = true;
      } else if (maleCollectionIds.includes(voice.voice_id)) {
        isMale = true;
      } else {
        // Fallback: Erweiterte Geschlechtserkennung für andere Stimmen
        isFemale = name.includes('sarah') || name.includes('emma') || name.includes('anna') || 
                  name.includes('lily') || name.includes('lilly') || name.includes('claire') || 
                  name.includes('grace') || name.includes('sophie') || name.includes('maria') || 
                  name.includes('lisa') || name.includes('helen') || name.includes('kate') || 
                  name.includes('julia') || name.includes('rachel') || name.includes('jessica') ||
                  name.includes('nicole') || name.includes('samantha') || name.includes('amanda') ||
                  name.includes('jennifer') || name.includes('michelle') || name.includes('laura') ||
                  name.includes('susan') || name.includes('karen') || name.includes('nancy') ||
                  name.includes('betty') || name.includes('dorothy') || name.includes('sandra') ||
                  name.includes('donna') || name.includes('carol') || name.includes('ruth') ||
                  name.includes('sharon') || name.includes('michelle') || name.includes('laura') ||
                  name.includes('alice') || name.includes('matilda') || name.includes('brittney') ||
                  name.includes('arabella') || name.includes('danielle') || name.includes('jane') ||
                  name.includes('sanna') || name.includes('mila') || name.includes('lana') ||
                  name.includes('lucy') || name.includes('magdalena') || name.includes('elizabeth') ||
                  name.includes('beth') || name.includes('leonie') ||
                  description.includes('female') || description.includes('woman') || 
                  description.includes('girl') || description.includes('lady') ||
                  description.includes('feminine') || description.includes('mother') ||
                  description.includes('daughter') || description.includes('sister');
        
        isMale = name.includes('james') || name.includes('david') || name.includes('michael') ||
                name.includes('thomas') || name.includes('william') || name.includes('robert') ||
                name.includes('john') || name.includes('peter') || name.includes('alex') ||
                name.includes('daniel') || name.includes('mark') || name.includes('steve') ||
                name.includes('richard') || name.includes('charles') || name.includes('joseph') ||
                name.includes('christopher') || name.includes('matthew') || name.includes('anthony') ||
                name.includes('donald') || name.includes('steven') || name.includes('paul') ||
                name.includes('andrew') || name.includes('joshua') || name.includes('kenneth') ||
                name.includes('kevin') || name.includes('brian') || name.includes('george') ||
                name.includes('timothy') || name.includes('ronald') || name.includes('jason') ||
                name.includes('clyde') || name.includes('roger') || name.includes('charlie') ||
                name.includes('callum') || name.includes('river') || name.includes('harry') ||
                name.includes('liam') || name.includes('will') || name.includes('eric') ||
                name.includes('chris') || name.includes('bill') || name.includes('gregory') ||
                name.includes('stefan') || name.includes('william') ||
                description.includes('male') || description.includes('man') || 
                description.includes('boy') || description.includes('gentleman') ||
                description.includes('masculine') || description.includes('father') ||
                description.includes('son') || description.includes('brother');
      }
      
      // Mütterliche/fürsorgliche Stimmen (nur weibliche)
      if (isFemale && !isMale && (name.includes('sarah') || name.includes('emma') || name.includes('anna') || 
          name.includes('lily') || name.includes('claire') || name.includes('grace') ||
          name.includes('beth') || name.includes('elizabeth') || name.includes('lana') ||
          description.includes('warm') || description.includes('maternal') || 
          description.includes('caring') || description.includes('gentle') ||
          description.includes('nurturing') || description.includes('motherly'))) {
        return {
          type: 'maternal',
          gender: 'female',
          demoText: "Mein liebes Kind, ich bin hier für dich. Du bist geliebt und wertvoll, genau so wie du bist.",
          characteristics: ['warm', 'nurturing', 'protective']
        };
      }
      
      // Väterliche/weisheitsvolle Stimmen (nur männliche)
      if (isMale && !isFemale && (name.includes('james') || name.includes('david') || name.includes('michael') ||
          name.includes('thomas') || name.includes('william') || name.includes('robert') ||
          name.includes('daniel') || name.includes('timothy') ||
          description.includes('wise') || description.includes('strong') || 
          description.includes('authoritative') || description.includes('calm'))) {
        return {
          type: 'paternal',
          gender: 'male',
          demoText: "Du bist stark und fähig. Ich bin stolz auf dich und glaube an deine Kraft.",
          characteristics: ['wise', 'strong', 'protective']
        };
      }
      
      // Großelterliche/weisheitsvolle Stimmen (geschlechtsspezifisch)
      if (name.includes('grandma') || name.includes('grandmother') || 
          (isFemale && (description.includes('elderly') || description.includes('experienced')))) {
        return {
          type: 'elderly',
          gender: 'female',
          demoText: "Mein Schatz, ich habe so viel Liebe für dich. Du bist ein Geschenk in meinem Leben.",
          characteristics: ['wise', 'loving', 'experienced']
        };
      }
      
      if (name.includes('grandpa') || name.includes('grandfather') || 
          (isMale && (description.includes('elderly') || description.includes('experienced')))) {
        return {
          type: 'elderly',
          gender: 'male',
          demoText: "Mein Schatz, ich bin so stolz auf dich. Du bist ein Geschenk in meinem Leben.",
          characteristics: ['wise', 'loving', 'experienced']
        };
      }
      
      // Freundliche/unterstützende Stimmen (geschlechtsspezifisch)
      if (isFemale && (name.includes('friend') || name.includes('companion') || 
          description.includes('friendly') || description.includes('supportive') ||
          description.includes('companion'))) {
        return {
          type: 'friendly',
          gender: 'female',
          demoText: "Ich bin deine Freundin und Begleiterin. Zusammen sind wir stark und können alles schaffen.",
          characteristics: ['friendly', 'supportive', 'loyal']
        };
      }
      
      if (isMale && (name.includes('friend') || name.includes('companion') || 
          description.includes('friendly') || description.includes('supportive') ||
          description.includes('companion'))) {
        return {
          type: 'friendly',
          gender: 'male',
          demoText: "Ich bin dein Freund und Begleiter. Zusammen sind wir stark und können alles schaffen.",
          characteristics: ['friendly', 'supportive', 'loyal']
        };
      }
      
      // Standard für unbekannte Stimmen (geschlechtsspezifisch)
      return {
        type: 'neutral',
        gender: isFemale ? 'female' : isMale ? 'male' : 'unknown',
        demoText: "Ich bin hier für dich. Du bist nicht allein und ich begleite dich auf deinem Weg.",
        characteristics: ['neutral', 'calm', 'supportive']
      };
    };
    
    // Filtere und sortiere Stimmen nach Qualität (Creator-Account + Collections)
    const filterHighQualityVoices = (voices: any[]) => {
      return voices
        .filter(voice => {
          // Bevorzuge Collection-Stimmen, Premium-Stimmen und bekannte Qualitätsstimmen
          const isFromCollection = collectionVoiceIds.has(voice.voice_id);
          const isPremium = voice.category === 'premade' || voice.category === 'professional';
          const isKnownQuality = voice.name.toLowerCase().includes('sarah') || 
                                voice.name.toLowerCase().includes('emma') ||
                                voice.name.toLowerCase().includes('james') ||
                                voice.name.toLowerCase().includes('david') ||
                                voice.name.toLowerCase().includes('lily') ||
                                voice.name.toLowerCase().includes('claire') ||
                                voice.name.toLowerCase().includes('grace') ||
                                voice.name.toLowerCase().includes('michael') ||
                                voice.name.toLowerCase().includes('thomas');
          
          return isFromCollection || isPremium || isKnownQuality;
        })
        .sort((a, b) => {
          // Sortiere nach Qualität: Collection > Premium > Bekannte Namen > Andere
          const aQuality = (collectionVoiceIds.has(a.voice_id) ? 4 : 0) + 
                          (a.category === 'premade' ? 3 : 0) + 
                          (a.name.toLowerCase().includes('sarah') || a.name.toLowerCase().includes('emma') || a.name.toLowerCase().includes('james') ? 2 : 0);
          const bQuality = (collectionVoiceIds.has(b.voice_id) ? 4 : 0) + 
                          (b.category === 'premade' ? 3 : 0) + 
                          (b.name.toLowerCase().includes('sarah') || b.name.toLowerCase().includes('emma') || b.name.toLowerCase().includes('james') ? 2 : 0);
          return bQuality - aQuality;
        });
    };

    // Filtere nach Qualität
    const highQualityVoices = filterHighQualityVoices(data.voices);
    
    // Erstelle Vorschau-URLs für jede Stimme mit Kategorisierung
    const voicesWithPreview = highQualityVoices.map((voice: any) => {
      const category = categorizeVoice(voice);
      const isFromCollection = collectionVoiceIds.has(voice.voice_id);
      return {
        id: voice.voice_id,
        name: voice.name,
        description: voice.description,
        category: voice.category,
        voiceType: category.type,
        gender: category.gender,
        characteristics: category.characteristics,
        previewUrl: `https://api.elevenlabs.io/v1/text-to-speech/${voice.voice_id}/stream`,
        demoText: category.demoText,
        isPremium: voice.category === 'premade' || voice.category === 'professional',
        isFromCollection: isFromCollection
      };
    });

    return NextResponse.json({ voices: voicesWithPreview });
  } catch (error) {
    console.error('Error fetching voices:', error);
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
}
