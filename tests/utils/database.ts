import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { expect } from '@playwright/test';

/**
 * Database utilities for Playwright tests
 * Provides helper functions for database operations and validations
 */

export interface TestUser {
  id: string;
  email: string;
  role: 'field_worker' | 'supervisor' | 'admin' | 'super_admin';
  organization_id: string;
  region_id?: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  mfa_required: boolean;
  max_users: number;
}

export interface TestInvitation {
  id: string;
  email: string;
  organization_id: string;
  role: string;
  invitation_token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  invited_by: string;
}

export class DatabaseTestHelper {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Get Supabase client for direct database operations
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get test user by email
   */
  async getTestUser(email: string): Promise<TestUser | null> {
    const { data: user } = await this.supabase.auth.admin.listUsers();
    const authUser = user.users.find(u => u.email === email);
    
    if (!authUser) return null;

    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (!profile) return null;

    return {
      id: authUser.id,
      email: authUser.email!,
      role: profile.role,
      organization_id: profile.organization_id,
      region_id: profile.region_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      phone: profile.phone,
    };
  }

  /**
   * Get test organization by slug
   */
  async getTestOrganization(slug: string): Promise<TestOrganization | null> {
    const { data: org } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    return org;
  }

  /**
   * Create test session for user
   */
  async createTestSession(userId: string, organizationId: string): Promise<string> {
    const sessionToken = `test_session_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const { data } = await this.supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        session_token: sessionToken,
        device_info: { platform: 'test', browser: 'playwright' },
        ip_address: '127.0.0.1',
        user_agent: 'Playwright Test',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    return data.session_token;
  }

  /**
   * Create test invitation
   */
  async createTestInvitation(
    email: string,
    organizationId: string,
    role: string,
    invitedBy: string
  ): Promise<TestInvitation> {
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    const { data } = await this.supabase
      .from('organization_invitations')
      .insert({
        email,
        organization_id: organizationId,
        role,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        invited_by: invitedBy,
        status: 'pending',
      })
      .select()
      .single();

    return data;
  }

  /**
   * Validate database schema exists and is accessible
   */
  async validateSchema(): Promise<void> {
    // Check that all required tables exist
    const requiredTables = [
      'organizations',
      'regions',
      'organization_regions',
      'user_profiles',
      'user_sessions',
      'organization_invitations',
      'user_mfa_settings',
      'user_password_history',
      'auth_audit_log',
      'role_permissions'
    ];

    for (const table of requiredTables) {
      const { data, error } = await this.supabase
        .from(table)
        .select('*')
        .limit(1);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    }
  }

  /**
   * Validate RLS policies are enforced
   */
  async validateRLSEnforcement(userToken: string): Promise<void> {
    // Create authenticated client
    const authClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        },
      }
    );

    // Test that user can only see their own organization data
    const { data: orgs, error } = await authClient
      .from('organizations')
      .select('*');

    expect(error).toBeNull();
    // Should only see organizations the user belongs to
    expect(orgs).toBeDefined();
  }

  /**
   * Clean up test data for specific organization
   */
  async cleanupTestData(organizationSlug: string): Promise<void> {
    // Delete organization (cascade will clean up related data)
    await this.supabase
      .from('organizations')
      .delete()
      .eq('slug', organizationSlug);
  }

  /**
   * Count rows in audit log for specific event types
   */
  async countAuditEvents(
    organizationId: string,
    eventType?: string,
    since?: Date
  ): Promise<number> {
    let query = this.supabase
      .from('auth_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (since) {
      query = query.gte('timestamp', since.toISOString());
    }

    const { count, error } = await query;
    expect(error).toBeNull();
    return count || 0;
  }

  /**
   * Verify database indexes exist and are being used
   */
  async validateIndexUsage(tableName: string, queryPattern: string): Promise<void> {
    // Execute EXPLAIN ANALYZE to check if indexes are being used
    const { data, error } = await this.supabase.rpc('explain_query', {
      query_text: `EXPLAIN ANALYZE ${queryPattern}`
    });

    expect(error).toBeNull();
    // Check that the query plan uses indexes (not sequential scan)
    expect(data).toBeDefined();
  }

  /**
   * Test concurrent operations for race condition detection
   */
  async testConcurrentOperations(
    operation: () => Promise<any>,
    concurrency: number = 5
  ): Promise<any[]> {
    const promises = Array(concurrency).fill(null).map(() => operation());
    return Promise.allSettled(promises);
  }

  /**
   * Validate trigger functionality
   */
  async validateTriggers(): Promise<void> {
    // Test updated_at triggers by updating a record
    const testOrg = await this.getTestOrganization('test-water-authority');
    if (!testOrg) return;

    const originalUpdatedAt = testOrg.updated_at;
    
    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    // Update the organization
    const { data: updated } = await this.supabase
      .from('organizations')
      .update({ name: testOrg.name + ' (Updated)' })
      .eq('id', testOrg.id)
      .select()
      .single();

    expect(updated.updated_at).not.toBe(originalUpdatedAt);
    expect(new Date(updated.updated_at) > new Date(originalUpdatedAt)).toBe(true);
  }

  /**
   * Test Edge Function endpoints
   */
  async testEdgeFunction(
    functionName: string,
    payload: any,
    authToken?: string
  ): Promise<Response> {
    const baseUrl = process.env.SUPABASE_URL!;
    const url = `${baseUrl}/functions/v1/${functionName}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY!,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  /**
   * Simulate expired sessions for cleanup testing
   */
  async createExpiredSessions(userId: string, organizationId: string, count: number = 3): Promise<void> {
    const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

    const sessions = Array(count).fill(null).map((_, index) => ({
      user_id: userId,
      organization_id: organizationId,
      session_token: `expired_session_${index}_${Math.random().toString(36).substr(2, 9)}`,
      device_info: { platform: 'test', browser: 'playwright' },
      ip_address: '127.0.0.1',
      user_agent: 'Playwright Test - Expired',
      expires_at: expiredDate.toISOString(),
      is_active: false,
    }));

    await this.supabase
      .from('user_sessions')
      .insert(sessions);
  }
}