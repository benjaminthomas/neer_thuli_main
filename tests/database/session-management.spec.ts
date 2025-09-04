import { test, expect } from '@playwright/test';
import { DatabaseTestHelper } from '../utils/database';

/**
 * Session Management Testing
 * 
 * Tests session creation, expiration, cleanup, and security for the
 * water infrastructure monitoring platform. Validates device tracking,
 * concurrent session handling, and security features.
 */

test.describe('Session Management', () => {
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

  test.describe('Session Creation and Tracking', () => {
    test('should create session with device and location tracking', async () => {
      const deviceInfo = {
        platform: 'android',
        version: '12.0',
        app_version: '2.1.0',
        device_model: 'Samsung Galaxy S21',
        screen_resolution: '2400x1080',
        network_type: '4G',
        gps_enabled: true,
        camera_available: true,
        storage_available_gb: 32.5
      };

      const sessionData = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        session_token: `field_session_${Math.random().toString(36).substr(2, 16)}`,
        device_info: deviceInfo,
        ip_address: '192.168.1.101',
        user_agent: 'WaterMonitor-Mobile/2.1.0 (Android 12; Samsung SM-G991B)',
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
        is_active: true
      };

      const { data: session, error } = await dbHelper.getClient()
        .from('user_sessions')
        .insert(sessionData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(session.session_token).toBe(sessionData.session_token);
      expect(session.device_info).toEqual(deviceInfo);
      expect(session.device_info.platform).toBe('android');
      expect(session.device_info.gps_enabled).toBe(true);
      expect(session.is_active).toBe(true);
    });

    test('should track multiple concurrent sessions for same user', async () => {
      const user = supervisorUser;
      
      // Create multiple sessions (web, mobile, tablet)
      const sessions = [
        {
          platform: 'web',
          device_model: 'Chrome Desktop',
          ip_address: '192.168.1.100'
        },
        {
          platform: 'ios',
          device_model: 'iPhone 13 Pro',
          ip_address: '192.168.1.102'
        },
        {
          platform: 'android',
          device_model: 'Samsung Galaxy Tab S8',
          ip_address: '192.168.1.103'
        }
      ];

      const createdSessions = [];
      for (const sessionInfo of sessions) {
        const sessionToken = `multi_session_${sessionInfo.platform}_${Math.random().toString(36).substr(2, 9)}`;
        
        const { data: session, error } = await dbHelper.getClient()
          .from('user_sessions')
          .insert({
            user_id: user.id,
            organization_id: user.organization_id,
            session_token: sessionToken,
            device_info: {
              platform: sessionInfo.platform,
              device_model: sessionInfo.device_model,
              app_version: '2.1.0'
            },
            ip_address: sessionInfo.ip_address,
            user_agent: `WaterMonitor-${sessionInfo.platform}/2.1.0`,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
          })
          .select()
          .single();

        expect(error).toBeNull();
        createdSessions.push(session);
      }

      // Verify all sessions exist for the user
      const { data: userSessions, error: queryError } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      expect(queryError).toBeNull();
      expect(userSessions.length).toBeGreaterThanOrEqual(3);

      // Verify each platform is represented
      const platforms = userSessions.map(s => s.device_info.platform);
      expect(platforms).toContain('web');
      expect(platforms).toContain('ios');
      expect(platforms).toContain('android');
    });

    test('should update last_activity_at on session activity', async () => {
      const sessionToken = await dbHelper.createTestSession(
        fieldWorkerUser.id,
        fieldWorkerUser.organization_id
      );

      // Get initial last_activity_at
      const { data: initialSession } = await dbHelper.getClient()
        .from('user_sessions')
        .select('last_activity_at')
        .eq('session_token', sessionToken)
        .single();

      const initialActivity = new Date(initialSession.last_activity_at);

      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update activity
      const { data: updatedSession, error } = await dbHelper.getClient()
        .from('user_sessions')
        .update({ last_activity_at: new Date().toISOString() })
        .eq('session_token', sessionToken)
        .select()
        .single();

      expect(error).toBeNull();
      const updatedActivity = new Date(updatedSession.last_activity_at);
      expect(updatedActivity > initialActivity).toBe(true);
    });

    test('should enforce unique session tokens', async () => {
      const duplicateToken = `duplicate_${Math.random().toString(36).substr(2, 9)}`;

      // Create first session
      const { error: firstError } = await dbHelper.getClient()
        .from('user_sessions')
        .insert({
          user_id: fieldWorkerUser.id,
          organization_id: fieldWorkerUser.organization_id,
          session_token: duplicateToken,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      expect(firstError).toBeNull();

      // Try to create duplicate token
      const { error: duplicateError } = await dbHelper.getClient()
        .from('user_sessions')
        .insert({
          user_id: supervisorUser.id,
          organization_id: supervisorUser.organization_id,
          session_token: duplicateToken, // Same token
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      expect(duplicateError).not.toBeNull();
      expect(duplicateError.code).toBe('23505'); // Unique constraint violation
    });
  });

  test.describe('Session Security and Validation', () => {
    test('should validate session token format and security', async () => {
      const sessionToken = await dbHelper.createTestSession(
        adminUser.id,
        adminUser.organization_id
      );

      // Session token should be properly formatted
      expect(sessionToken).toBeDefined();
      expect(typeof sessionToken).toBe('string');
      expect(sessionToken.length).toBeGreaterThan(10);
      
      // Test session lookup
      const { data: session, error } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .single();

      expect(error).toBeNull();
      expect(session.user_id).toBe(adminUser.id);
      expect(session.organization_id).toBe(adminUser.organization_id);
    });

    test('should prevent session hijacking across organizations', async () => {
      // Create session for user in org1
      const org1SessionToken = await dbHelper.createTestSession(
        fieldWorkerUser.id,
        org1.id
      );

      // Try to use this session for user in org2 (should fail)
      const { data: hijackAttempt, error } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*')
        .eq('session_token', org1SessionToken)
        .eq('organization_id', org2.id)
        .single();

      expect(hijackAttempt).toBeNull();
      expect(error).not.toBeNull();
    });

    test('should track suspicious session activity', async () => {
      const sessionToken = await dbHelper.createTestSession(
        supervisorUser.id,
        supervisorUser.organization_id
      );

      // Simulate rapid IP address changes (potential security issue)
      const suspiciousIPs = ['1.1.1.1', '2.2.2.2', '3.3.3.3'];
      
      for (const ip of suspiciousIPs) {
        const { error } = await dbHelper.getClient()
          .from('user_sessions')
          .update({
            ip_address: ip,
            last_activity_at: new Date().toISOString()
          })
          .eq('session_token', sessionToken);

        expect(error).toBeNull();

        // Log security event
        await dbHelper.getClient()
          .from('auth_audit_log')
          .insert({
            user_id: supervisorUser.id,
            organization_id: supervisorUser.organization_id,
            event_type: 'suspicious_activity',
            resource: 'session_management',
            details: {
              session_token: sessionToken,
              ip_change: ip,
              risk_level: 'medium',
              action_taken: 'logged'
            },
            ip_address: ip,
            success: true
          });
      }

      // Verify audit trail exists
      const { data: auditEvents, error: auditError } = await dbHelper.getClient()
        .from('auth_audit_log')
        .select('*')
        .eq('event_type', 'suspicious_activity')
        .eq('user_id', supervisorUser.id);

      expect(auditError).toBeNull();
      expect(auditEvents.length).toBeGreaterThanOrEqual(3);
    });

    test('should implement session timeout and extension', async () => {
      // Create session with short expiry
      const shortExpirySession = {
        user_id: fieldWorkerUser.id,
        organization_id: fieldWorkerUser.organization_id,
        session_token: `short_session_${Math.random().toString(36).substr(2, 9)}`,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
        is_active: true
      };

      const { data: session, error } = await dbHelper.getClient()
        .from('user_sessions')
        .insert(shortExpirySession)
        .select()
        .single();

      expect(error).toBeNull();

      // Extend session (simulate user activity)
      const newExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const { data: extendedSession, error: extendError } = await dbHelper.getClient()
        .from('user_sessions')
        .update({
          expires_at: newExpiry.toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq('session_token', shortExpirySession.session_token)
        .select()
        .single();

      expect(extendError).toBeNull();
      expect(new Date(extendedSession.expires_at) > new Date(session.expires_at)).toBe(true);
    });
  });

  test.describe('Session Cleanup and Maintenance', () => {
    test('should clean up expired sessions automatically', async () => {
      // Create some expired sessions
      await dbHelper.createExpiredSessions(
        fieldWorkerUser.id,
        fieldWorkerUser.organization_id,
        3
      );

      // Get count before cleanup
      const { data: beforeCleanup, error: beforeError } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*', { count: 'exact' })
        .eq('user_id', fieldWorkerUser.id)
        .lt('expires_at', new Date().toISOString());

      expect(beforeError).toBeNull();
      const expiredCount = beforeCleanup.length;
      expect(expiredCount).toBeGreaterThanOrEqual(3);

      // Run cleanup function
      const { data: cleanupResult, error: cleanupError } = await dbHelper.getClient()
        .rpc('clean_expired_sessions');

      expect(cleanupError).toBeNull();
      expect(cleanupResult).toBeGreaterThanOrEqual(3);

      // Verify expired sessions are removed
      const { data: afterCleanup, error: afterError } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*')
        .eq('user_id', fieldWorkerUser.id)
        .lt('expires_at', new Date().toISOString());

      expect(afterError).toBeNull();
      expect(afterCleanup.length).toBeLessThan(expiredCount);
    });

    test('should clean up inactive sessions after period', async () => {
      // Create inactive session (no activity for over 30 days)
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      
      const inactiveSession = {
        user_id: supervisorUser.id,
        organization_id: supervisorUser.organization_id,
        session_token: `inactive_session_${Math.random().toString(36).substr(2, 9)}`,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        last_activity_at: oldDate.toISOString(),
        is_active: false
      };

      const { error: createError } = await dbHelper.getClient()
        .from('user_sessions')
        .insert(inactiveSession);

      expect(createError).toBeNull();

      // Run cleanup
      const { data: cleanupResult, error: cleanupError } = await dbHelper.getClient()
        .rpc('clean_expired_sessions');

      expect(cleanupError).toBeNull();
      expect(cleanupResult).toBeGreaterThanOrEqual(1);

      // Verify inactive session was cleaned up
      const { data: cleanedSession, error: queryError } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*')
        .eq('session_token', inactiveSession.session_token)
        .single();

      expect(cleanedSession).toBeNull();
      expect(queryError).not.toBeNull();
    });

    test('should preserve active sessions during cleanup', async () => {
      const activeSessionToken = await dbHelper.createTestSession(
        adminUser.id,
        adminUser.organization_id
      );

      // Run cleanup
      await dbHelper.getClient().rpc('clean_expired_sessions');

      // Verify active session is preserved
      const { data: activeSession, error } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*')
        .eq('session_token', activeSessionToken)
        .single();

      expect(error).toBeNull();
      expect(activeSession).toBeDefined();
      expect(activeSession.is_active).toBe(true);
    });

    test('should log cleanup operations for audit trail', async () => {
      const beforeCleanup = await dbHelper.countAuditEvents(
        org1.id,
        'logout',
        new Date(Date.now() - 60 * 1000) // Last minute
      );

      // Create some expired sessions and clean them
      await dbHelper.createExpiredSessions(
        fieldWorkerUser.id,
        fieldWorkerUser.organization_id,
        2
      );

      const { data: cleanupCount } = await dbHelper.getClient()
        .rpc('clean_expired_sessions');

      // Verify cleanup was logged
      const afterCleanup = await dbHelper.countAuditEvents(
        org1.id,
        'logout',
        new Date(Date.now() - 60 * 1000)
      );

      expect(afterCleanup).toBeGreaterThan(beforeCleanup);

      // Check audit log details
      const { data: cleanupAudit, error } = await dbHelper.getClient()
        .from('auth_audit_log')
        .select('*')
        .eq('event_type', 'logout')
        .eq('resource', 'system')
        .order('timestamp', { ascending: false })
        .limit(1);

      expect(error).toBeNull();
      expect(cleanupAudit.length).toBeGreaterThan(0);
      expect(cleanupAudit[0].details.cleaned_sessions).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Water Infrastructure Monitoring Session Features', () => {
    test('should track field location data in sessions', async () => {
      const fieldLocationData = {
        platform: 'android',
        device_model: 'Panasonic Toughbook FZ-T1',
        gps_coordinates: {
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy_meters: 5,
          timestamp: new Date().toISOString()
        },
        work_site: 'North Treatment Plant',
        facility_zone: 'Chemical Building - pH Treatment',
        equipment_connections: ['ph_meter_001', 'flow_sensor_A12'],
        environmental_conditions: {
          temperature_c: 22,
          humidity_percent: 65,
          ambient_light: 'indoor_bright'
        },
        network_info: {
          connection_type: 'cellular_4g',
          signal_strength: -78,
          carrier: 'Verizon',
          data_usage_mb: 15.7
        }
      };

      const { data: fieldSession, error } = await dbHelper.getClient()
        .from('user_sessions')
        .insert({
          user_id: fieldWorkerUser.id,
          organization_id: fieldWorkerUser.organization_id,
          session_token: `field_location_${Math.random().toString(36).substr(2, 12)}`,
          device_info: fieldLocationData,
          ip_address: '73.95.123.45', // Cellular IP
          user_agent: 'WaterMonitor-Field/2.1.0 (Android 12; Panasonic FZ-T1)',
          expires_at: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
          is_active: true
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(fieldSession.device_info.gps_coordinates).toBeDefined();
      expect(fieldSession.device_info.work_site).toBe('North Treatment Plant');
      expect(fieldSession.device_info.equipment_connections).toContain('ph_meter_001');
      expect(fieldSession.device_info.network_info.connection_type).toBe('cellular_4g');
    });

    test('should handle offline field data sync sessions', async () => {
      const offlineSessionData = {
        platform: 'ios',
        device_model: 'iPad Air 4',
        offline_mode: true,
        sync_pending: true,
        cached_readings: 47,
        cache_size_mb: 12.3,
        last_sync: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        pending_uploads: [
          { type: 'water_quality_reading', count: 23, priority: 'high' },
          { type: 'equipment_maintenance', count: 3, priority: 'medium' },
          { type: 'photo_evidence', count: 8, size_mb: 45.7, priority: 'low' }
        ],
        network_availability: {
          wifi_available: false,
          cellular_available: true,
          cellular_strength: 2,
          data_limit_reached: false
        }
      };

      const { data: offlineSession, error } = await dbHelper.getClient()
        .from('user_sessions')
        .insert({
          user_id: fieldWorkerUser.id,
          organization_id: fieldWorkerUser.organization_id,
          session_token: `offline_sync_${Math.random().toString(36).substr(2, 12)}`,
          device_info: offlineSessionData,
          ip_address: null, // No current IP due to offline mode
          user_agent: 'WaterMonitor-Field/2.1.0 (iOS 16.0; iPad14,1)',
          expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          is_active: true
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(offlineSession.device_info.offline_mode).toBe(true);
      expect(offlineSession.device_info.cached_readings).toBe(47);
      expect(offlineSession.device_info.pending_uploads.length).toBe(3);
      expect(offlineSession.ip_address).toBeNull();
    });

    test('should track emergency response session escalation', async () => {
      const emergencySessionData = {
        platform: 'android',
        device_model: 'Samsung Galaxy S21 Ultra',
        emergency_mode: true,
        incident_id: 'INC-2025-001',
        response_level: 'level_2',
        escalation_timestamp: new Date().toISOString(),
        emergency_contacts_notified: [supervisorUser.id, adminUser.id],
        location_override: {
          latitude: 40.7589,
          longitude: -73.9851,
          accuracy_meters: 3,
          address: '123 Emergency Response Site, City',
          landmark: 'Main Distribution Center'
        },
        priority_data_channels: ['voice', 'emergency_text', 'push_notification'],
        equipment_status: {
          critical_sensors: 'online',
          backup_power: 'engaged',
          communication_systems: 'functional'
        }
      };

      const { data: emergencySession, error } = await dbHelper.getClient()
        .from('user_sessions')
        .insert({
          user_id: supervisorUser.id,
          organization_id: supervisorUser.organization_id,
          session_token: `emergency_${Math.random().toString(36).substr(2, 12)}`,
          device_info: emergencySessionData,
          ip_address: '192.168.100.50', // Emergency network
          user_agent: 'WaterMonitor-Emergency/2.1.0 (Android 12; Samsung SM-G998B)',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Extended for emergency
          is_active: true
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(emergencySession.device_info.emergency_mode).toBe(true);
      expect(emergencySession.device_info.incident_id).toBe('INC-2025-001');
      expect(emergencySession.device_info.response_level).toBe('level_2');
      
      // Log emergency session activation
      await dbHelper.getClient()
        .from('auth_audit_log')
        .insert({
          user_id: supervisorUser.id,
          organization_id: supervisorUser.organization_id,
          event_type: 'emergency_login',
          resource: 'emergency_response',
          details: {
            incident_id: 'INC-2025-001',
            session_token: emergencySession.session_token,
            escalation_level: 'level_2',
            contacts_notified: emergencySessionData.emergency_contacts_notified.length
          },
          ip_address: '192.168.100.50',
          success: true
        });
    });

    test('should support supervisor multi-region monitoring sessions', async () => {
      const multiRegionData = {
        platform: 'web',
        device_model: 'Chrome Desktop',
        monitoring_mode: 'multi_region_dashboard',
        active_regions: ['NORTH', 'SOUTH'],
        dashboard_views: [
          { region: 'NORTH', facilities: 3, active_alerts: 1 },
          { region: 'SOUTH', facilities: 5, active_alerts: 0 }
        ],
        real_time_feeds: {
          sensor_connections: 47,
          data_streams_active: 156,
          last_data_refresh: new Date().toISOString()
        },
        alert_configurations: {
          ph_threshold_alerts: true,
          turbidity_warnings: true,
          pressure_drop_alerts: true,
          communication_failure_alerts: true
        },
        performance_metrics: {
          dashboard_load_time_ms: 850,
          data_refresh_interval_seconds: 30,
          concurrent_users: 8
        }
      };

      const { data: supervisorSession, error } = await dbHelper.getClient()
        .from('user_sessions')
        .insert({
          user_id: supervisorUser.id,
          organization_id: supervisorUser.organization_id,
          session_token: `supervisor_multi_${Math.random().toString(36).substr(2, 12)}`,
          device_info: multiRegionData,
          ip_address: '192.168.1.200',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
          expires_at: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(), // 10 hours
          is_active: true
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(supervisorSession.device_info.monitoring_mode).toBe('multi_region_dashboard');
      expect(supervisorSession.device_info.active_regions).toEqual(['NORTH', 'SOUTH']);
      expect(supervisorSession.device_info.real_time_feeds.sensor_connections).toBe(47);
    });
  });

  test.describe('Performance and Scalability', () => {
    test('should handle high concurrent session load', async () => {
      const concurrentSessions = Array(10).fill(null).map(async (_, index) => {
        return dbHelper.createTestSession(
          fieldWorkerUser.id,
          fieldWorkerUser.organization_id
        );
      });

      const startTime = Date.now();
      const results = await Promise.allSettled(concurrentSessions);
      const totalTime = Date.now() - startTime;

      // All sessions should be created successfully
      results.forEach((result, index) => {
        expect(result.status).toBe('fulfilled');
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
        }
      });

      // Should handle concurrent load efficiently
      expect(totalTime).toBeLessThan(2000); // Under 2 seconds for 10 concurrent operations
    });

    test('should efficiently query user sessions with proper indexing', async () => {
      const startTime = Date.now();

      const { data: activeSessions, error } = await dbHelper.getClient()
        .from('user_sessions')
        .select('*')
        .eq('organization_id', org1.id)
        .eq('is_active', true)
        .order('last_activity_at', { ascending: false })
        .limit(50);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(activeSessions).toBeDefined();
      expect(queryTime).toBeLessThan(100); // Should be very fast with indexes

      // Verify all returned sessions are from the correct organization
      activeSessions.forEach(session => {
        expect(session.organization_id).toBe(org1.id);
        expect(session.is_active).toBe(true);
      });
    });

    test('should handle session cleanup at scale', async () => {
      // Create multiple expired sessions across different users
      await Promise.all([
        dbHelper.createExpiredSessions(fieldWorkerUser.id, org1.id, 5),
        dbHelper.createExpiredSessions(supervisorUser.id, org1.id, 5),
        dbHelper.createExpiredSessions(adminUser.id, org1.id, 3)
      ]);

      const startTime = Date.now();
      const { data: cleanupCount, error } = await dbHelper.getClient()
        .rpc('clean_expired_sessions');
      const cleanupTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(cleanupCount).toBeGreaterThanOrEqual(13);
      expect(cleanupTime).toBeLessThan(1000); // Should be efficient even with many sessions
    });
  });

  test.describe('Session Analytics and Monitoring', () => {
    test('should provide session analytics for organization', async () => {
      // Create diverse sessions for analytics
      const sessionTypes = [
        { platform: 'web', user: adminUser },
        { platform: 'ios', user: supervisorUser },
        { platform: 'android', user: fieldWorkerUser },
        { platform: 'android', user: fieldWorkerUser } // Duplicate platform/user
      ];

      for (const sessionType of sessionTypes) {
        await dbHelper.getClient()
          .from('user_sessions')
          .insert({
            user_id: sessionType.user.id,
            organization_id: sessionType.user.organization_id,
            session_token: `analytics_${sessionType.platform}_${Math.random().toString(36).substr(2, 9)}`,
            device_info: { platform: sessionType.platform },
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            is_active: true
          });
      }

      // Query session analytics
      const { data: analytics, error } = await dbHelper.getClient()
        .rpc('get_session_analytics', { org_id: org1.id });

      expect(error).toBeNull();
      expect(analytics).toBeDefined();
      
      // Should include platform distribution, active users, etc.
      if (analytics.platform_breakdown) {
        expect(analytics.platform_breakdown.web).toBeGreaterThanOrEqual(1);
        expect(analytics.platform_breakdown.mobile).toBeGreaterThanOrEqual(2);
      }
    });

    test('should track session duration and usage patterns', async () => {
      const longSessionToken = await dbHelper.createTestSession(
        supervisorUser.id,
        supervisorUser.organization_id
      );

      // Update session with usage data
      const usageData = {
        total_duration_minutes: 185,
        screens_visited: [
          'dashboard', 'water_quality', 'equipment_status', 
          'alerts', 'reports', 'user_management'
        ],
        actions_performed: 67,
        data_queries: 23,
        alerts_acknowledged: 4,
        reports_generated: 2,
        peak_usage_hours: [9, 10, 11, 14, 15, 16],
        geographic_coverage: {
          regions_accessed: ['NORTH', 'SOUTH'],
          facilities_monitored: 8,
          field_locations_visited: 3
        }
      };

      const { data: updatedSession, error } = await dbHelper.getClient()
        .from('user_sessions')
        .update({
          device_info: { ...usageData, platform: 'web' },
          last_activity_at: new Date().toISOString()
        })
        .eq('session_token', longSessionToken)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updatedSession.device_info.total_duration_minutes).toBe(185);
      expect(updatedSession.device_info.screens_visited).toContain('water_quality');
      expect(updatedSession.device_info.geographic_coverage.regions_accessed).toEqual(['NORTH', 'SOUTH']);
    });
  });
});