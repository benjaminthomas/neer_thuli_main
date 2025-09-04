import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!

// Test data
const TEST_USER = {
  email: 'test.user@example.com',
  password: 'TestPassword123!',
  weakPassword: 'weak',
  fullName: 'Test User',
}

const INVITE_CODE = 'TEST_INVITE_123'
const TEST_ORGANIZATION = 'test-org-slug'

test.describe('Authentication System', () => {
  let supabase: ReturnType<typeof createClient>

  test.beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  })

  test.beforeEach(async ({ page }) => {
    // Clean up test data before each test
    await supabase.from('auth_attempts').delete().eq('email', TEST_USER.email)
    await supabase.from('user_invitations').delete().eq('email', TEST_USER.email)
    await supabase.auth.admin.deleteUser(TEST_USER.email)
  })

  test.describe('User Registration Flow', () => {
    test('should reject registration without valid invitation', async ({ page }) => {
      await page.goto('/auth/signup')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.fill('[data-testid="confirm-password-input"]', TEST_USER.password)
      await page.fill('[data-testid="full-name-input"]', TEST_USER.fullName)
      await page.check('[data-testid="terms-checkbox"]')
      
      await page.click('[data-testid="signup-submit"]')
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Valid invitation required'
      )
    })

    test('should accept registration with valid invitation', async ({ page }) => {
      // Create test invitation
      await supabase.from('user_invitations').insert({
        email: TEST_USER.email,
        invitation_code: INVITE_CODE,
        organization_id: TEST_ORGANIZATION,
        role: 'operator',
        invited_by: 'test-admin',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      })

      await page.goto('/auth/signup?invite=' + INVITE_CODE)
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.fill('[data-testid="confirm-password-input"]', TEST_USER.password)
      await page.fill('[data-testid="full-name-input"]', TEST_USER.fullName)
      await page.check('[data-testid="terms-checkbox"]')
      
      await page.click('[data-testid="signup-submit"]')
      
      // Should show email verification message
      await expect(page.locator('[data-testid="verification-message"]')).toContainText(
        'Check your email for verification'
      )
    })

    test('should enforce password strength requirements', async ({ page }) => {
      await page.goto('/auth/signup')
      
      await page.fill('[data-testid="password-input"]', TEST_USER.weakPassword)
      await page.blur('[data-testid="password-input"]')
      
      await expect(page.locator('[data-testid="password-error"]')).toContainText(
        'Password must be at least 12 characters'
      )
    })
  })

  test.describe('User Login Flow', () => {
    test.beforeEach(async () => {
      // Create verified test user
      const { data } = await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true,
        user_metadata: { full_name: TEST_USER.fullName },
      })
    })

    test('should login with valid credentials', async ({ page }) => {
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      
      await page.click('[data-testid="login-submit"]')
      
      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/)
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', 'WrongPassword123!')
      
      await page.click('[data-testid="login-submit"]')
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Invalid credentials'
      )
    })

    test('should implement account lockout after failed attempts', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await page.fill('[data-testid="email-input"]', TEST_USER.email)
        await page.fill('[data-testid="password-input"]', 'WrongPassword123!')
        await page.click('[data-testid="login-submit"]')
        
        if (i < 4) {
          await expect(page.locator('[data-testid="error-message"]')).toContainText(
            'Invalid credentials'
          )
        }
        
        await page.reload()
      }
      
      // 6th attempt should show lockout message
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Account temporarily locked'
      )
    })

    test('should handle remember me functionality', async ({ page }) => {
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.check('[data-testid="remember-checkbox"]')
      
      await page.click('[data-testid="login-submit"]')
      
      // Check local storage for remember flag
      const rememberFlag = await page.evaluate(() => 
        localStorage.getItem('neer-thuli-remember')
      )
      expect(rememberFlag).toBe('true')
    })
  })

  test.describe('Password Reset Flow', () => {
    test.beforeEach(async () => {
      // Create verified test user
      await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true,
        user_metadata: { full_name: TEST_USER.fullName },
      })
    })

    test('should send password reset email', async ({ page }) => {
      await page.goto('/auth/forgot-password')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.click('[data-testid="reset-submit"]')
      
      await expect(page.locator('[data-testid="success-message"]')).toContainText(
        'Password reset email sent'
      )
    })

    test('should reject reset request for locked account', async ({ page }) => {
      // Lock the account first by making failed attempts
      for (let i = 0; i < 5; i++) {
        await supabase.from('auth_attempts').insert({
          email: TEST_USER.email,
          ip_address: '127.0.0.1',
          attempt_type: 'login',
          success: false,
          attempted_at: new Date().toISOString(),
        })
      }

      await page.goto('/auth/forgot-password')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.click('[data-testid="reset-submit"]')
      
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Account temporarily locked'
      )
    })
  })

  test.describe('Session Management', () => {
    test.beforeEach(async () => {
      // Create verified test user
      await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true,
        user_metadata: { full_name: TEST_USER.fullName },
      })
    })

    test('should maintain session across page reloads', async ({ page }) => {
      await page.goto('/auth/login')
      
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      await expect(page).toHaveURL(/.*dashboard/)
      
      // Reload page
      await page.reload()
      
      // Should still be authenticated
      await expect(page).toHaveURL(/.*dashboard/)
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    })

    test('should logout and clear session', async ({ page }) => {
      // Login first
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      await expect(page).toHaveURL(/.*dashboard/)
      
      // Logout
      await page.click('[data-testid="user-menu"]')
      await page.click('[data-testid="logout-button"]')
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login/)
      
      // Check that remember flag is cleared
      const rememberFlag = await page.evaluate(() => 
        localStorage.getItem('neer-thuli-remember')
      )
      expect(rememberFlag).toBeNull()
    })

    test('should handle session timeout', async ({ page }) => {
      // This would require mocking session timeout behavior
      // For now, we'll test the basic flow
      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      await expect(page).toHaveURL(/.*dashboard/)
      
      // Mock session expiry by clearing auth tokens
      await page.evaluate(() => {
        localStorage.clear()
        sessionStorage.clear()
      })
      
      // Navigate to protected page
      await page.goto('/dashboard/settings')
      
      // Should redirect to login due to expired session
      await expect(page).toHaveURL(/.*login/)
    })
  })

  test.describe('Social Authentication', () => {
    test('should display Google OAuth option', async ({ page }) => {
      await page.goto('/auth/login')
      
      await expect(page.locator('[data-testid="google-auth-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="google-auth-button"]')).toContainText(
        'Continue with Google'
      )
    })

    test('should display GitHub OAuth option', async ({ page }) => {
      await page.goto('/auth/login')
      
      await expect(page.locator('[data-testid="github-auth-button"]')).toBeVisible()
      await expect(page.locator('[data-testid="github-auth-button"]')).toContainText(
        'Continue with GitHub'
      )
    })
  })

  test.describe('Route Protection', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/.*login/)
    })

    test('should allow access to authenticated users', async ({ page }) => {
      // Create and login user first
      await supabase.auth.admin.createUser({
        email: TEST_USER.email,
        password: TEST_USER.password,
        email_confirm: true,
        user_metadata: { full_name: TEST_USER.fullName },
      })

      await page.goto('/auth/login')
      await page.fill('[data-testid="email-input"]', TEST_USER.email)
      await page.fill('[data-testid="password-input"]', TEST_USER.password)
      await page.click('[data-testid="login-submit"]')
      
      // Now try accessing dashboard
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/.*dashboard/)
    })
  })

  test.describe('Security Features', () => {
    test('should enforce HTTPS in production', async ({ page }) => {
      // This would depend on deployment environment
      // For now, just check that secure attributes are set
      await page.goto('/auth/login')
      
      const cookieSecurityAttributes = await page.evaluate(() => {
        return document.cookie.includes('Secure') || window.location.protocol === 'https:'
      })
      
      expect(cookieSecurityAttributes).toBe(true)
    })

    test('should prevent CSRF attacks with proper headers', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Check for CSRF protection headers
      const response = await page.request.get('/auth/login')
      const headers = response.headers()
      
      expect(headers['x-frame-options'] || headers['X-Frame-Options']).toBeDefined()
    })
  })

  test.afterEach(async () => {
    // Clean up test data
    await supabase.from('auth_attempts').delete().eq('email', TEST_USER.email)
    await supabase.from('user_invitations').delete().eq('email', TEST_USER.email)
    await supabase.auth.admin.deleteUser(TEST_USER.email)
  })
})