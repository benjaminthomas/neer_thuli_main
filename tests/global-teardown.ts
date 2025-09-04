import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Global teardown for Playwright tests
 * Cleans up test data and resources
 */
async function globalTeardown() {
  console.log('🧹 Starting global teardown...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('⚠️ Missing Supabase environment variables for teardown');
    return;
  }

  // Initialize Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Only clean up if TEST_DB_RESET is true
    if (process.env.TEST_DB_RESET === 'true') {
      console.log('🗑️ Cleaning up test data...');
      
      const testOrgSlugs = ['test-water-authority', 'test-water-dept-2'];
      
      // Delete test organizations (cascade will clean up related data)
      const { error } = await supabase
        .from('organizations')
        .delete()
        .in('slug', testOrgSlugs);

      if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
        console.warn('Warning during teardown cleanup:', error.message);
      }

      // Clean up test auth users
      const testEmails = [
        'admin@watermonitor.test',
        'supervisor@watermonitor.test',
        'fieldworker@watermonitor.test', 
        'admin2@watermonitor.test',
        'supervisor2@watermonitor.test'
      ];

      for (const email of testEmails) {
        try {
          const { data: users } = await supabase.auth.admin.listUsers();
          const existingUser = users.users.find((u: any) => u.email === email);
          if (existingUser) {
            await supabase.auth.admin.deleteUser(existingUser.id);
          }
        } catch (error) {
          // Ignore user deletion errors - user might not exist
          console.warn(`Warning: Could not delete user ${email}`);
        }
      }

      console.log('✅ Test data cleanup completed');
    } else {
      console.log('ℹ️ Skipping test data cleanup (TEST_DB_RESET=false)');
    }

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw - teardown failures shouldn't fail the test suite
  }

  console.log('🏁 Global teardown completed');
}

export default globalTeardown;