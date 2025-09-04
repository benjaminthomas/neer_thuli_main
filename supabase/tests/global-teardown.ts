// Global Teardown for Playwright Database Tests
// Water Infrastructure Monitoring Platform  
// Created: 2025-09-04

import { createClient } from '@supabase/supabase-js'

async function globalTeardown() {
  console.log('Cleaning up database test environment...')

  // Initialize Supabase client with service role
  const supabase = createClient(
    process.env.SUPABASE_URL || 'https://rmwvhfmootqzcxjgblsq.supabase.co',
    process.env.SUPABASE_SERVICE_KEY || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // Clean up any test data that might have persisted
    await supabase
      .from('organizations')
      .delete()
      .like('name', '%Test%')
      .like('name', '%Playwright%')

    await supabase
      .from('organization_invitations')  
      .delete()
      .like('email', '%test%')
      .like('email', '%playwright%')

    // Clean up test users (this might need special handling)
    const { data: testUsers } = await supabase.auth.admin.listUsers()
    
    for (const user of testUsers.users || []) {
      if (user.email?.includes('test') || user.email?.includes('playwright')) {
        await supabase.auth.admin.deleteUser(user.id)
      }
    }

    console.log('Test environment cleanup complete ✓')

  } catch (error) {
    console.error('Global teardown warning:', error)
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown