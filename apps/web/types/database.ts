export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          organization_id: string | null
          email: string
          full_name: string | null
          avatar_url: string | null
          role: string
          status: string
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          organization_id?: string | null
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          status?: string
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string | null
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string
          status?: string
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_invitations: {
        Row: {
          id: string
          organization_id: string
          invited_email: string
          invited_role: string
          invited_by: string
          token: string
          status: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          invited_email: string
          invited_role: string
          invited_by: string
          token: string
          status?: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          invited_email?: string
          invited_role?: string
          invited_by?: string
          token?: string
          status?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          ip_address: string | null
          user_agent: string | null
          expires_at: string
          created_at: string
          last_activity: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          ip_address?: string | null
          user_agent?: string | null
          expires_at: string
          created_at?: string
          last_activity?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          ip_address?: string | null
          user_agent?: string | null
          expires_at?: string
          created_at?: string
          last_activity?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          metadata: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          metadata?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'owner' | 'admin' | 'manager' | 'operator' | 'viewer'
      user_status: 'active' | 'inactive' | 'suspended'
      invitation_status: 'pending' | 'accepted' | 'expired' | 'revoked'
    }
  }
}