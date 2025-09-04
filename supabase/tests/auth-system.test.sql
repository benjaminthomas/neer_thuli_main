-- Comprehensive Database Tests for Authentication System
-- Water Infrastructure Monitoring Platform
-- Created: 2025-09-04
-- Test Framework: pgTAP (PostgreSQL Testing Framework)

BEGIN;

-- Load pgTAP extension for testing
-- Note: This requires pgTAP to be installed in your Supabase instance
-- CREATE EXTENSION IF NOT EXISTS pgtap;

-- ============================================================================
-- SCHEMA STRUCTURE TESTS
-- ============================================================================

-- Test that all required tables exist
SELECT has_table('public', 'organizations', 'Organizations table should exist');
SELECT has_table('public', 'user_profiles', 'User profiles table should exist');
SELECT has_table('public', 'user_sessions', 'User sessions table should exist');
SELECT has_table('public', 'organization_invitations', 'Organization invitations table should exist');
SELECT has_table('public', 'user_mfa_settings', 'MFA settings table should exist');
SELECT has_table('public', 'user_password_history', 'Password history table should exist');
SELECT has_table('public', 'auth_audit_log', 'Audit log table should exist');
SELECT has_table('public', 'role_permissions', 'Role permissions table should exist');
SELECT has_table('public', 'regions', 'Regions table should exist');
SELECT has_table('public', 'organization_regions', 'Organization regions table should exist');

-- Test that required columns exist with correct types
SELECT has_column('organizations', 'id', 'Organizations should have id column');
SELECT col_type_is('organizations', 'id', 'uuid', 'Organizations id should be UUID');
SELECT col_is_pk('organizations', 'id', 'Organizations id should be primary key');
SELECT col_not_null('organizations', 'name', 'Organization name should be required');
SELECT col_is_unique('organizations', 'slug', 'Organization slug should be unique');

SELECT has_column('user_profiles', 'organization_id', 'User profiles should link to organization');
SELECT col_is_fk('user_profiles', 'organization_id', 'User profiles organization_id should be foreign key');
SELECT col_has_check('user_profiles', 'valid_phone', 'User profiles should validate phone format');

-- Test enum types exist
SELECT has_type('user_role_enum', 'User role enum should exist');
SELECT has_type('invitation_status', 'Invitation status enum should exist');
SELECT has_type('auth_event_type', 'Auth event type enum should exist');

-- ============================================================================
-- INDEX EXISTENCE TESTS
-- ============================================================================

-- Test critical indexes exist for performance
SELECT has_index('user_profiles', 'idx_user_profiles_org_id', 'Should have org_id index');
SELECT has_index('user_profiles', 'idx_user_profiles_role', 'Should have role index');
SELECT has_index('user_sessions', 'idx_user_sessions_user_id', 'Should have user_id index');
SELECT has_index('user_sessions', 'idx_user_sessions_expires_at', 'Should have expires_at index');
SELECT has_index('organization_invitations', 'idx_invitations_token', 'Should have token index');
SELECT has_index('auth_audit_log', 'idx_audit_log_user_timestamp', 'Should have user timestamp index');

-- ============================================================================
-- RLS POLICY TESTS
-- ============================================================================

-- Test that RLS is enabled on all sensitive tables
SELECT row_security_on('organizations', 'Organizations should have RLS enabled');
SELECT row_security_on('user_profiles', 'User profiles should have RLS enabled');
SELECT row_security_on('user_sessions', 'User sessions should have RLS enabled');
SELECT row_security_on('organization_invitations', 'Invitations should have RLS enabled');
SELECT row_security_on('user_mfa_settings', 'MFA settings should have RLS enabled');
SELECT row_security_on('auth_audit_log', 'Audit log should have RLS enabled');

-- ============================================================================
-- FUNCTION TESTS
-- ============================================================================

-- Test utility functions exist
SELECT has_function('get_user_organization', 'get_user_organization function should exist');
SELECT has_function('clean_expired_sessions', 'clean_expired_sessions function should exist');
SELECT has_function('generate_invitation_token', 'generate_invitation_token function should exist');
SELECT has_function('check_password_reuse', 'check_password_reuse function should exist');

-- Test function behaviors
SELECT ok(
  length(generate_invitation_token()) = 64,
  'Invitation token should be 64 characters (32 bytes hex encoded)'
);

-- ============================================================================
-- TRIGGER TESTS
-- ============================================================================

-- Test that audit triggers exist
SELECT has_trigger('user_profiles', 'user_profiles_audit_trigger', 'User profiles should have audit trigger');
SELECT has_trigger('user_sessions', 'user_sessions_audit_trigger', 'User sessions should have audit trigger');
SELECT has_trigger('organization_invitations', 'organization_invitations_audit_trigger', 'Invitations should have audit trigger');

