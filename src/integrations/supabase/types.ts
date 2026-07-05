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
      job_seekers: {
        Row: {
          id: string
          email: string
          education_level: string | null
          majors: string[] | null
          academic_mark: number | null
          job_interests: string[] | null
          company_interests: string[] | null
          work_regions: string[] | null
          employment_types: string[] | null
          willing_to_relocate: boolean | null
          one_line_intro: string | null
          external_links: Json
          discovery_consent: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          education_level?: string | null
          majors?: string[] | null
          academic_mark?: number | null
          job_interests?: string[] | null
          company_interests?: string[] | null
          work_regions?: string[] | null
          employment_types?: string[] | null
          willing_to_relocate?: boolean | null
          one_line_intro?: string | null
          external_links?: Json
          discovery_consent?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          education_level?: string | null
          majors?: string[] | null
          academic_mark?: number | null
          job_interests?: string[] | null
          company_interests?: string[] | null
          work_regions?: string[] | null
          employment_types?: string[] | null
          willing_to_relocate?: boolean | null
          one_line_intro?: string | null
          external_links?: Json
          discovery_consent?: boolean | null
          created_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          id: string
          name: string
          unique_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          unique_code: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          unique_code?: string
          created_at?: string
        }
        Relationships: []
      }
      job_simulations: {
        Row: {
          id: string
          company_id: string
          title: string
          description: string | null
          job_family: string | null
          domain: string | null
          estimated_minutes: number | null
          task_prompt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          title: string
          description?: string | null
          job_family?: string | null
          domain?: string | null
          estimated_minutes?: number | null
          task_prompt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          title?: string
          description?: string | null
          job_family?: string | null
          domain?: string | null
          estimated_minutes?: number | null
          task_prompt?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_simulations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          id: string
          job_seeker_id: string
          job_simulation_id: string
          response_text: string | null
          started_at: string | null
          submitted_at: string | null
          duration_sec: number | null
          paste_detected: boolean | null
          answer_transmission_consent: boolean | null
          score_json: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          job_seeker_id: string
          job_simulation_id: string
          response_text?: string | null
          started_at?: string | null
          submitted_at?: string | null
          duration_sec?: number | null
          paste_detected?: boolean | null
          answer_transmission_consent?: boolean | null
          score_json?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          job_seeker_id?: string
          job_simulation_id?: string
          response_text?: string | null
          started_at?: string | null
          submitted_at?: string | null
          duration_sec?: number | null
          paste_detected?: boolean | null
          answer_transmission_consent?: boolean | null
          score_json?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_job_seeker_id_fkey"
            columns: ["job_seeker_id"]
            isOneToOne: false
            referencedRelation: "job_seekers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_job_simulation_id_fkey"
            columns: ["job_simulation_id"]
            isOneToOne: false
            referencedRelation: "job_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      company_visible_submissions: {
        Row: {
          id: string
          company_id: string
          simulation_title: string
          response_text: string | null
          submitted_at: string | null
          duration_sec: number | null
          paste_detected: boolean | null
          one_line_intro: string | null
          external_links: Json
          job_interests: string[] | null
          discovery_consent: boolean | null
        }
        Relationships: []
      }
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
