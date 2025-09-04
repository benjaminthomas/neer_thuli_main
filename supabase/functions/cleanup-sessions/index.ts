// Supabase Edge Function: cleanup-sessions
// Automated cleanup of expired sessions and audit logs
// Created: 2025-09-04

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CleanupResult {
  success: boolean
  expired_sessions_cleaned: number
  old_audit_logs_cleaned: number
  expired_invitations_cleaned: number
  error?: string
}

export default async function handler(req: Request): Promise<Response> {
  try {
    // This function should only be called by Supabase cron or service role
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.includes('service_role')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - service role required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

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

    let expiredSessionsCount = 0
    let oldAuditLogsCount = 0
    let expiredInvitationsCount = 0

    // Clean up expired sessions
    try {
      const { data: expiredSessions } = await supabase
        .from('user_sessions')
        .select('id')
        .or(`expires_at.lt.${new Date().toISOString()},and(is_active.eq.false,last_activity_at.lt.${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()})`)

      if (expiredSessions) {
        expiredSessionsCount = expiredSessions.length

        if (expiredSessionsCount > 0) {
          const sessionIds = expiredSessions.map(s => s.id)
          
          await supabase
            .from('user_sessions')
            .delete()
            .in('id', sessionIds)
        }
      }
    } catch (error) {
      console.error('Session cleanup error:', error)
    }

    // Clean up old audit logs (keep only last 90 days for performance)
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      
      const { data: oldLogs } = await supabase
        .from('auth_audit_log')
        .select('id')
        .lt('timestamp', cutoffDate)

      if (oldLogs) {
        oldAuditLogsCount = oldLogs.length

        if (oldAuditLogsCount > 0) {
          const logIds = oldLogs.map(l => l.id)
          
          await supabase
            .from('auth_audit_log')
            .delete()
            .in('id', logIds)
        }
      }
    } catch (error) {
      console.error('Audit log cleanup error:', error)
    }

    // Clean up expired invitations
    try {
      const { data: expiredInvitations } = await supabase
        .from('organization_invitations')
        .select('id')
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'pending')

      if (expiredInvitations) {
        expiredInvitationsCount = expiredInvitations.length

        if (expiredInvitationsCount > 0) {
          // Mark as expired instead of deleting for audit trail
          const invitationIds = expiredInvitations.map(i => i.id)
          
          await supabase
            .from('organization_invitations')
            .update({ status: 'expired' })
            .in('id', invitationIds)
        }
      }
    } catch (error) {
      console.error('Invitation cleanup error:', error)
    }

    // Clean up old password history (keep only last 180 days)
    try {
      const cutoffDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
      
      await supabase
        .from('user_password_history')
        .delete()
        .lt('created_at', cutoffDate)
    } catch (error) {
      console.error('Password history cleanup error:', error)
    }

    // Log the cleanup operation
    await supabase
      .from('auth_audit_log')
      .insert({
        event_type: 'system_maintenance',
        resource: 'cleanup',
        details: {
          expired_sessions_cleaned: expiredSessionsCount,
          old_audit_logs_cleaned: oldAuditLogsCount,
          expired_invitations_cleaned: expiredInvitationsCount,
          cleanup_timestamp: new Date().toISOString()
        },
        success: true
      })

    const result: CleanupResult = {
      success: true,
      expired_sessions_cleaned: expiredSessionsCount,
      old_audit_logs_cleaned: oldAuditLogsCount,
      expired_invitations_cleaned: expiredInvitationsCount
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Cleanup function error:', error)
    
    // Log the error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      await supabase
        .from('auth_audit_log')
        .insert({
          event_type: 'system_error',
          resource: 'cleanup',
          details: {
            error_message: error instanceof Error ? error.message : 'Unknown error',
            error_timestamp: new Date().toISOString()
          },
          success: false
        })
    } catch (logError) {
      console.error('Error logging cleanup failure:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        expired_sessions_cleaned: 0,
        old_audit_logs_cleaned: 0,
        expired_invitations_cleaned: 0,
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}