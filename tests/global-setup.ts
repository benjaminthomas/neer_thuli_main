import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Global setup for Playwright tests
 * Initializes test environment and creates necessary test data
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for water monitoring platform tests...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  // Initialize Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    await cleanupTestData(supabase);

    // Create test organizations and regions
    console.log('🏗️ Creating test organizations and regions...');
    const testData = await createTestData(supabase);

    // Create test users with different roles
    console.log('👥 Creating test users with different roles...');
    await createTestUsers(supabase, testData);

    // Set up authentication state
    console.log('🔐 Setting up authentication states...');
    await setupAuthStates(config);

    console.log('✅ Global setup completed successfully!');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

/**
 * Clean up existing test data
 */
async function cleanupTestData(supabase: any) {
  const testOrgSlugs = ['test-water-authority', 'test-water-dept-2'];
  
  // Delete test organizations (cascade will clean up related data)
  const { error } = await supabase
    .from('organizations')
    .delete()
    .in('slug', testOrgSlugs);

  if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
    console.warn('Warning during cleanup:', error.message);
  }

  // Clean up any orphaned auth users
  const testEmails = [
    'admin@watermonitor.test',
    'supervisor@watermonitor.test', 
    'fieldworker@watermonitor.test',
    'admin2@watermonitor.test',
    'supervisor2@watermonitor.test'
  ];

  for (const email of testEmails) {
    try {
      const { data: user } = await supabase.auth.admin.listUsers();
      const existingUser = user.users.find((u: any) => u.email === email);
      if (existingUser) {
        await supabase.auth.admin.deleteUser(existingUser.id);
      }
    } catch (error) {
      // Ignore user deletion errors - user might not exist
    }
  }
}

/**
 * Create test data (organizations, regions)
 */
async function createTestData(supabase: any) {
  // Create regions first
  const { data: regions, error: regionError } = await supabase
    .from('regions')
    .insert([
      {
        name: 'North District',
        code: 'NORTH',
        settings: { population: 50000, area_km2: 150 }
      },
      {
        name: 'South District', 
        code: 'SOUTH',
        settings: { population: 75000, area_km2: 200 }
      }
    ])
    .select();

  if (regionError) {
    throw new Error(`Failed to create regions: ${regionError.message}`);
  }

  // Create test organizations
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .insert([
      {
        name: 'Test Water Authority',
        slug: 'test-water-authority',
        subscription_tier: 'premium',
        mfa_required: false,
        open_registration: false,
        max_users: 100,
        settings: {
          alert_thresholds: { ph: [6.5, 8.5], turbidity: [0, 4] },
          monitoring_frequency: 'hourly'
        }
      },
      {
        name: 'Test Water Department 2',
        slug: 'test-water-dept-2', 
        subscription_tier: 'basic',
        mfa_required: true,
        open_registration: false,
        max_users: 50,
        settings: {
          alert_thresholds: { ph: [6.0, 8.0], turbidity: [0, 5] },
          monitoring_frequency: 'daily'
        }
      }
    ])
    .select();

  if (orgError) {
    throw new Error(`Failed to create organizations: ${orgError.message}`);
  }

  // Link organizations to regions
  const orgRegionData = [
    { organization_id: orgs[0].id, region_id: regions[0].id, is_primary: true },
    { organization_id: orgs[0].id, region_id: regions[1].id, is_primary: false },
    { organization_id: orgs[1].id, region_id: regions[1].id, is_primary: true }
  ];

  const { error: orgRegionError } = await supabase
    .from('organization_regions')
    .insert(orgRegionData);

  if (orgRegionError) {
    throw new Error(`Failed to link organizations to regions: ${orgRegionError.message}`);
  }

  return { organizations: orgs, regions };
}

/**
 * Create test users with different roles
 */
async function createTestUsers(supabase: any, testData: any) {
  const org1 = testData.organizations[0];
  const org2 = testData.organizations[1]; 
  const northRegion = testData.regions.find((r: any) => r.code === 'NORTH');
  const southRegion = testData.regions.find((r: any) => r.code === 'SOUTH');

  const testUsers = [
    {
      email: 'admin@watermonitor.test',
      password: 'SecureTestPassword123!',
      role: 'admin',
      organization_id: org1.id,
      region_id: northRegion.id,
      first_name: 'Admin',
      last_name: 'User',
      phone: '+1234567890'
    },
    {
      email: 'supervisor@watermonitor.test', 
      password: 'SecureTestPassword123!',
      role: 'supervisor',
      organization_id: org1.id,
      region_id: northRegion.id,
      first_name: 'Supervisor',
      last_name: 'User',
      phone: '+1234567891'
    },
    {
      email: 'fieldworker@watermonitor.test',
      password: 'SecureTestPassword123!',
      role: 'field_worker', 
      organization_id: org1.id,
      region_id: southRegion.id,
      first_name: 'Field',
      last_name: 'Worker',
      phone: '+1234567892'
    },
    {
      email: 'admin2@watermonitor.test',
      password: 'SecureTestPassword123!',
      role: 'admin',
      organization_id: org2.id,
      region_id: southRegion.id,
      first_name: 'Admin2',
      last_name: 'User',
      phone: '+1234567893'
    }
  ];

  for (const userData of testUsers) {
    // Create auth user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        first_name: userData.first_name,
        last_name: userData.last_name
      }
    });

    if (authError) {
      throw new Error(`Failed to create auth user ${userData.email}: ${authError.message}`);
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        organization_id: userData.organization_id,
        role: userData.role,
        region_id: userData.region_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        preferences: {
          notifications: true,
          dashboard_refresh: 30,
          map_default_zoom: 12
        },
        device_info: {
          platform: 'web',
          version: '1.0.0'
        }
      });

    if (profileError) {
      throw new Error(`Failed to create user profile ${userData.email}: ${profileError.message}`);
    }
  }
}

/**
 * Set up authentication states for different user types
 */
async function setupAuthStates(config: FullConfig) {
  const browser = await chromium.launch();
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

  // For now, we'll create empty auth files that tests can populate
  // In a real implementation, you would authenticate and save the states
  const authStates = [
    '.auth/admin.json',
    '.auth/supervisor.json', 
    '.auth/fieldworker.json',
    '.auth/admin2.json'
  ];

  for (const authFile of authStates) {
    const context = await browser.newContext();
    await context.storageState({ path: authFile });
    await context.close();
  }

  await browser.close();
}

export default globalSetup;