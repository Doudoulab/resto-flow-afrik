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
      accounting_accounts: {
        Row: {
          class: number
          code: string
          created_at: string
          id: string
          is_system: boolean
          label: string
          restaurant_id: string
          type: string
        }
        Insert: {
          class: number
          code: string
          created_at?: string
          id?: string
          is_system?: boolean
          label: string
          restaurant_id: string
          type: string
        }
        Update: {
          class?: number
          code?: string
          created_at?: string
          id?: string
          is_system?: boolean
          label?: string
          restaurant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_accounts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_entries: {
        Row: {
          account_code: string
          created_at: string
          created_by: string | null
          credit: number
          debit: number
          entry_date: string
          id: string
          journal: string
          label: string
          reference: string | null
          restaurant_id: string
          source_id: string | null
          source_type: string | null
        }
        Insert: {
          account_code: string
          created_at?: string
          created_by?: string | null
          credit?: number
          debit?: number
          entry_date?: string
          id?: string
          journal?: string
          label: string
          reference?: string | null
          restaurant_id: string
          source_id?: string | null
          source_type?: string | null
        }
        Update: {
          account_code?: string
          created_at?: string
          created_by?: string | null
          credit?: number
          debit?: number
          entry_date?: string
          id?: string
          journal?: string
          label?: string
          reference?: string | null
          restaurant_id?: string
          source_id?: string | null
          source_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          reason: string | null
          restaurant_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          restaurant_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          reason?: string | null
          restaurant_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
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
          allergies: string | null
          balance: number
          created_at: string
          credit_limit: number
          dietary_preferences: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          balance?: number
          created_at?: string
          credit_limit?: number
          dietary_preferences?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          balance?: number
          created_at?: string
          credit_limit?: number
          dietary_preferences?: string | null
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
      invoices: {
        Row: {
          created_at: string
          currency: string
          customer_address: string | null
          customer_name: string | null
          customer_tax_id: string | null
          discount_amount: number
          id: string
          invoice_number: string
          issued_at: string
          issued_by: string | null
          items_snapshot: Json
          legal_footer: string | null
          order_id: string | null
          payment_method: string | null
          pdf_url: string | null
          restaurant_id: string
          restaurant_snapshot: Json
          service_amount: number
          subtotal: number
          tax_amount: number
          tip_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_tax_id?: string | null
          discount_amount?: number
          id?: string
          invoice_number: string
          issued_at?: string
          issued_by?: string | null
          items_snapshot?: Json
          legal_footer?: string | null
          order_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          restaurant_id: string
          restaurant_snapshot?: Json
          service_amount?: number
          subtotal?: number
          tax_amount?: number
          tip_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_name?: string | null
          customer_tax_id?: string | null
          discount_amount?: number
          id?: string
          invoice_number?: string
          issued_at?: string
          issued_by?: string | null
          items_snapshot?: Json
          legal_footer?: string | null
          order_id?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          restaurant_id?: string
          restaurant_snapshot?: Json
          service_amount?: number
          subtotal?: number
          tax_amount?: number
          tip_amount?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      kitchen_stations: {
        Row: {
          color: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_stations_restaurant_id_fkey"
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
          station_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          sort_order?: number
          station_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          sort_order?: number
          station_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_modifier_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          max_select: number
          menu_item_id: string
          min_select: number
          name: string
          restaurant_id: string
          selection_type: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          menu_item_id: string
          min_select?: number
          name: string
          restaurant_id: string
          selection_type?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_select?: number
          menu_item_id?: string
          min_select?: number
          name?: string
          restaurant_id?: string
          selection_type?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_modifier_groups_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_modifier_groups_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_modifiers: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_available: boolean
          is_default: boolean
          name: string
          price_delta: number
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_available?: boolean
          is_default?: boolean
          name: string
          price_delta?: number
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_available?: boolean
          is_default?: boolean
          name?: string
          price_delta?: number
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_modifiers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "menu_item_modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_modifiers_restaurant_id_fkey"
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
      menu_item_variants: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_available: boolean
          is_default: boolean
          menu_item_id: string
          name: string
          price: number | null
          price_delta: number
          restaurant_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_default?: boolean
          menu_item_id: string
          name: string
          price?: number | null
          price_delta?: number
          restaurant_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_default?: boolean
          menu_item_id?: string
          name?: string
          price?: number | null
          price_delta?: number
          restaurant_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_variants_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_variants_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
          station_id: string | null
          updated_at: string
          vat_rate: number | null
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
          station_id?: string | null
          updated_at?: string
          vat_rate?: number | null
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
          station_id?: string | null
          updated_at?: string
          vat_rate?: number | null
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
          {
            foreignKeyName: "menu_items_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
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
          instructions: string | null
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
          instructions?: string | null
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
          instructions?: string | null
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
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          course_number: number
          created_at: string
          discount_amount: number
          discount_reason: string | null
          fired_at: string | null
          id: string
          is_allergy_alert: boolean
          menu_item_id: string | null
          name_snapshot: string
          order_id: string
          quantity: number
          special_request: string | null
          station_id: string | null
          status: string
          unit_price: number
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          course_number?: number
          created_at?: string
          discount_amount?: number
          discount_reason?: string | null
          fired_at?: string | null
          id?: string
          is_allergy_alert?: boolean
          menu_item_id?: string | null
          name_snapshot: string
          order_id: string
          quantity?: number
          special_request?: string | null
          station_id?: string | null
          status?: string
          unit_price: number
          vat_amount?: number
          vat_rate?: number
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          course_number?: number
          created_at?: string
          discount_amount?: number
          discount_reason?: string | null
          fired_at?: string | null
          id?: string
          is_allergy_alert?: boolean
          menu_item_id?: string | null
          name_snapshot?: string
          order_id?: string
          quantity?: number
          special_request?: string | null
          station_id?: string | null
          status?: string
          unit_price?: number
          vat_amount?: number
          vat_rate?: number
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
          {
            foreignKeyName: "order_items_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "kitchen_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          invoice_id: string | null
          method: string
          order_id: string
          payer_name: string | null
          reference: string | null
          restaurant_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method: string
          order_id: string
          payer_name?: string | null
          reference?: string | null
          restaurant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          method?: string
          order_id?: string
          payer_name?: string | null
          reference?: string | null
          restaurant_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_paid: number
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number
          discount_reason: string | null
          id: string
          invoice_id: string | null
          invoice_number: string | null
          merged_tables: string[] | null
          notes: string | null
          order_number: number
          payment_method: string | null
          payment_status: string
          restaurant_id: string
          service_amount: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_number: string | null
          tax_amount: number
          tip_amount: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          discount_reason?: string | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          merged_tables?: string[] | null
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_status?: string
          restaurant_id: string
          service_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_number?: string | null
          tax_amount?: number
          tip_amount?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          discount_reason?: string | null
          id?: string
          invoice_id?: string | null
          invoice_number?: string | null
          merged_tables?: string[] | null
          notes?: string | null
          order_number?: number
          payment_method?: string | null
          payment_status?: string
          restaurant_id?: string
          service_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_number?: string | null
          tax_amount?: number
          tip_amount?: number
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
      payroll_entries: {
        Row: {
          base_salary: number
          bonus: number
          cnss_employee: number
          cnss_employer: number
          created_at: string
          employee_name: string
          gross_salary: number
          hourly_rate: number
          hours_worked: number
          id: string
          ipres_employee: number
          ipres_employer: number
          irpp: number
          net_salary: number
          notes: string | null
          other_deductions: number
          other_employer: number
          period_id: string
          restaurant_id: string
          total_deductions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_salary?: number
          bonus?: number
          cnss_employee?: number
          cnss_employer?: number
          created_at?: string
          employee_name: string
          gross_salary?: number
          hourly_rate?: number
          hours_worked?: number
          id?: string
          ipres_employee?: number
          ipres_employer?: number
          irpp?: number
          net_salary?: number
          notes?: string | null
          other_deductions?: number
          other_employer?: number
          period_id: string
          restaurant_id: string
          total_deductions?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_salary?: number
          bonus?: number
          cnss_employee?: number
          cnss_employer?: number
          created_at?: string
          employee_name?: string
          gross_salary?: number
          hourly_rate?: number
          hours_worked?: number
          id?: string
          ipres_employee?: number
          ipres_employer?: number
          irpp?: number
          net_salary?: number
          notes?: string | null
          other_deductions?: number
          other_employer?: number
          period_id?: string
          restaurant_id?: string
          total_deductions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_entries_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_entries_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          period_month: string
          restaurant_id: string
          status: string
          total_employer_charges: number
          total_gross: number
          total_net: number
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          period_month: string
          restaurant_id: string
          status?: string
          total_employer_charges?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          period_month?: string
          restaurant_id?: string
          status?: string
          total_employer_charges?: number
          total_gross?: number
          total_net?: number
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_settings: {
        Row: {
          cnss_employee_pct: number
          cnss_employer_pct: number
          country_code: string
          created_at: string
          id: string
          ipres_employee_pct: number
          ipres_employer_pct: number
          irpp_pct: number
          other_employee_pct: number
          other_employer_pct: number
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          cnss_employee_pct?: number
          cnss_employer_pct?: number
          country_code?: string
          created_at?: string
          id?: string
          ipres_employee_pct?: number
          ipres_employer_pct?: number
          irpp_pct?: number
          other_employee_pct?: number
          other_employer_pct?: number
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          cnss_employee_pct?: number
          cnss_employer_pct?: number
          country_code?: string
          created_at?: string
          id?: string
          ipres_employee_pct?: number
          ipres_employer_pct?: number
          irpp_pct?: number
          other_employee_pct?: number
          other_employer_pct?: number
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_settings_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: true
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
          allergies: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string | null
          deposit_amount: number
          deposit_status: string
          estimated_duration_min: number
          id: string
          notes: string | null
          party_size: number
          reminder_sent_at: string | null
          reserved_at: string
          restaurant_id: string
          special_occasion: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          table_number: string | null
          updated_at: string
        }
        Insert: {
          allergies?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_phone?: string | null
          deposit_amount?: number
          deposit_status?: string
          estimated_duration_min?: number
          id?: string
          notes?: string | null
          party_size?: number
          reminder_sent_at?: string | null
          reserved_at: string
          restaurant_id: string
          special_occasion?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          table_number?: string | null
          updated_at?: string
        }
        Update: {
          allergies?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_phone?: string | null
          deposit_amount?: number
          deposit_status?: string
          estimated_duration_min?: number
          id?: string
          notes?: string | null
          party_size?: number
          reminder_sent_at?: string | null
          reserved_at?: string
          restaurant_id?: string
          special_occasion?: string | null
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
          assigned_waiter_id: string | null
          created_at: string
          id: string
          label: string
          pos_x: number
          pos_y: number
          restaurant_id: string
          seats: number
          shape: string
          sort_order: number
          status: Database["public"]["Enums"]["table_status"]
          updated_at: string
        }
        Insert: {
          assigned_waiter_id?: string | null
          created_at?: string
          id?: string
          label: string
          pos_x?: number
          pos_y?: number
          restaurant_id: string
          seats?: number
          shape?: string
          sort_order?: number
          status?: Database["public"]["Enums"]["table_status"]
          updated_at?: string
        }
        Update: {
          assigned_waiter_id?: string | null
          created_at?: string
          id?: string
          label?: string
          pos_x?: number
          pos_y?: number
          restaurant_id?: string
          seats?: number
          shape?: string
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
          business_register: string | null
          country_code: string
          cover_url: string | null
          created_at: string
          currency: string
          default_service_pct: number
          default_vat_rate: number
          description: string | null
          facebook_url: string | null
          id: string
          instagram_url: string | null
          invoice_footer: string | null
          invoice_prefix: string
          logo_url: string | null
          name: string
          next_invoice_number: number
          opening_hours: Json | null
          owner_id: string
          phone: string | null
          slug: string | null
          stock_decrement_mode: string
          tax_id: string | null
          theme_color: string | null
          updated_at: string
          vat_mode: string
          whatsapp: string | null
        }
        Insert: {
          accepts_online_orders?: boolean
          address?: string | null
          business_register?: string | null
          country_code?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          default_service_pct?: number
          default_vat_rate?: number
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          invoice_footer?: string | null
          invoice_prefix?: string
          logo_url?: string | null
          name: string
          next_invoice_number?: number
          opening_hours?: Json | null
          owner_id: string
          phone?: string | null
          slug?: string | null
          stock_decrement_mode?: string
          tax_id?: string | null
          theme_color?: string | null
          updated_at?: string
          vat_mode?: string
          whatsapp?: string | null
        }
        Update: {
          accepts_online_orders?: boolean
          address?: string | null
          business_register?: string | null
          country_code?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          default_service_pct?: number
          default_vat_rate?: number
          description?: string | null
          facebook_url?: string | null
          id?: string
          instagram_url?: string | null
          invoice_footer?: string | null
          invoice_prefix?: string
          logo_url?: string | null
          name?: string
          next_invoice_number?: number
          opening_hours?: Json | null
          owner_id?: string
          phone?: string | null
          slug?: string | null
          stock_decrement_mode?: string
          tax_id?: string | null
          theme_color?: string | null
          updated_at?: string
          vat_mode?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      stock_count_items: {
        Row: {
          count_id: string
          counted_quantity: number
          created_at: string
          expected_quantity: number
          id: string
          stock_item_id: string
        }
        Insert: {
          count_id: string
          counted_quantity?: number
          created_at?: string
          expected_quantity?: number
          id?: string
          stock_item_id: string
        }
        Update: {
          count_id?: string
          counted_quantity?: number
          created_at?: string
          expected_quantity?: number
          id?: string
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_count_items_count_id_fkey"
            columns: ["count_id"]
            isOneToOne: false
            referencedRelation: "stock_counts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_count_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_counts: {
        Row: {
          count_date: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          restaurant_id: string
          status: string
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          count_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          restaurant_id: string
          status?: string
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          count_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          restaurant_id?: string
          status?: string
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_counts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
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
      stock_receipt_items: {
        Row: {
          created_at: string
          id: string
          quantity: number
          receipt_id: string
          stock_item_id: string
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          quantity?: number
          receipt_id: string
          stock_item_id: string
          unit_cost?: number
        }
        Update: {
          created_at?: string
          id?: string
          quantity?: number
          receipt_id?: string
          stock_item_id?: string
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          receipt_date: string
          restaurant_id: string
          status: string
          supplier_id: string | null
          total: number
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          receipt_date?: string
          restaurant_id: string
          status?: string
          supplier_id?: string | null
          total?: number
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          receipt_date?: string
          restaurant_id?: string
          status?: string
          supplier_id?: string | null
          total?: number
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipts_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          restaurant_id: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          restaurant_id: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          restaurant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_declarations: {
        Row: {
          created_at: string
          declared_at: string | null
          id: string
          notes: string | null
          period_month: string
          restaurant_id: string
          status: string
          updated_at: string
          vat_collected: number
          vat_deductible: number
          vat_to_pay: number
        }
        Insert: {
          created_at?: string
          declared_at?: string | null
          id?: string
          notes?: string | null
          period_month: string
          restaurant_id: string
          status?: string
          updated_at?: string
          vat_collected?: number
          vat_deductible?: number
          vat_to_pay?: number
        }
        Update: {
          created_at?: string
          declared_at?: string | null
          id?: string
          notes?: string | null
          period_month?: string
          restaurant_id?: string
          status?: string
          updated_at?: string
          vat_collected?: number
          vat_deductible?: number
          vat_to_pay?: number
        }
        Relationships: [
          {
            foreignKeyName: "tax_declarations_restaurant_id_fkey"
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
      next_invoice_number: { Args: { _restaurant_id: string }; Returns: string }
      seed_syscohada_accounts: {
        Args: { _restaurant_id: string }
        Returns: undefined
      }
      transfer_order_item: {
        Args: { _item_id: string; _reason: string; _to_order_id: string }
        Returns: undefined
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
