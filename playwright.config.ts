import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Playwright configuration for database testing with Supabase
 * Focus on water infrastructure monitoring platform authentication system
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',

    /* Extra HTTP headers */
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports for field worker scenarios */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Web Application E2E Testing */
    {
      name: 'web-e2e',
      testDir: './tests/web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },

    /* Database-focused testing with API calls */
    {
      name: 'database-api',
      testDir: './tests/database',
      use: {
        // API testing doesn't need browser context
        headless: true,
        baseURL: process.env.SUPABASE_URL,
        extraHTTPHeaders: {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'Content-Type': 'application/json',
        },
      },
    },

    /* Edge Functions testing */
    {
      name: 'edge-functions',
      testDir: './tests/database/edge-functions.spec.ts',
      use: {
        baseURL: process.env.SUPABASE_URL,
        extraHTTPHeaders: {
          'apikey': process.env.SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          'Content-Type': 'application/json',
        },
      },
    },
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./tests/global-setup'),
  globalTeardown: require.resolve('./tests/global-teardown'),

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',

  /* Timeout settings */
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  /* Test patterns */
  testMatch: [
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.test.ts'
  ],

  /* Environment variables for database testing */
  use: {
    ...devices['Desktop Chrome'],
    // Ensure we have environment variables for database connections
    storageState: process.env.PLAYWRIGHT_STORAGE_STATE,
  },
});