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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type: Database["public"]["Enums"]["activity_type"]
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          type?: Database["public"]["Enums"]["activity_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          created_at: string
          earnings: number
          id: string
          payout_status: Database["public"]["Enums"]["payout_status"]
          referral_code: string
          referred_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          earnings?: number
          id?: string
          payout_status?: Database["public"]["Enums"]["payout_status"]
          referral_code: string
          referred_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          earnings?: number
          id?: string
          payout_status?: Database["public"]["Enums"]["payout_status"]
          referral_code?: string
          referred_count?: number
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          id: string
          key_hash: string
          last_used: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_hash: string
          last_used?: string | null
          name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_hash?: string
          last_used?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          type: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          type?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string
          workspace_id?: string | null
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          source: string | null
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          user_id: string
          value: number | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          user_id: string
          value?: number | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          user_id?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          api_key: string | null
          config: Json | null
          connected_at: string | null
          created_at: string
          id: string
          integration_name: string
          last_tested: string | null
          status: string
          user_id: string
        }
        Insert: {
          api_key?: string | null
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          id?: string
          integration_name: string
          last_tested?: string | null
          status?: string
          user_id: string
        }
        Update: {
          api_key?: string | null
          config?: Json | null
          connected_at?: string | null
          created_at?: string
          id?: string
          integration_name?: string
          last_tested?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      message_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_files_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messenger_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messenger_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel: Database["public"]["Enums"]["message_channel"]
          content: string
          created_at: string
          id: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["message_channel"]
          content: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["message_channel"]
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      messenger_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          message_type: string
          sender_id: string
          thread_id: string | null
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          sender_id: string
          thread_id?: string | null
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          message_type?: string
          sender_id?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messenger_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messenger_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "messenger_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          channel_id: string
          created_at: string
          id: string
          message_id: string | null
          priority: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          channel_id: string
          created_at?: string
          id?: string
          message_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          channel_id?: string
          created_at?: string
          id?: string
          message_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messenger_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          business_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          industry: string | null
          phone: string | null
          plan: Database["public"]["Enums"]["user_plan"]
          trial_end_date: string | null
          user_id: string
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          industry?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          trial_end_date?: string | null
          user_id: string
        }
        Update: {
          business_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          industry?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["user_plan"]
          trial_end_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          direction: string
          duration_ms: number | null
          event_type: string
          id: string
          payload: Json | null
          response: Json | null
          response_code: number | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction?: string
          duration_ms?: number | null
          event_type: string
          id?: string
          payload?: Json | null
          response?: Json | null
          response_code?: number | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          duration_ms?: number | null
          event_type?: string
          id?: string
          payload?: Json | null
          response?: Json | null
          response_code?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      workflows: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          runs_count: number
          steps: Json | null
          trigger: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          runs_count?: number
          steps?: Json | null
          trigger?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          runs_count?: number
          steps?: Json | null
          trigger?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      activity_type: "call" | "sms" | "email" | "chat" | "note"
      admin_role: "admin" | "support" | "sales"
      contact_status:
        | "new"
        | "hot"
        | "warm"
        | "cold"
        | "booked"
        | "won"
        | "lost"
      deal_stage: "new" | "hot" | "booked" | "won" | "lost"
      message_channel: "sms" | "email" | "chat" | "facebook" | "instagram"
      payout_status: "pending" | "paid" | "failed"
      user_plan: "starter" | "growth" | "enterprise"
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
      activity_type: ["call", "sms", "email", "chat", "note"],
      admin_role: ["admin", "support", "sales"],
      contact_status: ["new", "hot", "warm", "cold", "booked", "won", "lost"],
      deal_stage: ["new", "hot", "booked", "won", "lost"],
      message_channel: ["sms", "email", "chat", "facebook", "instagram"],
      payout_status: ["pending", "paid", "failed"],
      user_plan: ["starter", "growth", "enterprise"],
    },
  },
} as const
