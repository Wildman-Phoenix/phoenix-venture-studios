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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      form_security_log: {
        Row: {
          blocked_reason: string
          created_at: string
          email: string | null
          form_name: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          blocked_reason: string
          created_at?: string
          email?: string | null
          form_name: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          blocked_reason?: string
          created_at?: string
          email?: string | null
          form_name?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      image_health_runs: {
        Row: {
          default_fallback_count: number
          details: Json | null
          fallback_count: number
          function_name: string
          gateway_402: number
          generated_count: number
          id: string
          lovable_count: number
          openai_count: number
          openai_errors: number
          run_at: string
          source_count: number
          total: number
        }
        Insert: {
          default_fallback_count?: number
          details?: Json | null
          fallback_count?: number
          function_name?: string
          gateway_402?: number
          generated_count?: number
          id?: string
          lovable_count?: number
          openai_count?: number
          openai_errors?: number
          run_at?: string
          source_count?: number
          total?: number
        }
        Update: {
          default_fallback_count?: number
          details?: Json | null
          fallback_count?: number
          function_name?: string
          gateway_402?: number
          generated_count?: number
          id?: string
          lovable_count?: number
          openai_count?: number
          openai_errors?: number
          run_at?: string
          source_count?: number
          total?: number
        }
        Relationships: []
      }
      insights_posts: {
        Row: {
          author: string | null
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          published_at: string | null
          slug: string
          subtitle: string | null
          summary: string | null
          tags: string[] | null
          title: string
        }
        Insert: {
          author?: string | null
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          slug: string
          subtitle?: string | null
          summary?: string | null
          tags?: string[] | null
          title: string
        }
        Update: {
          author?: string | null
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          published_at?: string | null
          slug?: string
          subtitle?: string | null
          summary?: string | null
          tags?: string[] | null
          title?: string
        }
        Relationships: []
      }
      intelligence_entries: {
        Row: {
          content_type: string | null
          created_at: string
          cta_text: string | null
          cta_url: string | null
          editorial_category: string
          featured_quote: string | null
          founder_takeaway: string | null
          hashtags: string[] | null
          headline: string
          hook: string | null
          id: string
          image_direction: string | null
          image_prompt_used: string | null
          image_relevance_score: number | null
          image_scene_id: string | null
          image_source_type: string | null
          image_url: string | null
          long_social_post: string | null
          post_angle: string | null
          short_social_post: string | null
          slug: string
          source: string
          source_date: string | null
          source_url: string | null
          summary: string | null
          why_it_matters: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          editorial_category?: string
          featured_quote?: string | null
          founder_takeaway?: string | null
          hashtags?: string[] | null
          headline: string
          hook?: string | null
          id?: string
          image_direction?: string | null
          image_prompt_used?: string | null
          image_relevance_score?: number | null
          image_scene_id?: string | null
          image_source_type?: string | null
          image_url?: string | null
          long_social_post?: string | null
          post_angle?: string | null
          short_social_post?: string | null
          slug: string
          source: string
          source_date?: string | null
          source_url?: string | null
          summary?: string | null
          why_it_matters?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          editorial_category?: string
          featured_quote?: string | null
          founder_takeaway?: string | null
          hashtags?: string[] | null
          headline?: string
          hook?: string | null
          id?: string
          image_direction?: string | null
          image_prompt_used?: string | null
          image_relevance_score?: number | null
          image_scene_id?: string | null
          image_source_type?: string | null
          image_url?: string | null
          long_social_post?: string | null
          post_angle?: string | null
          short_social_post?: string | null
          slug?: string
          source?: string
          source_date?: string | null
          source_url?: string | null
          summary?: string | null
          why_it_matters?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget_range: string | null
          business_stage: string | null
          created_at: string
          credit_strength: string | null
          email: string
          founder_role: string | null
          funding_amount: string | null
          has_entity: boolean | null
          id: string
          industry: string | null
          lead_source: string | null
          lead_status: string | null
          marketing_consent: boolean | null
          name: string
          nurture_stage: string | null
          phone: string | null
          preferred_follow_up: string | null
          prior_funding: string | null
          state: string | null
          submission_type: string
          support_interest: string | null
          timeline_to_launch: string | null
          use_of_funds: string | null
          venture_summary: string | null
        }
        Insert: {
          budget_range?: string | null
          business_stage?: string | null
          created_at?: string
          credit_strength?: string | null
          email: string
          founder_role?: string | null
          funding_amount?: string | null
          has_entity?: boolean | null
          id?: string
          industry?: string | null
          lead_source?: string | null
          lead_status?: string | null
          marketing_consent?: boolean | null
          name: string
          nurture_stage?: string | null
          phone?: string | null
          preferred_follow_up?: string | null
          prior_funding?: string | null
          state?: string | null
          submission_type?: string
          support_interest?: string | null
          timeline_to_launch?: string | null
          use_of_funds?: string | null
          venture_summary?: string | null
        }
        Update: {
          budget_range?: string | null
          business_stage?: string | null
          created_at?: string
          credit_strength?: string | null
          email?: string
          founder_role?: string | null
          funding_amount?: string | null
          has_entity?: boolean | null
          id?: string
          industry?: string | null
          lead_source?: string | null
          lead_status?: string | null
          marketing_consent?: boolean | null
          name?: string
          nurture_stage?: string | null
          phone?: string | null
          preferred_follow_up?: string | null
          prior_funding?: string | null
          state?: string | null
          submission_type?: string
          support_interest?: string | null
          timeline_to_launch?: string | null
          use_of_funds?: string | null
          venture_summary?: string | null
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          email: string
          id: string
          marketing_consent: boolean | null
          signup_date: string
          unsubscribed: boolean | null
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          marketing_consent?: boolean | null
          signup_date?: string
          unsubscribed?: boolean | null
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          marketing_consent?: boolean | null
          signup_date?: string
          unsubscribed?: boolean | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      post_booking_interactions: {
        Row: {
          business_stage: string | null
          conversation_type: string | null
          created_at: string
          id: string
          lead_email: string | null
          lead_id: string | null
          priority: string | null
        }
        Insert: {
          business_stage?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          lead_email?: string | null
          lead_id?: string | null
          priority?: string | null
        }
        Update: {
          business_stage?: string | null
          conversation_type?: string | null
          created_at?: string
          id?: string
          lead_email?: string | null
          lead_id?: string | null
          priority?: string | null
        }
        Relationships: []
      }
      subscriber_profiles: {
        Row: {
          biggest_challenge: string | null
          created_at: string
          current_stage: string | null
          email: string
          feedback: string | null
          first_name: string | null
          id: string
          interactive_newsletter_preference: boolean | null
          interests: string[] | null
          onboarding_email_2_sent: boolean | null
          onboarding_email_2_sent_at: string | null
          onboarding_email_3_sent: boolean | null
          onboarding_email_3_sent_at: string | null
          primary_interest: string | null
          subscriber_id: string | null
          updated_at: string
          what_are_you_building: string | null
        }
        Insert: {
          biggest_challenge?: string | null
          created_at?: string
          current_stage?: string | null
          email: string
          feedback?: string | null
          first_name?: string | null
          id?: string
          interactive_newsletter_preference?: boolean | null
          interests?: string[] | null
          onboarding_email_2_sent?: boolean | null
          onboarding_email_2_sent_at?: string | null
          onboarding_email_3_sent?: boolean | null
          onboarding_email_3_sent_at?: string | null
          primary_interest?: string | null
          subscriber_id?: string | null
          updated_at?: string
          what_are_you_building?: string | null
        }
        Update: {
          biggest_challenge?: string | null
          created_at?: string
          current_stage?: string | null
          email?: string
          feedback?: string | null
          first_name?: string | null
          id?: string
          interactive_newsletter_preference?: boolean | null
          interests?: string[] | null
          onboarding_email_2_sent?: boolean | null
          onboarding_email_2_sent_at?: string | null
          onboarding_email_3_sent?: boolean | null
          onboarding_email_3_sent_at?: string | null
          primary_interest?: string | null
          subscriber_id?: string | null
          updated_at?: string
          what_are_you_building?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriber_profiles_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "newsletter_subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_brief_runs: {
        Row: {
          created_at: string
          entry_count: number | null
          error_message: string | null
          html_body: string | null
          id: string
          insights_post_id: string | null
          preview_text: string | null
          recipient_count: number | null
          sent_at: string | null
          source_entry_ids: string[] | null
          status: string
          subject_line: string | null
          text_body: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          entry_count?: number | null
          error_message?: string | null
          html_body?: string | null
          id?: string
          insights_post_id?: string | null
          preview_text?: string | null
          recipient_count?: number | null
          sent_at?: string | null
          source_entry_ids?: string[] | null
          status?: string
          subject_line?: string | null
          text_body?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          entry_count?: number | null
          error_message?: string | null
          html_body?: string | null
          id?: string
          insights_post_id?: string | null
          preview_text?: string | null
          recipient_count?: number | null
          sent_at?: string | null
          source_entry_ids?: string[] | null
          status?: string
          subject_line?: string | null
          text_body?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_brief_runs_insights_post_id_fkey"
            columns: ["insights_post_id"]
            isOneToOne: false
            referencedRelation: "insights_posts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_intelligence_entries: {
        Row: {
          content_type: string | null
          created_at: string | null
          cta_text: string | null
          cta_url: string | null
          editorial_category: string | null
          featured_quote: string | null
          founder_takeaway: string | null
          headline: string | null
          hook: string | null
          id: string | null
          image_source_type: string | null
          image_url: string | null
          slug: string | null
          source: string | null
          source_date: string | null
          source_url: string | null
          summary: string | null
          why_it_matters: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          editorial_category?: string | null
          featured_quote?: string | null
          founder_takeaway?: string | null
          headline?: string | null
          hook?: string | null
          id?: string | null
          image_source_type?: string | null
          image_url?: string | null
          slug?: string | null
          source?: string | null
          source_date?: string | null
          source_url?: string | null
          summary?: string | null
          why_it_matters?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          cta_text?: string | null
          cta_url?: string | null
          editorial_category?: string | null
          featured_quote?: string | null
          founder_takeaway?: string | null
          headline?: string | null
          hook?: string | null
          id?: string | null
          image_source_type?: string | null
          image_url?: string | null
          slug?: string | null
          source?: string | null
          source_date?: string | null
          source_url?: string | null
          summary?: string | null
          why_it_matters?: string | null
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
