-- Database Triggers for Audit Logging and User Lifecycle Events
-- Water Infrastructure Monitoring Platform - Authentication System
-- Created: 2025-09-04

-- ============================================================================
-- AUDIT LOGGING TRIGGER FUNCTIONS
-- ============================================================================

-- Generic audit trigger function for all table changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip audit logging for the audit table itself to prevent infinite loops
  IF TG_TABLE_NAME = 'auth_audit_log' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO auth_audit_log (
    user_id,
    organization_id,
    event_type,
    resource,
    details,
    ip_address,
    user_agent,
    success
  ) VALUES (
    auth.uid(),
    COALESCE(
      CASE 
        WHEN NEW IS NOT NULL THEN NEW.organization_id
        WHEN OLD IS NOT NULL THEN OLD.organization_id
        ELSE NULL
      END,
      get_user_organization(auth.uid())
    ),
    CASE TG_OP
      WHEN 'INSERT' THEN 'created'
      WHEN 'UPDATE' THEN 'updated'  
      WHEN 'DELETE' THEN 'deleted'
    END,
    TG_TABLE_NAME,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'old_values', CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      'new_values', CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
      'changed_fields', CASE 
        WHEN TG_OP = 'UPDATE' THEN (
          SELECT jsonb_object_agg(key, jsonb_build_object('old', old_row.value, 'new', new_row.value))
          FROM jsonb_each(to_jsonb(OLD)) AS old_row(key, value)
          JOIN jsonb_each(to_jsonb(NEW)) AS new_row(key, value) USING (key)
          WHERE old_row.value IS DISTINCT FROM new_row.value
        )
        ELSE NULL
      END,
      'timestamp', NOW()
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent',
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Specialized trigger for authentication events
CREATE OR REPLACE FUNCTION auth_event_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  event_type_name TEXT;
  user_org_id UUID;
  session_info JSONB;
BEGIN
  -- Get user's organization
  user_org_id := get_user_organization(auth.uid());

  -- Determine specific event type based on table and operation
  CASE TG_TABLE_NAME
    WHEN 'user_sessions' THEN
      CASE TG_OP
        WHEN 'INSERT' THEN event_type_name := 'login';
        WHEN 'UPDATE' THEN 
          event_type_name := CASE 
            WHEN OLD.is_active = true AND NEW.is_active = false THEN 'logout'
            ELSE 'session_updated'
          END;
        WHEN 'DELETE' THEN event_type_name := 'session_deleted';
      END;
    WHEN 'user_mfa_settings' THEN
      CASE TG_OP
        WHEN 'INSERT' THEN event_type_name := 'mfa_initialized';
        WHEN 'UPDATE' THEN
          event_type_name := CASE
            WHEN OLD.totp_enabled = false AND NEW.totp_enabled = true THEN 'mfa_enabled'
            WHEN OLD.totp_enabled = true AND NEW.totp_enabled = false THEN 'mfa_disabled'
            ELSE 'mfa_updated'
          END;
      END;
    WHEN 'user_profiles' THEN
      CASE TG_OP
        WHEN 'INSERT' THEN event_type_name := 'user_created';
        WHEN 'UPDATE' THEN
          event_type_name := CASE
            WHEN OLD.role != NEW.role THEN 'role_changed'
            WHEN OLD.is_active = true AND NEW.is_active = false THEN 'account_deactivated'
            WHEN OLD.is_active = false AND NEW.is_active = true THEN 'account_activated'
            ELSE 'profile_updated'
          END;
        WHEN 'DELETE' THEN event_type_name := 'user_deleted';
      END;
    WHEN 'organization_invitations' THEN
      CASE TG_OP
        WHEN 'INSERT' THEN event_type_name := 'invitation_sent';
        WHEN 'UPDATE' THEN
          event_type_name := CASE
            WHEN OLD.status = 'pending' AND NEW.status = 'accepted' THEN 'invitation_accepted'
            WHEN OLD.status = 'pending' AND NEW.status = 'revoked' THEN 'invitation_revoked'
            ELSE 'invitation_updated'
          END;
      END;
  END CASE;

  -- Build session info for login/logout events
  IF TG_TABLE_NAME = 'user_sessions' THEN
    session_info := jsonb_build_object(
      'session_id', COALESCE(NEW.id, OLD.id),
      'device_info', COALESCE(NEW.device_info, OLD.device_info),
      'ip_address', COALESCE(NEW.ip_address, OLD.ip_address),
      'user_agent', COALESCE(NEW.user_agent, OLD.user_agent),
      'expires_at', COALESCE(NEW.expires_at, OLD.expires_at)
    );
  ELSE
    session_info := '{}';
  END IF;

  -- Insert detailed audit log entry
  INSERT INTO auth_audit_log (
    user_id,
    organization_id,
    event_type,
    resource,
    details,
    ip_address,
    user_agent,
    success
  ) VALUES (
    COALESCE(
      CASE 
        WHEN NEW IS NOT NULL THEN NEW.user_id
        WHEN OLD IS NOT NULL THEN OLD.user_id
        ELSE auth.uid()
      END,
      auth.uid()
    ),
    user_org_id,
    event_type_name,
    TG_TABLE_NAME,
    jsonb_build_object(
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'record_id', COALESCE(
        CASE WHEN NEW IS NOT NULL THEN NEW.id ELSE NULL END,
        CASE WHEN OLD IS NOT NULL THEN OLD.id ELSE NULL END
      ),
      'session_info', session_info,
      'changes', CASE 
        WHEN TG_OP = 'UPDATE' THEN (
          SELECT jsonb_object_agg(key, jsonb_build_object('from', old_val.value, 'to', new_val.value))
          FROM jsonb_each(to_jsonb(OLD)) AS old_val(key, value)
          JOIN jsonb_each(to_jsonb(NEW)) AS new_val(key, value) USING (key)
          WHERE old_val.value IS DISTINCT FROM new_val.value
          AND key NOT IN ('updated_at', 'last_activity_at') -- Exclude auto-updated fields
        )
        ELSE NULL
      END,
      'timestamp', NOW()
    ),
    inet_client_addr(),
    current_setting('request.headers', true)::jsonb->>'user-agent',
    true
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for password history tracking
CREATE OR REPLACE FUNCTION password_history_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Only track password changes, not other auth.users updates
  IF OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password THEN
    -- Get user's organization
    SELECT organization_id INTO user_org_id
    FROM user_profiles
    WHERE id = NEW.id;

    -- Store password hash for reuse prevention
    INSERT INTO user_password_history (
      user_id,
      organization_id,
      password_hash
    ) VALUES (
      NEW.id,
      user_org_id,
      NEW.encrypted_password
    );

    -- Audit log the password change
    INSERT INTO auth_audit_log (
      user_id,
      organization_id,
      event_type,
      resource,
      details,
      success
    ) VALUES (
      NEW.id,
      user_org_id,
      'password_changed',
      'auth.users',
      jsonb_build_object(
        'user_id', NEW.id,
        'changed_at', NOW(),
        'ip_address', inet_client_addr()
      ),
      true
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for session activity updates
CREATE OR REPLACE FUNCTION session_activity_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user's last activity in profile
  UPDATE user_profiles
  SET last_activity_at = NOW()
  WHERE id = NEW.user_id;

  -- Update last login time if this is a new session
  IF TG_OP = 'INSERT' THEN
    UPDATE user_profiles
    SET last_login_at = NOW()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up user data on deletion
CREATE OR REPLACE FUNCTION user_cleanup_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up related data when a user profile is deleted
  DELETE FROM user_sessions WHERE user_id = OLD.id;
  DELETE FROM user_mfa_settings WHERE user_id = OLD.id;
  DELETE FROM user_password_history WHERE user_id = OLD.id;
  
  -- Update invitations to mark as orphaned rather than delete
  UPDATE organization_invitations 
  SET invited_by = NULL, 
      metadata = metadata || jsonb_build_object('original_inviter_deleted', true)
  WHERE invited_by = OLD.id;

  -- Log the user deletion
  INSERT INTO auth_audit_log (
    user_id,
    organization_id,
    event_type,
    resource,
    details,
    success
  ) VALUES (
    OLD.id,
    OLD.organization_id,
    'user_deleted',
    'user_profiles',
    jsonb_build_object(
      'deleted_user_id', OLD.id,
      'user_role', OLD.role,
      'organization_id', OLD.organization_id,
      'deletion_timestamp', NOW()
    ),
    true
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TRIGGERS ON RELEVANT TABLES
-- ============================================================================

-- User profiles triggers
CREATE TRIGGER user_profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION auth_event_trigger_function();

CREATE TRIGGER user_profiles_cleanup_trigger
  AFTER DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION user_cleanup_trigger_function();

-- User sessions triggers
CREATE TRIGGER user_sessions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION auth_event_trigger_function();

CREATE TRIGGER user_sessions_activity_trigger
  AFTER INSERT OR UPDATE ON user_sessions
  FOR EACH ROW EXECUTE FUNCTION session_activity_trigger_function();

-- MFA settings triggers
CREATE TRIGGER user_mfa_settings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_mfa_settings
  FOR EACH ROW EXECUTE FUNCTION auth_event_trigger_function();

-- Organization invitations triggers
CREATE TRIGGER organization_invitations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organization_invitations
  FOR EACH ROW EXECUTE FUNCTION auth_event_trigger_function();

-- Organizations general audit trigger
CREATE TRIGGER organizations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organizations
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Role permissions audit trigger
CREATE TRIGGER role_permissions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Regions audit trigger  
CREATE TRIGGER regions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON regions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Organization regions audit trigger
CREATE TRIGGER organization_regions_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON organization_regions
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- SPECIALIZED TRIGGERS FOR AUTH.USERS TABLE (if accessible)
-- ============================================================================

-- Note: This trigger on auth.users may require special permissions
-- and might need to be created manually with service role access
-- CREATE TRIGGER auth_users_password_history_trigger
--   AFTER UPDATE ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION password_history_trigger_function();

-- ============================================================================
-- UTILITY FUNCTIONS FOR TRIGGER MANAGEMENT
-- ============================================================================

-- Function to disable all audit triggers (for bulk operations)
CREATE OR REPLACE FUNCTION disable_audit_triggers()
RETURNS void AS $$
BEGIN
  ALTER TABLE user_profiles DISABLE TRIGGER user_profiles_audit_trigger;
  ALTER TABLE user_sessions DISABLE TRIGGER user_sessions_audit_trigger;
  ALTER TABLE user_mfa_settings DISABLE TRIGGER user_mfa_settings_audit_trigger;
  ALTER TABLE organization_invitations DISABLE TRIGGER organization_invitations_audit_trigger;
  ALTER TABLE organizations DISABLE TRIGGER organizations_audit_trigger;
  ALTER TABLE role_permissions DISABLE TRIGGER role_permissions_audit_trigger;
  ALTER TABLE regions DISABLE TRIGGER regions_audit_trigger;
  ALTER TABLE organization_regions DISABLE TRIGGER organization_regions_audit_trigger;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to re-enable all audit triggers
CREATE OR REPLACE FUNCTION enable_audit_triggers()
RETURNS void AS $$
BEGIN
  ALTER TABLE user_profiles ENABLE TRIGGER user_profiles_audit_trigger;
  ALTER TABLE user_sessions ENABLE TRIGGER user_sessions_audit_trigger;
  ALTER TABLE user_mfa_settings ENABLE TRIGGER user_mfa_settings_audit_trigger;
  ALTER TABLE organization_invitations ENABLE TRIGGER organization_invitations_audit_trigger;
  ALTER TABLE organizations ENABLE TRIGGER organizations_audit_trigger;
  ALTER TABLE role_permissions ENABLE TRIGGER role_permissions_audit_trigger;
  ALTER TABLE regions ENABLE TRIGGER regions_audit_trigger;
  ALTER TABLE organization_regions ENABLE TRIGGER organization_regions_audit_trigger;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trigger status
CREATE OR REPLACE FUNCTION get_trigger_status()
RETURNS TABLE (
  table_name TEXT,
  trigger_name TEXT,
  trigger_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || tablename as table_name,
    triggername as trigger_name,
    NOT tgisinternal as trigger_enabled
  FROM pg_trigger pt
  JOIN pg_class pc ON pt.tgrelid = pc.oid
  JOIN pg_namespace pn ON pc.relnamespace = pn.oid
  WHERE pn.nspname = 'public'
  AND triggername LIKE '%audit%'
  ORDER BY table_name, trigger_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER TESTING AND VALIDATION
-- ============================================================================

-- Function to test trigger functionality
CREATE OR REPLACE FUNCTION test_audit_triggers()
RETURNS TABLE (
  test_name TEXT,
  success BOOLEAN,
  details TEXT
) AS $$
DECLARE
  test_org_id UUID;
  test_user_id UUID;
  initial_audit_count INTEGER;
  final_audit_count INTEGER;
BEGIN
  -- Count initial audit log entries
  SELECT COUNT(*) INTO initial_audit_count FROM auth_audit_log;

  -- Test organization creation trigger
  INSERT INTO organizations (name, slug)
  VALUES ('Test Org for Triggers', 'test-org-triggers')
  RETURNING id INTO test_org_id;

  -- Verify audit log entry was created
  SELECT COUNT(*) INTO final_audit_count FROM auth_audit_log;
  
  RETURN QUERY SELECT 
    'Organization Creation Trigger' as test_name,
    (final_audit_count > initial_audit_count) as success,
    format('Audit entries: %s -> %s', initial_audit_count, final_audit_count) as details;

  -- Clean up test data
  DELETE FROM organizations WHERE id = test_org_id;

  -- Add more test cases as needed...
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION audit_trigger_function() IS 'Generic audit trigger for tracking all database changes';
COMMENT ON FUNCTION auth_event_trigger_function() IS 'Specialized trigger for authentication-related events';
COMMENT ON FUNCTION password_history_trigger_function() IS 'Tracks password changes for reuse prevention';
COMMENT ON FUNCTION session_activity_trigger_function() IS 'Updates user activity timestamps from session changes';
COMMENT ON FUNCTION user_cleanup_trigger_function() IS 'Cleans up related data when users are deleted';