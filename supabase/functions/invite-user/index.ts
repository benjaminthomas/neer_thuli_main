// Supabase Edge Function: invite-user
// Handles invite-only user registration with role assignment
// Created: 2025-09-04

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface InviteUserRequest {
  email: string
  organization_id: string
  role: 'field_worker' | 'supervisor' | 'admin'
  region_id?: string
  invited_by: string
  metadata?: Record<string, any>
}

interface InviteUserResponse {
  success: boolean
  invitation_id?: string
  invitation_token?: string
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
    const body: InviteUserRequest = await req.json()
    const { email, organization_id, role, region_id, invited_by, metadata } = body

    // Validate required fields
    if (!email || !organization_id || !role || !invited_by) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Set auth token for user context
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the inviting user has permission (supervisor or admin)
    const { data: inviterProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !inviterProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Inviter profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if inviter has permission to invite to this organization
    if (inviterProfile.organization_id !== organization_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot invite to different organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check role hierarchy - supervisors can't invite admins
    if (inviterProfile.role === 'supervisor' && role === 'admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions to invite admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if organization allows this invitation
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('max_users, open_registration')
      .eq('id', organization_id)
      .single()

    if (orgError || !organization) {
      return new Response(
        JSON.stringify({ success: false, error: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user already exists in auth.users
    const { data: existingUser } = await supabase.auth.admin.getUserById(email)
    if (existingUser.user) {
      // Check if they're already in this organization
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', existingUser.user.id)
        .eq('organization_id', organization_id)
        .single()

      if (existingProfile) {
        return new Response(
          JSON.stringify({ success: false, error: 'User already exists in organization' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from('organization_invitations')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organization_id)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invitation already pending for this user' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate secure invitation token
    const invitation_token = crypto.randomUUID()
    const expires_at = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .insert({
        email,
        organization_id,
        role,
        region_id,
        invitation_token,
        expires_at: expires_at.toISOString(),
        invited_by: user.id,
        status: 'pending',
        metadata: metadata || {}
      })
      .select('id, invitation_token')
      .single()

    if (inviteError) {
      console.error('Invitation creation error:', inviteError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send invitation email via Supabase Auth
    const redirectUrl = `${req.headers.get('origin') || 'http://localhost:3000'}/auth/accept-invite?token=${invitation_token}`
    
    const { error: emailError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: redirectUrl,
        data: {
          organization_id,
          role,
          region_id,
          invitation_token,
          invited_by_name: `${inviterProfile.first_name || ''} ${inviterProfile.last_name || ''}`.trim()
        }
      }
    )

    if (emailError) {
      console.error('Email invitation error:', emailError)
      // Don't fail the entire process if email fails
      // The invitation record exists, so user can still be manually notified
    }

    // Log the invitation creation
    await supabase
      .from('auth_audit_log')
      .insert({
        user_id: user.id,
        organization_id,
        event_type: 'user_invited',
        resource: 'invitations',
        details: {
          invited_email: email,
          invited_role: role,
          invitation_id: invitation.id,
          email_sent: !emailError
        },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        success: true
      })

    const response: InviteUserResponse = {
      success: true,
      invitation_id: invitation.id,
      invitation_token: invitation.invitation_token
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 201, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Invite user function error:', error)
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