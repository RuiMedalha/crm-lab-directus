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
      calls: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          attempt_count: number | null
          contact_id: string | null
          created_at: string | null
          customer_name: string | null
          deal_id: string | null
          id: string
          is_processed: boolean | null
          last_attempt: string | null
          notes: string | null
          phone_number: string | null
          processed_action: string | null
          source: string | null
          status: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          attempt_count?: number | null
          contact_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          deal_id?: string | null
          id?: string
          is_processed?: boolean | null
          last_attempt?: string | null
          notes?: string | null
          phone_number?: string | null
          processed_action?: string | null
          source?: string | null
          status?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          attempt_count?: number | null
          contact_id?: string | null
          created_at?: string | null
          customer_name?: string | null
          deal_id?: string | null
          id?: string
          is_processed?: boolean | null
          last_attempt?: string | null
          notes?: string | null
          phone_number?: string | null
          processed_action?: string | null
          source?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          chatwoot_token: string | null
          chatwoot_url: string | null
          email: string | null
          id: number
          logo_url: string | null
          moloni_api_key: string | null
          moloni_client_id: string | null
          moloni_client_secret: string | null
          name: string | null
          phone: string | null
          typebot_token: string | null
          typebot_url: string | null
          updated_at: string | null
          vat_number: string | null
          webhook_pdf_proposta: string | null
          webhook_sync_moloni: string | null
          webhook_woo_order: string | null
          whatsapp_api_url: string | null
          woo_consumer_key: string | null
          woo_consumer_secret: string | null
          woo_url: string | null
        }
        Insert: {
          chatwoot_token?: string | null
          chatwoot_url?: string | null
          email?: string | null
          id?: number
          logo_url?: string | null
          moloni_api_key?: string | null
          moloni_client_id?: string | null
          moloni_client_secret?: string | null
          name?: string | null
          phone?: string | null
          typebot_token?: string | null
          typebot_url?: string | null
          updated_at?: string | null
          vat_number?: string | null
          webhook_pdf_proposta?: string | null
          webhook_sync_moloni?: string | null
          webhook_woo_order?: string | null
          whatsapp_api_url?: string | null
          woo_consumer_key?: string | null
          woo_consumer_secret?: string | null
          woo_url?: string | null
        }
        Update: {
          chatwoot_token?: string | null
          chatwoot_url?: string | null
          email?: string | null
          id?: number
          logo_url?: string | null
          moloni_api_key?: string | null
          moloni_client_id?: string | null
          moloni_client_secret?: string | null
          name?: string | null
          phone?: string | null
          typebot_token?: string | null
          typebot_url?: string | null
          updated_at?: string | null
          vat_number?: string | null
          webhook_pdf_proposta?: string | null
          webhook_sync_moloni?: string | null
          webhook_woo_order?: string | null
          whatsapp_api_url?: string | null
          woo_consumer_key?: string | null
          woo_consumer_secret?: string | null
          woo_url?: string | null
        }
        Relationships: []
      }
      contact_tags: {
        Row: {
          category: string | null
          color: string
          created_at: string | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          color: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          color?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          accept_newsletter: boolean | null
          accept_whatsapp_marketing: boolean | null
          address: string | null
          city: string | null
          company_name: string | null
          contact_email: string | null
          contact_name: string | null
          contact_person: string | null
          contact_phone: string | null
          country_id: string | null
          created_at: string | null
          email: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          internal_notes: string | null
          linkedin_url: string | null
          moloni_client_id: string | null
          newsletter_welcome_sent: boolean | null
          nif: string | null
          notes: string | null
          phone: string | null
          postal_code: string | null
          quick_notes: Json | null
          sku_history: string[] | null
          source: string | null
          source_call_id: string | null
          tags: string[] | null
          website: string | null
          whatsapp_number: string | null
        }
        Insert: {
          accept_newsletter?: boolean | null
          accept_whatsapp_marketing?: boolean | null
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          internal_notes?: string | null
          linkedin_url?: string | null
          moloni_client_id?: string | null
          newsletter_welcome_sent?: boolean | null
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          quick_notes?: Json | null
          sku_history?: string[] | null
          source?: string | null
          source_call_id?: string | null
          tags?: string[] | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          accept_newsletter?: boolean | null
          accept_whatsapp_marketing?: boolean | null
          address?: string | null
          city?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          country_id?: string | null
          created_at?: string | null
          email?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          internal_notes?: string | null
          linkedin_url?: string | null
          moloni_client_id?: string | null
          newsletter_welcome_sent?: boolean | null
          nif?: string | null
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          quick_notes?: Json | null
          sku_history?: string[] | null
          source?: string | null
          source_call_id?: string | null
          tags?: string[] | null
          website?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_source_call_id_fkey"
            columns: ["source_call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_items: {
        Row: {
          cost_price: number | null
          deal_id: string | null
          id: string
          product_id: string | null
          product_name: string | null
          quantity: number | null
          sku: string | null
          unit_price: number | null
        }
        Insert: {
          cost_price?: number | null
          deal_id?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          sku?: string | null
          unit_price?: number | null
        }
        Update: {
          cost_price?: number | null
          deal_id?: string | null
          id?: string
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          sku?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_items_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          customer_id: string | null
          external_order_id: string | null
          id: string
          manufacturer_id: string | null
          source: string | null
          status: string | null
          title: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string | null
          external_order_id?: string | null
          id?: string
          manufacturer_id?: string | null
          source?: string | null
          status?: string | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          customer_id?: string | null
          external_order_id?: string | null
          id?: string
          manufacturer_id?: string | null
          source?: string | null
          status?: string | null
          title?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_addresses: {
        Row: {
          address: string
          address_name: string | null
          city: string | null
          contact_id: string | null
          contact_person: string | null
          created_at: string | null
          delivery_notes: string | null
          id: string
          is_main_address: boolean | null
          phone: string | null
          postal_code: string | null
        }
        Insert: {
          address: string
          address_name?: string | null
          city?: string | null
          contact_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          id?: string
          is_main_address?: boolean | null
          phone?: string | null
          postal_code?: string | null
        }
        Update: {
          address?: string
          address_name?: string | null
          city?: string | null
          contact_id?: string | null
          contact_person?: string | null
          created_at?: string | null
          delivery_notes?: string | null
          id?: string
          is_main_address?: boolean | null
          phone?: string | null
          postal_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_addresses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      external_documents: {
        Row: {
          created_at: string | null
          customer_id: string | null
          deal_id: string | null
          doc_number: string
          doc_type: string
          id: string
          pdf_link: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          deal_id?: string | null
          doc_number: string
          doc_type: string
          id?: string
          pdf_link?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          deal_id?: string | null
          doc_number?: string
          doc_type?: string
          id?: string
          pdf_link?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "external_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "external_documents_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          address: string | null
          catalog_url: string | null
          city: string | null
          contact_email: string | null
          created_at: string | null
          custom_field_1_name: string | null
          custom_field_1_value: string | null
          custom_field_2_name: string | null
          custom_field_2_value: string | null
          discount_info: string | null
          email_invoicing: string | null
          email_logistics: string | null
          id: string
          internal_notes: string | null
          name: string
          order_method: string | null
          phone_main: string | null
          phone_secondary: string | null
          portal_url: string | null
          postal_code: string | null
          sales_rep_name: string | null
          sku_prefix: string | null
        }
        Insert: {
          address?: string | null
          catalog_url?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string | null
          custom_field_1_name?: string | null
          custom_field_1_value?: string | null
          custom_field_2_name?: string | null
          custom_field_2_value?: string | null
          discount_info?: string | null
          email_invoicing?: string | null
          email_logistics?: string | null
          id?: string
          internal_notes?: string | null
          name: string
          order_method?: string | null
          phone_main?: string | null
          phone_secondary?: string | null
          portal_url?: string | null
          postal_code?: string | null
          sales_rep_name?: string | null
          sku_prefix?: string | null
        }
        Update: {
          address?: string | null
          catalog_url?: string | null
          city?: string | null
          contact_email?: string | null
          created_at?: string | null
          custom_field_1_name?: string | null
          custom_field_1_value?: string | null
          custom_field_2_name?: string | null
          custom_field_2_value?: string | null
          discount_info?: string | null
          email_invoicing?: string | null
          email_logistics?: string | null
          id?: string
          internal_notes?: string | null
          name?: string
          order_method?: string | null
          phone_main?: string | null
          phone_secondary?: string | null
          portal_url?: string | null
          postal_code?: string | null
          sales_rep_name?: string | null
          sku_prefix?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channels: string[] | null
          notify_on_missed_call: boolean | null
          user_id: string
          whatsapp_number: string | null
        }
        Insert: {
          channels?: string[] | null
          notify_on_missed_call?: boolean | null
          user_id: string
          whatsapp_number?: string | null
        }
        Update: {
          channels?: string[] | null
          notify_on_missed_call?: boolean | null
          user_id?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotation_items: {
        Row: {
          cost_price: number | null
          discount_percent: number | null
          id: string
          line_total: number | null
          notes: string | null
          product_id: string | null
          product_name: string | null
          quantity: number | null
          quotation_id: string
          sku: string | null
          sort_order: number | null
          unit_price: number | null
        }
        Insert: {
          cost_price?: number | null
          discount_percent?: number | null
          id?: string
          line_total?: number | null
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          quotation_id: string
          sku?: string | null
          sort_order?: number | null
          unit_price?: number | null
        }
        Update: {
          cost_price?: number | null
          discount_percent?: number | null
          id?: string
          line_total?: number | null
          notes?: string | null
          product_id?: string | null
          product_name?: string | null
          quantity?: number | null
          quotation_id?: string
          sku?: string | null
          sort_order?: number | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          customer_id: string | null
          deal_id: string | null
          discount_amount: number | null
          discount_percent: number | null
          id: string
          notes: string | null
          pdf_link: string | null
          quotation_number: string
          status: string
          subtotal: number | null
          terms_conditions: string | null
          total_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          pdf_link?: string | null
          quotation_number: string
          status?: string
          subtotal?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          deal_id?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          id?: string
          notes?: string | null
          pdf_link?: string | null
          quotation_number?: string
          status?: string
          subtotal?: number | null
          terms_conditions?: string | null
          total_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          contact_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string | null
          related_deal_id: string | null
          status: string | null
          task_type: string | null
          title: string
        }
        Insert: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_deal_id?: string | null
          status?: string | null
          task_type?: string | null
          title: string
        }
        Update: {
          assigned_to?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          related_deal_id?: string | null
          status?: string | null
          task_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_related_deal_id_fkey"
            columns: ["related_deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Enums: {
      app_role: "admin" | "vendedor" | "gestor" | "visualizador"
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
      app_role: ["admin", "vendedor", "gestor", "visualizador"],
    },
  },
} as const
