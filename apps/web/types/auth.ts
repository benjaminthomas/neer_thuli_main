import type { User } from '@supabase/auth-helpers-nextjs'
import type { Database } from './database'

// User profile types
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type UserRole = Database['public']['Enums']['user_role']
export type UserStatus = Database['public']['Enums']['user_status']

// Organization types
export type Organization = Database['public']['Tables']['organizations']['Row']

// Invitation types
export type UserInvitation = Database['public']['Tables']['user_invitations']['Row']
export type InvitationStatus = Database['public']['Enums']['invitation_status']

// Session types
export type UserSession = Database['public']['Tables']['user_sessions']['Row']

// Auth context types
export interface AuthUser extends User {
  profile?: UserProfile
  organization?: Organization
}

export interface AuthContextType {
  user: AuthUser | null
  profile: UserProfile | null
  organization: Organization | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: any }>
}

// Auth form types
export interface LoginFormData {
  email: string
  password: string
  remember?: boolean
}

export interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  agreeToTerms: boolean
}

export interface ResetPasswordFormData {
  email: string
}

export interface UpdatePasswordFormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

// Role permissions
export const ROLE_PERMISSIONS = {
  owner: [
    'manage_organization',
    'manage_users',
    'manage_roles',
    'view_audit_logs',
    'manage_billing',
    'manage_settings',
    'view_all_data',
    'manage_infrastructure',
  ],
  admin: [
    'manage_users',
    'manage_roles',
    'view_audit_logs',
    'manage_settings',
    'view_all_data',
    'manage_infrastructure',
  ],
  manager: [
    'manage_users',
    'view_audit_logs',
    'view_all_data',
    'manage_infrastructure',
  ],
  operator: [
    'view_all_data',
    'manage_infrastructure',
  ],
  viewer: [
    'view_assigned_data',
  ],
} as const

export type Permission = typeof ROLE_PERMISSIONS[UserRole][number]

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function canManageUser(userRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy = ['owner', 'admin', 'manager', 'operator', 'viewer']
  const userLevel = roleHierarchy.indexOf(userRole)
  const targetLevel = roleHierarchy.indexOf(targetRole)
  
  return userLevel <= targetLevel && hasPermission(userRole, 'manage_users')
}