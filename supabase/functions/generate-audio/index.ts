// Supabase Edge Function for Audio Generation
// This runs on Deno runtime with NO timeout limits (unlike Vercel's 60s)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VoiceConfig {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
}

interface TextToSpeechRequest {
  text: string;
  model_id: string;
  voice_settings: VoiceConfig;
  output_format: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const startTime = Date.now();

    // Parse request body
    const { text, voiceId, adminPreview } = await req.json();

    if (!text || !voiceId) {
      return new Response(
        JSON.stringify({ error: 'Text and voiceId are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('=== Audio Generation Request ===');
    console.log('Voice ID:', voiceId);
    console.log('Text length:', text.length);
    console.log('Admin preview:', adminPreview);

    // Get environment variables
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    // Voice settings
    const voiceSettings: VoiceConfig = {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.0,
      use_speaker_boost: true
    };

    // Admin-Sparmodus: Shorten text if needed
    const shortenForPreview = (t: string) => {
      const clean = (t || '').trim();
      if (!clean) return clean;
      const match = clean.match(/^[\s\S]*?[\.!?](\s|$)/);
      const firstSentence = match ? match[0].trim() : '';
      const clipped = clean.slice(0, 220).trim();
      const chosen = firstSentence || clipped;
      return chosen.length > 0 ? chosen : clean.slice(0, 220);
    };

    // Use full text unless admin preview
    let effectiveText = (adminPreview === true) ? shortenForPreview(text) : text;

    console.log('Effective text length:', effectiveText.length);
    console.log('Text preview:', effectiveText.slice(0, 100) + '...');

    // Request payload for ElevenLabs
    const requestPayload: TextToSpeechRequest = {
      text: effectiveText,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings,
      output_format: 'mp3_44100_128'
    };

    console.log('Calling ElevenLabs API...');
    const elevenLabsStart = Date.now();

    // Generate audio with ElevenLabs (NO TIMEOUT - Edge Functions can run indefinitely)
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify(requestPayload),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('ElevenLabs API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        voiceId: voiceId
      });

      return new Response(
        JSON.stringify({
          error: `ElevenLabs API error: ${response.status}`,
          details: errorBody
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const elevenLabsTime = Date.now() - elevenLabsStart;
    console.log(`ElevenLabs API took: ${elevenLabsTime}ms (${(elevenLabsTime/1000).toFixed(1)}s)`);

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 11);
    const filename = `audio_${timestamp}_${randomId}.mp3`;

    console.log('Uploading to Supabase Storage...');
    const uploadStart = Date.now();

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('audio-files')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to store audio file' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const uploadTime = Date.now() - uploadStart;
    console.log(`Supabase upload took: ${uploadTime}ms (${(uploadTime/1000).toFixed(1)}s)`);

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio-files')
      .getPublicUrl(filename);

    const totalTime = Date.now() - startTime;
    console.log(`Total processing time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log('Audio uploaded successfully:', publicUrl);

    // Return the public URL and metadata
    return new Response(
      JSON.stringify({
        audioUrl: publicUrl,
        filename: filename,
        voiceId: voiceId,
        size: audioBuffer.byteLength,
        processingTime: totalTime
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Audio generation error:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate audio. Please try again.',
        details: error?.message || 'Unknown error',
        type: error?.name || 'Error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
