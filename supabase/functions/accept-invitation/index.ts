// Supabase Edge Function: accept-invitation
// Handles invitation acceptance and user profile creation
// Created: 2025-09-04

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface AcceptInvitationRequest {
  invitation_token: string
  password: string
  first_name?: string
  last_name?: string
  phone?: string
}

interface AcceptInvitationResponse {
  success: boolean
  user_id?: string
  organization_id?: string
  error?: string
}

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const body: AcceptInvitationRequest = await req.json()
    const { invitation_token, password, first_name, last_name, phone } = body

    // Validate required fields
    if (!invitation_token || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate password strength (minimum requirements)
    if (password.length < 12) {
      return new Response(
        JSON.stringify({ success: false, error: 'Password must be at least 12 characters long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find and validate invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .select(`
        *,
        organizations (
          name,
          mfa_required
        )
      `)
      .eq('invitation_token', invitation_token)
      .eq('status', 'pending')
      .single()

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Mark invitation as expired
      await supabase
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return new Response(
        JSON.stringify({ success: false, error: 'Invitation has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers()
    const userExists = existingUser.users.find(u => u.email === invitation.email)

    let userId: string

    if (userExists) {
      // User exists, just need to add them to the organization
      userId = userExists.id

      // Check if they're already in this organization
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', userId)
        .eq('organization_id', invitation.organization_id)
        .single()

      if (existingProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'User already exists in this organization' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password: password,
        email_confirm: true, // Auto-confirm since they're accepting an invitation
        user_metadata: {
          first_name,
          last_name,
          phone,
          invited_to_organization: invitation.organization_id,
          invitation_accepted: true
        }
      })

      if (createError || !newUser.user) {
        console.error('User creation error:', createError)
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create user account' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      userId = newUser.user.id
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        organization_id: invitation.organization_id,
        role: invitation.role,
        region_id: invitation.region_id,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        is_active: true
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      
      // If profile creation fails, we should clean up the user if we created them
      if (!userExists) {
        await supabase.auth.admin.deleteUser(userId)
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize MFA settings for the user
    await supabase
      .from('user_mfa_settings')
      .insert({
        user_id: userId,
        organization_id: invitation.organization_id,
        totp_enabled: false,
        sms_enabled: false
      })

    // Mark invitation as accepted
    const { error: updateError } = await supabase
      .from('organization_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      console.error('Invitation update error:', updateError)
      // Don't fail the process, but log it
    }

    // Create default role permissions for this user's organization if they don't exist
    const { data: existingPermissions } = await supabase
      .from('role_permissions')
      .select('id')
      .eq('organization_id', invitation.organization_id)
      .eq('role', invitation.role)
      .limit(1)

    if (!existingPermissions || existingPermissions.length === 0) {
      // Insert default permissions based on role
      const defaultPermissions = getDefaultPermissions(invitation.role)
      
      for (const perm of defaultPermissions) {
        await supabase
          .from('role_permissions')
          .insert({
            organization_id: invitation.organization_id,
            role: invitation.role,
            permission: perm.permission,
            resource: perm.resource
          })
      }
    }

    // Log the successful invitation acceptance
    await supabase
      .from('auth_audit_log')
      .insert({
        user_id: userId,
        organization_id: invitation.organization_id,
        event_type: 'invitation_accepted',
        resource: 'invitations',
        details: {
          invitation_id: invitation.id,
          role: invitation.role,
          email: invitation.email,
          first_name,
          last_name
        },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        success: true
      })

    const response: AcceptInvitationResponse = {
      success: true,
      user_id: userId,
      organization_id: invitation.organization_id
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Accept invitation function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}

// Helper function to define default permissions per role
function getDefaultPermissions(role: string) {
  const permissions = {
    field_worker: [
      { permission: 'read', resource: 'own_profile' },
      { permission: 'update', resource: 'own_profile' },
      { permission: 'create', resource: 'field_reports' },
      { permission: 'read', resource: 'assigned_projects' }
    ],
    supervisor: [
      { permission: 'read', resource: 'own_profile' },
      { permission: 'update', resource: 'own_profile' },
      { permission: 'read', resource: 'team_profiles' },
      { permission: 'read', resource: 'all_reports' },
      { permission: 'approve', resource: 'field_reports' },
      { permission: 'create', resource: 'invitations' },
      { permission: 'assign', resource: 'tasks' }
    ],
    admin: [
      { permission: 'read', resource: 'own_profile' },
      { permission: 'update', resource: 'own_profile' },
      { permission: 'manage', resource: 'organization' },
      { permission: 'manage', resource: 'users' },
      { permission: 'manage', resource: 'settings' },
      { permission: 'create', resource: 'invitations' },
      { permission: 'manage', resource: 'projects' },
      { permission: 'read', resource: 'audit_logs' }
    ],
    super_admin: [
      { permission: 'manage', resource: 'system' },
      { permission: 'manage', resource: 'all_organizations' }
    ]
  }

  return permissions[role] || permissions.field_worker
}