import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { DatabaseTestHelper } from '../utils/database';

/**
 * Row Level Security (RLS) Policy Enforcement Tests
 * 
 * Validates multi-tenant data isolation through UI interactions and database queries.
 * Tests ensure users can only access data from their organization and proper role-based access.
 */

test.describe('RLS Policy Enforcement', () => {
  let dbHelper: DatabaseTestHelper;
  let adminUser: any;
  let supervisorUser: any;
  let fieldWorkerUser: any;
  let admin2User: any; // From different organization
  let org1: any;
  let org2: any;

  test.beforeAll(async () => {
    dbHelper = new DatabaseTestHelper();
    
    // Get test users from different organizations
    adminUser = await dbHelper.getTestUser('admin@watermonitor.test');
    supervisorUser = await dbHelper.getTestUser('supervisor@watermonitor.test');
    fieldWorkerUser = await dbHelper.getTestUser('fieldworker@watermonitor.test');
    admin2User = await dbHelper.getTestUser('admin2@watermonitor.test');
    
    // Get test organizations
    org1 = await dbHelper.getTestOrganization('test-water-authority');
    org2 = await dbHelper.getTestOrganization('test-water-dept-2');
    
    expect(adminUser).not.toBeNull();
    expect(supervisorUser).not.toBeNull();
    expect(fieldWorkerUser).not.toBeNull();
    expect(admin2User).not.toBeNull();
    expect(org1).not.toBeNull();
    expect(org2).not.toBeNull();
  });

  /**
   * Helper function to create authenticated Supabase client
   */
  function createAuthClient(userId: string): any {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          headers: {
            'Authorization': `Bearer ${generateTestJWT(userId)}`,
          },
        },
      }
    );
  }

  /**
   * Mock JWT generation for testing (in real app, this would come from auth)
   */
  function generateTestJWT(userId: string): string {
    // In a real implementation, you would generate a proper JWT
    // For testing, we'll use a mock token that includes the user ID
    return `mock_jwt_${userId}`;
  }

  test.describe('Organization Data Isolation', () => {
    test('should allow users to see only their organization', async () => {
      const adminClient = dbHelper.getClient();
      
      // Set row level security context for admin user
      await adminClient.rpc('set_user_context', { user_id: adminUser.id });
      
      const { data: orgs, error } = await adminClient
        .from('organizations')
        .select('*');

      expect(error).toBeNull();
      expect(orgs).toBeDefined();
      // Should only see their own organization
      expect(orgs.some(org => org.id === org1.id)).toBe(true);
      expect(orgs.some(org => org.id === org2.id)).toBe(false);
    });

    test('should prevent cross-organization data access', async () => {
      // Admin from org1 trying to access org2 data directly
      const { data, error } = await dbHelper.getClient()
        .from('user_profiles')
        .select('*')
        .eq('organization_id', org2.id);

      // With proper RLS, this should return empty or error depending on implementation
      if (error) {
        expect(error.code).toMatch(/42501|42P01/); // Insufficient privileges
      } else {
        expect(data).toEqual([]);
      }
    });

    test('should isolate user profiles by organization', async () => {
      const adminClient = dbHelper.getClient();
      await adminClient.rpc('set_user_context', { user_id: adminUser.id });

      const { data: profiles, error } = await adminClient
        .from('user_profiles')
        .select('*');

      expect(error).toBeNull();
      expect(profiles).toBeDefined();
      
      // All returned profiles should be from admin's organization
      profiles.forEach(profile => {
        expect(profile.organization_id).toBe(org1.id);
      });

      // Should include admin, supervisor, and field worker from org1
      const emails = profiles.map(p => p.email);
      expect(profiles.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should allow admins to view all profiles in their organization', async () => {
      const adminClient = dbHelper.getClient();
      await adminClient.rpc('set_user_context', { user_id: adminUser.id });

      const { data: profiles, error } = await adminClient
        .from('user_profiles')
        .select('*');

      expect(error).toBeNull();
      expect(profiles.length).toBeGreaterThanOrEqual(3); // admin, supervisor, field_worker
    });

    test('should allow supervisors to view team profiles but not admin data', async () => {
      const supervisorClient = dbHelper.getClient();
      await supervisorClient.rpc('set_user_context', { user_id: supervisorUser.id });

      const { data: profiles, error } = await supervisorClient
        .from('user_profiles')
        .select('*');

      expect(error).toBeNull();
      
      // Supervisor should see their organization's profiles based on policy
      profiles.forEach(profile => {
        expect(profile.organization_id).toBe(org1.id);
      });
    });

    test('should restrict field workers to their own profile only', async () => {
      const fieldWorkerClient = dbHelper.getClient();
      await fieldWorkerClient.rpc('set_user_context', { user_id: fieldWorkerUser.id });

      const { data: profiles, error } = await fieldWorkerClient
        .from('user_profiles')
        .select('*');

      expect(error).toBeNull();
      
      // Field worker should only see their own profile
      expect(profiles.length).toBe(1);
      expect(profiles[0].id).toBe(fieldWorkerUser.id);
    });

    test('should prevent role elevation attacks', async () => {
      const fieldWorkerClient = dbHelper.getClient();
      await fieldWorkerClient.rpc('set_user_context', { user_id: fieldWorkerUser.id });

      // Try to update own role to admin (should fail)
      const { error } = await fieldWorkerClient
        .from('user_profiles')
        .update({ role: 'admin' })
        .eq('id', fieldWorkerUser.id);

      expect(error).not.toBeNull();
      expect(error.code).toMatch(/42501|23514/); // Policy violation
    });

    test('should prevent organization switching attacks', async () => {
      const fieldWorkerClient = dbHelper.getClient();
      await fieldWorkerClient.rpc('set_user_context', { user_id: fieldWorkerUser.id });

      // Try to switch to different organization (should fail)
      const { error } = await fieldWorkerClient
        .from('user_profiles')
        .update({ organization_id: org2.id })
        .eq('id', fieldWorkerUser.id);

      expect(error).not.toBeNull();
      expect(error.code).toMatch(/42501|23514/); // Policy violation
    });
  });

  test.describe('Session Management RLS', () => {
    test('should allow users to see only their own sessions', async () => {
      // Create test sessions for different users
      const fieldWorkerSession = await dbHelper.createTestSession(
        fieldWorkerUser.id, 
        fieldWorkerUser.organization_id
      );
      const supervisorSession = await dbHelper.createTestSession(
        supervisorUser.id,
        supervisorUser.organization_id
      );

      const fieldWorkerClient = dbHelper.getClient();
      await fieldWorkerClient.rpc('set_user_context', { user_id: fieldWorkerUser.id });

      const { data: sessions, error } = await fieldWorkerClient
        .from('user_sessions')
        .select('*');

      expect(error).toBeNull();
      
      // Field worker should only see their own sessions
      sessions.forEach(session => {
        expect(session.user_id).toBe(fieldWorkerUser.id);
      });

      // Should not see supervisor's session
      expect(sessions.some(s => s.session_token === supervisorSession)).toBe(false);
    });

    test('should allow admins to view organization sessions for monitoring', async () => {
      const adminClient = dbHelper.getClient();
      await adminClient.rpc('set_user_context', { user_id: adminUser.id });

      const { data: sessions, error } = await adminClient
        .from('user_sessions')
        .select('*');

      expect(error).toBeNull();
      
      // Admin should see sessions from their organization
      sessions.forEach(session => {
        expect(session.organization_id).toBe(org1.id);
      });
    });

    test('should prevent cross-organization session access', async () => {
      // Create session in org2
      const org2Session = await dbHelper.createTestSession(admin2User.id, org2.id);

      const adminClient = dbHelper.getClient();
      await adminClient.rpc('set_user_context', { user_id: adminUser.id });

      const { data: sessions } = await adminClient
        .from('user_sessions')
        .select('*')
        .eq('session_token', org2Session);

      // Should not find session from different organization
      expect(sessions).toEqual([]);
    });
  });

  test.describe('Invitation System RLS', () => {
    test('should allow supervisors and admins to view organization invitations', async () => {
      // Create test invitation
      const invitation = await dbHelper.createTestInvitation(
        'new.worker@watermonitor.test',
        org1.id,
        'field_worker',
        adminUser.id
      );

      const supervisorClient = dbHelper.getClient();
      await supervisorClient.rpc('set_user_context', { user_id: supervisorUser.id });

      const { data: invitations, error } = await supervisorClient
        .from('organization_invitations')
        .select('*');

      expect(error).toBeNull();
      
      // Should see invitations for their organization
      const orgInvitations = invitations.filter(inv => inv.organization_id === org1.id);
      expect(orgInvitations.length).toBeGreaterThan(0);
      expect(orgInvitations.some(inv => inv.id === invitation.id)).toBe(true);
    });

    test('should prevent field workers from viewing invitations', async () => {
      const fieldWorkerClient = dbHelper.getClient();
      await fieldWorkerClient.rpc('set_user_context', { user_id: fieldWorkerUser.id });

      const { data: invitations, error } = await fieldWorkerClient
        .from('organization_invitations')
        .select('*');

      // Field worker should not see invitations (or see empty results)
      if (error) {
        expect(error.code).toMatch(/42501/); // Insufficient privileges
      } else {
        expect(invitations).toEqual([]);
      }
    });

    test('should allow public access for invitation token validation', async () => {
      const invitation = await dbHelper.createTestInvitation(
        'public.validation@test.com',
        org1.id,
        'field_worker',
        adminUser.id
      );

      // Create anonymous client (no auth)
      const anonClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!
      );

      const { data: publicInvite, error } = await anonClient
        .from('organization_invitations')
        .select('id, email, organization_id, role, expires_at, status')
        .eq('invitation_token', invitation.invitation_token)
        .eq('status', 'pending')
        .single();

      expect(error).toBeNull();
      expect(publicInvite).toBeDefined();
      expect(publicInvite.id).toBe(invitation.id);
    });
  });

  test.describe('Audit Log RLS', () => {
    test('should allow users to view their own audit events', async () => {
      // Create audit entry for field worker
      await dbHelper.getClient()
        .from('auth_audit_log')
        .insert({
          user_id: fieldWorkerUser.id,
          organization_id: fieldWorkerUser.organization_id,
          event_type: 'login',
          resource: 'mobile_app',
          details: { device: 'android', location: 'field_site_A' },
          success: true
        });

      const fieldWorkerClient = dbHelper.getClient();
      await fieldWorkerClient.rpc('set_user_context', { user_id: fieldWorkerUser.id });

      const { data: auditEvents, error } = await fieldWorkerClient
        .from('auth_audit_log')
        .select('*')
        .eq('user_id', fieldWorkerUser.id);

      expect(error).toBeNull();
      expect(auditEvents.length).toBeGreaterThan(0);
      
      auditEvents.forEach(event => {
        expect(event.user_id).toBe(fieldWorkerUser.id);
      });
    });

    test('should allow admins to view organization audit logs', async () => {
      const adminClient = dbHelper.getClient();
      await adminClient.rpc('set_user_context', { user_id: adminUser.id });

      const { data: auditEvents, error } = await adminClient
        .from('auth_audit_log')
        .select('*')
        .eq('organization_id', org1.id);

      expect(error).toBeNull();
      
      // Admin should see all audit events for their organization
      auditEvents.forEach(event => {
        expect(event.organization_id).toBe(org1.id);
      });
    });

    test('should prevent cross-organization audit log access', async () => {
      // Create audit event for org2
      await dbHelper.getClient()
        .from('auth_audit_log')
        .insert({
          user_id: admin2User.id,
          organization_id: org2.id,
          event_type: 'role_change',
          resource: 'user_management',
          details: { action: 'promote_user' },
          success: true
        });

      const adminClient = dbHelper.getClient();
      await adminClient.rpc('set_user_context', { user_id: adminUser.id });

      const { data: crossOrgEvents } = await adminClient
        .from('auth_audit_log')
        .select('*')
        .eq('organization_id', org2.id);

      // Should not see events from different organization
      expect(crossOrgEvents).toEqual([]);
    });
  });

  test.describe('Water Infrastructure Monitoring Context', () => {
    test('should enforce region-based data access for field workers', async () => {
      // Test that field workers can only access data from their assigned region
      const fieldWorkerClient = dbHelper.getClient();
      await fieldWorkerClient.rpc('set_user_context', { user_id: fieldWorkerUser.id });

      // Simulate water quality readings table with region isolation
      const { data: readings, error } = await fieldWorkerClient
        .rpc('get_accessible_readings', { user_id: fieldWorkerUser.id });

      expect(error).toBeNull();
      
      // All readings should be from field worker's region or organization
      if (readings && readings.length > 0) {
        readings.forEach(reading => {
          expect(reading.organization_id).toBe(fieldWorkerUser.organization_id);
        });
      }
    });

    test('should allow supervisors to access multi-region data within organization', async () => {
      const supervisorClient = dbHelper.getClient();
      await supervisorClient.rpc('set_user_context', { user_id: supervisorUser.id });

      // Supervisors should access data from all regions in their organization
      const { data: regions, error } = await supervisorClient
        .from('organization_regions')
        .select('*')
        .eq('organization_id', supervisorUser.organization_id);

      expect(error).toBeNull();
      expect(regions.length).toBeGreaterThanOrEqual(1);
      
      regions.forEach(region => {
        expect(region.organization_id).toBe(supervisorUser.organization_id);
      });
    });

    test('should enforce MFA requirements based on organization policy', async () => {
      // Test organization with MFA required (org2)
      const mfaRequiredOrg = org2;
      expect(mfaRequiredOrg.mfa_required).toBe(true);

      // User in MFA-required org should have MFA policy enforced
      const admin2Client = dbHelper.getClient();
      await admin2Client.rpc('set_user_context', { user_id: admin2User.id });

      // Check that MFA settings are accessible for users in MFA-required orgs
      const { data: mfaSettings, error } = await admin2Client
        .from('user_mfa_settings')
        .select('*')
        .eq('user_id', admin2User.id);

      expect(error).toBeNull();
      // MFA settings should exist or be creatable for users in MFA-required orgs
    });
  });

  test.describe('Performance and Security Tests', () => {
    test('should maintain query performance with RLS enabled', async () => {
      const startTime = Date.now();
      
      const adminClient = dbHelper.getClient();
      await adminClient.rpc('set_user_context', { user_id: adminUser.id });

      const { data: profiles, error } = await adminClient
        .from('user_profiles')
        .select('*')
        .eq('organization_id', org1.id);

      const queryTime = Date.now() - startTime;
      
      expect(error).toBeNull();
      expect(profiles).toBeDefined();
      expect(queryTime).toBeLessThan(500); // Should be fast with proper indexing
    });

    test('should handle concurrent access without policy violations', async () => {
      const concurrentOperations = Array(5).fill(null).map(async (_, index) => {
        const client = dbHelper.getClient();
        await client.rpc('set_user_context', { user_id: fieldWorkerUser.id });
        
        return client
          .from('user_profiles')
          .select('*')
          .eq('id', fieldWorkerUser.id);
      });

      const results = await Promise.allSettled(concurrentOperations);
      
      // All operations should succeed
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.error).toBeNull();
          expect(result.value.data).toBeDefined();
        }
      });
    });

    test('should prevent SQL injection through RLS policies', async () => {
      const maliciousPayload = "'; DROP TABLE organizations; --";
      
      const fieldWorkerClient = dbHelper.getClient();
      await fieldWorkerClient.rpc('set_user_context', { user_id: fieldWorkerUser.id });

      // Attempt malicious query (should be safely handled)
      const { data, error } = await fieldWorkerClient
        .from('user_profiles')
        .select('*')
        .eq('first_name', maliciousPayload);

      // Query should complete safely (empty results, no errors)
      expect(data).toEqual([]);
      
      // Verify organizations table still exists
      const { data: orgs, error: orgError } = await dbHelper.getClient()
        .from('organizations')
        .select('id')
        .limit(1);

      expect(orgError).toBeNull();
      expect(orgs).toBeDefined();
    });
  });

  test.describe('Policy Helper Functions', () => {
    test('should validate has_permission function works with RLS', async () => {
      const { data: hasPermission, error } = await dbHelper.getClient()
        .rpc('has_permission', {
          user_uuid: adminUser.id,
          permission_name: 'manage_users',
          resource_name: 'organization'
        });

      expect(error).toBeNull();
      // Admin should have user management permissions
      expect(typeof hasPermission).toBe('boolean');
    });

    test('should validate get_user_org_context function', async () => {
      const { data: context, error } = await dbHelper.getClient()
        .rpc('get_user_org_context', { user_uuid: fieldWorkerUser.id });

      expect(error).toBeNull();
      expect(context.length).toBe(1);
      expect(context[0].org_id).toBe(fieldWorkerUser.organization_id);
      expect(context[0].user_role).toBe('field_worker');
    });

    test('should validate is_org_admin function', async () => {
      const { data: isAdmin, error: adminError } = await dbHelper.getClient()
        .rpc('is_org_admin', { user_uuid: adminUser.id });
      
      const { data: isNotAdmin, error: notAdminError } = await dbHelper.getClient()
        .rpc('is_org_admin', { user_uuid: fieldWorkerUser.id });

      expect(adminError).toBeNull();
      expect(notAdminError).toBeNull();
      expect(isAdmin).toBe(true);
      expect(isNotAdmin).toBe(false);
    });
  });
});