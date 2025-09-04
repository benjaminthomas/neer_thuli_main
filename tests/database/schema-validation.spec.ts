import { test, expect } from '@playwright/test';
import { DatabaseTestHelper } from '../utils/database';

/**
 * Database Schema Validation Tests
 * 
 * Tests to validate that the database schema is properly created and accessible.
 * Focuses on water infrastructure monitoring platform authentication system.
 */

test.describe('Database Schema Validation', () => {
  let dbHelper: DatabaseTestHelper;

  test.beforeAll(async () => {
    dbHelper = new DatabaseTestHelper();
  });

  test.describe('Table Structure Validation', () => {
    test('should have all required tables accessible', async () => {
      await dbHelper.validateSchema();
    });

    test('should validate organizations table structure', async () => {
      const { data, error } = await dbHelper.getClient()
        .from('organizations')
        .select('id, name, slug, subscription_tier, mfa_required, max_users, settings, created_at, updated_at')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Test organization creation with water monitoring specific data
      const testOrg = {
        name: 'Schema Test Water Authority',
        slug: 'schema-test-water-auth',
        subscription_tier: 'premium',
        mfa_required: true,
        max_users: 150,
        settings: {
          alert_thresholds: {
            ph: [6.5, 8.5],
            turbidity: [0, 4],
            chlorine: [0.2, 4.0]
          },
          monitoring_frequency: 'hourly',
          auto_alerts: true
        }
      };

      const { data: created, error: createError } = await dbHelper.getClient()
        .from('organizations')
        .insert(testOrg)
        .select()
        .single();

      expect(createError).toBeNull();
      expect(created).toBeDefined();
      expect(created.name).toBe(testOrg.name);
      expect(created.slug).toBe(testOrg.slug);
      expect(created.settings).toEqual(testOrg.settings);

      // Cleanup
      await dbHelper.getClient()
        .from('organizations')
        .delete()
        .eq('id', created.id);
    });

    test('should validate user_profiles table structure and constraints', async () => {
      // Get test organization
      const org = await dbHelper.getTestOrganization('test-water-authority');
      expect(org).not.toBeNull();

      // Test user profile creation with water monitoring context
      const testProfile = {
        id: crypto.randomUUID(),
        organization_id: org!.id,
        role: 'field_worker' as const,
        first_name: 'Test',
        last_name: 'FieldWorker',
        phone: '+1234567800',
        preferences: {
          dashboard_refresh: 30,
          alert_sound: true,
          mobile_sync: true,
          map_default_layer: 'satellite'
        },
        device_info: {
          platform: 'android',
          version: '12',
          app_version: '2.1.0'
        }
      };

      // First create a mock auth user (normally done by Supabase Auth)
      const { data: authUser, error: authError } = await dbHelper.getClient()
        .auth.admin.createUser({
          id: testProfile.id,
          email: 'schema.test@example.com',
          password: 'SecureTestPassword123!',
          email_confirm: true
        });

      expect(authError).toBeNull();

      // Now create the profile
      const { data: profile, error: profileError } = await dbHelper.getClient()
        .from('user_profiles')
        .insert(testProfile)
        .select()
        .single();

      expect(profileError).toBeNull();
      expect(profile).toBeDefined();
      expect(profile.role).toBe('field_worker');
      expect(profile.preferences).toEqual(testProfile.preferences);

      // Test phone constraint validation
      const invalidPhoneProfile = {
        ...testProfile,
        id: crypto.randomUUID(),
        phone: 'invalid-phone'
      };

      const { error: phoneError } = await dbHelper.getClient()
        .from('user_profiles')
        .insert(invalidPhoneProfile);

      expect(phoneError).not.toBeNull();
      expect(phoneError.code).toBe('23514'); // Check constraint violation

      // Cleanup
      await dbHelper.getClient().auth.admin.deleteUser(testProfile.id);
    });

    test('should validate regions table and organization_regions junction', async () => {
      // Create test region
      const testRegion = {
        name: 'Test Coastal Region',
        code: 'COASTAL-TEST',
        settings: {
          population: 85000,
          area_km2: 250,
          water_sources: ['groundwater', 'surface_water'],
          treatment_plants: 3,
          distribution_zones: 12
        }
      };

      const { data: region, error: regionError } = await dbHelper.getClient()
        .from('regions')
        .insert(testRegion)
        .select()
        .single();

      expect(regionError).toBeNull();
      expect(region).toBeDefined();
      expect(region.code).toBe(testRegion.code);

      // Test linking to organization
      const org = await dbHelper.getTestOrganization('test-water-authority');
      const { data: orgRegion, error: linkError } = await dbHelper.getClient()
        .from('organization_regions')
        .insert({
          organization_id: org!.id,
          region_id: region.id,
          is_primary: false
        })
        .select()
        .single();

      expect(linkError).toBeNull();
      expect(orgRegion.organization_id).toBe(org!.id);
      expect(orgRegion.region_id).toBe(region.id);

      // Cleanup
      await dbHelper.getClient()
        .from('regions')
        .delete()
        .eq('id', region.id);
    });

    test('should validate user_sessions table with device tracking', async () => {
      const user = await dbHelper.getTestUser('fieldworker@watermonitor.test');
      expect(user).not.toBeNull();

      const sessionToken = await dbHelper.createTestSession(user!.id, user!.organization_id);
      expect(sessionToken).toBeDefined();

      // Validate session was created with correct structure
      const { data: session, error } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      expect(error).toBeNull();
      expect(session.user_id).toBe(user!.id);
      expect(session.organization_id).toBe(user!.organization_id);
      expect(session.is_active).toBe(true);
      expect(new Date(session.expires_at) > new Date()).toBe(true);
    });

    test('should validate organization_invitations table structure', async () => {
      const admin = await dbHelper.getTestUser('admin@watermonitor.test');
      const org = await dbHelper.getTestOrganization('test-water-authority');
      
      const invitation = await dbHelper.createTestInvitation(
        'new.field.worker@watermonitor.test',
        org!.id,
        'field_worker',
        admin!.id
      );

      expect(invitation).toBeDefined();
      expect(invitation.email).toBe('new.field.worker@watermonitor.test');
      expect(invitation.role).toBe('field_worker');
      expect(invitation.status).toBe('pending');
      expect(invitation.invitation_token).toBeDefined();

      // Validate invitation token is unique
      const duplicateTokenError = await dbHelper.getClient()
        .from('organization_invitations')
        .insert({
          email: 'another@test.com',
          organization_id: org!.id,
          role: 'field_worker',
          invitation_token: invitation.invitation_token,
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          invited_by: admin!.id,
          status: 'pending'
        });

      expect(duplicateTokenError.error).not.toBeNull();
      expect(duplicateTokenError.error.code).toBe('23505'); // Unique constraint violation
    });

    test('should validate audit_log table for water monitoring events', async () => {
      const user = await dbHelper.getTestUser('supervisor@watermonitor.test');
      const org = await dbHelper.getTestOrganization('test-water-authority');

      // Create water monitoring specific audit log entry
      const auditEntry = {
        user_id: user!.id,
        organization_id: org!.id,
        event_type: 'login',
        resource: 'water_quality_dashboard',
        details: {
          location: 'North Treatment Plant',
          sensor_readings: {
            ph: 7.2,
            turbidity: 1.5,
            chlorine: 1.8
          },
          alert_triggered: false,
          readings_count: 24
        },
        ip_address: '192.168.1.100',
        user_agent: 'Water Monitor Mobile App v2.1.0',
        success: true
      };

      const { data: audit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(auditEntry)
        .select()
        .single();

      expect(error).toBeNull();
      expect(audit.event_type).toBe('login');
      expect(audit.details).toEqual(auditEntry.details);
      expect(audit.success).toBe(true);
    });
  });

  test.describe('Index Performance Validation', () => {
    test('should validate critical indexes exist and perform well', async () => {
      // Test user_profiles organization index
      const { data: profiles, error } = await dbHelper.getClient()
        .from('user_profiles')
        .select('id, organization_id, role')
        .eq('organization_id', (await dbHelper.getTestOrganization('test-water-authority'))!.id);

      expect(error).toBeNull();
      expect(profiles.length).toBeGreaterThan(0);

      // Test session lookup by token (should be fast with index)
      const user = await dbHelper.getTestUser('fieldworker@watermonitor.test');
      const sessionToken = await dbHelper.createTestSession(user!.id, user!.organization_id);
      
      const startTime = Date.now();
      const { data: session } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();
      const queryTime = Date.now() - startTime;

      expect(session).toBeDefined();
      expect(queryTime).toBeLessThan(100); // Should be very fast with index
    });

    test('should validate JSONB indexes work for water monitoring preferences', async () => {
      // Test JSONB GIN index on user preferences
      const { data: users, error } = await dbHelper.getClient()
        .from('user_profiles')
        .select('id, first_name, preferences')
        .contains('preferences', { dashboard_refresh: 30 });

      expect(error).toBeNull();
      expect(Array.isArray(users)).toBe(true);

      // Test JSONB index on device_info
      const { data: mobileUsers, error: mobileError } = await dbHelper.getClient()
        .from('user_profiles')
        .select('id, device_info')
        .contains('device_info', { platform: 'android' });

      expect(mobileError).toBeNull();
      expect(Array.isArray(mobileUsers)).toBe(true);
    });
  });

  test.describe('Constraint Validation', () => {
    test('should enforce organization slug uniqueness', async () => {
      const orgData = {
        name: 'Duplicate Test Authority',
        slug: 'test-water-authority', // This should conflict
        subscription_tier: 'basic'
      };

      const { error } = await dbHelper.getClient()
        .from('organizations')
        .insert(orgData);

      expect(error).not.toBeNull();
      expect(error.code).toBe('23505'); // Unique constraint violation
    });

    test('should enforce user profile organization relationship', async () => {
      const invalidProfile = {
        id: crypto.randomUUID(),
        organization_id: crypto.randomUUID(), // Non-existent org
        role: 'field_worker',
        first_name: 'Invalid',
        last_name: 'User'
      };

      const { error } = await dbHelper.getClient()
        .from('user_profiles')
        .insert(invalidProfile);

      expect(error).not.toBeNull();
      expect(error.code).toBe('23503'); // Foreign key constraint violation
    });

    test('should enforce invitation email uniqueness per organization', async () => {
      const admin = await dbHelper.getTestUser('admin@watermonitor.test');
      const org = await dbHelper.getTestOrganization('test-water-authority');

      // Create first invitation
      await dbHelper.createTestInvitation(
        'duplicate.test@example.com',
        org!.id,
        'field_worker',
        admin!.id
      );

      // Try to create duplicate invitation (should fail)
      const { error } = await dbHelper.getClient()
        .from('organization_invitations')
        .insert({
          email: 'duplicate.test@example.com',
          organization_id: org!.id,
          role: 'supervisor',
          invitation_token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          invited_by: admin!.id,
          status: 'pending'
        });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23505'); // Unique constraint violation
    });
  });

  test.describe('Trigger Functionality', () => {
    test('should validate updated_at triggers work correctly', async () => {
      await dbHelper.validateTriggers();
    });

    test('should validate audit trigger captures authentication events', async () => {
      const user = await dbHelper.getTestUser('admin@watermonitor.test');
      const initialCount = await dbHelper.countAuditEvents(user!.organization_id);

      // Simulate an authentication event that should trigger audit logging
      await dbHelper.getClient()
        .from('auth_audit_log')
        .insert({
          user_id: user!.id,
          organization_id: user!.organization_id,
          event_type: 'role_change',
          resource: 'user_management',
          details: {
            old_role: 'supervisor',
            new_role: 'admin',
            changed_by: user!.id
          },
          success: true
        });

      const finalCount = await dbHelper.countAuditEvents(user!.organization_id);
      expect(finalCount).toBe(initialCount + 1);
    });
  });

  test.describe('Custom Functions', () => {
    test('should validate custom functions are accessible', async () => {
      // Test clean_expired_sessions function
      const { data, error } = await dbHelper.getClient()
        .rpc('clean_expired_sessions');

      expect(error).toBeNull();
      expect(typeof data).toBe('number');

      // Test get_user_organization function
      const user = await dbHelper.getTestUser('fieldworker@watermonitor.test');
      const { data: orgId, error: orgError } = await dbHelper.getClient()
        .rpc('get_user_organization', { user_uuid: user!.id });

      expect(orgError).toBeNull();
      expect(orgId).toBe(user!.organization_id);
    });

    test('should validate password reuse checking function', async () => {
      const user = await dbHelper.getTestUser('supervisor@watermonitor.test');
      const testPasswordHash = 'hashed_password_123';

      // Add password to history
      await dbHelper.getClient()
        .from('user_password_history')
        .insert({
          user_id: user!.id,
          organization_id: user!.organization_id,
          password_hash: testPasswordHash
        });

      // Test password reuse check
      const { data: isReused, error } = await dbHelper.getClient()
        .rpc('check_password_reuse', {
          user_uuid: user!.id,
          new_password_hash: testPasswordHash
        });

      expect(error).toBeNull();
      expect(isReused).toBe(true);

      // Test with different password
      const { data: isNotReused, error: notReusedError } = await dbHelper.getClient()
        .rpc('check_password_reuse', {
          user_uuid: user!.id,
          new_password_hash: 'different_password_hash'
        });

      expect(notReusedError).toBeNull();
      expect(isNotReused).toBe(false);
    });
  });

  test.describe('Row Level Security Setup', () => {
    test('should validate RLS is enabled on all tables', async () => {
      const tables = [
        'organizations',
        'user_profiles', 
        'user_sessions',
        'organization_invitations',
        'user_mfa_settings',
        'auth_audit_log',
        'role_permissions'
      ];

      for (const table of tables) {
        const { data, error } = await dbHelper.getClient()
          .rpc('check_rls_enabled', { table_name: table });

        expect(error).toBeNull();
        expect(data).toBe(true);
      }
    });
  });
});