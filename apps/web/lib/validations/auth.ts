import { VALIDATION, ERROR_MESSAGES } from '@/utils/constants'
import type { LoginFormData, SignUpFormData, ResetPasswordFormData, UpdatePasswordFormData } from '@/types/auth'

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

/**
 * Validate email format
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD }
  }

  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_EMAIL }
  }

  return { isValid: true }
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD }
  }

  if (password.length < VALIDATION.PASSWORD_MIN_LENGTH) {
    return { isValid: false, error: ERROR_MESSAGES.WEAK_PASSWORD }
  }

  if (!VALIDATION.STRONG_PASSWORD_REGEX.test(password)) {
    return { isValid: false, error: ERROR_MESSAGES.WEAK_PASSWORD }
  }

  return { isValid: true }
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): { isValid: boolean; error?: string } {
  if (!confirmPassword) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD }
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: ERROR_MESSAGES.PASSWORDS_DONT_MATCH }
  }

  return { isValid: true }
}

/**
 * Validate full name
 */
export function validateFullName(fullName: string): { isValid: boolean; error?: string } {
  if (!fullName.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD }
  }

  if (fullName.length > VALIDATION.USER_NAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Name must be less than ${VALIDATION.USER_NAME_MAX_LENGTH} characters` 
    }
  }

  return { isValid: true }
}

/**
 * Validate organization name
 */
export function validateOrganizationName(name: string): { isValid: boolean; error?: string } {
  if (!name.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD }
  }

  if (name.length > VALIDATION.ORGANIZATION_NAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Organization name must be less than ${VALIDATION.ORGANIZATION_NAME_MAX_LENGTH} characters` 
    }
  }

  return { isValid: true }
}

/**
 * Validate organization slug
 */
export function validateOrganizationSlug(slug: string): { isValid: boolean; error?: string } {
  if (!slug.trim()) {
    return { isValid: false, error: ERROR_MESSAGES.REQUIRED_FIELD }
  }

  if (!VALIDATION.ORGANIZATION_SLUG_REGEX.test(slug)) {
    return { 
      isValid: false, 
      error: 'Slug can only contain lowercase letters, numbers, and hyphens' 
    }
  }

  if (slug.length < 3) {
    return { isValid: false, error: 'Slug must be at least 3 characters long' }
  }

  if (slug.length > 50) {
    return { isValid: false, error: 'Slug must be less than 50 characters long' }
  }

  return { isValid: true }
}

/**
 * Validate login form data
 */
export function validateLoginForm(data: LoginFormData): ValidationResult {
  const errors: Record<string, string> = {}

  const emailValidation = validateEmail(data.email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!
  }

  if (!data.password) {
    errors.password = ERROR_MESSAGES.REQUIRED_FIELD
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate signup form data
 */
export function validateSignUpForm(data: SignUpFormData): ValidationResult {
  const errors: Record<string, string> = {}

  const emailValidation = validateEmail(data.email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!
  }

  const passwordValidation = validatePassword(data.password)
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.error!
  }

  const confirmPasswordValidation = validatePasswordConfirmation(
    data.password,
    data.confirmPassword
  )
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.error!
  }

  const fullNameValidation = validateFullName(data.fullName)
  if (!fullNameValidation.isValid) {
    errors.fullName = fullNameValidation.error!
  }

  if (!data.agreeToTerms) {
    errors.agreeToTerms = 'You must agree to the terms and conditions'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate reset password form data
 */
export function validateResetPasswordForm(data: ResetPasswordFormData): ValidationResult {
  const errors: Record<string, string> = {}

  const emailValidation = validateEmail(data.email)
  if (!emailValidation.isValid) {
    errors.email = emailValidation.error!
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate update password form data
 */
export function validateUpdatePasswordForm(data: UpdatePasswordFormData): ValidationResult {
  const errors: Record<string, string> = {}

  if (!data.currentPassword) {
    errors.currentPassword = ERROR_MESSAGES.REQUIRED_FIELD
  }

  const newPasswordValidation = validatePassword(data.newPassword)
  if (!newPasswordValidation.isValid) {
    errors.newPassword = newPasswordValidation.error!
  }

  const confirmPasswordValidation = validatePasswordConfirmation(
    data.newPassword,
    data.confirmPassword
  )
  if (!confirmPasswordValidation.isValid) {
    errors.confirmPassword = confirmPasswordValidation.error!
  }

  if (data.currentPassword === data.newPassword) {
    errors.newPassword = 'New password must be different from current password'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

/**
 * Validate invitation email
 */
export function validateInvitationEmail(email: string): { isValid: boolean; error?: string } {
  return validateEmail(email)
}

/**
 * Get password strength score and feedback
 */
export function getPasswordStrength(password: string): {
  score: number
  feedback: string[]
  strength: 'weak' | 'fair' | 'good' | 'strong'
} {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 12) {
    score += 1
  } else {
    feedback.push('Use at least 12 characters')
  }

  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include lowercase letters')
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include uppercase letters')
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('Include numbers')
  }

  if (/[@$!%*?&]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include special characters')
  }

  let strength: 'weak' | 'fair' | 'good' | 'strong'
  if (score <= 2) {
    strength = 'weak'
  } else if (score === 3) {
    strength = 'fair'
  } else if (score === 4) {
    strength = 'good'
  } else {
    strength = 'strong'
  }

  return { score, feedback, strength }
}