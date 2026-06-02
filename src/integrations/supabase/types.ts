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
      ai_search_sessions: {
        Row: {
          budget_filter: string | null
          clicked_gig_id: string | null
          confidence: number | null
          created_at: string
          delivery_filter: string | null
          id: string
          query: string | null
          refined_query: string | null
          result_gig_ids: string[] | null
          session_id: string | null
          suggested_categories: string[] | null
          user_id: string | null
        }
        Insert: {
          budget_filter?: string | null
          clicked_gig_id?: string | null
          confidence?: number | null
          created_at?: string
          delivery_filter?: string | null
          id?: string
          query?: string | null
          refined_query?: string | null
          result_gig_ids?: string[] | null
          session_id?: string | null
          suggested_categories?: string[] | null
          user_id?: string | null
        }
        Update: {
          budget_filter?: string | null
          clicked_gig_id?: string | null
          confidence?: number | null
          created_at?: string
          delivery_filter?: string | null
          id?: string
          query?: string | null
          refined_query?: string | null
          result_gig_ids?: string[] | null
          session_id?: string | null
          suggested_categories?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_search_sessions_clicked_gig_id_fkey"
            columns: ["clicked_gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_search_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string
          body: string
          channel: string
          created_at: string
          created_by: string
          id: string
          open_count: number
          recipient_count: number
          scheduled_for: string | null
          sent_at: string | null
          title: string
        }
        Insert: {
          audience: string
          body: string
          channel?: string
          created_at?: string
          created_by: string
          id?: string
          open_count?: number
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          title: string
        }
        Update: {
          audience?: string
          body?: string
          channel?: string
          created_at?: string
          created_by?: string
          id?: string
          open_count?: number
          recipient_count?: number
          scheduled_for?: string | null
          sent_at?: string | null
          title?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action_type: string
          admin_id: string
          admin_name: string | null
          created_at: string
          description: string | null
          id: string
          ip_address: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          admin_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          admin_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          ip_address?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      bids: {
        Row: {
          attachments: string[]
          bid_amount: number
          cover_message: string
          created_at: string
          delivery_days: number
          id: string
          project_id: string
          seller_id: string
          status: string
        }
        Insert: {
          attachments?: string[]
          bid_amount: number
          cover_message: string
          created_at?: string
          delivery_days: number
          id?: string
          project_id: string
          seller_id: string
          status?: string
        }
        Update: {
          attachments?: string[]
          bid_amount?: number
          cover_message?: string
          created_at?: string
          delivery_days?: number
          id?: string
          project_id?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_searches: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          query: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          query: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          query?: string
        }
        Relationships: []
      }
      cancellation_requests: {
        Row: {
          created_at: string
          id: string
          order_id: string
          reason: string | null
          requested_by: string
          status: Database["public"]["Enums"]["cancellation_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          reason?: string | null
          requested_by: string
          status?: Database["public"]["Enums"]["cancellation_status"]
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          reason?: string | null
          requested_by?: string
          status?: Database["public"]["Enums"]["cancellation_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          gig_id: string | null
          id: string
          last_message_at: string
          last_message_preview: string | null
          order_id: string | null
          participant_one: string
          participant_two: string
        }
        Insert: {
          created_at?: string
          gig_id?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          order_id?: string | null
          participant_one: string
          participant_two: string
        }
        Update: {
          created_at?: string
          gig_id?: string | null
          id?: string
          last_message_at?: string
          last_message_preview?: string | null
          order_id?: string | null
          participant_one?: string
          participant_two?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_p1_fkey"
            columns: ["participant_one"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_p2_fkey"
            columns: ["participant_two"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_offers: {
        Row: {
          buyer_id: string
          conversation_id: string
          created_at: string
          delivery_days: number
          description: string | null
          expires_at: string | null
          gig_id: string | null
          id: string
          order_id: string | null
          price: number
          revisions: number
          seller_id: string
          status: Database["public"]["Enums"]["offer_status"]
        }
        Insert: {
          buyer_id: string
          conversation_id: string
          created_at?: string
          delivery_days: number
          description?: string | null
          expires_at?: string | null
          gig_id?: string | null
          id?: string
          order_id?: string | null
          price: number
          revisions?: number
          seller_id: string
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Update: {
          buyer_id?: string
          conversation_id?: string
          created_at?: string
          delivery_days?: number
          description?: string | null
          expires_at?: string | null
          gig_id?: string | null
          id?: string
          order_id?: string | null
          price?: number
          revisions?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "custom_offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_offers_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_offers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_offers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string | null
          id: string
          order_id: string
          raised_by: string
          reason: string | null
          resolution_note: string | null
          resolution_outcome: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
          raised_by: string
          reason?: string | null
          resolution_note?: string | null
          resolution_outcome?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
          raised_by?: string
          reason?: string | null
          resolution_note?: string | null
          resolution_outcome?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Relationships: [
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      featured_sellers: {
        Row: {
          created_at: string
          id: string
          position: number
          seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          seller_id?: string
        }
        Relationships: []
      }
      gig_extras: {
        Row: {
          extra_delivery_days: number
          gig_id: string
          id: string
          price: number
          title: string
        }
        Insert: {
          extra_delivery_days?: number
          gig_id: string
          id?: string
          price: number
          title: string
        }
        Update: {
          extra_delivery_days?: number
          gig_id?: string
          id?: string
          price?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "gig_extras_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_packages: {
        Row: {
          delivery_days: number
          description: string | null
          features: string[] | null
          gig_id: string
          id: string
          package_type: Database["public"]["Enums"]["package_type"]
          price: number
          revisions: number
          title: string | null
        }
        Insert: {
          delivery_days?: number
          description?: string | null
          features?: string[] | null
          gig_id: string
          id?: string
          package_type: Database["public"]["Enums"]["package_type"]
          price: number
          revisions?: number
          title?: string | null
        }
        Update: {
          delivery_days?: number
          description?: string | null
          features?: string[] | null
          gig_id?: string
          id?: string
          package_type?: Database["public"]["Enums"]["package_type"]
          price?: number
          revisions?: number
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_packages_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gig_promotions: {
        Row: {
          clicks: number
          created_at: string
          daily_budget_cents: number
          ends_at: string
          gig_id: string
          id: string
          impressions: number
          seller_id: string
          spend_cents: number
          starts_at: string
          status: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          daily_budget_cents: number
          ends_at: string
          gig_id: string
          id?: string
          impressions?: number
          seller_id: string
          spend_cents?: number
          starts_at?: string
          status?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          daily_budget_cents?: number
          ends_at?: string
          gig_id?: string
          id?: string
          impressions?: number
          seller_id?: string
          spend_cents?: number
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      gig_requirements: {
        Row: {
          field_type: string
          gig_id: string
          id: string
          is_required: boolean
          options: string[] | null
          question: string
          sort_order: number | null
        }
        Insert: {
          field_type?: string
          gig_id: string
          id?: string
          is_required?: boolean
          options?: string[] | null
          question: string
          sort_order?: number | null
        }
        Update: {
          field_type?: string
          gig_id?: string
          id?: string
          is_required?: boolean
          options?: string[] | null
          question?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gig_requirements_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
        ]
      }
      gigs: {
        Row: {
          average_rating: number
          category: string
          clicks: number
          created_at: string
          description: string | null
          gallery_urls: string[] | null
          id: string
          impressions: number
          search_vector: unknown
          seller_id: string
          starting_price: number
          status: Database["public"]["Enums"]["gig_status"]
          subcategory: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          total_orders: number
          total_reviews: number
          updated_at: string
        }
        Insert: {
          average_rating?: number
          category: string
          clicks?: number
          created_at?: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          impressions?: number
          search_vector?: unknown
          seller_id: string
          starting_price: number
          status?: Database["public"]["Enums"]["gig_status"]
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          total_orders?: number
          total_reviews?: number
          updated_at?: string
        }
        Update: {
          average_rating?: number
          category?: string
          clicks?: number
          created_at?: string
          description?: string | null
          gallery_urls?: string[] | null
          id?: string
          impressions?: number
          search_vector?: unknown
          seller_id?: string
          starting_price?: number
          status?: Database["public"]["Enums"]["gig_status"]
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          total_orders?: number
          total_reviews?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string | null
          conversation_id: string
          created_at: string
          custom_offer_id: string | null
          id: string
          is_read: boolean
          message_type: string
          order_id: string | null
          pitch_delivery_days: number | null
          pitch_price: number | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          attachment_url?: string | null
          content?: string | null
          conversation_id: string
          created_at?: string
          custom_offer_id?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          order_id?: string | null
          pitch_delivery_days?: number | null
          pitch_price?: number | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          attachment_url?: string | null
          content?: string | null
          conversation_id?: string
          created_at?: string
          custom_offer_id?: string | null
          id?: string
          is_read?: boolean
          message_type?: string
          order_id?: string | null
          pitch_delivery_days?: number | null
          pitch_price?: number | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_custom_offer_id_fkey"
            columns: ["custom_offer_id"]
            isOneToOne: false
            referencedRelation: "custom_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          buyer_orders_email: boolean
          buyer_orders_inapp: boolean
          marketing_email: boolean
          messages_email: boolean
          messages_inapp: boolean
          seller_orders_email: boolean
          seller_orders_inapp: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_orders_email?: boolean
          buyer_orders_inapp?: boolean
          marketing_email?: boolean
          messages_email?: boolean
          messages_inapp?: boolean
          seller_orders_email?: boolean
          seller_orders_inapp?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer_orders_email?: boolean
          buyer_orders_inapp?: boolean
          marketing_email?: boolean
          messages_email?: boolean
          messages_inapp?: boolean
          seller_orders_email?: boolean
          seller_orders_inapp?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_deliveries: {
        Row: {
          created_at: string
          delivered_by: string
          file_urls: string[] | null
          id: string
          is_revision: boolean
          message: string | null
          order_id: string
        }
        Insert: {
          created_at?: string
          delivered_by: string
          file_urls?: string[] | null
          id?: string
          is_revision?: boolean
          message?: string | null
          order_id: string
        }
        Update: {
          created_at?: string
          delivered_by?: string
          file_urls?: string[] | null
          id?: string
          is_revision?: boolean
          message?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_deliveries_delivered_by_fkey"
            columns: ["delivered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_requirements_answers: {
        Row: {
          answer: string | null
          created_at: string
          file_url: string | null
          id: string
          order_id: string
          requirement_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          order_id: string
          requirement_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          order_id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_requirements_answers_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_requirements_answers_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "gig_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          auto_complete_at: string | null
          bid_id: string | null
          buyer_id: string
          completed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_deadline: string | null
          dispute_deadline: string | null
          dispute_hold_notified_at: string | null
          escrow_released_at: string | null
          escrow_status: string
          gig_id: string | null
          id: string
          order_number: string
          package_id: string | null
          pitch_message_id: string | null
          platform_fee: number
          price: number
          project_title: string | null
          refund_id: string | null
          refunded_at: string | null
          reminder_24h_sent_at: string | null
          reminder_halfway_sent_at: string | null
          reminder_late_sent_at: string | null
          requirements_submitted: boolean
          requirements_submitted_at: string | null
          revision_count: number
          selected_extra_ids: string[] | null
          seller_earnings: number
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          auto_complete_at?: string | null
          bid_id?: string | null
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline?: string | null
          dispute_deadline?: string | null
          dispute_hold_notified_at?: string | null
          escrow_released_at?: string | null
          escrow_status?: string
          gig_id?: string | null
          id?: string
          order_number?: string
          package_id?: string | null
          pitch_message_id?: string | null
          platform_fee: number
          price: number
          project_title?: string | null
          refund_id?: string | null
          refunded_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_halfway_sent_at?: string | null
          reminder_late_sent_at?: string | null
          requirements_submitted?: boolean
          requirements_submitted_at?: string | null
          revision_count?: number
          selected_extra_ids?: string[] | null
          seller_earnings: number
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_complete_at?: string | null
          bid_id?: string | null
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline?: string | null
          dispute_deadline?: string | null
          dispute_hold_notified_at?: string | null
          escrow_released_at?: string | null
          escrow_status?: string
          gig_id?: string | null
          id?: string
          order_number?: string
          package_id?: string | null
          pitch_message_id?: string | null
          platform_fee?: number
          price?: number
          project_title?: string | null
          refund_id?: string | null
          refunded_at?: string | null
          reminder_24h_sent_at?: string | null
          reminder_halfway_sent_at?: string | null
          reminder_late_sent_at?: string | null
          requirements_submitted?: boolean
          requirements_submitted_at?: string | null
          revision_count?: number
          selected_extra_ids?: string[] | null
          seller_earnings?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "gig_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          application_submitted_at: string | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          certifications: Json
          country: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_online: boolean
          languages: string[] | null
          last_seen: string | null
          linkedin_url: string | null
          location: string | null
          member_since: string
          pending_packages: Json
          portfolio_links: Json
          portfolio_urls: string[]
          primary_category: string | null
          rejection_reason: string | null
          response_rate: number | null
          response_time_minutes: number | null
          river_score: number | null
          role: Database["public"]["Enums"]["user_role"]
          secondary_category: string | null
          seller_skills: string[]
          seller_status: string
          suspended_at: string | null
          total_reviews: number
          twitter_url: string | null
          updated_at: string
          username: string | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          application_submitted_at?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          certifications?: Json
          country?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_online?: boolean
          languages?: string[] | null
          last_seen?: string | null
          linkedin_url?: string | null
          location?: string | null
          member_since?: string
          pending_packages?: Json
          portfolio_links?: Json
          portfolio_urls?: string[]
          primary_category?: string | null
          rejection_reason?: string | null
          response_rate?: number | null
          response_time_minutes?: number | null
          river_score?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          secondary_category?: string | null
          seller_skills?: string[]
          seller_status?: string
          suspended_at?: string | null
          total_reviews?: number
          twitter_url?: string | null
          updated_at?: string
          username?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          application_submitted_at?: string | null
          avatar_url?: string | null
          average_rating?: number | null
          bio?: string | null
          certifications?: Json
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_online?: boolean
          languages?: string[] | null
          last_seen?: string | null
          linkedin_url?: string | null
          location?: string | null
          member_since?: string
          pending_packages?: Json
          portfolio_links?: Json
          portfolio_urls?: string[]
          primary_category?: string | null
          rejection_reason?: string | null
          response_rate?: number | null
          response_time_minutes?: number | null
          river_score?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          secondary_category?: string | null
          seller_skills?: string[]
          seller_status?: string
          suspended_at?: string | null
          total_reviews?: number
          twitter_url?: string | null
          updated_at?: string
          username?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      project_posts: {
        Row: {
          attachments: string[]
          bid_count: number
          budget_max: number | null
          budget_min: number | null
          buyer_id: string
          category: string | null
          created_at: string
          deadline: string | null
          description: string
          id: string
          skills: string[]
          status: string
          title: string
          visibility: string
        }
        Insert: {
          attachments?: string[]
          bid_count?: number
          budget_max?: number | null
          budget_min?: number | null
          buyer_id: string
          category?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          id?: string
          skills?: string[]
          status?: string
          title: string
          visibility?: string
        }
        Update: {
          attachments?: string[]
          bid_count?: number
          budget_max?: number | null
          budget_min?: number | null
          buyer_id?: string
          category?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          id?: string
          skills?: string[]
          status?: string
          title?: string
          visibility?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number
          id: string
          identifier: string
          window_start: string
        }
        Insert: {
          bucket: string
          count?: number
          id?: string
          identifier: string
          window_start?: string
        }
        Update: {
          bucket?: string
          count?: number
          id?: string
          identifier?: string
          window_start?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      review_prompts: {
        Row: {
          buyer_id: string
          created_at: string
          expires_at: string
          id: string
          notified_at: string
          order_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          expires_at: string
          id?: string
          notified_at?: string
          order_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          notified_at?: string
          order_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          buyer_id: string
          communication_rating: number | null
          created_at: string
          gig_id: string
          helpful_count: number
          id: string
          is_public: boolean
          order_id: string
          overall_rating: number | null
          rating: number
          rating_communication: number | null
          rating_delivery: number | null
          rating_quality: number | null
          rating_rehire: number | null
          rating_value: number | null
          recommend_rating: number | null
          reply: string | null
          review_text: string | null
          reviewer_role: string
          seller_id: string
          service_rating: number | null
          standout_moment: string | null
        }
        Insert: {
          buyer_id: string
          communication_rating?: number | null
          created_at?: string
          gig_id: string
          helpful_count?: number
          id?: string
          is_public?: boolean
          order_id: string
          overall_rating?: number | null
          rating: number
          rating_communication?: number | null
          rating_delivery?: number | null
          rating_quality?: number | null
          rating_rehire?: number | null
          rating_value?: number | null
          recommend_rating?: number | null
          reply?: string | null
          review_text?: string | null
          reviewer_role: string
          seller_id: string
          service_rating?: number | null
          standout_moment?: string | null
        }
        Update: {
          buyer_id?: string
          communication_rating?: number | null
          created_at?: string
          gig_id?: string
          helpful_count?: number
          id?: string
          is_public?: boolean
          order_id?: string
          overall_rating?: number | null
          rating?: number
          rating_communication?: number | null
          rating_delivery?: number | null
          rating_quality?: number | null
          rating_rehire?: number | null
          rating_value?: number | null
          recommend_rating?: number | null
          reply?: string | null
          review_text?: string | null
          reviewer_role?: string
          seller_id?: string
          service_rating?: number | null
          standout_moment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      river_ops_conversations: {
        Row: {
          created_at: string
          daily_briefing: boolean
          id: string
          message: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_briefing?: boolean
          id?: string
          message: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_briefing?: boolean
          id?: string
          message?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_gigs: {
        Row: {
          created_at: string
          gig_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gig_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gig_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_gigs_gig_id_fkey"
            columns: ["gig_id"]
            isOneToOne: false
            referencedRelation: "gigs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_gigs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_accounts: {
        Row: {
          available_balance: number
          bank_country: string | null
          bank_last4: string | null
          charges_enabled: boolean
          created_at: string
          id: string
          lifetime_earnings: number
          onboarding_complete: boolean
          payout_method: string | null
          payouts_enabled: boolean
          paypal_email: string | null
          pending_balance: number
          seller_id: string
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          available_balance?: number
          bank_country?: string | null
          bank_last4?: string | null
          charges_enabled?: boolean
          created_at?: string
          id?: string
          lifetime_earnings?: number
          onboarding_complete?: boolean
          payout_method?: string | null
          payouts_enabled?: boolean
          paypal_email?: string | null
          pending_balance?: number
          seller_id: string
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          available_balance?: number
          bank_country?: string | null
          bank_last4?: string | null
          charges_enabled?: boolean
          created_at?: string
          id?: string
          lifetime_earnings?: number
          onboarding_complete?: boolean
          payout_method?: string | null
          payouts_enabled?: boolean
          paypal_email?: string | null
          pending_balance?: number
          seller_id?: string
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_applications: {
        Row: {
          admin_notes: string | null
          avatar_url: string | null
          bio: string
          created_at: string
          experience_description: string
          full_name: string
          id: string
          language: string
          location: string
          packages: Json
          portfolio_urls: string[]
          primary_category: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_category: string | null
          seller_id: string
          skills: string[]
          status: string
        }
        Insert: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio: string
          created_at?: string
          experience_description: string
          full_name: string
          id?: string
          language: string
          location: string
          packages?: Json
          portfolio_urls?: string[]
          primary_category: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_category?: string | null
          seller_id: string
          skills?: string[]
          status?: string
        }
        Update: {
          admin_notes?: string | null
          avatar_url?: string | null
          bio?: string
          created_at?: string
          experience_description?: string
          full_name?: string
          id?: string
          language?: string
          location?: string
          packages?: Json
          portfolio_urls?: string[]
          primary_category?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_category?: string | null
          seller_id?: string
          skills?: string[]
          status?: string
        }
        Relationships: []
      }
      seller_follows: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          seller_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          seller_id?: string
        }
        Relationships: []
      }
      seller_verifications: {
        Row: {
          created_at: string
          id: string
          id_document_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          seller_id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_document_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          seller_id: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          id_document_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          seller_id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          clears_at: string | null
          created_at: string
          id: string
          order_id: string | null
          seller_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          stripe_transfer_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          clears_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          stripe_transfer_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          clears_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          stripe_transfer_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string
          source: string
        }
        Insert: {
          event_type: string
          id: string
          processed_at?: string
          source: string
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string
          source?: string
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
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          failure_reason: string | null
          id: string
          method: string | null
          paid_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          stripe_payout_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          stripe_payout_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          failure_reason?: string | null
          id?: string
          method?: string | null
          paid_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          stripe_payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string | null
          current_step: number | null
          id: string
          started_at: string | null
          status: string
          step_results: Json | null
          steps_completed: number | null
          trigger_data: Json | null
          updated_at: string | null
          user_id: string
          wait_until: string | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          current_step?: number | null
          id?: string
          started_at?: string | null
          status?: string
          step_results?: Json | null
          steps_completed?: number | null
          trigger_data?: Json | null
          updated_at?: string | null
          user_id: string
          wait_until?: string | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          current_step?: number | null
          id?: string
          started_at?: string | null
          status?: string
          step_results?: Json | null
          steps_completed?: number | null
          trigger_data?: Json | null
          updated_at?: string | null
          user_id?: string
          wait_until?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_scheduled: {
        Row: {
          contact_id: string
          created_at: string | null
          executed: boolean | null
          id: string
          resume_step: number
          run_id: string
          scheduled_for: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          executed?: boolean | null
          id?: string
          resume_step?: number
          run_id: string
          scheduled_for: string
          user_id: string
          workflow_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          executed?: boolean | null
          id?: string
          resume_step?: number
          run_id?: string
          scheduled_for?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_scheduled_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_scheduled_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
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
      accept_bid: { Args: { _bid_id: string }; Returns: string }
      accept_custom_offer: { Args: { _offer_id: string }; Returns: string }
      approve_delivery: { Args: { _order_id: string }; Returns: undefined }
      approve_seller: { Args: { _seller: string }; Returns: undefined }
      auto_complete_orders: { Args: never; Returns: undefined }
      auto_publish_reviews: { Args: never; Returns: undefined }
      clear_due_seller_credits: { Args: never; Returns: undefined }
      clear_test_messages: { Args: never; Returns: undefined }
      create_escrow_order: {
        Args: { _source: string; _source_id: string }
        Returns: string
      }
      create_gig_order: {
        Args: { _extra_ids?: string[]; _package_id: string }
        Returns: string
      }
      create_notification: {
        Args: {
          _body: string
          _link: string
          _title: string
          _type: Database["public"]["Enums"]["notification_type"]
          _user: string
        }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_promotions: { Args: never; Returns: undefined }
      get_my_profile: {
        Args: never
        Returns: {
          application_submitted_at: string | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          certifications: Json
          country: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_online: boolean
          languages: string[] | null
          last_seen: string | null
          linkedin_url: string | null
          location: string | null
          member_since: string
          pending_packages: Json
          portfolio_links: Json
          portfolio_urls: string[]
          primary_category: string | null
          rejection_reason: string | null
          response_rate: number | null
          response_time_minutes: number | null
          river_score: number | null
          role: Database["public"]["Enums"]["user_role"]
          secondary_category: string | null
          seller_skills: string[]
          seller_status: string
          suspended_at: string | null
          total_reviews: number
          twitter_url: string | null
          updated_at: string
          username: string | null
          website_url: string | null
          years_experience: number | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_my_promotion_stats: {
        Args: never
        Returns: {
          clicks: number
          created_at: string
          daily_budget_cents: number
          ends_at: string
          gig_id: string
          id: string
          impressions: number
          seller_id: string
          spend_cents: number
          starts_at: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "gig_promotions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_or_create_conversation: {
        Args: { _gig_id?: string; _order_id?: string; _other: string }
        Returns: string
      }
      get_seller_verification_status: {
        Args: { _seller: string }
        Returns: string
      }
      heartbeat_online: { Args: never; Returns: undefined }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_order_party: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      mark_offline_stale: { Args: never; Returns: undefined }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_river_match: {
        Args: { _query: string; _seller_ids: string[] }
        Returns: string
      }
      raise_dispute: {
        Args: { _order_id: string; _reason: string }
        Returns: undefined
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_seller_balance: {
        Args: { _seller: string }
        Returns: undefined
      }
      recompute_seller_response_stats: {
        Args: { _seller: string }
        Returns: undefined
      }
      recompute_seller_review_stats: {
        Args: { _seller: string }
        Returns: undefined
      }
      reject_seller: {
        Args: { _reason: string; _seller: string }
        Returns: undefined
      }
      reset_test_orders: { Args: never; Returns: undefined }
      reset_test_users: { Args: never; Returns: undefined }
      seller_follower_count: { Args: { _seller: string }; Returns: number }
      should_notify: {
        Args: { _category: string; _channel: string; _user_id: string }
        Returns: boolean
      }
      simulate_mark_order_paid: {
        Args: { _order_id: string }
        Returns: undefined
      }
      simulate_order_time_advance: {
        Args: { _mode: string; _order_id: string }
        Returns: undefined
      }
      submit_bid: {
        Args: {
          _attachments?: string[]
          _bid_amount: number
          _cover_message: string
          _delivery_days: number
          _project_id: string
        }
        Returns: string
      }
      submit_full_review: {
        Args: {
          _communication: number
          _delivery: number
          _order_id: string
          _quality: number
          _rehire: number
          _standout: string
          _text: string
          _value: number
        }
        Returns: string
      }
      submit_river_pitch: {
        Args: {
          _content: string
          _delivery_days: number
          _price: number
          _search_id: string
        }
        Returns: string
      }
      submit_seller_application:
        | {
            Args: {
              _avatar_url: string
              _bio: string
              _full_name: string
              _languages: string[]
              _location: string
              _packages: Json
              _portfolio_urls: string[]
              _primary_category: string
              _secondary_category: string
              _skills: string[]
            }
            Returns: undefined
          }
        | {
            Args: {
              _avatar_url: string
              _bio: string
              _experience_description?: string
              _full_name: string
              _languages: string[]
              _location: string
              _packages: Json
              _portfolio_urls: string[]
              _primary_category: string
              _secondary_category: string
              _skills: string[]
            }
            Returns: string
          }
      suspend_seller: { Args: { _seller: string }; Returns: undefined }
      track_promotion_event: {
        Args: { _event: string; _promotion_id: string }
        Returns: undefined
      }
    }
    Enums: {
      cancellation_status: "pending" | "accepted" | "declined"
      dispute_status:
        | "open"
        | "under_review"
        | "resolved_refund"
        | "resolved_release"
        | "resolved_partial"
      gig_status: "draft" | "pending_review" | "active" | "paused" | "denied"
      notification_type:
        | "order_placed"
        | "requirements_submitted"
        | "order_delivered"
        | "order_completed"
        | "revision_requested"
        | "review_received"
        | "custom_offer"
        | "message"
        | "dispute"
        | "payout"
        | "system"
        | "river_match"
        | "bid"
      offer_status:
        | "pending"
        | "pending_payment"
        | "accepted"
        | "declined"
        | "withdrawn"
        | "expired"
      order_status:
        | "pending_payment"
        | "pending_requirements"
        | "active"
        | "delivered"
        | "revision_requested"
        | "completed"
        | "cancelled"
        | "disputed"
        | "late"
      package_type: "basic" | "standard" | "premium"
      transaction_status: "pending" | "cleared" | "reversed"
      transaction_type:
        | "charge"
        | "platform_fee"
        | "seller_credit"
        | "refund"
        | "withdrawal"
        | "promotion_charge"
      user_role: "client" | "seller" | "admin"
      withdrawal_status: "requested" | "processing" | "paid" | "failed"
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
      cancellation_status: ["pending", "accepted", "declined"],
      dispute_status: [
        "open",
        "under_review",
        "resolved_refund",
        "resolved_release",
        "resolved_partial",
      ],
      gig_status: ["draft", "pending_review", "active", "paused", "denied"],
      notification_type: [
        "order_placed",
        "requirements_submitted",
        "order_delivered",
        "order_completed",
        "revision_requested",
        "review_received",
        "custom_offer",
        "message",
        "dispute",
        "payout",
        "system",
        "river_match",
        "bid",
      ],
      offer_status: [
        "pending",
        "pending_payment",
        "accepted",
        "declined",
        "withdrawn",
        "expired",
      ],
      order_status: [
        "pending_payment",
        "pending_requirements",
        "active",
        "delivered",
        "revision_requested",
        "completed",
        "cancelled",
        "disputed",
        "late",
      ],
      package_type: ["basic", "standard", "premium"],
      transaction_status: ["pending", "cleared", "reversed"],
      transaction_type: [
        "charge",
        "platform_fee",
        "seller_credit",
        "refund",
        "withdrawal",
        "promotion_charge",
      ],
      user_role: ["client", "seller", "admin"],
      withdrawal_status: ["requested", "processing", "paid", "failed"],
    },
  },
} as const
