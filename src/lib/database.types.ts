// Generated from the Supabase project schema. Regenerate after migrations
// (Supabase MCP `generate_typescript_types` or `supabase gen types typescript`).
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coach_reads: {
        Row: {
          seen_at: string
          workout_id: string
        }
        Insert: {
          seen_at?: string
          workout_id: string
        }
        Update: {
          seen_at?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_reads_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: true
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      export_tokens: {
        Row: {
          created_at: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          muscle_group: string | null
          name: string
          youtube_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          muscle_group?: string | null
          name: string
          youtube_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          muscle_group?: string | null
          name?: string
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          invited_by: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          invited_by?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          invited_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          locale: string
          role: Database["public"]["Enums"]["user_role"]
          unit: Database["public"]["Enums"]["weight_unit"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          unit?: Database["public"]["Enums"]["weight_unit"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          locale?: string
          role?: Database["public"]["Enums"]["user_role"]
          unit?: Database["public"]["Enums"]["weight_unit"]
        }
        Relationships: []
      }
      program_days: {
        Row: {
          created_at: string
          day_no: number
          id: string
          program_id: string
          title: string | null
          week_no: number
        }
        Insert: {
          created_at?: string
          day_no: number
          id?: string
          program_id: string
          title?: string | null
          week_no: number
        }
        Update: {
          created_at?: string
          day_no?: number
          id?: string
          program_id?: string
          title?: string | null
          week_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          coach_notes: string | null
          created_at: string
          exercise_id: string
          id: string
          position: number
          program_day_id: string
          target_reps: number | null
          target_rpe: number | null
          target_sets: number | null
          target_time_sec: number | null
          target_weight: number | null
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          position?: number
          program_day_id: string
          target_reps?: number | null
          target_rpe?: number | null
          target_sets?: number | null
          target_time_sec?: number | null
          target_weight?: number | null
        }
        Update: {
          coach_notes?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          position?: number
          program_day_id?: string
          target_reps?: number | null
          target_rpe?: number | null
          target_sets?: number | null
          target_time_sec?: number | null
          target_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          start_date: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          start_date?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          id: string
          program_exercise_id: string
          reps: number | null
          rpe: number | null
          set_no: number
          time_sec: number | null
          weight: number | null
          workout_id: string
        }
        Insert: {
          id?: string
          program_exercise_id: string
          reps?: number | null
          rpe?: number | null
          set_no: number
          time_sec?: number | null
          weight?: number | null
          workout_id: string
        }
        Update: {
          id?: string
          program_exercise_id?: string
          reps?: number | null
          rpe?: number | null
          set_no?: number
          time_sec?: number | null
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_program_exercise_id_fkey"
            columns: ["program_exercise_id"]
            isOneToOne: false
            referencedRelation: "program_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercise_notes: {
        Row: {
          note: string
          program_exercise_id: string
          workout_id: string
        }
        Insert: {
          note: string
          program_exercise_id: string
          workout_id: string
        }
        Update: {
          note?: string
          program_exercise_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_notes_program_exercise_id_fkey"
            columns: ["program_exercise_id"]
            isOneToOne: false
            referencedRelation: "program_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_notes_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          client_comment: string | null
          client_id: string
          created_at: string
          id: string
          performed_at: string
          program_day_id: string
          status: Database["public"]["Enums"]["workout_status"]
        }
        Insert: {
          client_comment?: string | null
          client_id: string
          created_at?: string
          id?: string
          performed_at?: string
          program_day_id: string
          status?: Database["public"]["Enums"]["workout_status"]
        }
        Update: {
          client_comment?: string | null
          client_id?: string
          created_at?: string
          id?: string
          performed_at?: string
          program_day_id?: string
          status?: Database["public"]["Enums"]["workout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "workouts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      export_sets: {
        Args: { p_token: string }
        Returns: {
          performed_at: string
          client_name: string | null
          client_email: string
          program: string
          week_no: number
          day_no: number
          day_title: string | null
          exercise: string
          set_no: number
          weight_kg: number | null
          reps: number | null
          time_sec: number | null
          rpe: number | null
          exercise_note: string | null
          workout_comment: string | null
          workout_id: string
        }[]
      }
    }
    Enums: {
      user_role: "coach" | "client"
      weight_unit: "kg" | "lb"
      workout_status: "done" | "skipped"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      user_role: ["coach", "client"],
      weight_unit: ["kg", "lb"],
      workout_status: ["done", "skipped"],
    },
  },
} as const
