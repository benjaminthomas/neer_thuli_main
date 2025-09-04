// Application constants
export const APP_NAME = 'Neer Thuli'
export const APP_DESCRIPTION = 'Water Infrastructure Monitoring Platform'

// Route constants
export const ROUTES = {
  HOME: '/',
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  AUTH_CALLBACK: '/auth/callback',
  DASHBOARD: '/dashboard',
  MONITORING: '/monitoring',
  ADMIN: '/admin',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  ONBOARDING: '/onboarding',
  UNAUTHORIZED: '/unauthorized',
} as const

// API routes
export const API_ROUTES = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  ORGANIZATIONS: '/api/organizations',
  INVITATIONS: '/api/invitations',
  SESSIONS: '/api/sessions',
  AUDIT_LOGS: '/api/audit-logs',
} as const

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'neer-thuli-theme',
  PREFERENCES: 'neer-thuli-preferences',
  DASHBOARD_LAYOUT: 'neer-thuli-dashboard-layout',
  RECENT_SEARCHES: 'neer-thuli-recent-searches',
} as const

// User roles and their display names
export const USER_ROLES = {
  owner: 'Organization Owner',
  admin: 'Administrator',
  manager: 'Manager',
  operator: 'Operator',
  viewer: 'Viewer',
} as const

// User status options
export const USER_STATUS = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
} as const

// Invitation status options
export const INVITATION_STATUS = {
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
  revoked: 'Revoked',
} as const

// Form validation constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 12, // Updated to 12+ characters as per requirements
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  STRONG_PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/,
  ORGANIZATION_SLUG_REGEX: /^[a-z0-9-]+$/,
  ORGANIZATION_NAME_MAX_LENGTH: 100,
  USER_NAME_MAX_LENGTH: 100,
  // Account lockout settings
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes in milliseconds
  // Session settings
  SESSION_IDLE_TIMEOUT: 15 * 60 * 1000, // 15 minutes
  SESSION_MAX_DURATION: 24 * 60 * 60 * 1000, // 24 hours
} as const

// Time constants
export const TIME = {
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  INVITATION_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  PASSWORD_RESET_EXPIRY: 60 * 60 * 1000, // 1 hour
  AUDIT_LOG_RETENTION: 90 * 24 * 60 * 60 * 1000, // 90 days
} as const

// Pagination constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  USERS_PAGE_SIZE: 15,
  AUDIT_LOGS_PAGE_SIZE: 25,
} as const

// Water monitoring specific constants
export const MONITORING = {
  REFRESH_INTERVALS: {
    REAL_TIME: 5000, // 5 seconds
    NORMAL: 30000, // 30 seconds
    LOW: 60000, // 1 minute
  },
  ALERT_LEVELS: {
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical',
  },
  SENSOR_TYPES: {
    TEMPERATURE: 'temperature',
    PH: 'ph',
    TURBIDITY: 'turbidity',
    FLOW_RATE: 'flow_rate',
    PRESSURE: 'pressure',
    CHLORINE: 'chlorine',
    DISSOLVED_OXYGEN: 'dissolved_oxygen',
  },
  STATUS: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    WARNING: 'warning',
    ERROR: 'error',
  },
} as const

// Theme constants
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  WEAK_PASSWORD: 'Password must be at least 12 characters with uppercase, lowercase, number, and special character.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  REQUIRED_FIELD: 'This field is required.',
  ORGANIZATION_EXISTS: 'An organization with this name already exists.',
  INVITATION_EXPIRED: 'This invitation has expired.',
  USER_NOT_FOUND: 'User not found.',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully.',
  PASSWORD_CHANGED: 'Password changed successfully.',
  INVITATION_SENT: 'Invitation sent successfully.',
  USER_DELETED: 'User deleted successfully.',
  ORGANIZATION_CREATED: 'Organization created successfully.',
  SETTINGS_SAVED: 'Settings saved successfully.',
} as const