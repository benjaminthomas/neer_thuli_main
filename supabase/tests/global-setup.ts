// Global Setup for Playwright Database Tests
// Water Infrastructure Monitoring Platform
// Created: 2025-09-04

import { createClient } from '@supabase/supabase-js'

async function globalSetup() {
  console.log('Setting up database test environment...')

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
    // Verify database connection
    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)

    if (error) {
      console.error('Database connection failed:', error)
      throw new Error(`Database setup failed: ${error.message}`)
    }

    console.log('Database connection verified ✓')

    // Run any necessary test data setup
    console.log('Test environment setup complete ✓')

  } catch (error) {
    console.error('Global setup failed:', error)
    throw error
  }
}

export default globalSetup