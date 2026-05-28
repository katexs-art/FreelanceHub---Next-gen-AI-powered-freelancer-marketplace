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
          created_at: string
          description: string | null
          id: string
          order_id: string
          raised_by: string
          reason: string | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          order_id: string
          raised_by: string
          reason?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          order_id?: string
          raised_by?: string
          reason?: string | null
          resolution_note?: string | null
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
        Relationships: [
          {
            foreignKeyName: "gigs_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          order_id: string | null
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
          order_id?: string | null
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
          order_id?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
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
          buyer_id: string
          completed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_deadline: string | null
          gig_id: string
          id: string
          order_number: string
          package_id: string | null
          platform_fee: number
          price: number
          requirements_submitted: boolean
          requirements_submitted_at: string | null
          revision_count: number
          selected_extra_ids: string[] | null
          seller_earnings: number
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          auto_complete_at?: string | null
          buyer_id: string
          completed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline?: string | null
          gig_id: string
          id?: string
          order_number?: string
          package_id?: string | null
          platform_fee: number
          price: number
          requirements_submitted?: boolean
          requirements_submitted_at?: string | null
          revision_count?: number
          selected_extra_ids?: string[] | null
          seller_earnings: number
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          auto_complete_at?: string | null
          buyer_id?: string
          completed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_deadline?: string | null
          gig_id?: string
          id?: string
          order_number?: string
          package_id?: string | null
          platform_fee?: number
          price?: number
          requirements_submitted?: boolean
          requirements_submitted_at?: string | null
          revision_count?: number
          selected_extra_ids?: string[] | null
          seller_earnings?: number
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
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
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_online: boolean
          languages: string[] | null
          last_seen: string | null
          member_since: string
          response_rate: number | null
          response_time_minutes: number | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_online?: boolean
          languages?: string[] | null
          last_seen?: string | null
          member_since?: string
          response_rate?: number | null
          response_time_minutes?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_online?: boolean
          languages?: string[] | null
          last_seen?: string | null
          member_since?: string
          response_rate?: number | null
          response_time_minutes?: number | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          buyer_id: string
          communication_rating: number | null
          created_at: string
          gig_id: string
          id: string
          is_public: boolean
          order_id: string
          rating: number
          recommend_rating: number | null
          reply: string | null
          review_text: string | null
          reviewer_role: string
          seller_id: string
          service_rating: number | null
        }
        Insert: {
          buyer_id: string
          communication_rating?: number | null
          created_at?: string
          gig_id: string
          id?: string
          is_public?: boolean
          order_id: string
          rating: number
          recommend_rating?: number | null
          reply?: string | null
          review_text?: string | null
          reviewer_role: string
          seller_id: string
          service_rating?: number | null
        }
        Update: {
          buyer_id?: string
          communication_rating?: number | null
          created_at?: string
          gig_id?: string
          id?: string
          is_public?: boolean
          order_id?: string
          rating?: number
          recommend_rating?: number | null
          reply?: string | null
          review_text?: string | null
          reviewer_role?: string
          seller_id?: string
          service_rating?: number | null
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
          charges_enabled: boolean
          created_at: string
          id: string
          lifetime_earnings: number
          onboarding_complete: boolean
          payouts_enabled: boolean
          pending_balance: number
          seller_id: string
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          available_balance?: number
          charges_enabled?: boolean
          created_at?: string
          id?: string
          lifetime_earnings?: number
          onboarding_complete?: boolean
          payouts_enabled?: boolean
          pending_balance?: number
          seller_id: string
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          available_balance?: number
          charges_enabled?: boolean
          created_at?: string
          id?: string
          lifetime_earnings?: number
          onboarding_complete?: boolean
          payouts_enabled?: boolean
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
      transactions: {
        Row: {
          amount: number
          clears_at: string | null
          created_at: string
          id: string
          order_id: string | null
          seller_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
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
          id: string
          paid_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          stripe_payout_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          stripe_payout_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
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
      accept_custom_offer: { Args: { _offer_id: string }; Returns: string }
      clear_due_seller_credits: { Args: never; Returns: undefined }
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
      get_or_create_conversation: {
        Args: { _gig_id?: string; _order_id?: string; _other: string }
        Returns: string
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_order_party: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      recompute_seller_balance: {
        Args: { _seller: string }
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
      offer_status:
        | "pending"
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
      package_type: "basic" | "standard" | "premium"
      transaction_status: "pending" | "cleared" | "reversed"
      transaction_type:
        | "charge"
        | "platform_fee"
        | "seller_credit"
        | "refund"
        | "withdrawal"
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
      ],
      offer_status: ["pending", "accepted", "declined", "withdrawn", "expired"],
      order_status: [
        "pending_payment",
        "pending_requirements",
        "active",
        "delivered",
        "revision_requested",
        "completed",
        "cancelled",
        "disputed",
      ],
      package_type: ["basic", "standard", "premium"],
      transaction_status: ["pending", "cleared", "reversed"],
      transaction_type: [
        "charge",
        "platform_fee",
        "seller_credit",
        "refund",
        "withdrawal",
      ],
      user_role: ["client", "seller", "admin"],
      withdrawal_status: ["requested", "processing", "paid", "failed"],
    },
  },
} as const
