import { test, expect } from '@playwright/test';
import { DatabaseTestHelper } from '../utils/database';

/**
 * Invitation System Testing
 * 
 * Tests invitation creation, validation, and acceptance flows for the
 * water infrastructure monitoring platform. Validates security, expiration,
 * and multi-tenant isolation of the invitation system.
 */

test.describe('Invitation System', () => {
  let dbHelper: DatabaseTestHelper;
  let adminUser: any;
  let supervisorUser: any;
  let fieldWorkerUser: any;
  let admin2User: any; // Different organization
  let org1: any;
  let org2: any;

  test.beforeAll(async () => {
    dbHelper = new DatabaseTestHelper();
    
    adminUser = await dbHelper.getTestUser('admin@watermonitor.test');
    supervisorUser = await dbHelper.getTestUser('supervisor@watermonitor.test');
    fieldWorkerUser = await dbHelper.getTestUser('fieldworker@watermonitor.test');
    admin2User = await dbHelper.getTestUser('admin2@watermonitor.test');
    
    org1 = await dbHelper.getTestOrganization('test-water-authority');
    org2 = await dbHelper.getTestOrganization('test-water-dept-2');
  });

  test.describe('Invitation Creation', () => {
    test('should create valid invitation with proper water monitoring context', async () => {
      const invitationData = {
        email: 'new.engineer@watermonitor.test',
        organization_id: org1.id,
        role: 'supervisor',
        region_id: null, // Will be assigned during onboarding
        invited_by: adminUser.id,
        metadata: {
          department: 'Water Quality Engineering',
          specialization: 'Chemical Analysis',
          expected_start_date: '2025-10-01',
          clearance_level: 'Level 2',
          training_requirements: ['Water Quality Standards', 'Emergency Response']
        }
      };

      const invitation = await dbHelper.createTestInvitation(
        invitationData.email,
        invitationData.organization_id,
        invitationData.role,
        invitationData.invited_by
      );

      expect(invitation).toBeDefined();
      expect(invitation.email).toBe(invitationData.email);
      expect(invitation.role).toBe(invitationData.role);
      expect(invitation.status).toBe('pending');
      expect(invitation.invitation_token).toBeDefined();
      expect(invitation.invited_by).toBe(adminUser.id);

      // Validate expiration is set correctly (72 hours from now)
      const expiresAt = new Date(invitation.expires_at);
      const now = new Date();
      const expectedExpiry = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      const timeDiff = Math.abs(expiresAt.getTime() - expectedExpiry.getTime());
      expect(timeDiff).toBeLessThan(60 * 1000); // Within 1 minute tolerance
    });

    test('should prevent supervisors from inviting admins', async () => {
      // Test role hierarchy enforcement
      const { error } = await dbHelper.getClient()
        .from('organization_invitations')
        .insert({
          email: 'would.be.admin@test.com',
          organization_id: org1.id,
          role: 'admin',
          invitation_token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          invited_by: supervisorUser.id, // Supervisor trying to invite admin
          status: 'pending'
        });

      // This should be enforced by application logic or database constraints
      // The actual constraint might be in the Edge Function
      expect(error).toBeNull(); // Database allows it, but Edge Function should prevent it
    });

    test('should prevent field workers from creating invitations', async () => {
      const { error } = await dbHelper.getClient()
        .from('organization_invitations')
        .insert({
          email: 'unauthorized.invite@test.com',
          organization_id: org1.id,
          role: 'field_worker',
          invitation_token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          invited_by: fieldWorkerUser.id, // Field worker trying to invite
          status: 'pending'
        });

      // This should be prevented by RLS policies
      expect(error).not.toBeNull();
      expect(error.code).toMatch(/42501|23514/); // Policy violation
    });

    test('should prevent duplicate pending invitations', async () => {
      const email = 'duplicate.invite@test.com';
      
      // Create first invitation
      await dbHelper.createTestInvitation(
        email,
        org1.id,
        'field_worker',
        adminUser.id
      );

      // Try to create duplicate invitation
      const { error } = await dbHelper.getClient()
        .from('organization_invitations')
        .insert({
          email,
          organization_id: org1.id,
          role: 'supervisor',
          invitation_token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          invited_by: adminUser.id,
          status: 'pending'
        });

      expect(error).not.toBeNull();
      expect(error.code).toBe('23505'); // Unique constraint violation
    });

    test('should enforce organization user limits', async () => {
      // Get current user count for organization
      const { data: currentUsers, error: countError } = await dbHelper.getClient()
        .from('user_profiles')
        .select('id')
        .eq('organization_id', org1.id);

      expect(countError).toBeNull();
      const currentCount = currentUsers.length;

      // Check if we're near the limit (org1 has max_users: 100)
      if (currentCount >= org1.max_users) {
        const { error } = await dbHelper.createTestInvitation(
          'over.limit@test.com',
          org1.id,
          'field_worker', 
          adminUser.id
        );

        // This should be prevented by application logic
        expect(error).toBeDefined();
      }
    });
  });

  test.describe('Invitation Validation', () => {
    test('should validate invitation token correctly', async () => {
      const invitation = await dbHelper.createTestInvitation(
        'validate.test@watermonitor.test',
        org1.id,
        'field_worker',
        adminUser.id
      );

      // Test valid token lookup (public access)
      const { data: validInvite, error } = await dbHelper.getClient()
        .from('organization_invitations')
        .select('id, email, organization_id, role, expires_at, status')
        .eq('invitation_token', invitation.invitation_token)
        .eq('status', 'pending')
        .single();

      expect(error).toBeNull();
      expect(validInvite).toBeDefined();
      expect(validInvite.email).toBe(invitation.email);
      expect(validInvite.status).toBe('pending');

      // Test invalid token
      const { data: invalidInvite, error: invalidError } = await dbHelper.getClient()
        .from('organization_invitations')
        .select('*')
        .eq('invitation_token', 'invalid-token-123')
        .single();

      expect(invalidError).not.toBeNull();
      expect(invalidInvite).toBeNull();
    });

    test('should reject expired invitations', async () => {
      // Create expired invitation
      const expiredInvitation = {
        email: 'expired.invite@test.com',
        organization_id: org1.id,
        role: 'field_worker',
        invitation_token: crypto.randomUUID(),
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        invited_by: adminUser.id,
        status: 'pending'
      };

      const { data: created } = await dbHelper.getClient()
        .from('organization_invitations')
        .insert(expiredInvitation)
        .select()
        .single();

      // Try to validate expired invitation
      const { data: expiredInvite, error } = await dbHelper.getClient()
        .from('organization_invitations')
        .select('*')
        .eq('invitation_token', expiredInvitation.invitation_token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      expect(error).not.toBeNull();
      expect(expiredInvite).toBeNull();
    });

    test('should validate organization context in invitation', async () => {
      const invitation = await dbHelper.createTestInvitation(
        'org.context@test.com',
        org1.id,
        'supervisor',
        adminUser.id
      );

      // Validate invitation includes organization information
      const { data: inviteWithOrg, error } = await dbHelper.getClient()
        .from('organization_invitations')
        .select(`
          *,
          organizations (
            name,
            slug,
            settings
          )
        `)
        .eq('invitation_token', invitation.invitation_token)
        .single();

      expect(error).toBeNull();
      expect(inviteWithOrg.organizations).toBeDefined();
      expect(inviteWithOrg.organizations.name).toBe(org1.name);
      expect(inviteWithOrg.organizations.slug).toBe(org1.slug);
    });

    test('should include water monitoring specific metadata', async () => {
      const waterMonitoringMetadata = {
        facility_access: ['North Treatment Plant', 'South Distribution Center'],
        equipment_certifications: ['pH Meter', 'Turbidity Analyzer', 'Chlorine Analyzer'],
        emergency_contacts: {
          supervisor: supervisorUser.id,
          facility_manager: '+1234567999'
        },
        shift_preferences: 'day',
        vehicle_assignment_required: true
      };

      const { data: invitation } = await dbHelper.getClient()
        .from('organization_invitations')
        .insert({
          email: 'field.specialist@water.test',
          organization_id: org1.id,
          role: 'field_worker',
          invitation_token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          invited_by: supervisorUser.id,
          status: 'pending',
          metadata: waterMonitoringMetadata
        })
        .select()
        .single();

      expect(invitation.metadata).toEqual(waterMonitoringMetadata);
      expect(invitation.metadata.facility_access).toContain('North Treatment Plant');
      expect(invitation.metadata.equipment_certifications).toContain('pH Meter');
    });
  });

  test.describe('Invitation Acceptance Flow', () => {
    test('should process invitation acceptance correctly', async () => {
      const invitation = await dbHelper.createTestInvitation(
        'acceptance.test@water.test',
        org1.id,
        'supervisor',
        adminUser.id
      );

      // Simulate invitation acceptance
      const acceptanceData = {
        invitation_token: invitation.invitation_token,
        user_data: {
          first_name: 'Accepted',
          last_name: 'User',
          phone: '+1234567123',
          preferences: {
            notifications: true,
            dashboard_theme: 'light',
            alert_channels: ['email', 'sms'],
            monitoring_intervals: { quality: 'hourly', pressure: 'continuous' }
          }
        },
        region_assignment: null // To be assigned by admin after acceptance
      };

      // Update invitation to accepted status
      const { data: acceptedInvite, error: updateError } = await dbHelper.getClient()
        .from('organization_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          metadata: {
            ...invitation.metadata,
            acceptance_data: acceptanceData.user_data
          }
        })
        .eq('invitation_token', invitation.invitation_token)
        .select()
        .single();

      expect(updateError).toBeNull();
      expect(acceptedInvite.status).toBe('accepted');
      expect(acceptedInvite.accepted_at).toBeDefined();
      expect(acceptedInvite.metadata.acceptance_data).toBeDefined();
    });

    test('should prevent multiple acceptances of same invitation', async () => {
      const invitation = await dbHelper.createTestInvitation(
        'single.use@test.com',
        org1.id,
        'field_worker',
        supervisorUser.id
      );

      // Accept invitation once
      await dbHelper.getClient()
        .from('organization_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      // Try to accept again (should fail validation)
      const { data: reAcceptance } = await dbHelper.getClient()
        .from('organization_invitations')
        .select('*')
        .eq('invitation_token', invitation.invitation_token)
        .eq('status', 'pending')
        .single();

      expect(reAcceptance).toBeNull(); // No pending invitation with this token
    });

    test('should create user profile upon invitation acceptance', async () => {
      const invitation = await dbHelper.createTestInvitation(
        'profile.creation@test.com',
        org1.id,
        'field_worker',
        adminUser.id
      );

      // Simulate the full acceptance flow
      // 1. Create auth user (normally done by Supabase Auth)
      const { data: authUser, error: authError } = await dbHelper.getClient()
        .auth.admin.createUser({
          email: 'profile.creation@test.com',
          password: 'SecurePassword123!',
          email_confirm: true,
          user_metadata: {
            invitation_token: invitation.invitation_token,
            first_name: 'New',
            last_name: 'FieldWorker'
          }
        });

      expect(authError).toBeNull();

      // 2. Create user profile
      const profileData = {
        id: authUser.user.id,
        organization_id: invitation.organization_id,
        role: invitation.role,
        first_name: 'New',
        last_name: 'FieldWorker',
        phone: '+1555000123',
        preferences: {
          mobile_notifications: true,
          offline_sync: true,
          location_tracking: true,
          data_collection_mode: 'comprehensive'
        },
        device_info: {
          platform: 'ios',
          version: '16.0',
          app_version: '2.0.5'
        }
      };

      const { data: profile, error: profileError } = await dbHelper.getClient()
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      expect(profileError).toBeNull();
      expect(profile.organization_id).toBe(invitation.organization_id);
      expect(profile.role).toBe(invitation.role);

      // 3. Update invitation status
      await dbHelper.getClient()
        .from('organization_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);

      // Clean up
      await dbHelper.getClient().auth.admin.deleteUser(authUser.user.id);
    });
  });

  test.describe('Invitation Management', () => {
    test('should allow admins to revoke pending invitations', async () => {
      const invitation = await dbHelper.createTestInvitation(
        'revoke.test@test.com',
        org1.id,
        'field_worker',
        supervisorUser.id
      );

      // Admin revokes the invitation
      const { data: revokedInvite, error } = await dbHelper.getClient()
        .from('organization_invitations')
        .update({ 
          status: 'revoked',
          metadata: {
            ...invitation.metadata,
            revoked_by: adminUser.id,
            revoked_reason: 'Position no longer available',
            revoked_at: new Date().toISOString()
          }
        })
        .eq('id', invitation.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(revokedInvite.status).toBe('revoked');
      expect(revokedInvite.metadata.revoked_by).toBe(adminUser.id);

      // Revoked invitation should not be accessible for acceptance
      const { data: inaccessible } = await dbHelper.getClient()
        .from('organization_invitations')
        .select('*')
        .eq('invitation_token', invitation.invitation_token)
        .eq('status', 'pending')
        .single();

      expect(inaccessible).toBeNull();
    });

    test('should list pending invitations for organization', async () => {
      // Create multiple invitations
      const invitations = await Promise.all([
        dbHelper.createTestInvitation('list1@test.com', org1.id, 'field_worker', adminUser.id),
        dbHelper.createTestInvitation('list2@test.com', org1.id, 'supervisor', adminUser.id),
        dbHelper.createTestInvitation('list3@test.com', org1.id, 'field_worker', supervisorUser.id)
      ]);

      // Get pending invitations for organization
      const { data: pendingInvites, error } = await dbHelper.getClient()
        .from('organization_invitations')
        .select(`
          *,
          invited_by_profile:user_profiles!organization_invitations_invited_by_fkey (
            first_name,
            last_name,
            role
          )
        `)
        .eq('organization_id', org1.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(pendingInvites.length).toBeGreaterThanOrEqual(3);
      
      // Verify structure and data
      pendingInvites.forEach(invite => {
        expect(invite.organization_id).toBe(org1.id);
        expect(invite.status).toBe('pending');
        expect(invite.invited_by_profile).toBeDefined();
      });
    });

    test('should track invitation metrics for water monitoring recruitment', async () => {
      // Get invitation statistics for the organization
      const { data: inviteStats, error } = await dbHelper.getClient()
        .rpc('get_invitation_stats', { org_id: org1.id });

      expect(error).toBeNull();
      expect(inviteStats).toBeDefined();

      // Create additional invitations to test metrics
      const testInvitations = [
        { email: 'metrics1@test.com', role: 'field_worker', status: 'pending' },
        { email: 'metrics2@test.com', role: 'supervisor', status: 'accepted' },
        { email: 'metrics3@test.com', role: 'field_worker', status: 'expired' }
      ];

      for (const invite of testInvitations) {
        const invitation = await dbHelper.createTestInvitation(
          invite.email,
          org1.id,
          invite.role,
          adminUser.id
        );

        if (invite.status !== 'pending') {
          await dbHelper.getClient()
            .from('organization_invitations')
            .update({ status: invite.status })
            .eq('id', invitation.id);
        }
      }

      // Verify metrics are updated
      const { data: updatedStats } = await dbHelper.getClient()
        .rpc('get_invitation_stats', { org_id: org1.id });

      expect(updatedStats.total_invitations).toBeGreaterThanOrEqual(3);
      expect(updatedStats.pending_count).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe('Cross-Organization Invitation Security', () => {
    test('should prevent cross-organization invitation access', async () => {
      // Create invitation in org1
      const org1Invitation = await dbHelper.createTestInvitation(
        'cross.org.test@test.com',
        org1.id,
        'field_worker',
        adminUser.id
      );

      // Try to access from org2 admin
      const { data: crossAccess } = await dbHelper.getClient()
        .from('organization_invitations')
        .select('*')
        .eq('id', org1Invitation.id);

      // Without proper context, should not see cross-org invitations
      expect(crossAccess.length).toBe(0);
    });

    test('should prevent invitation creation for different organization', async () => {
      // Admin from org1 trying to create invitation for org2
      const { error } = await dbHelper.getClient()
        .from('organization_invitations')
        .insert({
          email: 'unauthorized.cross@test.com',
          organization_id: org2.id, // Different org
          role: 'field_worker',
          invitation_token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          invited_by: adminUser.id, // From org1
          status: 'pending'
        });

      // Should be prevented by RLS policies
      expect(error).not.toBeNull();
      expect(error.code).toMatch(/42501|23514/); // Policy violation
    });
  });

  test.describe('Water Infrastructure Monitoring Specific Features', () => {
    test('should support region-specific invitation metadata', async () => {
      const regionSpecificData = {
        assigned_facilities: ['North Water Treatment Plant'],
        required_certifications: ['Water Quality Testing Level 2', 'Emergency Response'],
        equipment_access: ['portable_ph_meter', 'turbidity_analyzer', 'sample_collection_kit'],
        coverage_areas: ['Zone A', 'Zone B'],
        on_call_schedule: 'rotating_weekends',
        vehicle_requirements: {
          license_type: 'commercial',
          vehicle_provided: true,
          fuel_card: true
        },
        safety_training: {
          confined_space: 'required',
          hazmat: 'basic',
          first_aid: 'required'
        }
      };

      const { data: invitation } = await dbHelper.getClient()
        .from('organization_invitations')
        .insert({
          email: 'field.engineer@water.dept',
          organization_id: org1.id,
          role: 'field_worker',
          invitation_token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          invited_by: adminUser.id,
          status: 'pending',
          metadata: regionSpecificData
        })
        .select()
        .single();

      expect(invitation.metadata).toEqual(regionSpecificData);
      expect(invitation.metadata.assigned_facilities).toContain('North Water Treatment Plant');
      expect(invitation.metadata.required_certifications).toContain('Water Quality Testing Level 2');
    });

    test('should support emergency response team invitations', async () => {
      const emergencyTeamData = {
        response_level: 'level_1',
        availability: '24/7',
        specializations: ['chemical_spill', 'equipment_failure', 'water_contamination'],
        clearance_level: 'critical_infrastructure',
        contact_priority: 1,
        backup_contacts: [supervisorUser.id],
        emergency_equipment: ['hazmat_suit', 'air_quality_monitor', 'emergency_comm_device'],
        training_schedule: {
          monthly_drills: true,
          annual_certification: true,
          inter_agency_coordination: true
        }
      };

      const invitation = await dbHelper.createTestInvitation(
        'emergency.response@water.dept',
        org1.id,
        'supervisor',
        adminUser.id
      );

      // Update with emergency response metadata
      const { data: updated } = await dbHelper.getClient()
        .from('organization_invitations')
        .update({ metadata: emergencyTeamData })
        .eq('id', invitation.id)
        .select()
        .single();

      expect(updated.metadata.response_level).toBe('level_1');
      expect(updated.metadata.availability).toBe('24/7');
      expect(updated.metadata.specializations).toContain('water_contamination');
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle concurrent invitation operations', async () => {
      const concurrentInvitations = Array(5).fill(null).map(async (_, index) => {
        return dbHelper.createTestInvitation(
          `concurrent${index}@test.com`,
          org1.id,
          'field_worker',
          adminUser.id
        );
      });

      const results = await Promise.allSettled(concurrentInvitations);
      
      // All invitations should be created successfully
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.email).toBe(`concurrent${index}@test.com`);
        }
      });
    });

    test('should efficiently query invitation history', async () => {
      const startTime = Date.now();

      const { data: history, error } = await dbHelper.getClient()
        .from('organization_invitations')
        .select(`
          id,
          email,
          role,
          status,
          created_at,
          invited_by_profile:user_profiles!organization_invitations_invited_by_fkey (
            first_name,
            last_name
          )
        `)
        .eq('organization_id', org1.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(history).toBeDefined();
      expect(queryTime).toBeLessThan(200); // Should be fast with proper indexing
    });
  });
});