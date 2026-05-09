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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      drafts: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          input_data: Json | null
          promotion_status: string
          result_data: Json | null
          session_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          promotion_status?: string
          result_data?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          input_data?: Json | null
          promotion_status?: string
          result_data?: Json | null
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drafts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      edits: {
        Row: {
          created_at: string
          edit_type: string | null
          feedback_score: number | null
          id: string
          output_id: string
          refinement_prompt: string | null
        }
        Insert: {
          created_at?: string
          edit_type?: string | null
          feedback_score?: number | null
          id?: string
          output_id: string
          refinement_prompt?: string | null
        }
        Update: {
          created_at?: string
          edit_type?: string | null
          feedback_score?: number | null
          id?: string
          output_id?: string
          refinement_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edits_output_id_fkey"
            columns: ["output_id"]
            isOneToOne: false
            referencedRelation: "outputs"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          analytics_session_id: string | null
          created_at: string
          db_session_id: string | null
          event_type: string
          experiment_id: string | null
          id: string
          metadata: Json | null
          platform_type: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          analytics_session_id?: string | null
          created_at?: string
          db_session_id?: string | null
          event_type: string
          experiment_id?: string | null
          id?: string
          metadata?: Json | null
          platform_type?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          analytics_session_id?: string | null
          created_at?: string
          db_session_id?: string | null
          event_type?: string
          experiment_id?: string | null
          id?: string
          metadata?: Json | null
          platform_type?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_db_session_id_fkey"
            columns: ["db_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      outputs: {
        Row: {
          created_at: string
          generated_content: string | null
          id: string
          platform_type: string
          session_id: string
        }
        Insert: {
          created_at?: string
          generated_content?: string | null
          id?: string
          platform_type: string
          session_id: string
        }
        Update: {
          created_at?: string
          generated_content?: string | null
          id?: string
          platform_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "outputs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          audio_url: string | null
          created_at: string
          device_type: string | null
          entry_source: string | null
          id: string
          input_duration: number | null
          input_guide_type: string | null
          input_length_chars: number | null
          input_type: string | null
          keyword: string | null
          raw_text: string | null
          recording_duration_seconds: number | null
          selected_example_id: string | null
          selected_example_text: string | null
          selected_guide_chip: string | null
          selected_mood: string | null
          selected_persona: string | null
          session_purpose: string | null
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          device_type?: string | null
          entry_source?: string | null
          id?: string
          input_duration?: number | null
          input_guide_type?: string | null
          input_length_chars?: number | null
          input_type?: string | null
          keyword?: string | null
          raw_text?: string | null
          recording_duration_seconds?: number | null
          selected_example_id?: string | null
          selected_example_text?: string | null
          selected_guide_chip?: string | null
          selected_mood?: string | null
          selected_persona?: string | null
          session_purpose?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          device_type?: string | null
          entry_source?: string | null
          id?: string
          input_duration?: number | null
          input_guide_type?: string | null
          input_length_chars?: number | null
          input_type?: string | null
          keyword?: string | null
          raw_text?: string | null
          recording_duration_seconds?: number | null
          selected_example_id?: string | null
          selected_example_text?: string | null
          selected_guide_chip?: string | null
          selected_mood?: string | null
          selected_persona?: string | null
          session_purpose?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          job_role: string | null
          preferred_tone: string | null
          usage_purpose: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          job_role?: string | null
          preferred_tone?: string | null
          usage_purpose?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          job_role?: string | null
          preferred_tone?: string | null
          usage_purpose?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