-- ============================================================================
-- DATA INTEGRITY TESTS
-- ============================================================================

-- Setup test data
DO $$ 
DECLARE
    test_org_id UUID;
    test_user_id UUID := gen_random_uuid();
    test_invitation_id UUID;
    audit_count_before INTEGER;
    audit_count_after INTEGER;
BEGIN
    -- Get initial audit count
    SELECT COUNT(*) INTO audit_count_before FROM auth_audit_log;

    -- Test organization creation
    INSERT INTO organizations (name, slug, subscription_tier)
    VALUES ('Test Organization', 'test-org', 'basic')
    RETURNING id INTO test_org_id;

    -- Verify organization was created
    PERFORM ok(
        EXISTS(SELECT 1 FROM organizations WHERE id = test_org_id),
        'Test organization should be created'
    );

    -- Test user profile creation
    INSERT INTO user_profiles (id, organization_id, role, first_name, last_name)
    VALUES (test_user_id, test_org_id, 'field_worker', 'Test', 'User');

    -- Verify user profile was created
    PERFORM ok(
        EXISTS(SELECT 1 FROM user_profiles WHERE id = test_user_id),
        'Test user profile should be created'
    );

    -- Test invitation creation
    INSERT INTO organization_invitations (
        organization_id,
        email,
        role,
        invited_by,
        invitation_token
    ) VALUES (
        test_org_id,
        'test@example.com',
        'field_worker',
        test_user_id,
        gen_random_uuid()
    ) RETURNING id INTO test_invitation_id;

    -- Verify invitation was created
    PERFORM ok(
        EXISTS(SELECT 1 FROM organization_invitations WHERE id = test_invitation_id),
        'Test invitation should be created'
    );

    -- Test that audit logs were created
    SELECT COUNT(*) INTO audit_count_after FROM auth_audit_log;
    PERFORM ok(
        audit_count_after > audit_count_before,
        'Audit triggers should create log entries'
    );

    -- Test session creation
    INSERT INTO user_sessions (
        user_id,
        organization_id,
        session_token,
        expires_at
    ) VALUES (
        test_user_id,
        test_org_id,
        'test_session_token_' || test_user_id::text,
        NOW() + INTERVAL '24 hours'
    );

    -- Verify session was created
    PERFORM ok(
        EXISTS(SELECT 1 FROM user_sessions WHERE user_id = test_user_id),
        'Test user session should be created'
    );

    -- Test MFA settings creation
    INSERT INTO user_mfa_settings (
        user_id,
        organization_id,
        totp_enabled
    ) VALUES (
        test_user_id,
        test_org_id,
        false
    );

    -- Verify MFA settings were created
    PERFORM ok(
        EXISTS(SELECT 1 FROM user_mfa_settings WHERE user_id = test_user_id),
        'Test MFA settings should be created'
    );

    -- Clean up test data
    DELETE FROM user_sessions WHERE user_id = test_user_id;
    DELETE FROM user_mfa_settings WHERE user_id = test_user_id;
    DELETE FROM organization_invitations WHERE id = test_invitation_id;
    DELETE FROM user_profiles WHERE id = test_user_id;
    DELETE FROM organizations WHERE id = test_org_id;
END $$;

-- ============================================================================
-- CONSTRAINT TESTS
-- ============================================================================

-- Test unique constraints
DO $$
DECLARE
    test_org_id UUID;
    test_user_id UUID := gen_random_uuid();
    constraint_violation_caught BOOLEAN := false;
BEGIN
    -- Create test organization
    INSERT INTO organizations (name, slug) 
    VALUES ('Constraint Test Org', 'constraint-test-org')
    RETURNING id INTO test_org_id;

    -- Try to create duplicate slug (should fail)
    BEGIN
        INSERT INTO organizations (name, slug) 
        VALUES ('Another Org', 'constraint-test-org');
    EXCEPTION 
        WHEN unique_violation THEN
            constraint_violation_caught := true;
    END;

    PERFORM ok(
        constraint_violation_caught,
        'Organizations should enforce unique slug constraint'
    );

    -- Clean up
    DELETE FROM organizations WHERE id = test_org_id;
END $$;

-- ============================================================================
-- PERFORMANCE TESTS
-- ============================================================================

-- Test query performance with indexes
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    execution_time INTERVAL;
    test_org_id UUID;
