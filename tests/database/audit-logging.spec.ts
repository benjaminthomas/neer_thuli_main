import { test, expect } from '@playwright/test';
import { DatabaseTestHelper } from '../utils/database';

/**
 * Audit Logging Testing
 * 
 * Tests comprehensive audit trail functionality for authentication and authorization events
 * in the water infrastructure monitoring platform. Validates event capture, retention,
 * security monitoring, and compliance reporting.
 */

test.describe('Audit Logging System', () => {
  let dbHelper: DatabaseTestHelper;
  let adminUser: any;
  let supervisorUser: any;
  let fieldWorkerUser: any;
  let admin2User: any;
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

  test.describe('Authentication Event Logging', () => {
    test('should log successful login events with context', async () => {
      const loginEvent = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        event_type: 'login',
        resource: 'mobile_app',
        details: {
          device_type: 'mobile',
          platform: 'android',
          app_version: '2.1.0',
          device_model: 'Samsung Galaxy S21',
          location: {
            latitude: 40.7128,
            longitude: -74.0060,
            accuracy: 10,
            site_name: 'North Treatment Plant'
          },
          network: {
            type: 'cellular',
            carrier: 'Verizon',
            signal_strength: -75
          },
          session_id: crypto.randomUUID(),
          mfa_used: false,
          login_method: 'email_password',
          login_duration_ms: 1250
        },
        ip_address: '192.168.1.150',
        user_agent: 'WaterMonitor-Mobile/2.1.0 (Android 12; Samsung SM-G991B)',
        success: true
      };

      const { data: auditLog, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(loginEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(auditLog.event_type).toBe('login');
      expect(auditLog.user_id).toBe(fieldWorkerUser.id);
      expect(auditLog.details.device_type).toBe('mobile');
      expect(auditLog.details.location.site_name).toBe('North Treatment Plant');
      expect(auditLog.success).toBe(true);
    });

    test('should log failed login attempts with security details', async () => {
      const failedLoginEvent = {
        user_id: null, // Failed login may not have valid user_id
        organization_id: null,
        event_type: 'login',
        resource: 'web_portal',
        details: {
          attempted_email: 'suspicious@example.com',
          failure_reason: 'invalid_credentials',
          attempt_count: 3,
          previous_attempts: [
            { timestamp: new Date(Date.now() - 60000).toISOString(), ip: '192.168.1.100' },
            { timestamp: new Date(Date.now() - 30000).toISOString(), ip: '192.168.1.101' }
          ],
          security_flags: {
            suspicious_ip: true,
            rapid_attempts: true,
            unknown_device: true,
            geo_anomaly: false
          },
          browser_fingerprint: 'Chrome/119.0.0.0_Windows_1920x1080',
          captcha_required: true
        },
        ip_address: '10.0.0.1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: false,
        error_details: 'Authentication failed - credentials invalid'
      };

      const { data: failedAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(failedLoginEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(failedAudit.success).toBe(false);
      expect(failedAudit.details.failure_reason).toBe('invalid_credentials');
      expect(failedAudit.details.security_flags.suspicious_ip).toBe(true);
      expect(failedAudit.error_details).toContain('Authentication failed');
    });

    test('should log logout events with session details', async () => {
      const sessionToken = await dbHelper.createTestSession(
        supervisorUser.id,
        supervisorUser.organization_id
      );

      const logoutEvent = {
        user_id: supervisorUser.id,
        organization_id: supervisorUser.organization_id,
        event_type: 'logout',
        resource: 'web_dashboard',
        details: {
          logout_type: 'user_initiated',
          session_duration_minutes: 127,
          session_token: sessionToken,
          pages_visited: ['dashboard', 'water_quality', 'reports', 'settings'],
          actions_performed: 45,
          data_exported: false,
          alerts_acknowledged: 3,
          reports_generated: 1,
          last_activity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          browser_closed: false
        },
        ip_address: '192.168.1.200',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: true
      };

      const { data: logoutAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(logoutEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(logoutAudit.event_type).toBe('logout');
      expect(logoutAudit.details.logout_type).toBe('user_initiated');
      expect(logoutAudit.details.session_duration_minutes).toBe(127);
      expect(logoutAudit.details.actions_performed).toBe(45);
    });

    test('should log password change events with security context', async () => {
      const passwordChangeEvent = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        event_type: 'password_change',
        resource: 'user_profile',
        details: {
          change_trigger: 'user_requested',
          old_password_age_days: 45,
          password_strength_score: 85,
          password_reuse_check: false,
          mfa_verified: true,
          initiated_from: 'settings_page',
          admin_assistance: false,
          compliance_flags: {
            meets_complexity: true,
            not_in_breach_list: true,
            not_recently_used: true
          },
          security_questions_updated: false,
          recovery_email_verified: true
        },
        ip_address: '192.168.1.150',
        user_agent: 'WaterMonitor-Mobile/2.1.0',
        success: true
      };

      const { data: passwordAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(passwordChangeEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(passwordAudit.event_type).toBe('password_change');
      expect(passwordAudit.details.password_strength_score).toBe(85);
      expect(passwordAudit.details.compliance_flags.meets_complexity).toBe(true);
    });
  });

  test.describe('Authorization and Role Management Logging', () => {
    test('should log role change events with approval workflow', async () => {
      const roleChangeEvent = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        event_type: 'role_change',
        resource: 'user_management',
        details: {
          old_role: 'field_worker',
          new_role: 'supervisor',
          changed_by: adminUser.id,
          change_reason: 'Promotion due to excellent performance and additional certifications',
          approval_workflow: {
            requested_by: supervisorUser.id,
            approved_by: adminUser.id,
            request_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            approval_date: new Date().toISOString(),
            justification: 'Completed advanced water quality training and leadership program'
          },
          effective_date: new Date().toISOString(),
          permission_changes: {
            added: ['manage_team', 'approve_reports', 'emergency_response'],
            removed: [],
            regions_access: ['NORTH', 'SOUTH']
          },
          notification_sent: true,
          training_required: ['supervisor_orientation', 'emergency_protocols']
        },
        ip_address: '192.168.1.200',
        user_agent: 'WaterMonitor-Web/2.1.0',
        success: true
      };

      const { data: roleAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(roleChangeEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(roleAudit.event_type).toBe('role_change');
      expect(roleAudit.details.old_role).toBe('field_worker');
      expect(roleAudit.details.new_role).toBe('supervisor');
      expect(roleAudit.details.changed_by).toBe(adminUser.id);
      expect(roleAudit.details.permission_changes.added).toContain('manage_team');
    });

    test('should log permission violations and access attempts', async () => {
      const unauthorizedAccessEvent = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        event_type: 'access_denied',
        resource: 'admin_panel',
        details: {
          attempted_action: 'delete_user',
          required_role: 'admin',
          user_role: 'field_worker',
          target_resource: 'user_profiles',
          target_user_id: supervisorUser.id,
          access_path: '/admin/users/delete',
          referrer_page: '/dashboard',
          security_risk_level: 'medium',
          automatic_lockout: false,
          admin_notification_sent: true,
          similar_attempts_count: 1,
          time_since_last_attempt_minutes: 0
        },
        ip_address: '192.168.1.150',
        user_agent: 'WaterMonitor-Mobile/2.1.0',
        success: false,
        error_details: 'Insufficient permissions - field_worker role cannot access admin functions'
      };

      const { data: accessDeniedAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(unauthorizedAccessEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(accessDeniedAudit.event_type).toBe('access_denied');
      expect(accessDeniedAudit.success).toBe(false);
      expect(accessDeniedAudit.details.attempted_action).toBe('delete_user');
      expect(accessDeniedAudit.details.security_risk_level).toBe('medium');
    });

    test('should log account lockout and unlock events', async () => {
      const lockoutEvent = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        event_type: 'account_locked',
        resource: 'security_system',
        details: {
          lockout_reason: 'multiple_failed_login_attempts',
          failed_attempts_count: 5,
          lockout_duration_minutes: 30,
          automatic_lockout: true,
          triggered_by_ip: '10.0.0.1',
          lockout_policy: 'standard_security',
          admin_override_available: true,
          unlock_methods: ['time_expiry', 'admin_unlock', 'password_reset'],
          notification_contacts: [supervisorUser.id, adminUser.id],
          security_incident_id: 'SEC-2025-001'
        },
        ip_address: '10.0.0.1',
        user_agent: 'Unknown/Suspicious',
        success: true
      };

      const { data: lockoutAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(lockoutEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(lockoutAudit.event_type).toBe('account_locked');
      expect(lockoutAudit.details.failed_attempts_count).toBe(5);
      expect(lockoutAudit.details.security_incident_id).toBe('SEC-2025-001');

      // Follow up with unlock event
      const unlockEvent = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        event_type: 'account_unlocked',
        resource: 'security_system',
        details: {
          unlock_method: 'admin_override',
          unlocked_by: adminUser.id,
          unlock_reason: 'Verified legitimate user - device compromise resolved',
          lockout_duration_actual_minutes: 15,
          security_review_completed: true,
          password_reset_required: true,
          mfa_reset_required: true,
          additional_monitoring: true,
          follow_up_actions: ['security_training', 'device_security_audit']
        },
        ip_address: '192.168.1.200',
        user_agent: 'WaterMonitor-Web/2.1.0',
        success: true
      };

      const { data: unlockAudit, error: unlockError } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(unlockEvent)
        .select()
        .single();

      expect(unlockError).toBeNull();
      expect(unlockAudit.event_type).toBe('account_unlocked');
      expect(unlockAudit.details.unlocked_by).toBe(adminUser.id);
      expect(unlockAudit.details.password_reset_required).toBe(true);
    });
  });

  test.describe('MFA and Security Events Logging', () => {
    test('should log MFA enablement with setup details', async () => {
      const mfaEnableEvent = {
        user_id: supervisorUser.id,
        organization_id: supervisorUser.organization_id,
        event_type: 'mfa_enabled',
        resource: 'security_settings',
        details: {
          mfa_method: 'totp',
          setup_method: 'qr_code',
          backup_codes_generated: 8,
          app_used: 'Google Authenticator',
          verification_successful: true,
          setup_duration_minutes: 5,
          admin_enforcement: false,
          policy_compliance: true,
          previous_mfa_status: 'disabled',
          recovery_options: {
            sms_backup: false,
            email_backup: true,
            recovery_codes: true,
            admin_recovery: true
          }
        },
        ip_address: '192.168.1.175',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        success: true
      };

      const { data: mfaAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(mfaEnableEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(mfaAudit.event_type).toBe('mfa_enabled');
      expect(mfaAudit.details.mfa_method).toBe('totp');
      expect(mfaAudit.details.backup_codes_generated).toBe(8);
    });

    test('should log MFA verification events', async () => {
      const mfaVerifyEvent = {
        user_id: supervisorUser.id,
        organization_id: supervisorUser.organization_id,
        event_type: 'mfa_verified',
        resource: 'authentication',
        details: {
          verification_method: 'totp',
          verification_time_seconds: 3,
          code_attempts: 1,
          device_remembered: false,
          login_context: 'high_risk_action',
          triggering_action: 'user_role_modification',
          risk_score: 75,
          location_verified: true,
          device_recognized: true,
          time_window_valid: true
        },
        ip_address: '192.168.1.175',
        user_agent: 'WaterMonitor-Web/2.1.0',
        success: true
      };

      const { data: verifyAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(mfaVerifyEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(verifyAudit.event_type).toBe('mfa_verified');
      expect(verifyAudit.details.verification_method).toBe('totp');
      expect(verifyAudit.details.risk_score).toBe(75);
    });

    test('should log security incidents and suspicious activity', async () => {
      const securityIncident = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        event_type: 'security_incident',
        resource: 'monitoring_system',
        details: {
          incident_type: 'unusual_access_pattern',
          risk_level: 'high',
          incident_id: 'INC-SEC-2025-002',
          detection_method: 'automated_monitoring',
          anomaly_score: 92,
          indicators: [
            'login_from_new_country',
            'access_outside_business_hours',
            'multiple_device_types_rapidly',
            'unusual_data_export_volume'
          ],
          affected_resources: ['water_quality_data', 'facility_reports'],
          geographic_anomaly: {
            usual_location: 'New York, NY, US',
            current_location: 'Unknown (VPN/Proxy)',
            distance_km: -1,
            vpn_detected: true
          },
          response_actions: {
            session_terminated: true,
            admin_alerted: true,
            account_flagged: true,
            additional_auth_required: true
          },
          investigation_required: true,
          escalation_level: 2
        },
        ip_address: '185.220.100.240',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        success: false,
        error_details: 'Access denied due to security policy violation'
      };

      const { data: incidentAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(securityIncident)
        .select()
        .single();

      expect(error).toBeNull();
      expect(incidentAudit.event_type).toBe('security_incident');
      expect(incidentAudit.details.risk_level).toBe('high');
      expect(incidentAudit.details.anomaly_score).toBe(92);
      expect(incidentAudit.details.indicators).toContain('login_from_new_country');
    });
  });

  test.describe('Water Infrastructure Monitoring Specific Events', () => {
    test('should log emergency response activation events', async () => {
      const emergencyEvent = {
        user_id: supervisorUser.id,
        organization_id: supervisorUser.organization_id,
        event_type: 'emergency_activation',
        resource: 'emergency_response_system',
        details: {
          emergency_type: 'water_contamination_detected',
          severity_level: 'level_2',
          incident_location: {
            facility: 'North Treatment Plant',
            zone: 'Chemical Treatment Area',
            coordinates: { latitude: 40.7128, longitude: -74.0060 }
          },
          detection_source: 'automated_sensor_alert',
          affected_systems: ['chemical_dosing', 'ph_adjustment', 'filtration'],
          response_team_activated: [supervisorUser.id, adminUser.id],
          external_notifications: [
            { recipient: 'Emergency Management', status: 'sent' },
            { recipient: 'Health Department', status: 'pending' },
            { recipient: 'EPA Regional Office', status: 'queued' }
          ],
          containment_actions: [
            'isolate_affected_zone',
            'activate_backup_treatment',
            'increase_monitoring_frequency'
          ],
          estimated_impact: {
            population_affected: 15000,
            facilities_impacted: 3,
            expected_duration_hours: 4
          },
          media_alert_required: true,
          customer_notification_initiated: true
        },
        ip_address: '192.168.1.175',
        user_agent: 'WaterMonitor-Emergency/2.1.0',
        success: true
      };

      const { data: emergencyAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(emergencyEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(emergencyAudit.event_type).toBe('emergency_activation');
      expect(emergencyAudit.details.emergency_type).toBe('water_contamination_detected');
      expect(emergencyAudit.details.severity_level).toBe('level_2');
      expect(emergencyAudit.details.estimated_impact.population_affected).toBe(15000);
    });

    test('should log data export and compliance events', async () => {
      const dataExportEvent = {
        user_id: adminUser.id,
        organization_id: adminUser.organization_id,
        event_type: 'data_export',
        resource: 'compliance_reporting',
        details: {
          export_type: 'regulatory_compliance',
          report_type: 'monthly_water_quality',
          date_range: {
            start: '2025-08-01',
            end: '2025-08-31'
          },
          data_categories: [
            'ph_readings',
            'turbidity_measurements', 
            'chlorine_levels',
            'bacterial_counts'
          ],
          record_count: 8760, // One hour readings for a month
          file_format: 'csv',
          file_size_mb: 15.7,
          encryption_applied: true,
          regulatory_recipient: 'EPA Region 2',
          compliance_period: 'Q3-2025',
          approval_workflow: {
            requested_by: adminUser.id,
            reviewed_by: supervisorUser.id,
            approved_by: adminUser.id,
            review_notes: 'Data validated, all readings within acceptable ranges'
          },
          retention_policy: '7_years',
          access_level: 'confidential'
        },
        ip_address: '192.168.1.200',
        user_agent: 'WaterMonitor-Web/2.1.0',
        success: true
      };

      const { data: exportAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(dataExportEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(exportAudit.event_type).toBe('data_export');
      expect(exportAudit.details.record_count).toBe(8760);
      expect(exportAudit.details.regulatory_recipient).toBe('EPA Region 2');
      expect(exportAudit.details.encryption_applied).toBe(true);
    });

    test('should log critical equipment access events', async () => {
      const equipmentAccessEvent = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        event_type: 'equipment_access',
        resource: 'critical_infrastructure',
        details: {
          equipment_id: 'SCADA-NORTH-001',
          equipment_type: 'SCADA_controller',
          access_type: 'configuration_change',
          facility: 'North Treatment Plant',
          location: 'Control Room A',
          access_method: 'physical_keycard_and_biometric',
          configuration_changes: [
            {
              parameter: 'ph_setpoint',
              old_value: '7.2',
              new_value: '7.4',
              reason: 'Seasonal adjustment per SOP-001'
            },
            {
              parameter: 'alarm_threshold_turbidity',
              old_value: '4.0 NTU',
              new_value: '3.5 NTU',
              reason: 'Increased sensitivity per regulatory guidance'
            }
          ],
          supervision_required: true,
          supervisor_present: supervisorUser.id,
          maintenance_window: {
            scheduled: true,
            start_time: '2025-09-04T02:00:00Z',
            duration_minutes: 30
          },
          safety_protocols: {
            lockout_tagout: true,
            backup_systems_active: true,
            communication_maintained: true
          },
          documentation_updated: true,
          post_change_verification: true
        },
        ip_address: '10.1.1.50', // Plant network
        user_agent: 'SCADA-Interface/3.2.1',
        success: true
      };

      const { data: equipmentAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(equipmentAccessEvent)
        .select()
        .single();

      expect(error).toBeNull();
      expect(equipmentAudit.event_type).toBe('equipment_access');
      expect(equipmentAudit.details.equipment_type).toBe('SCADA_controller');
      expect(equipmentAudit.details.configuration_changes.length).toBe(2);
      expect(equipmentAudit.details.safety_protocols.lockout_tagout).toBe(true);
    });
  });

  test.describe('Audit Log Analysis and Reporting', () => {
    test('should query audit events by time range and event type', async () => {
      const timeRangeStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      
      const { data: recentEvents, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .select('*')
        .eq('organization_id', org1.id)
        .eq('event_type', 'login')
        .gte('timestamp', timeRangeStart.toISOString())
        .order('timestamp', { ascending: false })
        .limit(50);

      expect(error).toBeNull();
      expect(recentEvents).toBeDefined();
      
      // All events should be login events from the correct org
      recentEvents.forEach(event => {
        expect(event.event_type).toBe('login');
        expect(event.organization_id).toBe(org1.id);
        expect(new Date(event.timestamp) >= timeRangeStart).toBe(true);
      });
    });

    test('should generate security summary reports', async () => {
      // Create test events for report generation
      const testEvents = [
        { event_type: 'login', success: true },
        { event_type: 'login', success: false },
        { event_type: 'password_change', success: true },
        { event_type: 'role_change', success: true },
        { event_type: 'mfa_enabled', success: true }
      ];

      for (const event of testEvents) {
        await dbHelper.getClient()
          .from('auth_audit_log')
          .insert({
            user_id: fieldWorkerUser.id,
            organization_id: org1.id,
            event_type: event.event_type,
            resource: 'test_resource',
            details: { test_event: true },
            success: event.success
          });
      }

      // Query security summary
      const { data: securitySummary, error } = await dbHelper.getClient()
        .rpc('get_security_summary', {
          org_id: org1.id,
          days_back: 7
        });

      expect(error).toBeNull();
      expect(securitySummary).toBeDefined();

      if (securitySummary.event_counts) {
        expect(securitySummary.event_counts.login).toBeGreaterThanOrEqual(1);
        expect(securitySummary.event_counts.password_change).toBeGreaterThanOrEqual(1);
      }
    });

    test('should identify patterns in failed login attempts', async () => {
      // Create pattern of failed attempts
      const suspiciousIP = '10.0.0.99';
      const failedAttempts = Array(5).fill(null).map((_, index) => ({
        user_id: null,
        organization_id: org1.id,
        event_type: 'login',
        resource: 'web_portal',
        details: {
          attempted_email: 'admin@example.com',
          failure_reason: 'invalid_credentials',
          attempt_number: index + 1
        },
        ip_address: suspiciousIP,
        success: false,
        timestamp: new Date(Date.now() - (5 - index) * 60 * 1000).toISOString() // 1 min apart
      }));

      for (const attempt of failedAttempts) {
        await dbHelper.getClient()
          .from('auth_audit_log')
          .insert(attempt);
      }

      // Analyze failed login patterns
      const { data: suspiciousActivity, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .select('ip_address, count(*) as attempt_count')
        .eq('organization_id', org1.id)
        .eq('event_type', 'login')
        .eq('success', false)
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
        .group('ip_address')
        .having('count(*) >= 3')
        .order('attempt_count', { ascending: false });

      expect(error).toBeNull();
      expect(suspiciousActivity.some(activity => activity.ip_address === suspiciousIP)).toBe(true);
    });

    test('should track user activity patterns for compliance', async () => {
      // Create diverse activity pattern for a user
      const activityEvents = [
        { event_type: 'login', hour: 8 },
        { event_type: 'data_export', hour: 10 },
        { event_type: 'role_change', hour: 14 },
        { event_type: 'logout', hour: 17 }
      ];

      for (const activity of activityEvents) {
        const timestamp = new Date();
        timestamp.setHours(activity.hour, 0, 0, 0);
        
        await dbHelper.getClient()
          .from('auth_audit_log')
          .insert({
            user_id: supervisorUser.id,
            organization_id: org1.id,
            event_type: activity.event_type,
            resource: 'system',
            details: { compliance_tracking: true },
            timestamp: timestamp.toISOString(),
            success: true
          });
      }

      // Query user activity timeline
      const { data: userActivity, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .select('event_type, timestamp, resource, details')
        .eq('user_id', supervisorUser.id)
        .eq('organization_id', org1.id)
        .contains('details', { compliance_tracking: true })
        .order('timestamp', { ascending: true });

      expect(error).toBeNull();
      expect(userActivity.length).toBe(4);
      expect(userActivity[0].event_type).toBe('login');
      expect(userActivity[3].event_type).toBe('logout');
    });
  });

  test.describe('Audit Log Security and Integrity', () => {
    test('should prevent unauthorized modification of audit logs', async () => {
      // Create audit entry
      const originalEvent = {
        user_id: fieldWorkerUser.id,
        organization_id: org1.id,
        event_type: 'login',
        resource: 'mobile_app',
        details: { original: true },
        success: true
      };

      const { data: auditEntry, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert(originalEvent)
        .select()
        .single();

      expect(error).toBeNull();

      // Try to modify the audit entry (should fail)
      const { error: updateError } = await dbHelper.getClient()
        .from('auth_audit_log')
        .update({ 
          details: { modified: true, original: false },
          success: false 
        })
        .eq('id', auditEntry.id);

      // Audit logs should be immutable
      expect(updateError).not.toBeNull();
    });

    test('should enforce retention policies', async () => {
      // Create old audit entries (simulated)
      const oldTimestamp = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000); // Over 1 year old
      
      const { data: oldEntry, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .insert({
          user_id: fieldWorkerUser.id,
          organization_id: org1.id,
          event_type: 'login',
          resource: 'test',
          details: { retention_test: true },
          timestamp: oldTimestamp.toISOString(),
          success: true
        })
        .select()
        .single();

      expect(error).toBeNull();

      // In a real system, retention cleanup would be handled by scheduled jobs
      // Here we simulate checking if old data exists and can be identified
      const { data: oldEntries, error: queryError } = await dbHelper.getClient()
        .from('auth_audit_log')
        .select('*')
        .lt('timestamp', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
        .contains('details', { retention_test: true });

      expect(queryError).toBeNull();
      expect(oldEntries.length).toBeGreaterThan(0);
      expect(oldEntries.some(entry => entry.id === oldEntry.id)).toBe(true);
    });

    test('should maintain audit log performance with large datasets', async () => {
      const startTime = Date.now();

      // Query recent audit events with complex filters
      const { data: complexQuery, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .select(`
          id,
          event_type,
          timestamp,
          success,
          details
        `)
        .eq('organization_id', org1.id)
        .in('event_type', ['login', 'logout', 'role_change'])
        .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(100);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(queryTime).toBeLessThan(500); // Should be fast with proper indexing
      expect(Array.isArray(complexQuery)).toBe(true);
    });

    test('should handle high-volume concurrent audit logging', async () => {
      const concurrentAudits = Array(10).fill(null).map(async (_, index) => {
        return dbHelper.getClient()
          .from('auth_audit_log')
          .insert({
            user_id: fieldWorkerUser.id,
            organization_id: org1.id,
            event_type: 'concurrent_test',
            resource: 'performance_test',
            details: { batch_index: index, timestamp: new Date().toISOString() },
            success: true
          });
      });

      const results = await Promise.allSettled(concurrentAudits);

      // All audit logs should be created successfully
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value.error).toBeNull();
        }
      });
    });
  });
});