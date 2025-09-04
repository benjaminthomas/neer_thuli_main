# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-09-04-user-auth-system/spec.md

> Created: 2025-09-04
> Version: 1.0.0

## Authentication Endpoints

### POST /api/auth/login
**Purpose:** User authentication with email/password
**Parameters:**
- `email` (string, required): User email address
- `password` (string, required): User password
- `remember_me` (boolean, optional): Extend session duration
- `platform` (string, optional): 'web' | 'mobile' for platform-specific handling

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "profile": { /* user profile data */ },
      "role": "user|admin|super_admin",
      "mfa_enabled": boolean,
      "requires_mfa": boolean
    },
    "session": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_at": "timestamp"
    }
  }
}
```

**Error Handling:**
- 401: Invalid credentials
- 429: Too many login attempts
- 400: Validation errors

### POST /api/auth/logout
**Purpose:** User session termination
**Parameters:**
- `refresh_token` (string, optional): Token to invalidate specific session
- `all_sessions` (boolean, optional): Logout from all devices

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

### POST /api/auth/refresh
**Purpose:** Token refresh for session management
**Parameters:**
- `refresh_token` (string, required): Valid refresh token

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "new_jwt_token",
    "expires_at": "timestamp"
  }
}
```

### POST /api/auth/mfa/setup
**Purpose:** Initialize MFA setup process
**Parameters:**
- `method` (string, required): 'totp' | 'sms' | 'email'

**Response:**
```json
{
  "success": true,
  "data": {
    "qr_code": "base64_qr_image", // for TOTP
    "secret": "backup_secret",
    "backup_codes": ["code1", "code2", ...]
  }
}
```

### POST /api/auth/mfa/verify
**Purpose:** Verify MFA code during login or setup
**Parameters:**
- `code` (string, required): MFA verification code
- `method` (string, required): MFA method used
- `context` (string, required): 'login' | 'setup'

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "session": { /* session data if login context */ }
  }
}
```

## User Registration & Invitation

### POST /api/auth/register
**Purpose:** New user registration
**Parameters:**
- `email` (string, required): User email
- `password` (string, required): User password
- `first_name` (string, required): User first name
- `last_name` (string, required): User last name
- `invitation_token` (string, optional): Organization invitation token

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* user data */ },
    "verification_sent": true
  }
}
```

### POST /api/auth/verify-email
**Purpose:** Email verification for new accounts
**Parameters:**
- `token` (string, required): Email verification token

**Response:**
```json
{
  "success": true,
  "data": {
    "verified": true,
    "user": { /* updated user data */ }
  }
}
```

### POST /api/invitations/send
**Purpose:** Send organization invitation
**Parameters:**
- `email` (string, required): Invitee email
- `role` (string, required): Assigned role
- `organization_id` (string, required): Target organization
- `message` (string, optional): Custom invitation message

**Response:**
```json
{
  "success": true,
  "data": {
    "invitation_id": "uuid",
    "expires_at": "timestamp"
  }
}
```

### GET /api/invitations/:token
**Purpose:** Retrieve invitation details
**Response:**
```json
{
  "success": true,
  "data": {
    "organization": {
      "name": "Organization Name",
      "logo": "logo_url"
    },
    "role": "assigned_role",
    "inviter": "inviter_name",
    "expires_at": "timestamp"
  }
}
```

## Password Management

### POST /api/auth/password/reset
**Purpose:** Initiate password reset process
**Parameters:**
- `email` (string, required): User email address

**Response:**
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

### POST /api/auth/password/confirm-reset
**Purpose:** Complete password reset with token
**Parameters:**
- `token` (string, required): Password reset token
- `new_password` (string, required): New password

**Response:**
```json
{
  "success": true,
  "message": "Password successfully reset"
}
```

### POST /api/auth/password/change
**Purpose:** Change password for authenticated user
**Parameters:**
- `current_password` (string, required): Current password
- `new_password` (string, required): New password

**Response:**
```json
{
  "success": true,
  "message": "Password successfully changed"
}
```

## Profile Management

### GET /api/profile
**Purpose:** Get current user profile
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "avatar_url": "avatar_url",
    "role": "user_role",
    "organization": { /* org details */ },
    "preferences": { /* user preferences */ },
    "mfa_enabled": boolean,
    "last_login": "timestamp"
  }
}
```

### PUT /api/profile
**Purpose:** Update user profile information
**Parameters:**
- `first_name` (string, optional): Updated first name
- `last_name` (string, optional): Updated last name
- `avatar` (file, optional): Profile picture upload
- `preferences` (object, optional): User preferences

**Response:**
```json
{
  "success": true,
  "data": { /* updated profile data */ }
}
```

### POST /api/profile/avatar/upload
**Purpose:** Upload profile picture
**Parameters:**
- `avatar` (file, required): Image file

**Response:**
```json
{
  "success": true,
  "data": {
    "avatar_url": "new_avatar_url"
  }
}
```

## Session Management

### GET /api/sessions
**Purpose:** List active user sessions
**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "session_id",
        "platform": "web|mobile",
        "ip_address": "ip_address",
        "user_agent": "user_agent",
        "last_activity": "timestamp",
        "is_current": boolean
      }
    ]
  }
}
```

