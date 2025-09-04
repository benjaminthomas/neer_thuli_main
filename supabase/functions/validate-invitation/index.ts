// Supabase Edge Function: validate-invitation
// Validates invitation tokens and returns invitation details
// Created: 2025-09-04

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ValidateInvitationRequest {
  invitation_token: string
}

interface ValidateInvitationResponse {
  success: boolean
  invitation?: {
    id: string
    email: string
    role: string
    organization_name: string
    organization_id: string
    invited_by_name: string
    expires_at: string
    region_name?: string
  }
  error?: string
}

export default async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client (using anon key since this is public validation)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    )

    // Parse request body
    const body: ValidateInvitationRequest = await req.json()
    const { invitation_token } = body

    // Validate required fields
    if (!invitation_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing invitation token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find invitation with related data
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        status,
        region_id,
        organizations (
          id,
          name
        ),
        regions (
          name
        ),
        invited_by_profile:user_profiles!invited_by (
          first_name,
          last_name
        )
      `)
      .eq('invitation_token', invitation_token)
      .single()

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid invitation token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check invitation status
    if (invitation.status !== 'pending') {
      const statusMessages = {
        'accepted': 'This invitation has already been accepted',
        'expired': 'This invitation has expired',
        'revoked': 'This invitation has been revoked'
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: statusMessages[invitation.status] || 'Invitation is not valid' 
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if invitation has expired
    if (new Date(invitation.expires_at) < new Date()) {
      // Auto-mark as expired
      await supabase
        .from('organization_invitations')
        .update({ status: 'expired' })
        .eq('invitation_token', invitation_token)

      return new Response(
        JSON.stringify({ success: false, error: 'This invitation has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Format invited by name
    const invitedByProfile = invitation.invited_by_profile
    const invitedByName = invitedByProfile 
      ? `${invitedByProfile.first_name || ''} ${invitedByProfile.last_name || ''}`.trim()
      : 'Unknown'

    const response: ValidateInvitationResponse = {
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organization_name: invitation.organizations.name,
        organization_id: invitation.organizations.id,
        invited_by_name: invitedByName || 'System Administrator',
        expires_at: invitation.expires_at,
        region_name: invitation.regions?.name || null
      }
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Validate invitation function error:', error)
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