-- Cron jobs for automated maintenance tasks
-- Water Infrastructure Monitoring Platform - Authentication System
-- Created: 2025-09-04

-- Note: These cron jobs should be configured in Supabase Dashboard under Database → Cron
-- Or via SQL if you have the pg_cron extension enabled

-- Clean up expired sessions, invitations, and audit logs daily at 2 AM UTC
SELECT cron.schedule('cleanup-auth-data', '0 2 * * *', 'SELECT net.http_post(
    url := ''' || current_setting('app.base_url') || '/functions/v1/cleanup-sessions'',
    headers := ''{"Authorization": "Bearer " || current_setting('app.service_role_key') || '", "Content-Type": "application/json"}''::jsonb,
    body := ''{}''::jsonb
) AS result;');

-- Generate daily authentication metrics report at 1 AM UTC
SELECT cron.schedule('auth-metrics-report', '0 1 * * *', '
    INSERT INTO auth_audit_log (event_type, resource, details, success)
    SELECT 
        ''system_metrics'',
        ''daily_report'',
        jsonb_build_object(
            ''date'', CURRENT_DATE,
            ''total_users'', (SELECT COUNT(*) FROM user_profiles WHERE is_active = true),
            ''new_users_today'', (SELECT COUNT(*) FROM user_profiles WHERE DATE(created_at) = CURRENT_DATE),
            ''active_sessions'', (SELECT COUNT(*) FROM user_sessions WHERE is_active = true AND expires_at > NOW()),
            ''pending_invitations'', (SELECT COUNT(*) FROM organization_invitations WHERE status = ''pending''),
            ''failed_logins_today'', (SELECT COUNT(*) FROM auth_audit_log WHERE DATE(timestamp) = CURRENT_DATE AND event_type = ''login'' AND success = false),
            ''organizations_count'', (SELECT COUNT(*) FROM organizations),
            ''mfa_enabled_users'', (SELECT COUNT(*) FROM user_mfa_settings WHERE totp_enabled = true OR sms_enabled = true)
        ),
        true;
');

-- Clean up old password history monthly (first day at 3 AM UTC)
SELECT cron.schedule('cleanup-password-history', '0 3 1 * *', '
    DELETE FROM user_password_history 
    WHERE created_at < NOW() - INTERVAL ''180 days'';
    
    INSERT INTO auth_audit_log (event_type, resource, details, success)
    VALUES (''system_maintenance'', ''password_history'', 
            jsonb_build_object(''cleanup_date'', NOW(), ''retention_days'', 180), 
            true);
');

-- Send weekly security summary to admins (Mondays at 9 AM UTC)
SELECT cron.schedule('weekly-security-summary', '0 9 * * 1', '
    -- This would typically call an Edge Function to send email notifications
    -- For now, we''ll just log the summary
    INSERT INTO auth_audit_log (event_type, resource, details, success)
    SELECT 
        ''security_summary'',
        ''weekly_report'',
        jsonb_build_object(
            ''week_start'', DATE_TRUNC(''week'', NOW() - INTERVAL ''1 week''),
            ''week_end'', DATE_TRUNC(''week'', NOW()) - INTERVAL ''1 day'',
            ''new_users'', COUNT(CASE WHEN up.created_at >= DATE_TRUNC(''week'', NOW() - INTERVAL ''1 week'') THEN 1 END),
            ''failed_logins'', COUNT(CASE WHEN aal.event_type = ''login'' AND aal.success = false AND aal.timestamp >= DATE_TRUNC(''week'', NOW() - INTERVAL ''1 week'') THEN 1 END),
            ''suspicious_activities'', COUNT(CASE WHEN aal.event_type IN (''account_locked'', ''password_breach_detected'') AND aal.timestamp >= DATE_TRUNC(''week'', NOW() - INTERVAL ''1 week'') THEN 1 END),
            ''organizations_with_activity'', COUNT(DISTINCT up.organization_id)
        ),
        true
    FROM user_profiles up
    CROSS JOIN auth_audit_log aal;
');

-- Check for inactive users monthly and notify admins (15th day at 10 AM UTC)
SELECT cron.schedule('inactive-users-check', '0 10 15 * *', '
    INSERT INTO auth_audit_log (event_type, resource, details, success)
    SELECT 
        ''inactive_users_report'',
        ''monthly_report'',
        jsonb_build_object(
            ''report_date'', CURRENT_DATE,
            ''inactive_30_days'', (
                SELECT COUNT(*) FROM user_profiles up
                JOIN user_sessions us ON us.user_id = up.id
                WHERE us.last_activity_at < NOW() - INTERVAL ''30 days''
                AND up.is_active = true
                GROUP BY up.id
            ),
            ''inactive_90_days'', (
                SELECT COUNT(*) FROM user_profiles up
                LEFT JOIN user_sessions us ON us.user_id = up.id
                WHERE (us.last_activity_at < NOW() - INTERVAL ''90 days'' OR us.last_activity_at IS NULL)
                AND up.is_active = true
                GROUP BY up.id
            ),
            ''never_logged_in'', (
                SELECT COUNT(*) FROM user_profiles up
                WHERE up.last_login_at IS NULL
                AND up.created_at < NOW() - INTERVAL ''7 days''
                AND up.is_active = true
            )
        ),
        true;
');

-- Monitor for suspicious authentication patterns hourly
SELECT cron.schedule('security-monitoring', '0 * * * *', '
    INSERT INTO auth_audit_log (event_type, resource, details, success)
    SELECT 
        ''security_alert'',
        ''suspicious_activity'',
        jsonb_build_object(
            ''check_time'', NOW(),
            ''multiple_failed_logins'', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        ''user_id'', user_id,
                        ''organization_id'', organization_id,
                        ''failed_attempts'', failed_count,
                        ''ip_addresses'', ip_list
                    )
                )
                FROM (
                    SELECT 
                        user_id,
                        organization_id,
                        COUNT(*) as failed_count,
                        array_agg(DISTINCT ip_address::text) as ip_list
                    FROM auth_audit_log
                    WHERE event_type = ''login''
                    AND success = false
                    AND timestamp > NOW() - INTERVAL ''1 hour''
                    GROUP BY user_id, organization_id
                    HAVING COUNT(*) >= 5
                ) suspicious_users
            ),
            ''unusual_login_times'', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        ''user_id'', user_id,
                        ''organization_id'', organization_id,
                        ''login_time'', timestamp,
                        ''usual_hours'', ''business hours violation''
                    )
                )
                FROM auth_audit_log
                WHERE event_type = ''login''
                AND success = true
                AND timestamp > NOW() - INTERVAL ''1 hour''
                AND (EXTRACT(hour FROM timestamp) < 6 OR EXTRACT(hour FROM timestamp) > 22)
            )
        ),
        true
    WHERE EXISTS (
        SELECT 1 FROM auth_audit_log
        WHERE event_type = ''login''
        AND success = false
        AND timestamp > NOW() - INTERVAL ''1 hour''
        GROUP BY user_id
        HAVING COUNT(*) >= 5
    );
');

-- Comments for maintenance
COMMENT ON EXTENSION cron IS 'Automated maintenance and monitoring for authentication system';

-- To view active cron jobs:
-- SELECT * FROM cron.job;

-- To remove a cron job:
-- SELECT cron.unschedule('job_name');