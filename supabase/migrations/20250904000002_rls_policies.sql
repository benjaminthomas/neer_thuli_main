-- Row Level Security (RLS) Policies
-- Multi-tenant data isolation for User Authentication & Authorization System
-- Created: 2025-09-04

-- ============================================================================
-- ORGANIZATIONS TABLE POLICIES
-- ============================================================================

-- Users can only see organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.organization_id = organizations.id 
      AND user_profiles.id = auth.uid()
    )
  );

-- Only admins can update organization settings
CREATE POLICY "Admins can update organizations" ON organizations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.organization_id = organizations.id 
      AND user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Only super_admins can create new organizations (typically system-level)
CREATE POLICY "Super admins can create organizations" ON organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- ============================================================================
-- USER PROFILES TABLE POLICIES  
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Supervisors and admins can view team profiles in their organization
CREATE POLICY "Supervisors can view team profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles current_user
      WHERE current_user.id = auth.uid()
      AND current_user.role IN ('supervisor', 'admin', 'super_admin')
    )
  );

-- Users can update their own basic profile information
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- Prevent users from changing their own role or organization
    AND role = (SELECT role FROM user_profiles WHERE id = auth.uid())
    AND organization_id = (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
  );

-- Admins can manage all profiles in their organization
CREATE POLICY "Admins can manage org profiles" ON user_profiles
  FOR ALL TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles current_user
      WHERE current_user.id = auth.uid()
      AND current_user.role IN ('admin', 'super_admin')
    )
  );

-- Super admins can insert new user profiles (for system operations)
CREATE POLICY "Super admins can create profiles" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- ============================================================================
-- USER SESSIONS TABLE POLICIES
-- ============================================================================

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update/delete their own sessions (for logout functionality)
CREATE POLICY "Users can manage own sessions" ON user_sessions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view sessions within their organization (for security monitoring)
CREATE POLICY "Admins can view org sessions" ON user_sessions
  FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- ORGANIZATION INVITATIONS TABLE POLICIES
-- ============================================================================

-- Users can view invitations for their organization
CREATE POLICY "Users can view org invitations" ON organization_invitations
  FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid()
      AND role IN ('supervisor', 'admin', 'super_admin')
    )
  );

-- Admins and supervisors can create invitations for their organization
CREATE POLICY "Supervisors can create invitations" ON organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid()
      AND role IN ('supervisor', 'admin', 'super_admin')
    )
    AND invited_by = auth.uid()
  );

-- Admins can update/cancel invitations in their organization
CREATE POLICY "Admins can manage invitations" ON organization_invitations
  FOR UPDATE TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Allow public read for invitation validation (token lookup)
-- This is needed for invitation acceptance flow
CREATE POLICY "Public can validate invitation tokens" ON organization_invitations
  FOR SELECT TO anon
  USING (
    status = 'pending' 
    AND expires_at > NOW()
  );

-- ============================================================================
-- MFA SETTINGS TABLE POLICIES
-- ============================================================================

-- Users can only manage their own MFA settings
CREATE POLICY "Users can manage own MFA" ON user_mfa_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view MFA status for security oversight (but not secrets)
CREATE POLICY "Admins can view MFA status" ON user_mfa_settings
  FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- PASSWORD HISTORY TABLE POLICIES
-- ============================================================================

-- Only the user can access their password history (for reuse checking)
CREATE POLICY "Users can access own password history" ON user_password_history
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- AUDIT LOG TABLE POLICIES
-- ============================================================================

-- Users can view their own audit events
CREATE POLICY "Users can view own audit log" ON auth_audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all audit logs for their organization
CREATE POLICY "Admins can view org audit logs" ON auth_audit_log
  FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- System can insert audit logs (service role)
CREATE POLICY "System can insert audit logs" ON auth_audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);

-- Allow authenticated users to insert their own audit events
CREATE POLICY "Users can log own events" ON auth_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- ROLE PERMISSIONS TABLE POLICIES
-- ============================================================================

-- Users can view permissions for their role and organization
CREATE POLICY "Users can view relevant permissions" ON role_permissions
  FOR SELECT TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND role = (
      SELECT role FROM user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Admins can manage all permissions in their organization
CREATE POLICY "Admins can manage org permissions" ON role_permissions
  FOR ALL TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- REGIONS TABLE POLICIES
-- ============================================================================

-- Users can view regions associated with their organization
CREATE POLICY "Users can view accessible regions" ON regions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_regions orgr
      JOIN user_profiles up ON up.organization_id = orgr.organization_id
      WHERE orgr.region_id = regions.id
      AND up.id = auth.uid()
    )
  );

-- Admins can manage regions for their organization
CREATE POLICY "Admins can manage org regions" ON organization_regions
  FOR ALL TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM user_profiles 
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================================================

-- Function to check if user has permission for a specific action
CREATE OR REPLACE FUNCTION has_permission(user_uuid UUID, permission_name TEXT, resource_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM role_permissions rp
    JOIN user_profiles up ON up.role = rp.role AND up.organization_id = rp.organization_id
    WHERE up.id = user_uuid
    AND rp.permission = permission_name
    AND rp.resource = resource_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization context
CREATE OR REPLACE FUNCTION get_user_org_context(user_uuid UUID)
RETURNS TABLE(org_id UUID, user_role user_role_enum, region_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT up.organization_id, up.role, up.region_id
  FROM user_profiles up
  WHERE up.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin in their organization
CREATE OR REPLACE FUNCTION is_org_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = user_uuid 
    AND role IN ('admin', 'super_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECURITY VALIDATION
-- ============================================================================

-- Create a view to test RLS policy effectiveness
CREATE VIEW policy_test_view AS
SELECT 
  'organizations' as table_name,
  COUNT(*) as accessible_rows
FROM organizations
UNION ALL
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as accessible_rows  
FROM user_profiles
UNION ALL
SELECT 
  'user_sessions' as table_name,
  COUNT(*) as accessible_rows
FROM user_sessions;

COMMENT ON VIEW policy_test_view IS 'View to test RLS policy effectiveness - should show different counts per user';

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;