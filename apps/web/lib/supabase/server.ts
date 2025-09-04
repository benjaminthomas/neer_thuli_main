import { createServerClient } from './client'
import type { User } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'

export async function getUser(): Promise<User | null> {
  const supabase = createServerClient()
  
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

export async function getSession() {
  const supabase = createServerClient()
  
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}

export async function requireAuth() {
  const user = await getUser()
  
  if (!user) {
    redirect('/auth/login')
  }
  
  return user
}

export async function requireNoAuth() {
  const user = await getUser()
  
  if (user) {
    redirect('/dashboard')
  }
}

// Role-based access control helpers
export async function requireRole(roles: string[]) {
  const supabase = createServerClient()
  const user = await requireAuth()
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()
  
  if (!profile || !roles.includes(profile.role)) {
    redirect('/unauthorized')
  }
  
  return { user, role: profile.role }
}

export async function requireOrganization() {
  const supabase = createServerClient()
  const user = await requireAuth()
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()
  
  if (!profile?.organization_id) {
    redirect('/onboarding')
  }
  
  return { user, organizationId: profile.organization_id }
}