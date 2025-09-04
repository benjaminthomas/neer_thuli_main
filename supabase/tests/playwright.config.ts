// Playwright Configuration for Database Testing
// Water Infrastructure Monitoring Platform
// Created: 2025-09-04

import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/test-results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  use: {
    baseURL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),
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
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    // Database-only tests (no browser needed)
    {
      name: 'database-tests',
      testMatch: '**/playwright-database.spec.ts',
      use: {
        // Override to not use browser for pure database tests
        headless: true
      }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000
  }
})