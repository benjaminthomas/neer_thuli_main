-- User Authentication & Authorization System
-- Migration: Core authentication schema with multi-tenant architecture
-- Created: 2025-09-04

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE user_role_enum AS ENUM ('field_worker', 'supervisor', 'admin', 'super_admin');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE auth_event_type AS ENUM ('login', 'logout', 'password_change', 'role_change', 'mfa_enabled', 'mfa_disabled', 'account_locked', 'account_unlocked');

-- Organizations table (multi-tenant root)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) <= 100),
  slug TEXT UNIQUE NOT NULL CHECK (char_length(slug) <= 50 AND slug ~ '^[a-z0-9-]+$'),
  subscription_tier TEXT DEFAULT 'basic',
  mfa_required BOOLEAN DEFAULT false,
  open_registration BOOLEAN DEFAULT false,
  max_users INTEGER DEFAULT 100,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regions table for geographic organization
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  parent_region_id UUID REFERENCES regions(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Organization regions junction table
CREATE TABLE public.organization_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, region_id)
);

-- Extended user profiles (linked to auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL DEFAULT 'field_worker',
  region_id UUID REFERENCES regions(id),
  first_name TEXT CHECK (char_length(first_name) <= 50),
  last_name TEXT CHECK (char_length(last_name) <= 50),
  phone TEXT,
  avatar_url TEXT,
  device_id TEXT,
  device_info JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, phone),
  CONSTRAINT valid_phone CHECK (phone ~ '^[+]?[0-9\s\-\(\)]+$')
);

-- User sessions for device tracking
CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  device_info JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invitation system
CREATE TABLE public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role_enum NOT NULL DEFAULT 'field_worker',
  region_id UUID REFERENCES regions(id),
  invitation_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  status invitation_status DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email, status) -- Prevent duplicate pending invitations
);

-- MFA settings
CREATE TABLE public.user_mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  totp_enabled BOOLEAN DEFAULT false,
  totp_secret TEXT,
  sms_enabled BOOLEAN DEFAULT false,
  backup_codes TEXT[],
  recovery_codes_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Password history for reuse prevention
CREATE TABLE public.user_password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logging
CREATE TABLE public.auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  event_type auth_event_type NOT NULL,
  resource TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id UUID REFERENCES user_sessions(id),
  success BOOLEAN DEFAULT true,
  error_details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Role-based permissions (optional for future extension)
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL,
  permission TEXT NOT NULL,
  resource TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, role, permission, resource)
);

-- Indexes for performance optimization
CREATE INDEX idx_user_profiles_org_id ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_region_id ON user_profiles(region_id);
-- Note: User email is stored in auth.users table, accessible via join or function
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_invitations_token ON organization_invitations(invitation_token);
CREATE INDEX idx_invitations_email ON organization_invitations(email, status);
CREATE INDEX idx_invitations_org_status ON organization_invitations(organization_id, status);
CREATE INDEX idx_audit_log_user_timestamp ON auth_audit_log(user_id, timestamp);
CREATE INDEX idx_audit_log_org_timestamp ON auth_audit_log(organization_id, timestamp);
CREATE INDEX idx_audit_log_event_type ON auth_audit_log(event_type, timestamp);

-- Indexes for JSONB columns
CREATE INDEX idx_user_profiles_preferences ON user_profiles USING GIN (preferences);
CREATE INDEX idx_user_sessions_device_info ON user_sessions USING GIN (device_info);
CREATE INDEX idx_audit_log_details ON auth_audit_log USING GIN (details);

-- Additional performance indexes based on common query patterns
CREATE INDEX idx_user_profiles_org_role ON user_profiles(organization_id, role);
CREATE INDEX idx_user_profiles_active ON user_profiles(organization_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_org_user ON user_sessions(organization_id, user_id);
CREATE INDEX idx_invitations_expires_status ON organization_invitations(expires_at, status) WHERE status = 'pending';
CREATE INDEX idx_audit_log_recent ON auth_audit_log(organization_id, timestamp) WHERE timestamp > NOW() - INTERVAL '30 days';
CREATE INDEX idx_password_history_recent ON user_password_history(user_id, created_at) WHERE created_at > NOW() - INTERVAL '180 days';

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitations_updated_at BEFORE UPDATE ON organization_invitations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mfa_settings_updated_at BEFORE UPDATE ON user_mfa_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired sessions
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE 
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < NOW() 
  OR (last_activity_at < NOW() - INTERVAL '30 days' AND is_active = false);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log cleanup operation
  INSERT INTO auth_audit_log (event_type, resource, details, success) 
  VALUES ('logout', 'system', jsonb_build_object('cleaned_sessions', deleted_count), true);
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate secure invitation tokens
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to check password reuse
CREATE OR REPLACE FUNCTION check_password_reuse(user_uuid UUID, new_password_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_password_history 
    WHERE user_id = user_uuid 
    AND password_hash = new_password_hash
    AND created_at > NOW() - INTERVAL '180 days'
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user organization context
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM user_profiles 
    WHERE id = user_uuid 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Note: Default permissions will be inserted per organization during organization creation
-- This ensures proper multi-tenant isolation from the start

COMMENT ON TABLE organizations IS 'Multi-tenant organizations with subscription and configuration settings';
COMMENT ON TABLE user_profiles IS 'Extended user profiles linked to Supabase auth.users with organization membership';
COMMENT ON TABLE user_sessions IS 'Device and session tracking for security monitoring';
COMMENT ON TABLE organization_invitations IS 'Invite-only user registration system with token-based authentication';
COMMENT ON TABLE user_mfa_settings IS 'Multi-factor authentication settings and backup codes';
COMMENT ON TABLE auth_audit_log IS 'Comprehensive audit trail for all authentication and authorization events';