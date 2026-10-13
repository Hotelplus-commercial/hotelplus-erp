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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      collection_event: {
        Row: {
          amount_outstanding: number
          by_member: string | null
          created_at: string
          customer_id: string
          event_type: Database["public"]["Enums"]["collection_event_type"]
          hotel_id: string
          id: string
          note: string | null
          occurred_at: string
          sequence: number
          subscription_id: string | null
        }
        Insert: {
          amount_outstanding: number
          by_member?: string | null
          created_at?: string
          customer_id: string
          event_type: Database["public"]["Enums"]["collection_event_type"]
          hotel_id: string
          id?: string
          note?: string | null
          occurred_at?: string
          sequence?: never
          subscription_id?: string | null
        }
        Update: {
          amount_outstanding?: number
          by_member?: string | null
          created_at?: string
          customer_id?: string
          event_type?: Database["public"]["Enums"]["collection_event_type"]
          hotel_id?: string
          id?: string
          note?: string | null
          occurred_at?: string
          sequence?: never
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_event_by_member_fkey"
            columns: ["by_member"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_event_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ac_collection_current"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "collection_event_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_event_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_event_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "service_subscription"
            referencedColumns: ["id"]
          },
        ]
      }
      contract: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      crm_documents: {
        Row: {
          namespace: string
          payload: Json
          revision: number
          updated_at: string
        }
        Insert: {
          namespace: string
          payload?: Json
          revision?: number
          updated_at?: string
        }
        Update: {
          namespace?: string
          payload?: Json
          revision?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      hotel: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      invoice: {
        Row: {
          amount: number
          billing_period: string | null
          cadence: string | null
          created_at: string
          customer_id: string
          customer_segment: Database["public"]["Enums"]["customer_segment"]
          due_date: string
          gateway_paid_date: string | null
          hotel_id: string
          id: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          issue_date: string
          paid_amount: number
          service_line: Database["public"]["Enums"]["service_line"]
          settled_date: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subscription_id: string | null
          tax_receipt_no: string | null
        }
        Insert: {
          amount: number
          billing_period?: string | null
          cadence?: string | null
          created_at?: string
          customer_id: string
          customer_segment: Database["public"]["Enums"]["customer_segment"]
          due_date: string
          gateway_paid_date?: string | null
          hotel_id: string
          id?: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          issue_date: string
          paid_amount?: number
          service_line: Database["public"]["Enums"]["service_line"]
          settled_date?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          tax_receipt_no?: string | null
        }
        Update: {
          amount?: number
          billing_period?: string | null
          cadence?: string | null
          created_at?: string
          customer_id?: string
          customer_segment?: Database["public"]["Enums"]["customer_segment"]
          due_date?: string
          gateway_paid_date?: string | null
          hotel_id?: string
          id?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          issue_date?: string
          paid_amount?: number
          service_line?: Database["public"]["Enums"]["service_line"]
          settled_date?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subscription_id?: string | null
          tax_receipt_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ac_collection_current"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "invoice_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "service_subscription"
            referencedColumns: ["id"]
          },
        ]
      }
      member: {
        Row: {
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment: {
        Row: {
          amount: number
          created_at: string
          gateway_paid_date: string
          id: string
          invoice_id: string
          method: string
          recorded_by: string
          verified_at: string | null
          verified_by: string | null
          verified_by_ac: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_paid_date: string
          id?: string
          invoice_id: string
          method: string
          recorded_by: string
          verified_at?: string | null
          verified_by?: string | null
          verified_by_ac?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_paid_date?: string
          id?: string
          invoice_id?: string
          method?: string
          recorded_by?: string
          verified_at?: string | null
          verified_by?: string | null
          verified_by_ac?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_grade_record: {
        Row: {
          basis: Json
          billing_period: string
          computed_at: string
          customer_id: string
          grade: Database["public"]["Enums"]["payment_grade"]
          id: string
        }
        Insert: {
          basis: Json
          billing_period: string
          computed_at?: string
          customer_id: string
          grade: Database["public"]["Enums"]["payment_grade"]
          id?: string
        }
        Update: {
          basis?: Json
          billing_period?: string
          computed_at?: string
          customer_id?: string
          grade?: Database["public"]["Enums"]["payment_grade"]
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_grade_record_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ac_collection_current"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "payment_grade_record_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
        ]
      }
      service_subscription: {
        Row: {
          billing_day: number
          billing_start_date: string
          contract_id: string
          created_at: string
          customer_id: string
          due_day: number
          hotel_id: string
          id: string
          marcom_member_id: string | null
          monthly_fee: number
          orm_team_id: string | null
          service_line: Database["public"]["Enums"]["service_line"]
          service_variant: Database["public"]["Enums"]["service_variant"] | null
          status: Database["public"]["Enums"]["subscription_status"]
        }
        Insert: {
          billing_day?: number
          billing_start_date: string
          contract_id: string
          created_at?: string
          customer_id: string
          due_day?: number
          hotel_id: string
          id?: string
          marcom_member_id?: string | null
          monthly_fee: number
          orm_team_id?: string | null
          service_line: Database["public"]["Enums"]["service_line"]
          service_variant?:
            | Database["public"]["Enums"]["service_variant"]
            | null
          status?: Database["public"]["Enums"]["subscription_status"]
        }
        Update: {
          billing_day?: number
          billing_start_date?: string
          contract_id?: string
          created_at?: string
          customer_id?: string
          due_day?: number
          hotel_id?: string
          id?: string
          marcom_member_id?: string | null
          monthly_fee?: number
          orm_team_id?: string | null
          service_line?: Database["public"]["Enums"]["service_line"]
          service_variant?:
            | Database["public"]["Enums"]["service_variant"]
            | null
          status?: Database["public"]["Enums"]["subscription_status"]
        }
        Relationships: [
          {
            foreignKeyName: "service_subscription_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contract"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_subscription_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "ac_collection_current"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "service_subscription_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_subscription_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_subscription_marcom_member_id_fkey"
            columns: ["marcom_member_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_subscription_orm_team_id_fkey"
            columns: ["orm_team_id"]
            isOneToOne: false
            referencedRelation: "member"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          role: string
          user_id: string
        }
        Update: {
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ac_canonical_invoice_rows: {
        Row: {
          amount: number | null
          billing_period: string | null
          collection_status: string | null
          customer_id: string | null
          customer_segment:
            | Database["public"]["Enums"]["customer_segment"]
            | null
          due_date: string | null
          hotel_id: string | null
          hotel_name: string | null
          invoice_id: string | null
          marcom_member_id: string | null
          original_customer_id: string | null
          orm_team_id: string | null
          paid_amount: number | null
          service_line: Database["public"]["Enums"]["service_line"] | null
          status: string | null
        }
        Relationships: []
      }
      ac_collection_current: {
        Row: {
          collection_status:
            | Database["public"]["Enums"]["collection_status"]
            | null
          customer_id: string | null
          name: string | null
          outstanding: number | null
        }
        Relationships: []
      }
      ac_invoice_attributed: {
        Row: {
          amount: number | null
          billing_period: string | null
          cadence: string | null
          canonical_status: string | null
          collection_status: string | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          customer_segment:
            | Database["public"]["Enums"]["customer_segment"]
            | null
          due_date: string | null
          gateway_paid_date: string | null
          hotel_id: string | null
          hotel_name: string | null
          id: string | null
          invoice_type: Database["public"]["Enums"]["invoice_type"] | null
          issue_date: string | null
          marcom_member_id: string | null
          original_customer_id: string | null
          original_invoice_id: string | null
          orm_team_id: string | null
          paid_amount: number | null
          service_line: Database["public"]["Enums"]["service_line"] | null
          settled_date: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          subscription_id: string | null
          tax_receipt_no: string | null
        }
        Relationships: []
      }
      v_ac_debtors: {
        Row: {
          billing_period: string | null
          customer_id: string | null
          marcom_member_id: string | null
          orm_team_id: string | null
          service_line: Database["public"]["Enums"]["service_line"] | null
        }
        Relationships: []
      }
      v_ac_grade_distribution: {
        Row: {
          billing_period: string | null
          customer_count: number | null
          grade: Database["public"]["Enums"]["payment_grade"] | null
          marcom_member_id: string | null
          orm_team_id: string | null
          service_line: Database["public"]["Enums"]["service_line"] | null
        }
        Relationships: []
      }
      v_ac_invoice_ranking: {
        Row: {
          amount: number | null
          billing_period: string | null
          hotel_id: string | null
          lifetime_average_rank: number | null
          marcom_member_id: string | null
          orm_team_id: string | null
          previous_month_rank: number | null
          rank: number | null
          service_line: Database["public"]["Enums"]["service_line"] | null
        }
        Relationships: []
      }
      v_ac_invoices_breakdown: {
        Row: {
          billing_period: string | null
          customer_segment:
            | Database["public"]["Enums"]["customer_segment"]
            | null
          invoice_count: number | null
          marcom_member_id: string | null
          orm_team_id: string | null
          service_line: Database["public"]["Enums"]["service_line"] | null
        }
        Relationships: []
      }
      v_ac_legal: {
        Row: {
          billing_period: string | null
          customer_count: number | null
          marcom_member_id: string | null
          orm_team_id: string | null
          service_line: Database["public"]["Enums"]["service_line"] | null
        }
        Relationships: []
      }
      v_ac_overdue: {
        Row: {
          billing_period: string | null
          customer_count: number | null
          invoice_count: number | null
          marcom_member_id: string | null
          orm_team_id: string | null
          outstanding: number | null
          service_line: Database["public"]["Enums"]["service_line"] | null
        }
        Relationships: []
      }
      v_ac_suspended: {
        Row: {
          billing_period: string | null
          customer_count: number | null
          marcom_member_id: string | null
          orm_team_id: string | null
          service_line: Database["public"]["Enums"]["service_line"] | null
        }
        Relationships: []
      }
      v_ac_system_fee: {
        Row: {
          amount: number | null
          billing_period: string | null
          cadence: string | null
          customer_id: string | null
          hotel_id: string | null
          hotel_name: string | null
          marcom_member_id: string | null
          orm_team_id: string | null
          paid: boolean | null
          service_line: Database["public"]["Enums"]["service_line"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      ac_daily: { Args: { t?: string }; Returns: number }
      ac_has_role: { Args: { roles: string[] }; Returns: boolean }
      ac_invoice_grade: {
        Args: { period: string; settled: string; t: string }
        Returns: Database["public"]["Enums"]["payment_grade"]
      }
      ac_operate: { Args: { payload: Json }; Returns: string }
      ac_operate_as: {
        Args: {
          p_name: string
          p_persona: string
          p_role: string
          payload: Json
        }
        Returns: Json
      }
      ac_recompute: { Args: { t?: string }; Returns: undefined }
      ac_verify: {
        Args: { p_payment: string; p_receipt: string }
        Returns: undefined
      }
      crm_compare_swap: {
        Args: { p_namespace: string; p_payload: Json; p_revision: number }
        Returns: number
      }
      crm_force_push: {
        Args: { p_namespace: string; p_payload: Json }
        Returns: number
      }
    }
    Enums: {
      collection_event_type:
        | "OVERDUE_FLAGGED"
        | "SUSPENDED"
        | "REACTIVATED"
        | "LEGAL_FILED"
        | "WRITTEN_OFF"
      collection_status:
        | "NORMAL"
        | "OVERDUE"
        | "SUSPENDED"
        | "LEGAL"
        | "WRITTEN_OFF"
      customer_segment: "NEW" | "EXISTING"
      invoice_status:
        | "ISSUED"
        | "PARTIALLY_PAID"
        | "PAID"
        | "OVERDUE"
        | "WRITTEN_OFF"
        | "VOID"
      invoice_type: "SETUP" | "RECURRING" | "SYSTEM_FEE"
      payment_grade: "A" | "B" | "C" | "D"
      service_line: "ORM" | "Marcom"
      service_variant: "ORM" | "MT" | "GMB" | "ORM_LITE"
      subscription_status: "ACTIVE" | "PAUSED" | "SUSPENDED" | "TERMINATED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      collection_event_type: [
        "OVERDUE_FLAGGED",
        "SUSPENDED",
        "REACTIVATED",
        "LEGAL_FILED",
        "WRITTEN_OFF",
      ],
      collection_status: [
        "NORMAL",
        "OVERDUE",
        "SUSPENDED",
        "LEGAL",
        "WRITTEN_OFF",
      ],
      customer_segment: ["NEW", "EXISTING"],
      invoice_status: [
        "ISSUED",
        "PARTIALLY_PAID",
        "PAID",
        "OVERDUE",
        "WRITTEN_OFF",
        "VOID",
      ],
      invoice_type: ["SETUP", "RECURRING", "SYSTEM_FEE"],
      payment_grade: ["A", "B", "C", "D"],
      service_line: ["ORM", "Marcom"],
      service_variant: ["ORM", "MT", "GMB", "ORM_LITE"],
      subscription_status: ["ACTIVE", "PAUSED", "SUSPENDED", "TERMINATED"],
    },
  },
} as const
