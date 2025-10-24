import { createClient } from '@supabase/supabase-js'

// Verwende Umgebungsvariablen, damit Client und Server dasselbe Supabase-Projekt nutzen
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// Erstelle Supabase-Client mit Standard-Konfiguration
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Typen für die Datenbank
export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface SavedStory {
  id: string
  user_id: string
  title: string
  content: string
  resource_figure: any
  question_answers: any[]
  audio_url?: string
  voice_id?: string
  created_at: string
  updated_at: string
}
