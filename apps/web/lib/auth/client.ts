'use client'

import { createClient } from '@/lib/supabase/client'
import type { LoginFormData, SignUpFormData } from '@/types/auth'
import { VALIDATION } from '@/utils/constants'

export class AuthClient {
  private supabase = createClient()

  async signIn({ email, password, remember }: LoginFormData, ipAddress?: string) {
    try {
      // Check for account lockout first
      const { data: lockoutStatus, error: lockoutError } = await this.checkAccountLockout(email)
      if (lockoutError) {
        console.warn('Error checking account lockout:', lockoutError)
      }
      
      if (lockoutStatus?.isLocked) {
        return { 
          data: null, 
          error: new Error(`Account temporarily locked due to too many failed attempts. Try again later.`) 
        }
      }

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Record failed attempt
        if (ipAddress) {
          await this.recordFailedAttempt(email, ipAddress)
        }
        return { data: null, error }
      }

      // Record successful attempt
      if (ipAddress && data.user) {
        await this.recordSuccessfulAttempt(email, ipAddress)
        
        // Create user session record
        const userAgent = typeof window !== 'undefined' ? navigator.userAgent : ''
        await this.createUserSession(data.user.id, ipAddress, userAgent)
      }

      // Handle remember me functionality
      if (remember) {
        // Set a longer session duration or handle persistence
        localStorage.setItem('neer-thuli-remember', 'true')
      }

      return { data, error: null }
    } catch (error) {
      // Record failed attempt on exception
      if (ipAddress) {
        await this.recordFailedAttempt(email, ipAddress || 'unknown')
      }
      return { data: null, error }
    }
  }

  async signUp({ email, password, fullName }: SignUpFormData, inviteCode?: string) {
    try {
      // If invite code is provided, validate it first
      if (inviteCode) {
        const { data: invitation, error: inviteError } = await this.validateInvitation(email, inviteCode)
        if (inviteError || !invitation) {
          return { data: null, error: inviteError || new Error('Invalid invitation') }
        }
      }

      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            invite_code: inviteCode,
          },
        },
      })

      // If signup successful and had invitation, mark invitation as used
      if (data.user && inviteCode) {
        await this.acceptInvitation(inviteCode, data.user.id)
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async signOut() {
    try {
      // Clear remember me flag
      localStorage.removeItem('neer-thuli-remember')
      
      const { error } = await this.supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error }
    }
  }

  async resetPassword(email: string) {
    try {
      // Check if user exists and account is not locked
      const { data: lockoutStatus } = await this.checkAccountLockout(email)
      if (lockoutStatus?.isLocked) {
        return { 
          data: null, 
          error: new Error('Account temporarily locked. Cannot reset password at this time.') 
        }
      }

      const { data, error } = await this.supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      )

      // Record the reset request for security tracking
      if (!error) {
        await this.supabase
          .from('auth_attempts')
          .insert({
            email,
            ip_address: 'unknown', // Would be better to get actual IP
            attempt_type: 'password_reset_request',
            success: true,
            attempted_at: new Date().toISOString(),
          })
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async confirmPasswordReset(password: string, code?: string) {
    try {
      // Validate the new password strength
      const { isValid, errors } = this.validatePasswordStrength(password)
      if (!isValid) {
        return { 
          data: null, 
          error: new Error(Object.values(errors).join(', ')) 
        }
      }

      const { data, error } = await this.supabase.auth.updateUser({
        password,
      })

      if (!error && data.user) {
        // Save to password history
        await this.savePasswordToHistory(data.user.id, 'hashed_password_placeholder')
        
        // Record successful password reset
        await this.supabase
          .from('auth_attempts')
          .insert({
            email: data.user.email,
            ip_address: 'unknown',
            attempt_type: 'password_reset_complete',
            success: true,
            attempted_at: new Date().toISOString(),
          })
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  private validatePasswordStrength(password: string): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}
    
    if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
      errors.length = `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters long`
    }
    
    if (!VALIDATION.STRONG_PASSWORD_REGEX.test(password)) {
      errors.strength = 'Password must contain uppercase, lowercase, number, and special character'
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    }
  }

  async updatePassword(password: string) {
    try {
      const { data: user } = await this.getUser()
      
      if (!user.user?.id) {
        return { data: null, error: new Error('User not authenticated') }
      }

      // Check password history to prevent reuse
      const { data: isReused, error: historyError } = await this.checkPasswordHistory(user.user.id, password)
      if (historyError) {
        console.warn('Error checking password history:', historyError)
      }
      
      if (isReused) {
        return { 
          data: null, 
          error: new Error('Password has been used recently. Please choose a different password.') 
        }
      }

      const { data, error } = await this.supabase.auth.updateUser({
        password,
      })

      // Save password to history on successful update
      if (data && !error) {
        // This would typically be done in a secure server function
        // For now, we'll save a placeholder that would be replaced with actual hash
        await this.savePasswordToHistory(user.user.id, 'hashed_password_placeholder')
      }

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async getSession() {
    try {
      const { data, error } = await this.supabase.auth.getSession()
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async getUser() {
    try {
      const { data, error } = await this.supabase.auth.getUser()
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async refreshSession() {
    try {
      const { data, error } = await this.supabase.auth.refreshSession()
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback)
  }

  // Social authentication methods
  async signInWithGoogle() {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async signInWithGithub() {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Profile management
  async updateProfile(updates: {
    full_name?: string
    avatar_url?: string
    phone?: string
  }) {
    try {
      const { data, error } = await this.supabase.auth.updateUser({
        data: updates,
      })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Email verification
  async resendVerificationEmail() {
    try {
      const { data: user } = await this.getUser()
      
      if (!user.user?.email) {
        return { data: null, error: new Error('No email found') }
      }

      const { data, error } = await this.supabase.auth.resend({
        type: 'signup',
        email: user.user.email,
      })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Invitation system methods
  async validateInvitation(email: string, inviteCode: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_invitations')
        .select('*')
        .eq('invitation_code', inviteCode)
        .eq('email', email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single()

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async acceptInvitation(inviteCode: string, userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: userId,
        })
        .eq('invitation_code', inviteCode)

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async checkInvitationRequired(email: string) {
    try {
      // Check if system requires invitations for this domain/organization
      const { data: settings, error } = await this.supabase
        .from('organization_settings')
        .select('invite_only')
        .limit(1)
        .single()

      if (error || !settings) {
        // Default to invite-only if no settings found
        return { data: true, error: null }
      }

      return { data: settings.invite_only, error: null }
    } catch (error) {
      return { data: true, error }
    }
  }

  // Account lockout and security methods
  async recordFailedAttempt(email: string, ipAddress: string) {
    try {
      const { data, error } = await this.supabase
        .from('auth_attempts')
        .insert({
          email,
          ip_address: ipAddress,
          attempt_type: 'login',
          success: false,
          attempted_at: new Date().toISOString(),
        })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async checkAccountLockout(email: string) {
    try {
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      const { data, error } = await this.supabase
        .from('auth_attempts')
        .select('*')
        .eq('email', email)
        .eq('success', false)
        .gte('attempted_at', oneHourAgo.toISOString())

      if (error) {
        return { data: null, error }
      }

      const failedAttempts = data.length
      const isLocked = failedAttempts >= 5

      return { 
        data: { 
          isLocked, 
          failedAttempts, 
          remainingAttempts: isLocked ? 0 : 5 - failedAttempts 
        }, 
        error: null 
      }
    } catch (error) {
      return { data: null, error }
    }
  }

  async recordSuccessfulAttempt(email: string, ipAddress: string) {
    try {
      const { data, error } = await this.supabase
        .from('auth_attempts')
        .insert({
          email,
          ip_address: ipAddress,
          attempt_type: 'login',
          success: true,
          attempted_at: new Date().toISOString(),
        })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Password history tracking
  async checkPasswordHistory(userId: string, newPassword: string) {
    try {
      // This would require password hashing comparison in a secure function
      const { data, error } = await this.supabase.rpc('check_password_history', {
        user_id: userId,
        new_password: newPassword,
      })

      return { data, error }
    } catch (error) {
      return { data: false, error }
    }
  }

  async savePasswordToHistory(userId: string, passwordHash: string) {
    try {
      const { data, error } = await this.supabase
        .from('password_history')
        .insert({
          user_id: userId,
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
        })

      // Keep only last 12 passwords
      await this.supabase.rpc('cleanup_password_history', {
        user_id: userId,
        keep_count: 12,
      })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  // Session management methods
  async createUserSession(userId: string, ipAddress: string, userAgent: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .insert({
          user_id: userId,
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          is_active: true,
        })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async updateSessionActivity(sessionId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString(),
        })
        .eq('id', sessionId)

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async invalidateAllSessions(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  async getUserSessions(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false })

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }
}

// Export singleton instance
export const authClient = new AuthClient()