export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      anonymous_resource_creations: {
        Row: {
          browser_fingerprint: string
          created_at: string | null
          id: string
          ip_address: string | null
        }
        Insert: {
          browser_fingerprint: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          browser_fingerprint?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      background_music_tracks: {
        Row: {
          created_at: string | null
          figure_id: string
          figure_name: string | null
          id: string
          is_default: boolean | null
          track_artist: string | null
          track_id: string
          track_title: string | null
          track_url: string
          updated_at: string | null
          volume: number
        }
        Insert: {
          created_at?: string | null
          figure_id: string
          figure_name?: string | null
          id?: string
          is_default?: boolean | null
          track_artist?: string | null
          track_id: string
          track_title?: string | null
          track_url: string
          updated_at?: string | null
          volume?: number
        }
        Update: {
          created_at?: string | null
          figure_id?: string
          figure_name?: string | null
          id?: string
          is_default?: boolean | null
          track_artist?: string | null
          track_id?: string
          track_title?: string | null
          track_url?: string
          updated_at?: string | null
          volume?: number
        }
        Relationships: []
      }
      music_admins: {
        Row: {
          admin_type: string
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          admin_type: string
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          admin_type?: string
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          pronunciation_hint: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          pronunciation_hint?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          pronunciation_hint?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registration_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: unknown
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address: unknown
          success?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_stories: {
        Row: {
          audio_url: string | null
          client_email: string | null
          content: string | null
          created_at: string | null
          id: string
          is_audio_only: boolean | null
          question_answers: Json
          resource_figure: Json
          title: string
          updated_at: string | null
          user_id: string | null
          voice_id: string | null
        }
        Insert: {
          audio_url?: string | null
          client_email?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_audio_only?: boolean | null
          question_answers: Json
          resource_figure: Json
          title: string
          updated_at?: string | null
          user_id?: string | null
          voice_id?: string | null
        }
        Update: {
          audio_url?: string | null
          client_email?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_audio_only?: boolean | null
          question_answers?: Json
          resource_figure?: Json
          title?: string
          updated_at?: string | null
          user_id?: string | null
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_stories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_access: {
        Row: {
          access_expires_at: string | null
          access_starts_at: string | null
          created_at: string | null
          id: string
          plan_type: string
          resources_created: number
          resources_limit: number
          status: string
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          access_starts_at?: string | null
          created_at?: string | null
          id?: string
          plan_type?: string
          resources_created?: number
          resources_limit?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          access_starts_at?: string | null
          created_at?: string | null
          id?: string
          plan_type?: string
          resources_created?: number
          resources_limit?: number
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_analytics: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          resource_figure_name: string | null
          story_id: string | null
          user_id: string
          voice_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          resource_figure_name?: string | null
          story_id?: string | null
          user_id: string
          voice_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          resource_figure_name?: string | null
          story_id?: string | null
          user_id?: string
          voice_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_analytics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "saved_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_analytics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories_with_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      stories_with_users: {
        Row: {
          audio_url: string | null
          author_email: string | null
          author_name: string | null
          content: string | null
          created_at: string | null
          id: string | null
          question_answers: Json | null
          resource_figure: Json | null
          title: string | null
          updated_at: string | null
          voice_id: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_audio_resource: {
        Args: { resource_id: string; user_uuid: string }
        Returns: boolean
      }
      can_create_ai_resource: { Args: { user_uuid: string }; Returns: boolean }
      can_create_resource: { Args: { user_uuid: string }; Returns: boolean }
      can_register_from_ip: {
        Args: { ip_address_text: string }
        Returns: boolean
      }
      cleanup_old_stories: { Args: { days_old?: number }; Returns: number }
      create_access_after_payment:
        | {
            Args: {
              checkout_session_id: string
              payment_intent_id: string
              user_uuid: string
            }
            Returns: string
          }
        | {
            Args: {
              checkout_session_id: string
              payment_intent_id: string
              plan_type?: string
              user_uuid: string
            }
            Returns: string
          }
      create_subscription_access: {
        Args: {
          checkout_session_id: string
          subscription_id: string
          user_uuid: string
        }
        Returns: string
      }
      has_active_access: { Args: { user_uuid: string }; Returns: boolean }
      increment_resource_count: { Args: { user_uuid: string }; Returns: number }
      is_email_domain_blocked: {
        Args: { email_text: string }
        Returns: boolean
      }
      is_music_admin_for_storage: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
