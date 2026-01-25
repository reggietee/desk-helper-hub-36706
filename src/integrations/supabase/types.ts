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
      approval_events: {
        Row: {
          action: string
          id: string
          ip_address: string | null
          performed_at: string
          token_used: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          ip_address?: string | null
          performed_at?: string
          token_used?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          ip_address?: string | null
          performed_at?: string
          token_used?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auth_attempt_logs: {
        Row: {
          created_at: string | null
          failure_reason: string | null
          id: string
          ip_address: string | null
          success: boolean | null
          user_agent: string | null
          user_email: string
        }
        Insert: {
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_email: string
        }
        Update: {
          created_at?: string | null
          failure_reason?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean | null
          user_agent?: string | null
          user_email?: string
        }
        Relationships: []
      }
      auth_rate_limits: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          endpoint: string
          id: string
          ip_address: string
          locked_until: string | null
          updated_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address: string
          locked_until?: string | null
          updated_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: string
          locked_until?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          event_uid: string
          id: string
          schedule_date: string
          sequence_number: number
          time_windows: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_uid: string
          id?: string
          schedule_date: string
          sequence_number?: number
          time_windows: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_uid?: string
          id?: string
          schedule_date?: string
          sequence_number?: number
          time_windows?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_invite_logs: {
        Row: {
          action: string
          created_at: string
          end_time: string
          error: string | null
          event_uid: string
          id: string
          provider: string | null
          provider_message_id: string | null
          retry_count: number
          schedule_date: string
          sent_at: string | null
          start_time: string
          status: string
          time_windows: string[]
          updated_at: string
          user_id: string
          week_start_date: string | null
        }
        Insert: {
          action: string
          created_at?: string
          end_time: string
          error?: string | null
          event_uid: string
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          retry_count?: number
          schedule_date: string
          sent_at?: string | null
          start_time: string
          status?: string
          time_windows: string[]
          updated_at?: string
          user_id: string
          week_start_date?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          end_time?: string
          error?: string | null
          event_uid?: string
          id?: string
          provider?: string | null
          provider_message_id?: string | null
          retry_count?: number
          schedule_date?: string
          sent_at?: string | null
          start_time?: string
          status?: string
          time_windows?: string[]
          updated_at?: string
          user_id?: string
          week_start_date?: string | null
        }
        Relationships: []
      }
      call_room_bookings: {
        Row: {
          booking_time: string
          created_at: string | null
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          booking_time: string
          created_at?: string | null
          id?: string
          user_id: string
          user_name: string
        }
        Update: {
          booking_time?: string
          created_at?: string | null
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      daily_credits_report_logs: {
        Row: {
          created_at: string
          error: string | null
          generated_at: string
          id: string
          members_included: number
          report_date: string
          resend_message_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          generated_at?: string
          id?: string
          members_included?: number
          report_date: string
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          generated_at?: string
          id?: string
          members_included?: number
          report_date?: string
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      guest_day_pass_requests: {
        Row: {
          arrival_date: string
          arrival_time: string
          created_at: string
          guest_email: string
          guest_name: string
          guest_phone: string
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          arrival_date: string
          arrival_time: string
          created_at?: string
          guest_email: string
          guest_name: string
          guest_phone: string
          id?: string
          user_id: string
          user_name: string
        }
        Update: {
          arrival_date?: string
          arrival_time?: string
          created_at?: string
          guest_email?: string
          guest_name?: string
          guest_phone?: string
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      haven_credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      haven_credits_ledger: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          email_error: string | null
          email_message_id: string | null
          email_sent_at: string | null
          email_status: string | null
          id: string
          reason: string
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          reason: string
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          email_error?: string | null
          email_message_id?: string | null
          email_sent_at?: string | null
          email_status?: string | null
          id?: string
          reason?: string
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      haven_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      haven_updates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          learn_more_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          learn_more_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          learn_more_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      issues: {
        Row: {
          created_at: string | null
          details: string
          id: string
          issue_type: string
          status: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string | null
          details: string
          id?: string
          issue_type: string
          status?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string | null
          details?: string
          id?: string
          issue_type?: string
          status?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      meeting_room_bookings: {
        Row: {
          booking_time: string
          created_at: string | null
          id: string
          payment_status: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          booking_time: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          booking_time?: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      member_visits: {
        Row: {
          checked_in_at: string
          created_at: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      otp_tokens: {
        Row: {
          attempts: number | null
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_email: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_email: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_email?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      private_office_bookings: {
        Row: {
          booking_date: string
          created_at: string | null
          id: string
          payment_status: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          booking_date: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          booking_date?: string
          created_at?: string | null
          id?: string
          payment_status?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      product_signouts: {
        Row: {
          checkout_time: string
          created_at: string | null
          id: string
          item_type: string
          user_id: string
          user_name: string
        }
        Insert: {
          checkout_time: string
          created_at?: string | null
          id?: string
          item_type: string
          user_id: string
          user_name: string
        }
        Update: {
          checkout_time?: string
          created_at?: string | null
          id?: string
          item_type?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approved_at: string | null
          created_at: string | null
          credit_email_notifications: boolean
          declined_at: string | null
          declined_reason: string | null
          email: string | null
          full_name: string
          id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string | null
          credit_email_notifications?: boolean
          declined_at?: string | null
          declined_reason?: string | null
          email?: string | null
          full_name: string
          id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string | null
          credit_email_notifications?: boolean
          declined_at?: string | null
          declined_reason?: string | null
          email?: string | null
          full_name?: string
          id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      weekly_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          show_name: boolean
          time_windows: string[] | null
          updated_at: string
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          show_name?: boolean
          time_windows?: string[] | null
          updated_at?: string
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          show_name?: boolean
          time_windows?: string[] | null
          updated_at?: string
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_otp_tokens: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
    Enums: {
      app_role: ["admin", "member"],
    },
  },
} as const
