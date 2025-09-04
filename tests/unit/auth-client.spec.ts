import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthClient } from '@/lib/auth/client'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}))

// Mock constants
vi.mock('@/utils/constants', () => ({
  VALIDATION: {
    PASSWORD_MIN_LENGTH: 12,
    STRONG_PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
  },
}))

describe('AuthClient', () => {
  let authClient: AuthClient
  let mockSupabaseClient: any

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Create mock Supabase client
    mockSupabaseClient = {
      auth: {
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
        getSession: vi.fn(),
        getUser: vi.fn(),
        refreshSession: vi.fn(),
        onAuthStateChange: vi.fn(),
        signInWithOAuth: vi.fn(),
        resend: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    }

    // Mock the from method to return query builder
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      single: vi.fn(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })

    // Mock createClient to return our mock
    vi.mocked(createClient).mockReturnValue(mockSupabaseClient)
    
    // Create AuthClient instance
    authClient = new AuthClient()
  })

  describe('signIn', () => {
    it('should sign in successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        remember: false,
      }

      const mockResponse = {
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null,
      }

      // Mock successful lockout check
      mockSupabaseClient.from().single.mockResolvedValueOnce({ 
        data: [], 
        error: null 
      })

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(mockResponse)

      const result = await authClient.signIn(loginData, '127.0.0.1')

      expect(result).toEqual(mockResponse)
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: loginData.email,
        password: loginData.password,
      })
    })

    it('should handle account lockout', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        remember: false,
      }

      // Mock locked account (5 failed attempts)
      const mockFailedAttempts = Array(5).fill({ 
        email: 'test@example.com', 
        success: false 
      })
      
      mockSupabaseClient.from().single.mockResolvedValueOnce({ 
        data: mockFailedAttempts, 
        error: null 
      })

      const result = await authClient.signIn(loginData, '127.0.0.1')

      expect(result.data).toBeNull()
      expect(result.error.message).toContain('Account temporarily locked')
      expect(mockSupabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('should record failed login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword',
        remember: false,
      }

      // Mock no lockout
      mockSupabaseClient.from().single.mockResolvedValueOnce({ 
        data: [], 
        error: null 
      })

      // Mock failed login
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid credentials' },
      })

      const result = await authClient.signIn(loginData, '127.0.0.1')

      expect(result.error.message).toBe('Invalid credentials')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('auth_attempts')
    })
  })

  describe('signUp', () => {
    it('should sign up successfully with valid invitation', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        fullName: 'Test User',
        agreeToTerms: true,
      }

      const inviteCode = 'VALID_INVITE_123'

      // Mock valid invitation
      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: { 
          id: '456',
          email: 'test@example.com',
          invitation_code: inviteCode,
          status: 'pending',
        },
        error: null,
      })

      // Mock successful signup
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null,
      })

      const result = await authClient.signUp(signupData, inviteCode)

      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: signupData.email,
        password: signupData.password,
        options: {
          data: {
            full_name: signupData.fullName,
            invite_code: inviteCode,
          },
        },
      })
    })

    it('should reject signup with invalid invitation', async () => {
      const signupData = {
        email: 'test@example.com',
        password: 'ValidPassword123!',
        confirmPassword: 'ValidPassword123!',
        fullName: 'Test User',
        agreeToTerms: true,
      }

      const invalidInviteCode = 'INVALID_INVITE'

      // Mock invalid invitation
      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' },
      })

      const result = await authClient.signUp(signupData, invalidInviteCode)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
    })
  })

  describe('checkAccountLockout', () => {
    it('should return unlocked status for accounts with fewer than 5 failed attempts', async () => {
      const email = 'test@example.com'
      
      // Mock 3 failed attempts
      const mockFailedAttempts = Array(3).fill({ 
        email,
        success: false,
        attempted_at: new Date().toISOString(),
      })
      
      mockSupabaseClient.from().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ 
          data: mockFailedAttempts, 
          error: null 
        }),
      })

      const result = await authClient.checkAccountLockout(email)

      expect(result.data.isLocked).toBe(false)
      expect(result.data.failedAttempts).toBe(3)
      expect(result.data.remainingAttempts).toBe(2)
    })

    it('should return locked status for accounts with 5 or more failed attempts', async () => {
      const email = 'test@example.com'
      
      // Mock 5 failed attempts
      const mockFailedAttempts = Array(5).fill({ 
        email,
        success: false,
        attempted_at: new Date().toISOString(),
      })
      
      mockSupabaseClient.from().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ 
          data: mockFailedAttempts, 
          error: null 
        }),
      })

      const result = await authClient.checkAccountLockout(email)

      expect(result.data.isLocked).toBe(true)
      expect(result.data.failedAttempts).toBe(5)
      expect(result.data.remainingAttempts).toBe(0)
    })
  })

  describe('validateInvitation', () => {
    it('should validate correct invitation code and email', async () => {
      const email = 'test@example.com'
      const inviteCode = 'VALID_INVITE_123'

      const mockInvitation = {
        id: '456',
        email,
        invitation_code: inviteCode,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: mockInvitation,
        error: null,
      })

      const result = await authClient.validateInvitation(email, inviteCode)

      expect(result.data).toEqual(mockInvitation)
      expect(result.error).toBeNull()
    })

    it('should reject expired invitations', async () => {
      const email = 'test@example.com'
      const inviteCode = 'EXPIRED_INVITE_123'

      mockSupabaseClient.from().single.mockResolvedValueOnce({
        data: null,
        error: { message: 'No rows returned' },
      })

      const result = await authClient.validateInvitation(email, inviteCode)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })
  })

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const newPassword = 'NewValidPassword123!'

      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null,
      })

      // Mock password not in history
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: false,
        error: null,
      })

      // Mock successful password update
      mockSupabaseClient.auth.updateUser.mockResolvedValueOnce({
        data: { user: { id: '123' } },
        error: null,
      })

      const result = await authClient.updatePassword(newPassword)

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        password: newPassword,
      })
    })

    it('should reject password reuse', async () => {
      const reusedPassword = 'ReusedPassword123!'

      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: '123', email: 'test@example.com' } },
        error: null,
      })

      // Mock password found in history
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: true,
        error: null,
      })

      const result = await authClient.updatePassword(reusedPassword)

      expect(result.data).toBeNull()
      expect(result.error.message).toContain('Password has been used recently')
      expect(mockSupabaseClient.auth.updateUser).not.toHaveBeenCalled()
    })
  })

  describe('session management', () => {
    it('should create user session record', async () => {
      const userId = '123'
      const ipAddress = '127.0.0.1'
      const userAgent = 'Test Browser'

      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: { id: 'session-123' },
        error: null,
      })

      const result = await authClient.createUserSession(userId, ipAddress, userAgent)

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions')
    })

    it('should invalidate all user sessions', async () => {
      const userId = '123'

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await authClient.invalidateAllSessions(userId)

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_sessions')
    })
  })

  describe('password reset', () => {
    it('should send password reset email for unlocked account', async () => {
      const email = 'test@example.com'

      // Mock unlocked account
      mockSupabaseClient.from().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ 
          data: [], // No failed attempts
          error: null 
        }),
      })

      // Mock successful reset email
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      })

      const result = await authClient.resetPassword(email)

      expect(result.error).toBeNull()
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        email,
        expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/reset-password'),
        })
      )
    })

    it('should reject password reset for locked account', async () => {
      const email = 'test@example.com'

      // Mock locked account
      const mockFailedAttempts = Array(5).fill({ 
        email,
        success: false,
        attempted_at: new Date().toISOString(),
      })
      
      mockSupabaseClient.from().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockResolvedValue({ 
          data: mockFailedAttempts,
          error: null 
        }),
      })

      const result = await authClient.resetPassword(email)

      expect(result.data).toBeNull()
      expect(result.error.message).toContain('Account temporarily locked')
      expect(mockSupabaseClient.auth.resetPasswordForEmail).not.toHaveBeenCalled()
    })
  })
})