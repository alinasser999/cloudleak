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
      aws_accounts: {
        Row: {
          account_id: string | null
          created_at: string
          external_id: string
          id: string
          last_validated_at: string | null
          organization_id: string
          role_arn: string | null
          status: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          external_id: string
          id?: string
          last_validated_at?: string | null
          organization_id: string
          role_arn?: string | null
          status?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          external_id?: string
          id?: string
          last_validated_at?: string | null
          organization_id?: string
          role_arn?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "aws_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          aws_account_id: string
          confidence_score: number | null
          created_at: string
          description: string | null
          estimated_monthly_savings: number | null
          finding_type: string
          id: string
          manual_fix: string | null
          organization_id: string
          resource_id: string | null
          risk_score: number | null
          severity: string
          status: string
          terraform_fix: string | null
          title: string
        }
        Insert: {
          aws_account_id: string
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          estimated_monthly_savings?: number | null
          finding_type: string
          id?: string
          manual_fix?: string | null
          organization_id: string
          resource_id?: string | null
          risk_score?: number | null
          severity: string
          status?: string
          terraform_fix?: string | null
          title: string
        }
        Update: {
          aws_account_id?: string
          confidence_score?: number | null
          created_at?: string
          description?: string | null
          estimated_monthly_savings?: number | null
          finding_type?: string
          id?: string
          manual_fix?: string | null
          organization_id?: string
          resource_id?: string | null
          risk_score?: number | null
          severity?: string
          status?: string
          terraform_fix?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          plan: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          plan?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          plan?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          payload: Json
          period_end: string
          period_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          payload?: Json
          period_end: string
          period_start: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          payload?: Json
          period_end?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          aws_account_id: string
          created_at: string
          estimated_monthly_cost: number | null
          id: string
          metadata: Json
          organization_id: string
          region: string
          resource_id: string
          resource_type: string
        }
        Insert: {
          aws_account_id: string
          created_at?: string
          estimated_monthly_cost?: number | null
          id?: string
          metadata?: Json
          organization_id: string
          region: string
          resource_id: string
          resource_type: string
        }
        Update: {
          aws_account_id?: string
          created_at?: string
          estimated_monthly_cost?: number | null
          id?: string
          metadata?: Json
          organization_id?: string
          region?: string
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          aws_account_id: string
          created_at: string
          finished_at: string | null
          id: string
          organization_id: string
          started_at: string | null
          stats: Json
          status: string
        }
        Insert: {
          aws_account_id: string
          created_at?: string
          finished_at?: string | null
          id?: string
          organization_id: string
          started_at?: string | null
          stats?: Json
          status?: string
        }
        Update: {
          aws_account_id?: string
          created_at?: string
          finished_at?: string | null
          id?: string
          organization_id?: string
          started_at?: string | null
          stats?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_schedules: {
        Row: {
          id: string
          organization_id: string
          aws_account_id: string
          frequency: string
          enabled: boolean
          next_scan_at: string | null
          last_scan_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          aws_account_id: string
          frequency?: string
          enabled?: boolean
          next_scan_at?: string | null
          last_scan_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          aws_account_id?: string
          frequency?: string
          enabled?: boolean
          next_scan_at?: string | null
          last_scan_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scan_schedules_aws_account_id_fkey"
            columns: ["aws_account_id"]
            isOneToOne: false
            referencedRelation: "aws_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          organization_id: string
          plan: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id: string
          plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          organization_id?: string
          plan?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string }
      create_organization: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          id: string
          name: string
          plan: string
        }
      }
      remove_member: { Args: { p_membership_id: string }; Returns: undefined }
      update_member_role: {
        Args: { p_membership_id: string; p_role: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
