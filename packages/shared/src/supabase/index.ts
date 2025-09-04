// Shared Supabase configuration and utilities

export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
};

export const DATABASE_TABLES = {
  USERS: 'users',
  PROFILES: 'profiles',
  SITES: 'water_sites',
  MONITORING_DATA: 'monitoring_data',
  REPORTS: 'reports',
  AUDIT_LOGS: 'audit_logs',
  INVITATIONS: 'invitations',
  SESSIONS: 'user_sessions',
} as const;

export type DatabaseTable = typeof DATABASE_TABLES[keyof typeof DATABASE_TABLES];