BEGIN
    -- Create test organization
    INSERT INTO organizations (name, slug) 
    VALUES ('Performance Test Org', 'perf-test-org')
    RETURNING id INTO test_org_id;

    -- Test indexed query performance
    start_time := clock_timestamp();
    
    PERFORM COUNT(*) FROM user_profiles WHERE organization_id = test_org_id;
    
    end_time := clock_timestamp();
    execution_time := end_time - start_time;

    PERFORM ok(
        execution_time < INTERVAL '1 second',
        'Organization-scoped queries should be fast (< 1 second)'
    );

    -- Clean up
    DELETE FROM organizations WHERE id = test_org_id;
END $$;

-- ============================================================================
-- SECURITY TESTS
-- ============================================================================

-- Test password validation
DO $$
DECLARE
    weak_password_rejected BOOLEAN := false;
    test_hash TEXT := '$2b$12$example_hash';
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Test password reuse checking
    INSERT INTO user_password_history (user_id, password_hash)
    VALUES (test_user_id, test_hash);

    -- Check if password reuse is detected
    PERFORM ok(
        check_password_reuse(test_user_id, test_hash) = true,
        'Password reuse should be detected'
    );

    -- Check if new password is allowed
    PERFORM ok(
        check_password_reuse(test_user_id, '$2b$12$different_hash') = false,
        'New password should be allowed'
    );

    -- Clean up
    DELETE FROM user_password_history WHERE user_id = test_user_id;
END $$;

-- ============================================================================
-- CLEANUP FUNCTION TESTS
-- ============================================================================

-- Test session cleanup function
DO $$
DECLARE
    cleanup_count INTEGER;
    test_org_id UUID;
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Create test organization
    INSERT INTO organizations (name, slug) 
    VALUES ('Cleanup Test Org', 'cleanup-test-org')
    RETURNING id INTO test_org_id;

    -- Create expired session
    INSERT INTO user_sessions (
        user_id,
        organization_id,
        session_token,
        expires_at
    ) VALUES (
        test_user_id,
        test_org_id,
        'expired_session_token',
        NOW() - INTERVAL '1 hour'  -- Expired 1 hour ago
    );

    -- Run cleanup function
    SELECT clean_expired_sessions() INTO cleanup_count;

    PERFORM ok(
        cleanup_count > 0,
        'Cleanup function should remove expired sessions'
    );

    -- Verify expired session was removed
    PERFORM ok(
        NOT EXISTS(
            SELECT 1 FROM user_sessions 
            WHERE session_token = 'expired_session_token'
        ),
        'Expired session should be removed by cleanup'
    );

    -- Clean up
    DELETE FROM organizations WHERE id = test_org_id;
END $$;

-- ============================================================================
-- COMPREHENSIVE INTEGRATION TESTS
-- ============================================================================

-- Test complete user invitation and acceptance flow
DO $$
DECLARE
    test_org_id UUID;
    test_user_id UUID := gen_random_uuid();
    test_invitation_id UUID;
    test_token UUID := gen_random_uuid();
BEGIN
    -- Create organization
    INSERT INTO organizations (name, slug, max_users)
    VALUES ('Integration Test Org', 'integration-test', 10)
    RETURNING id INTO test_org_id;

    -- Create admin user
    INSERT INTO user_profiles (
        id, organization_id, role, first_name, last_name
    ) VALUES (
        test_user_id, test_org_id, 'admin', 'Admin', 'User'
    );

    -- Create invitation
    INSERT INTO organization_invitations (
        organization_id,
        email,
        role,
        invitation_token,
        expires_at,
        invited_by
    ) VALUES (
        test_org_id,
        'newuser@example.com',
        'field_worker',
        test_token,
        NOW() + INTERVAL '72 hours',
        test_user_id
    ) RETURNING id INTO test_invitation_id;

    -- Verify invitation is valid and not expired
    PERFORM ok(
        EXISTS(
            SELECT 1 FROM organization_invitations 
            WHERE id = test_invitation_id 
            AND status = 'pending'
            AND expires_at > NOW()
        ),
        'Invitation should be valid and not expired'
    );

    -- Simulate acceptance (mark as accepted)
    UPDATE organization_invitations 
    SET status = 'accepted', accepted_at = NOW()
    WHERE id = test_invitation_id;

    -- Verify invitation was accepted
    PERFORM ok(
        EXISTS(
            SELECT 1 FROM organization_invitations 
            WHERE id = test_invitation_id 
            AND status = 'accepted'
        ),
        'Invitation should be marked as accepted'
    );

    -- Clean up
    DELETE FROM organization_invitations WHERE id = test_invitation_id;
    DELETE FROM user_profiles WHERE id = test_user_id;
    DELETE FROM organizations WHERE id = test_org_id;
END $$;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

-- Run test summary and results
SELECT * FROM finish();

ROLLBACK;