### DELETE /api/sessions/:id
**Purpose:** Terminate specific session
**Response:**
```json
{
  "success": true,
  "message": "Session terminated"
}
```

### DELETE /api/sessions/all
**Purpose:** Terminate all sessions except current
**Response:**
```json
{
  "success": true,
  "message": "All other sessions terminated"
}
```

## Organization & User Administration

### GET /api/admin/users
**Purpose:** List organization users (admin only)
**Parameters:**
- `page` (number, optional): Pagination page
- `limit` (number, optional): Items per page
- `role` (string, optional): Filter by role
- `status` (string, optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [ /* user list */ ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "total_pages": 5
    }
  }
}
```

### PUT /api/admin/users/:id/role
**Purpose:** Update user role (admin only)
**Parameters:**
- `role` (string, required): New role assignment

**Response:**
```json
{
  "success": true,
  "data": { /* updated user data */ }
}
```

### DELETE /api/admin/users/:id
**Purpose:** Deactivate/remove user (admin only)
**Parameters:**
- `reason` (string, optional): Deactivation reason

**Response:**
```json
{
  "success": true,
  "message": "User deactivated"
}
```

## Audit & Security

### GET /api/audit/logs
**Purpose:** Retrieve security audit logs (admin only)
**Parameters:**
- `user_id` (string, optional): Filter by user
- `action` (string, optional): Filter by action type
- `from_date` (string, optional): Start date filter
- `to_date` (string, optional): End date filter
- `page` (number, optional): Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "user_id": "user_uuid",
        "action": "login|logout|role_change|etc",
        "details": { /* action details */ },
        "ip_address": "ip_address",
        "user_agent": "user_agent",
        "timestamp": "timestamp"
      }
    ],
    "pagination": { /* pagination info */ }
  }
}
```

### GET /api/security/activity
**Purpose:** Get current user's security activity
**Response:**
```json
{
  "success": true,
  "data": {
    "recent_logins": [ /* recent login attempts */ ],
    "active_sessions": [ /* active sessions */ ],
    "security_events": [ /* relevant security events */ ]
  }
}
```

## Controllers

### AuthController
**Actions:**
- `login` - Handle user authentication with Supabase
- `logout` - Terminate user session and cleanup
- `refresh` - Generate new access tokens
- `mfaSetup` - Initialize MFA configuration
- `mfaVerify` - Validate MFA codes

**Business Logic:**
- Rate limiting for login attempts
- Platform-specific session handling
- MFA requirement enforcement
- Security event logging

**Error Handling:**
- Standardized error responses
- Security-conscious error messages
- Audit trail for failed attempts

### RegistrationController
**Actions:**
- `register` - Create new user accounts
- `verifyEmail` - Email verification process
- `resendVerification` - Resend verification emails

**Business Logic:**
- Email uniqueness validation
- Password strength requirements
- Organization invitation processing
- Welcome email automation

### ProfileController
**Actions:**
- `getProfile` - Retrieve user profile data
- `updateProfile` - Update profile information
- `uploadAvatar` - Handle profile picture uploads
- `updatePreferences` - Manage user preferences

**Business Logic:**
- File upload validation and processing
- Profile data sanitization
- Change history tracking

### SessionController
**Actions:**
- `getSessions` - List user sessions
- `terminateSession` - End specific session
- `terminateAllSessions` - End all user sessions

**Business Logic:**
- Session validation and cleanup
- Cross-device session management
- Security monitoring

### AdminController
**Actions:**
- `listUsers` - Organization user management
- `updateUserRole` - Role assignment management
- `deactivateUser` - User account management
- `getAuditLogs` - Security audit access

**Business Logic:**
- Permission validation
- Bulk operations support
- Audit trail maintenance
- Organization boundary enforcement

### InvitationController
**Actions:**
- `sendInvitation` - Organization invitations
- `getInvitation` - Invitation details retrieval
- `acceptInvitation` - Invitation acceptance process

**Business Logic:**
- Invitation token generation and validation
- Email delivery and tracking
- Expiration handling
- Duplicate prevention