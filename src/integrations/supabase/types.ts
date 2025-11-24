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
      bot_buttons: {
        Row: {
          bot_id: string | null
          created_at: string
          external_url: string | null
          id: string
          is_active: boolean
          label: string
          position: number
          telegram_chat_id: string | null
          type: Database["public"]["Enums"]["button_type"]
          updated_at: string
          updated_by: string | null
          web_app_url: string | null
        }
        Insert: {
          bot_id?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          is_active?: boolean
          label: string
          position?: number
          telegram_chat_id?: string | null
          type: Database["public"]["Enums"]["button_type"]
          updated_at?: string
          updated_by?: string | null
          web_app_url?: string | null
        }
        Update: {
          bot_id?: string | null
          created_at?: string
          external_url?: string | null
          id?: string
          is_active?: boolean
          label?: string
          position?: number
          telegram_chat_id?: string | null
          type?: Database["public"]["Enums"]["button_type"]
          updated_at?: string
          updated_by?: string | null
          web_app_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_buttons_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_buttons_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_configs: {
        Row: {
          admin_id: string
          bot_name: string | null
          bot_token: string
          created_at: string
          id: string
          is_active: boolean | null
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          admin_id: string
          bot_name?: string | null
          bot_token: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          admin_id?: string
          bot_name?: string | null
          bot_token?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_configs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_settings: {
        Row: {
          bot_id: string | null
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          bot_id?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          bot_id?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_settings_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_drafts: {
        Row: {
          admin_id: string
          bot_id: string
          button_ids: string[] | null
          created_at: string | null
          id: string
          is_scheduled: boolean | null
          media_urls: string[] | null
          message: string
          scheduled_date: string | null
          scheduled_time: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          bot_id: string
          button_ids?: string[] | null
          created_at?: string | null
          id?: string
          is_scheduled?: boolean | null
          media_urls?: string[] | null
          message: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          bot_id?: string
          button_ids?: string[] | null
          created_at?: string | null
          id?: string
          is_scheduled?: boolean | null
          media_urls?: string[] | null
          message?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_drafts_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_drafts_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      captcha_codes: {
        Row: {
          bot_id: string | null
          code: string
          created_at: string
          expires_at: string
          id: string
          is_validated: boolean
          user_telegram_id: number
        }
        Insert: {
          bot_id?: string | null
          code: string
          created_at?: string
          expires_at?: string
          id?: string
          is_validated?: boolean
          user_telegram_id: number
        }
        Update: {
          bot_id?: string | null
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          is_validated?: boolean
          user_telegram_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "captcha_codes_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          recovery_key: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          recovery_key: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          recovery_key?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_broadcasts: {
        Row: {
          admin_id: string
          bot_id: string
          button_ids: string[] | null
          created_at: string | null
          id: string
          is_sent: boolean | null
          media_urls: string[] | null
          message: string
          scheduled_for: string
          sent_at: string | null
          updated_at: string | null
        }
        Insert: {
          admin_id: string
          bot_id: string
          button_ids?: string[] | null
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          media_urls?: string[] | null
          message: string
          scheduled_for: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_id?: string
          bot_id?: string
          button_ids?: string[] | null
          created_at?: string | null
          id?: string
          is_sent?: boolean | null
          media_urls?: string[] | null
          message?: string
          scheduled_for?: string
          sent_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_broadcasts_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_broadcasts_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_invite_links: {
        Row: {
          bot_id: string | null
          button_id: string
          created_at: string
          expires_at: string
          id: string
          invite_link: string
          user_telegram_id: number
        }
        Insert: {
          bot_id?: string | null
          button_id: string
          created_at?: string
          expires_at: string
          id?: string
          invite_link: string
          user_telegram_id: number
        }
        Update: {
          bot_id?: string | null
          button_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invite_link?: string
          user_telegram_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "telegram_invite_links_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_invite_links_button_id_fkey"
            columns: ["button_id"]
            isOneToOne: false
            referencedRelation: "bot_buttons"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_users: {
        Row: {
          banned_at: string | null
          banned_by: string | null
          bot_id: string | null
          first_interaction_at: string
          first_name: string | null
          id: string
          ip_address: string | null
          is_banned: boolean
          is_bot: boolean | null
          language_code: string | null
          last_interaction_at: string
          last_name: string | null
          platform: string | null
          telegram_id: number
          total_interactions: number | null
          user_agent: string | null
          username: string | null
        }
        Insert: {
          banned_at?: string | null
          banned_by?: string | null
          bot_id?: string | null
          first_interaction_at?: string
          first_name?: string | null
          id?: string
          ip_address?: string | null
          is_banned?: boolean
          is_bot?: boolean | null
          language_code?: string | null
          last_interaction_at?: string
          last_name?: string | null
          platform?: string | null
          telegram_id: number
          total_interactions?: number | null
          user_agent?: string | null
          username?: string | null
        }
        Update: {
          banned_at?: string | null
          banned_by?: string | null
          bot_id?: string | null
          first_interaction_at?: string
          first_name?: string | null
          id?: string
          ip_address?: string | null
          is_banned?: boolean
          is_bot?: boolean | null
          language_code?: string | null
          last_interaction_at?: string
          last_name?: string | null
          platform?: string | null
          telegram_id?: number
          total_interactions?: number | null
          user_agent?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "telegram_users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "telegram_users_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
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
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          password_hash: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password_hash?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_captcha_codes: { Args: never; Returns: undefined }
      count_registered_users: { Args: never; Returns: number }
      get_current_user_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator"
      button_type: "telegram_invite" | "external_link" | "miniapp"
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
      app_role: ["admin", "moderator"],
      button_type: ["telegram_invite", "external_link", "miniapp"],
    },
  },
} as const
