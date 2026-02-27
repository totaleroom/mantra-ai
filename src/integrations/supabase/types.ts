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
      billing_alerts: {
        Row: {
          alert_type: string
          client_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
        }
        Insert: {
          alert_type: string
          client_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
        }
        Update: {
          alert_type?: string
          client_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          daily_message_limit: number
          id: string
          industry: string | null
          last_activity_at: string | null
          name: string
          quota_limit: number
          quota_remaining: number
          status: string
          subscription_plan: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_message_limit?: number
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          name: string
          quota_limit?: number
          quota_remaining?: number
          status?: string
          subscription_plan?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_message_limit?: number
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          name?: string
          quota_limit?: number
          quota_remaining?: number
          status?: string
          subscription_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          chunk_index: number | null
          client_id: string
          content: string | null
          created_at: string
          embedding: string | null
          file_name: string
          file_path: string | null
          id: string
          role_tag: string | null
          status: string
          ts_content: unknown
        }
        Insert: {
          chunk_index?: number | null
          client_id: string
          content?: string | null
          created_at?: string
          embedding?: string | null
          file_name: string
          file_path?: string | null
          id?: string
          role_tag?: string | null
          status?: string
          ts_content?: unknown
        }
        Update: {
          chunk_index?: number | null
          client_id?: string
          content?: string | null
          created_at?: string
          embedding?: string | null
          file_name?: string
          file_path?: string | null
          id?: string
          role_tag?: string | null
          status?: string
          ts_content?: unknown
        }
        Relationships: [
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          client_id: string
          created_at: string
          id: string
          log_date: string
          message_count: number
          token_usage: number
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          log_date?: string
          message_count?: number
          token_usage?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          log_date?: string
          message_count?: number
          token_usage?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
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
        Relationships: []
      }
      wa_conversations: {
        Row: {
          client_id: string
          created_at: string
          customer_id: string
          handled_by: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          customer_id: string
          handled_by?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          customer_id?: string
          handled_by?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "wa_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_customers: {
        Row: {
          client_id: string
          created_at: string
          id: string
          name: string | null
          phone_number: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          name?: string | null
          phone_number: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          name?: string | null
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_customers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          media_type: string | null
          media_url: string | null
          sender: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          sender: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "wa_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_sessions: {
        Row: {
          client_id: string
          created_at: string
          id: string
          instance_name: string | null
          qr_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          instance_name?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          instance_name?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      search_documents:
        | {
            Args: { p_client_id: string; p_limit?: number; p_query: string }
            Returns: {
              chunk_index: number
              content: string
              file_name: string
              id: string
              rank: number
            }[]
          }
        | {
            Args: {
              p_client_id: string
              p_limit?: number
              p_query: string
              p_role_tag?: string
            }
            Returns: {
              chunk_index: number
              content: string
              file_name: string
              id: string
              rank: number
            }[]
          }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
