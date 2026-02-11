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
      coworking_sprint_emails: {
        Row: {
          created_at: string
          email_type: string
          error: string | null
          id: string
          resend_message_id: string | null
          sent_at: string | null
          sprint_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_type: string
          error?: string | null
          id?: string
          resend_message_id?: string | null
          sent_at?: string | null
          sprint_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_type?: string
          error?: string | null
          id?: string
          resend_message_id?: string | null
          sent_at?: string | null
          sprint_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coworking_sprint_emails_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "coworking_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      coworking_sprint_participants: {
        Row: {
          id: string
          joined_at: string
          notification_sent: boolean
          sprint_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          notification_sent?: boolean
          sprint_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          notification_sent?: boolean
          sprint_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coworking_sprint_participants_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "coworking_sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      coworking_sprints: {
        Row: {
          allow_guests: boolean
          created_at: string
          created_by: string | null
          daily_room_name: string | null
          daily_room_url: string | null
          description: string | null
          end_time: string
          hosting_mode: string
          id: string
          is_active: boolean
          max_participants: number
          meeting_link: string | null
          sprint_date: string
          start_time: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_guests?: boolean
          created_at?: string
          created_by?: string | null
          daily_room_name?: string | null
          daily_room_url?: string | null
          description?: string | null
          end_time: string
          hosting_mode?: string
          id?: string
          is_active?: boolean
          max_participants?: number
          meeting_link?: string | null
          sprint_date: string
          start_time: string
          title?: string
          updated_at?: string
        }
        Update: {
          allow_guests?: boolean
          created_at?: string
          created_by?: string | null
          daily_room_name?: string | null
          daily_room_url?: string | null
          description?: string | null
          end_time?: string
          hosting_mode?: string
          id?: string
          is_active?: boolean
          max_participants?: number
          meeting_link?: string | null
          sprint_date?: string
          start_time?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_calls: {
        Row: {
          allow_guests: boolean
          call_name: string
          created_at: string
          created_by: string
          daily_room_name: string
          daily_room_url: string
          ended_at: string | null
          id: string
          note: string | null
          status: string
        }
        Insert: {
          allow_guests?: boolean
          call_name?: string
          created_at?: string
          created_by: string
          daily_room_name: string
          daily_room_url: string
          ended_at?: string | null
          id?: string
          note?: string | null
          status?: string
        }
        Update: {
          allow_guests?: boolean
          call_name?: string
          created_at?: string
          created_by?: string
          daily_room_name?: string
          daily_room_url?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          status?: string
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
      feed_items: {
        Row: {
          action_name: string | null
          author_id: string | null
          body: string
          created_at: string
          credits_amount: number | null
          id: string
          ledger_id: string | null
          type: string
        }
        Insert: {
          action_name?: string | null
          author_id?: string | null
          body: string
          created_at?: string
          credits_amount?: number | null
          id?: string
          ledger_id?: string | null
          type: string
        }
        Update: {
          action_name?: string | null
          author_id?: string | null
          body?: string
          created_at?: string
          credits_amount?: number | null
          id?: string
          ledger_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_items_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      livestreams: {
        Row: {
          allow_guests: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          player_embed_html: string | null
          player_url: string | null
          replace_haven_updates: boolean
          replay_url: string | null
          restream_rtmp_url: string | null
          restream_stream_key: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["livestream_status"]
          title: string
          updated_at: string
        }
        Insert: {
          allow_guests?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          player_embed_html?: string | null
          player_url?: string | null
          replace_haven_updates?: boolean
          replay_url?: string | null
          restream_rtmp_url?: string | null
          restream_stream_key?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["livestream_status"]
          title: string
          updated_at?: string
        }
        Update: {
          allow_guests?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          player_embed_html?: string | null
          player_url?: string | null
          replace_haven_updates?: boolean
          replay_url?: string | null
          restream_rtmp_url?: string | null
          restream_stream_key?: string | null
          starts_at?: string | null
          status?: Database["public"]["Enums"]["livestream_status"]
          title?: string
          updated_at?: string
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
      onboarding_progress: {
        Row: {
          bonus_awarded_at: string | null
          checked_in_at: string | null
          created_at: string
          feed_posted_at: string | null
          id: string
          profile_completed_at: string | null
          sprint_joined_at: string | null
          updated_at: string
          user_id: string
          week_planned_at: string | null
        }
        Insert: {
          bonus_awarded_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          feed_posted_at?: string | null
          id?: string
          profile_completed_at?: string | null
          sprint_joined_at?: string | null
          updated_at?: string
          user_id: string
          week_planned_at?: string | null
        }
        Update: {
          bonus_awarded_at?: string | null
          checked_in_at?: string | null
          created_at?: string
          feed_posted_at?: string | null
          id?: string
          profile_completed_at?: string | null
          sprint_joined_at?: string | null
          updated_at?: string
          user_id?: string
          week_planned_at?: string | null
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
          admin_notified_at: string | null
          approved_at: string | null
          avatar_url: string | null
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
          admin_notified_at?: string | null
          approved_at?: string | null
          avatar_url?: string | null
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
          admin_notified_at?: string | null
          approved_at?: string | null
          avatar_url?: string | null
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
      get_active_livestream: {
        Args: never
        Returns: {
          allow_guests: boolean
          description: string
          id: string
          player_embed_html: string
          player_url: string
          replace_haven_updates: boolean
          replay_url: string
          starts_at: string
          status: Database["public"]["Enums"]["livestream_status"]
          title: string
        }[]
      }
      get_active_livestream_for_guests: {
        Args: never
        Returns: {
          allow_guests: boolean
          description: string
          id: string
          player_embed_html: string
          player_url: string
          replace_haven_updates: boolean
          replay_url: string
          starts_at: string
          status: Database["public"]["Enums"]["livestream_status"]
          title: string
        }[]
      }
      get_member_directory: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_public_livestreams: {
        Args: never
        Returns: {
          allow_guests: boolean
          created_at: string
          description: string
          id: string
          player_embed_html: string
          player_url: string
          replace_haven_updates: boolean
          replay_url: string
          starts_at: string
          status: Database["public"]["Enums"]["livestream_status"]
          title: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member" | "guest"
      livestream_status: "draft" | "scheduled" | "live" | "ended"
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
      app_role: ["admin", "member", "guest"],
      livestream_status: ["draft", "scheduled", "live", "ended"],
    },
  },
} as const
