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
      customer_credit_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          order_id: string | null
          restaurant_id: string
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          order_id?: string | null
          restaurant_id: string
          type: Database["public"]["Enums"]["credit_tx_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          restaurant_id?: string
          type?: Database["public"]["Enums"]["credit_tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "customer_credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credit_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          balance: number
          created_at: string
          credit_limit: number
          id: string
          name: string
          notes: string | null
          phone: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          created_at?: string
          credit_limit?: number
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          balance?: number
          created_at?: string
          credit_limit?: number
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      employee_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_invitations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_recipes: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          quantity: number
          restaurant_id: string
          stock_item_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          quantity?: number
          restaurant_id: string
          stock_item_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          quantity?: number
          restaurant_id?: string
          stock_item_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_money_operators: {
        Row: {
          account_number: string | null
          created_at: string
          deeplink_template: string | null
          display_name: string | null
          enabled: boolean
          id: string
          merchant_id: string | null
          notes: string | null
          operator_code: string
          restaurant_id: string
          sort_order: number
          updated_at: string
          ussd_template: string | null
        }
        Insert: {
          account_number?: string | null
          created_at?: string
          deeplink_template?: string | null
          display_name?: string | null
          enabled?: boolean
          id?: string
          merchant_id?: string | null
          notes?: string | null
          operator_code: string
          restaurant_id: string
          sort_order?: number
          updated_at?: string
          ussd_template?: string | null
        }
        Update: {
          account_number?: string | null
          created_at?: string
          deeplink_template?: string | null
          display_name?: string | null
          enabled?: boolean
          id?: string
          merchant_id?: string | null
          notes?: string | null
          operator_code?: string
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
          ussd_template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_operators_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string | null
          name_snapshot: string
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name_snapshot: string
          order_id: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string | null
          name_snapshot?: string
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          id: string
          notes: string | null
          order_number: number
          payment_method: string | null
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"]
          table_number: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_configs: {
        Row: {
          cinetpay_apikey: string | null
          cinetpay_secret_key: string | null
          cinetpay_site_id: string | null
          created_at: string
          enabled: boolean
          id: string
          moov_number: string | null
          mtn_momo_number: string | null
          orange_money_number: string | null
          paydunya_master_key: string | null
          paydunya_private_key: string | null
          paydunya_public_key: string | null
          paydunya_token: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          restaurant_id: string
          test_mode: boolean
          updated_at: string
          wave_country_code: string
          wave_merchant_id: string | null
          wave_number: string | null
        }
        Insert: {
          cinetpay_apikey?: string | null
          cinetpay_secret_key?: string | null
          cinetpay_site_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          moov_number?: string | null
          mtn_momo_number?: string | null
          orange_money_number?: string | null
          paydunya_master_key?: string | null
          paydunya_private_key?: string | null
          paydunya_public_key?: string | null
          paydunya_token?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          restaurant_id: string
          test_mode?: boolean
          updated_at?: string
          wave_country_code?: string
          wave_merchant_id?: string | null
          wave_number?: string | null
        }
        Update: {
          cinetpay_apikey?: string | null
          cinetpay_secret_key?: string | null
          cinetpay_site_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          moov_number?: string | null
          mtn_momo_number?: string | null
          orange_money_number?: string | null
          paydunya_master_key?: string | null
          paydunya_private_key?: string | null
          paydunya_public_key?: string | null
          paydunya_token?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          restaurant_id?: string
          test_mode?: boolean
          updated_at?: string
          wave_country_code?: string
          wave_merchant_id?: string | null
          wave_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_configs_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          checkout_url: string | null
          created_at: string
          currency: string
          customer_name: string | null
          customer_phone: string | null
          external_ref: string | null
          id: string
          order_id: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          raw_response: Json | null
          restaurant_id: string
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          customer_phone?: string | null
          external_ref?: string | null
          id?: string
          order_id?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          raw_response?: Json | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_url?: string | null
          created_at?: string
          currency?: string
          customer_name?: string | null
          customer_phone?: string | null
          external_ref?: string | null
          id?: string
          order_id?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          raw_response?: Json | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          first_name: string | null
          hourly_rate: number
          id: string
          is_owner: boolean
          last_name: string | null
          restaurant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_name?: string | null
          hourly_rate?: number
          id: string
          is_owner?: boolean
          last_name?: string | null
          restaurant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_name?: string | null
          hourly_rate?: number
          id?: string
          is_owner?: boolean
          last_name?: string | null
          restaurant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      public_orders: {
        Row: {
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          restaurant_id: string
          status: string
          table_number: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          restaurant_id: string
          status?: string
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          restaurant_id?: string
          status?: string
          table_number?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          notes: string | null
          party_size: number
          reserved_at: string
          restaurant_id: string
          status: Database["public"]["Enums"]["reservation_status"]
          table_number: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          reserved_at: string
          restaurant_id: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_number?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          notes?: string | null
          party_size?: number
          reserved_at?: string
          restaurant_id?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          table_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          created_at: string
          id: string
          label: string
          restaurant_id: string
          seats: number
          sort_order: number
          status: Database["public"]["Enums"]["table_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          restaurant_id: string
          seats?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          restaurant_id?: string
          seats?: number
          sort_order?: number
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          accepts_online_orders: boolean
          address: string | null
          country_code: string
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          logo_url: string | null
          name: string
          opening_hours: Json | null
          owner_id: string
          phone: string | null
          slug: string | null
          theme_color: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          accepts_online_orders?: boolean
          address?: string | null
          country_code?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name: string
          opening_hours?: Json | null
          owner_id: string
          phone?: string | null
          slug?: string | null
          theme_color?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          accepts_online_orders?: boolean
          address?: string | null
          country_code?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          logo_url?: string | null
          name?: string
          opening_hours?: Json | null
          owner_id?: string
          phone?: string | null
          slug?: string | null
          theme_color?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      stock_items: {
        Row: {
          alert_threshold: number
          cost_per_unit: number
          created_at: string
          id: string
          name: string
          quantity: number
          restaurant_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          alert_threshold?: number
          cost_per_unit?: number
          created_at?: string
          id?: string
          name: string
          quantity?: number
          restaurant_id: string
          unit?: string
          updated_at?: string
        }
        Update: {
          alert_threshold?: number
          cost_per_unit?: number
          created_at?: string
          id?: string
          name?: string
          quantity?: number
          restaurant_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          restaurant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          restaurant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          restaurant_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          restaurant_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invitation: { Args: { _token: string }; Returns: Json }
      current_user_restaurant_id: { Args: never; Returns: string }
      get_invitation_by_token: { Args: { _token: string }; Returns: Json }
      get_public_restaurant: { Args: { _slug: string }; Returns: Json }
      has_role: {
        Args: {
          _restaurant_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_restaurant_owner: {
        Args: { _restaurant_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "manager" | "waiter" | "kitchen" | "cashier"
      credit_tx_type: "charge" | "payment"
      order_status:
        | "pending"
        | "preparing"
        | "ready"
        | "served"
        | "paid"
        | "cancelled"
      payment_provider: "paydunya" | "cinetpay" | "direct_link"
      payment_status: "pending" | "success" | "failed" | "cancelled"
      reservation_status: "confirmed" | "cancelled" | "honored" | "no_show"
      table_status: "available" | "occupied" | "needs_cleaning" | "reserved"
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
      app_role: ["manager", "waiter", "kitchen", "cashier"],
      credit_tx_type: ["charge", "payment"],
      order_status: [
        "pending",
        "preparing",
        "ready",
        "served",
        "paid",
        "cancelled",
      ],
      payment_provider: ["paydunya", "cinetpay", "direct_link"],
      payment_status: ["pending", "success", "failed", "cancelled"],
      reservation_status: ["confirmed", "cancelled", "honored", "no_show"],
      table_status: ["available", "occupied", "needs_cleaning", "reserved"],
    },
  },
} as const
