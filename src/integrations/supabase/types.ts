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
      client_locations: {
        Row: {
          address_line: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_favorite: boolean
          label: string
          latitude: number | null
          location_type: Database["public"]["Enums"]["location_type"]
          longitude: number | null
          municipality_id: string
          owner_id: string
          province_id: string
          reference: string | null
          updated_at: string
        }
        Insert: {
          address_line: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          label: string
          latitude?: number | null
          location_type?: Database["public"]["Enums"]["location_type"]
          longitude?: number | null
          municipality_id: string
          owner_id: string
          province_id: string
          reference?: string | null
          updated_at?: string
        }
        Update: {
          address_line?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          label?: string
          latitude?: number | null
          location_type?: Database["public"]["Enums"]["location_type"]
          longitude?: number | null
          municipality_id?: string
          owner_id?: string
          province_id?: string
          reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_locations_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locations_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          balance: number
          contact_name: string | null
          created_at: string
          credit_limit: number
          email: string | null
          id: string
          is_active: boolean
          is_company: boolean
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          balance?: number
          contact_name?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          is_active?: boolean
          is_company?: boolean
          name: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          balance?: number
          contact_name?: string | null
          created_at?: string
          credit_limit?: number
          email?: string | null
          id?: string
          is_active?: boolean
          is_company?: boolean
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_config: {
        Row: {
          address: string | null
          created_at: string
          default_currency: Database["public"]["Enums"]["currency_code"]
          default_diesel_price: number
          default_usd_exchange_rate: number
          email: string | null
          enzona_qr_url: string | null
          id: string
          invoice_footer_text: string | null
          invoice_prefix: string
          is_iva_registered: boolean
          legal_name: string
          logo_url: string | null
          phone: string | null
          province: string | null
          tax_id: string | null
          territorial_contribution_rate: number
          trade_name: string | null
          transfermovil_qr_url: string | null
          updated_at: string
          wizard_completed: boolean
        }
        Insert: {
          address?: string | null
          created_at?: string
          default_currency?: Database["public"]["Enums"]["currency_code"]
          default_diesel_price?: number
          default_usd_exchange_rate?: number
          email?: string | null
          enzona_qr_url?: string | null
          id?: string
          invoice_footer_text?: string | null
          invoice_prefix?: string
          is_iva_registered?: boolean
          legal_name?: string
          logo_url?: string | null
          phone?: string | null
          province?: string | null
          tax_id?: string | null
          territorial_contribution_rate?: number
          trade_name?: string | null
          transfermovil_qr_url?: string | null
          updated_at?: string
          wizard_completed?: boolean
        }
        Update: {
          address?: string | null
          created_at?: string
          default_currency?: Database["public"]["Enums"]["currency_code"]
          default_diesel_price?: number
          default_usd_exchange_rate?: number
          email?: string | null
          enzona_qr_url?: string | null
          id?: string
          invoice_footer_text?: string | null
          invoice_prefix?: string
          is_iva_registered?: boolean
          legal_name?: string
          logo_url?: string | null
          phone?: string | null
          province?: string | null
          tax_id?: string | null
          territorial_contribution_rate?: number
          trade_name?: string | null
          transfermovil_qr_url?: string | null
          updated_at?: string
          wizard_completed?: boolean
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          description: string
          driver_id: string | null
          expense_date: string
          id: string
          notes: string | null
          order_id: string | null
          receipt_url: string | null
          recorded_by: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description: string
          driver_id?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          receipt_url?: string | null
          recorded_by?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          description?: string
          driver_id?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          receipt_url?: string | null
          recorded_by?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          id: string
          invoice_id: string
          quantity: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          client_id: string
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_code"]
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          total: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          client_id: string
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          client_id?: string
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      municipalities: {
        Row: {
          code: string
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          province_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          province_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          province_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "municipalities_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provinces"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          declared_value: number | null
          description: string
          height_cm: number | null
          id: string
          length_cm: number | null
          order_id: string
          package_type: Database["public"]["Enums"]["package_type"]
          quantity: number
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          created_at?: string
          declared_value?: number | null
          description: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          order_id: string
          package_type?: Database["public"]["Enums"]["package_type"]
          quantity?: number
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          created_at?: string
          declared_value?: number | null
          description?: string
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          order_id?: string
          package_type?: Database["public"]["Enums"]["package_type"]
          quantity?: number
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          notes: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          base_cost: number | null
          client_id: string
          created_at: string
          created_by: string
          delivered_at: string | null
          destination_address: string
          destination_lat: number | null
          destination_lng: number | null
          destination_location_id: string | null
          distance_km: number | null
          driver_id: string | null
          estimated_duration_minutes: number | null
          id: string
          is_paid: boolean
          notes: string | null
          order_number: string
          origin_address: string
          origin_lat: number | null
          origin_lng: number | null
          origin_location_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          picked_up_at: string | null
          recipient_name: string | null
          recipient_phone: string | null
          scheduled_pickup_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_cost: number | null
          tracking_code: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          base_cost?: number | null
          client_id: string
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          destination_address: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_location_id?: string | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_paid?: boolean
          notes?: string | null
          order_number?: string
          origin_address: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_location_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          picked_up_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_cost?: number | null
          tracking_code?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          base_cost?: number | null
          client_id?: string
          created_at?: string
          created_by?: string
          delivered_at?: string | null
          destination_address?: string
          destination_lat?: number | null
          destination_lng?: number | null
          destination_location_id?: string | null
          distance_km?: number | null
          driver_id?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_paid?: boolean
          notes?: string | null
          order_number?: string
          origin_address?: string
          origin_lat?: number | null
          origin_lng?: number | null
          origin_location_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          picked_up_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          scheduled_pickup_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_cost?: number | null
          tracking_code?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_destination_location_id_fkey"
            columns: ["destination_location_id"]
            isOneToOne: false
            referencedRelation: "client_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_origin_location_id_fkey"
            columns: ["origin_location_id"]
            isOneToOne: false
            referencedRelation: "client_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          invoice_id: string | null
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_at: string
          recorded_by: string
          reference: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          recorded_by?: string
          reference?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          invoice_id?: string | null
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_at?: string
          recorded_by?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          client_id: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          client_id?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      provinces: {
        Row: {
          code: string
          created_at: string
          display_order: number
          id: string
          latitude: number | null
          longitude: number | null
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
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
      vehicle_locations: {
        Row: {
          accuracy_m: number | null
          driver_id: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          order_id: string | null
          recorded_at: string
          speed_kmh: number | null
          vehicle_id: string
        }
        Insert: {
          accuracy_m?: number | null
          driver_id?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          order_id?: string | null
          recorded_at?: string
          speed_kmh?: number | null
          vehicle_id: string
        }
        Update: {
          accuracy_m?: number | null
          driver_id?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          order_id?: string | null
          recorded_at?: string
          speed_kmh?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_locations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          capacity_kg: number | null
          capacity_m3: number | null
          created_at: string
          driver_id: string | null
          fuel_level: number | null
          id: string
          model: string | null
          notes: string | null
          plate: string
          status: Database["public"]["Enums"]["vehicle_status"]
          updated_at: string
          vehicle_type: Database["public"]["Enums"]["vehicle_type"]
          year: number | null
        }
        Insert: {
          brand?: string | null
          capacity_kg?: number | null
          capacity_m3?: number | null
          created_at?: string
          driver_id?: string | null
          fuel_level?: number | null
          id?: string
          model?: string | null
          notes?: string | null
          plate: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          year?: number | null
        }
        Update: {
          brand?: string | null
          capacity_kg?: number | null
          capacity_m3?: number | null
          created_at?: string
          driver_id?: string | null
          fuel_level?: number | null
          id?: string
          model?: string | null
          notes?: string | null
          plate?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          updated_at?: string
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"]
          year?: number | null
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
      app_role: "admin" | "operator" | "accountant" | "driver" | "client"
      currency_code: "CUP" | "USD" | "MLC" | "EUR"
      expense_category:
        | "fuel"
        | "maintenance"
        | "tolls"
        | "salaries"
        | "parts"
        | "permits"
        | "food"
        | "lodging"
        | "other"
      invoice_status: "draft" | "issued" | "paid" | "overdue" | "cancelled"
      location_type:
        | "residential"
        | "commercial"
        | "warehouse"
        | "pickup_point"
        | "other"
      order_status:
        | "draft"
        | "pending"
        | "confirmed"
        | "assigned"
        | "picked_up"
        | "in_transit"
        | "delivered"
        | "cancelled"
        | "returned"
      package_type:
        | "document"
        | "small_package"
        | "medium_package"
        | "large_package"
        | "pallet"
        | "refrigerated"
        | "fragile"
      payment_method: "cash" | "transfer" | "credit" | "prepaid"
      vehicle_status: "available" | "in_route" | "maintenance" | "inactive"
      vehicle_type:
        | "motorcycle"
        | "car"
        | "van"
        | "truck_small"
        | "truck_medium"
        | "truck_large"
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
      app_role: ["admin", "operator", "accountant", "driver", "client"],
      currency_code: ["CUP", "USD", "MLC", "EUR"],
      expense_category: [
        "fuel",
        "maintenance",
        "tolls",
        "salaries",
        "parts",
        "permits",
        "food",
        "lodging",
        "other",
      ],
      invoice_status: ["draft", "issued", "paid", "overdue", "cancelled"],
      location_type: [
        "residential",
        "commercial",
        "warehouse",
        "pickup_point",
        "other",
      ],
      order_status: [
        "draft",
        "pending",
        "confirmed",
        "assigned",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
        "returned",
      ],
      package_type: [
        "document",
        "small_package",
        "medium_package",
        "large_package",
        "pallet",
        "refrigerated",
        "fragile",
      ],
      payment_method: ["cash", "transfer", "credit", "prepaid"],
      vehicle_status: ["available", "in_route", "maintenance", "inactive"],
      vehicle_type: [
        "motorcycle",
        "car",
        "van",
        "truck_small",
        "truck_medium",
        "truck_large",
      ],
    },
  },
} as const
