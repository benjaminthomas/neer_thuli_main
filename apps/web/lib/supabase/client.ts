import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// Client-side Supabase client for use in Client Components
export const createClient = () =>
  createClientComponentClient<Database>()

// Server-side Supabase client for use in Server Components
export const createServerClient = () =>
  createServerComponentClient<Database>({ cookies })

// Route handler Supabase client for use in API routes
export const createRouteClient = () =>
  createRouteHandlerClient<Database>({ cookies })

// Configuration constants
export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
} as const

// Auth configuration
export const authConfig = {
  redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
  flowType: 'pkce',
} as const