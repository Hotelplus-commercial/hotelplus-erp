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
      task_backlog_snapshot: {
        Row: {
          created_at: string
          dim_key: string
          metric: string
          snapshot_date: string
          source: string
          threshold_used: number | null
          value: number
        }
        Insert: {
          created_at?: string
          dim_key: string
          metric: string
          snapshot_date: string
          source: string
          threshold_used?: number | null
          value: number
        }
        Update: {
          created_at?: string
          dim_key?: string
          metric?: string
          snapshot_date?: string
          source?: string
          threshold_used?: number | null
          value?: number
        }
        Relationships: []
      }
      ticket: {
        Row: {
          case_no: string
          category_id: string
          created_at: string
          created_by: string
          description: string | null
          hotel_id: string
          hotel_name: string
          id: string
          resolved_at: string | null
          resp_id_at_close: string | null
          resp_id_at_create: string | null
          resp_team_at_close: string | null
          resp_team_at_create: string | null
          revision: number
          routed_team: string
          stamp_source: string | null
          status: string
          title: string
          updated_at: string
          waiting_reason: string | null
        }
        Insert: {
          case_no?: string
          category_id: string
          created_at?: string
          created_by: string
          description?: string | null
          hotel_id: string
          hotel_name?: string
          id?: string
          resolved_at?: string | null
          resp_id_at_close?: string | null
          resp_id_at_create?: string | null
          resp_team_at_close?: string | null
          resp_team_at_create?: string | null
          revision?: number
          routed_team: string
          stamp_source?: string | null
          status?: string
          title: string
          updated_at?: string
          waiting_reason?: string | null
        }
        Update: {
          case_no?: string
          category_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          hotel_id?: string
          hotel_name?: string
          id?: string
          resolved_at?: string | null
          resp_id_at_close?: string | null
          resp_id_at_create?: string | null
          resp_team_at_close?: string | null
          resp_team_at_create?: string | null
          revision?: number
          routed_team?: string
          stamp_source?: string | null
          status?: string
          title?: string
          updated_at?: string
          waiting_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_category"
            referencedColumns: ["code"]
          },
        ]
      }
      ticket_activity: {
        Row: {
          actor_id: string
          at: string
          body: string
          id: string
          ticket_id: string
          type: string
        }
        Insert: {
          actor_id: string
          at?: string
          body?: string
          id?: string
          ticket_id: string
          type: string
        }
        Update: {
          actor_id?: string
          at?: string
          body?: string
          id?: string
          ticket_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_activity_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "ticket"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activity_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_task_overdue_tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_activity_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "v_task_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_category: {
        Row: {
          active: boolean
          code: string
          domain: string
          sort: number
          subcategory_label_th: string
        }
        Insert: {
          active?: boolean
          code: string
          domain: string
          sort?: number
          subcategory_label_th: string
        }
        Update: {
          active?: boolean
          code?: string
          domain?: string
          sort?: number
          subcategory_label_th?: string
        }
        Relationships: []
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
          amount_thb: number | null
          avg_rank: number | null
          billing_period: string | null
          has_bill: boolean | null
          hotel_id: string | null
          hotel_name: string | null
          invoice_count: number | null
          lens: string | null
          marcom_member_id: string | null
          marcom_thb: number | null
          orm_team_id: string | null
          orm_thb: number | null
          prev_rank: number | null
          rank: number | null
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
      v_meeting_completion: {
        Row: {
          ae_owner_id: string | null
          completed: number | null
          hotel_id: string | null
          hotel_name: string | null
          marcom_owner_id: string | null
          meeting_date: string | null
          meeting_id: string | null
          orm_owner_id: string | null
          orm_team: string | null
          pending_sync: boolean | null
          postponed_next_month: number | null
          scheduled: number | null
          service_line: string | null
          status: string | null
        }
        Relationships: []
      }
      v_meeting_count_by_ae: {
        Row: {
          ae_owner_id: string | null
          hotel_id: string | null
          hotel_name: string | null
          marcom_owner_id: string | null
          meeting_count: number | null
          meeting_date: string | null
          meeting_id: string | null
          orm_owner_id: string | null
          orm_team: string | null
          pending_sync: boolean | null
          service_line: string | null
          status: string | null
        }
        Relationships: []
      }
      v_meeting_flags: {
        Row: {
          ae_owner_id: string | null
          age_days: number | null
          comment: string | null
          hotel_id: string | null
          hotel_name: string | null
          marcom_owner_id: string | null
          meeting_date: string | null
          meeting_id: string | null
          orm_owner_id: string | null
          orm_team: string | null
          pending_sync: boolean | null
          red_count: number | null
          resolved_at: string | null
          route_target: string | null
          service_line: string | null
          status: string | null
          topic: string | null
          warn_count: number | null
          warning_progress: number | null
        }
        Relationships: []
      }
      v_meeting_funnel: {
        Row: {
          ae_owner_id: string | null
          completed: number | null
          confirmed: number | null
          hotel_id: string | null
          hotel_name: string | null
          marcom_owner_id: string | null
          meeting_date: string | null
          meeting_id: string | null
          orm_owner_id: string | null
          orm_team: string | null
          pending_sync: boolean | null
          postponed_next_month: number | null
          scheduled: number | null
          service_line: string | null
          status: string | null
          survey: number | null
          tier: string | null
        }
        Relationships: []
      }
      v_meeting_rubric_summary: {
        Row: {
          average_score: number | null
          category_breakdown: Json | null
          pending_engine: boolean | null
          verdict_tier: string | null
        }
        Relationships: []
      }
      v_meeting_survey_collection: {
        Row: {
          ae_owner_id: string | null
          completed: number | null
          hotel_id: string | null
          hotel_name: string | null
          marcom_owner_id: string | null
          meeting_date: string | null
          meeting_id: string | null
          orm_owner_id: string | null
          orm_team: string | null
          pending_sync: boolean | null
          queue: number | null
          service_line: string | null
          status: string | null
          submitted: number | null
        }
        Relationships: []
      }
      v_meeting_survey_scores: {
        Row: {
          ae_owner_id: string | null
          comment: string | null
          hotel_id: string | null
          hotel_name: string | null
          marcom_owner_id: string | null
          meeting_date: string | null
          meeting_id: string | null
          orm_owner_id: string | null
          orm_team: string | null
          pending_sync: boolean | null
          question: string | null
          score: number | null
          service_line: string | null
          status: string | null
          subject_owner_id: string | null
        }
        Relationships: []
      }
      v_ps_account_health: {
        Row: {
          active_services: number | null
          completeness: string | null
          flag: string | null
          has_orm_commission: boolean | null
          hotel_id: string | null
          hotel_name: string | null
          latest_grade: string | null
          monthly_billing: number | null
          monthly_survey_score: number | null
          nps: number | null
          pending_sync: boolean | null
          service_line: string | null
          survey2: number | null
          worst_grade: string | null
        }
        Relationships: []
      }
      v_ps_attach_rate: {
        Row: {
          active_hotels: number | null
          attached_hotels: number | null
          service_line: string | null
        }
        Relationships: []
      }
      v_ps_churn_monthly: {
        Row: {
          active_at_start: number | null
          billing_period: string | null
          out_count: number | null
          service_line: string | null
        }
        Relationships: []
      }
      v_ps_contract_lifetime: {
        Row: {
          age_days: number | null
          contract_id: string | null
          end_date: string | null
          hotel_id: string | null
          service_line: string | null
          status: string | null
        }
        Relationships: []
      }
      v_ps_crosssell: {
        Row: {
          ae_owner_id: string | null
          gap_service: string | null
          gate_fail_reason: string | null
          gate_pass: boolean | null
          grade: string | null
          health_tier: string | null
          hotel_id: string | null
          hotel_name: string | null
          is_prime: boolean | null
          owned_service: string | null
          pending_sync: boolean | null
          readiness_score: number | null
          readiness_tier: string | null
          service_line: string | null
          sig_happy: boolean | null
          sig_mature: boolean | null
          sig_timely: boolean | null
          sig_value_proof: boolean | null
          survey_score: number | null
        }
        Relationships: []
      }
      v_ps_lifecycle_flow: {
        Row: {
          ae_owner_id: string | null
          contract_id: string | null
          created_at: string | null
          hotel_id: string | null
          inactivated_at: string | null
          service_line: string | null
          start_date: string | null
          status: string | null
        }
        Relationships: []
      }
      v_ps_nps: {
        Row: {
          billing_period: string | null
          detractors: number | null
          promoters: number | null
          responses: number | null
          service_line: string | null
        }
        Relationships: []
      }
      v_ps_offboard: {
        Row: {
          hotel_id: string | null
          pending_sync: boolean | null
        }
        Relationships: []
      }
      v_ps_onboard_cohort: {
        Row: {
          ae_days: number | null
          billing_period: string | null
          detractors: number | null
          marcom_days: number | null
          median_days: number | null
          orm_days: number | null
          overall_days: number | null
          p25_days: number | null
          p75_days: number | null
          promoters: number | null
          responses: number | null
          service_line: string | null
          specialist_days: number | null
          survey1: number | null
          survey2: number | null
        }
        Relationships: []
      }
      v_ps_renewal: {
        Row: {
          ae_owner_id: string | null
          decided_at: string | null
          hotel_id: string | null
          outcome: string | null
          renewal_due_date: string | null
          renewal_id: string | null
          service_line: string | null
        }
        Relationships: []
      }
      v_ps_repricing: {
        Row: {
          ae_owner_id: string | null
          band_bucket: string | null
          band_max_pct: number | null
          band_min_pct: number | null
          billing_model: string | null
          cadence_path: boolean | null
          gate_fail_reason: string | null
          gate_pass: boolean | null
          hotel_id: string | null
          hotel_name: string | null
          last_increase_at: string | null
          lever_amount: number | null
          lever_field: string | null
          months_since_increase: number | null
          pending_sync: boolean | null
          revenue_profile: string | null
          service_line: string | null
          signal_path: string | null
          suggested_max_thb: number | null
          suggested_min_thb: number | null
          trigger: string | null
          trigger_pending: boolean | null
          why_chips: string[] | null
        }
        Relationships: []
      }
      v_ps_risk_scorecard: {
        Row: {
          active_hotels: number | null
          attached_hotels: number | null
          dim_grade: number | null
          dim_near_end: number | null
          dim_survey: number | null
          dim_ws2: number | null
          high_risk: number | null
          pending_sync: boolean | null
          service_line: string | null
        }
        Relationships: []
      }
      v_ps_roi: {
        Row: {
          achievement_pct: number | null
          ae_owner_id: string | null
          commission_thb: number | null
          fee_fixed_thb: number | null
          hotel_id: string | null
          hotel_name: string | null
          orm_tier: string | null
          pending_sync: boolean | null
          period: string | null
          portfolio_n: number | null
          portfolio_rev_median: number | null
          revenue_thb: number | null
          service_line: string | null
          value_ratio: number | null
        }
        Relationships: []
      }
      v_servicing_assignment_gaps: {
        Row: {
          card_id: string | null
          current_stage: string | null
          hotel_id: string | null
          hotel_name: string | null
          missing_roles: string[] | null
          pending_sync: boolean | null
          service_line: string | null
        }
        Relationships: []
      }
      v_servicing_golive_days: {
        Row: {
          card_id: string | null
          cohort_month: string | null
          created_at: string | null
          go_live_at: string | null
          hotel_id: string | null
          hotel_name: string | null
          overall_days: number | null
          owner_label: string | null
          pending_sync: boolean | null
          service_line: string | null
        }
        Relationships: []
      }
      v_servicing_phase_time: {
        Row: {
          card_id: string | null
          days: number | null
          go_live_at: string | null
          hotel_id: string | null
          hotel_name: string | null
          lane: string | null
          owner_fallback: boolean | null
          owner_id_at_end: string | null
          owner_label: string | null
          phase: string | null
          service_variant: string | null
          zone: string | null
        }
        Relationships: []
      }
      v_servicing_pipeline: {
        Row: {
          card_count: number | null
          max_days_hotel: string | null
          max_days_in_stage: number | null
          n_amber: number | null
          n_gap: number | null
          n_ok: number | null
          n_red: number | null
          n_wait: number | null
          pending_sync: boolean | null
          service_line: string | null
          stage: string | null
        }
        Relationships: []
      }
      v_servicing_stage_cards: {
        Row: {
          ae_owner_id: string | null
          assignment_complete: boolean | null
          card_id: string | null
          card_tone: string | null
          cause_lane: Json | null
          created_at: string | null
          current_stage: string | null
          form_all_pct: number | null
          form_required_filled: number | null
          form_required_total: number | null
          form_status: string | null
          go_live_at: string | null
          hotel_id: string | null
          hotel_name: string | null
          hotel_status: string | null
          lanes: Json | null
          last_updated: string | null
          marcom_owner_id: string | null
          meeting_created_at: string | null
          meeting_date: string | null
          open_ticket_id: string | null
          open_ticket_source: string | null
          open_ticket_status: string | null
          open_ticket_target: string | null
          orm_lite: boolean | null
          orm_team: string | null
          pending_sync: boolean | null
          progress_done: number | null
          progress_total: number | null
          row2_complete: boolean | null
          service_line: string | null
          service_variant: string | null
          specialist_handover_done_at: string | null
          specialist_id: string | null
          stage_entered_at: string | null
          stage_events: Json | null
        }
        Relationships: []
      }
      v_servicing_stall_candidates: {
        Row: {
          card_id: string | null
          current_stage: string | null
          d: number | null
          event_key: string | null
          hotel_id: string | null
          hotel_name: string | null
          lane: string | null
          owner_id: string | null
          phase: string | null
          service_line: string | null
          service_variant: string | null
          target_role: string | null
        }
        Relationships: []
      }
      v_servicing_stat: {
        Row: {
          awaiting_caretaker: number | null
          cards_total: number | null
          go_live: number | null
          hotels: number | null
          in_progress: number | null
          n_amber: number | null
          n_red: number | null
          pending_sync: boolean | null
        }
        Relationships: []
      }
      v_task_coaching_backlog: {
        Row: {
          age_days: number | null
          coach: string | null
          coaching_id: string | null
          created_at: string | null
          hotel_id: string | null
          hotel_name: string | null
          pending_sync: boolean | null
          service_line: string | null
          status: string | null
        }
        Relationships: []
      }
      v_task_deadline_streams: {
        Row: {
          age_days: number | null
          deadline: string | null
          hotel_id: string | null
          hotel_name: string | null
          item_id: string | null
          overdue: boolean | null
          owner_id: string | null
          pending_sync: boolean | null
          service_line: string | null
          stream: string | null
        }
        Relationships: []
      }
      v_task_flow_monthly: {
        Row: {
          closed_count: number | null
          created_count: number | null
          hotel_id: string | null
          hotel_name: string | null
          month: string | null
          routed_team: string | null
        }
        Relationships: []
      }
      v_task_onboard_cycle: {
        Row: {
          card_id: string | null
          created_at: string | null
          cycle_days: number | null
          go_live_at: string | null
          hotel_id: string | null
          hotel_name: string | null
          pending_sync: boolean | null
          service_line: string | null
        }
        Relationships: []
      }
      v_task_overdue_tickets: {
        Row: {
          aging_days: number | null
          case_no: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          hotel_id: string | null
          hotel_name: string | null
          id: string | null
          resolved_at: string | null
          revision: number | null
          routed_team: string | null
          status: string | null
          subcategory_label_th: string | null
          title: string | null
          updated_at: string | null
          waiting_reason: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_category"
            referencedColumns: ["code"]
          },
        ]
      }
      v_task_tickets: {
        Row: {
          aging_days: number | null
          case_no: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          hotel_id: string | null
          hotel_name: string | null
          id: string | null
          resolved_at: string | null
          resp_id_at_close: string | null
          resp_id_at_create: string | null
          resp_team_at_close: string | null
          resp_team_at_create: string | null
          revision: number | null
          routed_team: string | null
          stamp_source: string | null
          status: string | null
          subcategory_label_th: string | null
          title: string | null
          updated_at: string | null
          waiting_reason: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ticket_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "ticket_category"
            referencedColumns: ["code"]
          },
        ]
      }
      v_task_unassigned: {
        Row: {
          age_days: number | null
          card_id: string | null
          due_since: string | null
          hotel_id: string | null
          hotel_name: string | null
          pending_sync: boolean | null
          role: string | null
          service_line: string | null
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
      task_snapshot_upsert: { Args: { p_rows: Json }; Returns: number }
      ticket_create: {
        Args: {
          p_actor: string
          p_category: string
          p_description: string
          p_hotel_id: string
          p_hotel_name: string
          p_title: string
        }
        Returns: Json
      }
      ticket_create_v2: {
        Args: {
          p_actor: string
          p_category: string
          p_description: string
          p_hotel_id: string
          p_hotel_name: string
          p_routed_team: string
          p_title: string
        }
        Returns: Json
      }
      ticket_create_v3: {
        Args: {
          p_actor: string
          p_category: string
          p_description: string
          p_hotel_id: string
          p_hotel_name: string
          p_resp_id: string
          p_resp_team: string
          p_routed_team: string
          p_title: string
        }
        Returns: Json
      }
      ticket_update: {
        Args: {
          p_actor: string
          p_category: string
          p_comment: string
          p_id: string
          p_revision: number
          p_status: string
          p_waiting_reason: string
        }
        Returns: Json
      }
      ticket_update_v2: {
        Args: {
          p_actor: string
          p_category: string
          p_comment: string
          p_id: string
          p_revision: number
          p_routed_team: string
          p_status: string
          p_waiting_reason: string
        }
        Returns: Json
      }
      ticket_update_v3: {
        Args: {
          p_actor: string
          p_category: string
          p_comment: string
          p_id: string
          p_resp_id: string
          p_resp_team: string
          p_revision: number
          p_routed_team: string
          p_status: string
          p_waiting_reason: string
        }
        Returns: Json
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
