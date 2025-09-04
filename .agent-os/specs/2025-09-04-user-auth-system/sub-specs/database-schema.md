# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-09-04-user-auth-system/spec.md

> Created: 2025-09-04
> Version: 1.0.0

## Schema Changes

### New Tables

#### organizations
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    subscription_tier TEXT DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_domain ON organizations(domain);
```

#### user_profiles
```sql
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    status TEXT NOT NULL DEFAULT 'active',
    preferences JSONB DEFAULT '{}',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, organization_id)
);

-- Indexes
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_org_id ON user_profiles(organization_id);
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_status ON user_profiles(status);
```

#### organization_invitations
```sql
CREATE TABLE organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    token TEXT UNIQUE NOT NULL,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, email)
);

-- Indexes
CREATE INDEX idx_org_invitations_token ON organization_invitations(token);
CREATE INDEX idx_org_invitations_org_email ON organization_invitations(organization_id, email);
CREATE INDEX idx_org_invitations_expires ON organization_invitations(expires_at);
```

#### user_sessions
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    refresh_token_id TEXT NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_org_id ON user_sessions(organization_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_last_activity ON user_sessions(last_activity_at);
```

#### user_mfa_settings
```sql
CREATE TABLE user_mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT FALSE,
    totp_secret TEXT,
    backup_codes TEXT[],
    phone_number TEXT,
    recovery_email TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_user_mfa_user_id ON user_mfa_settings(user_id);
CREATE INDEX idx_user_mfa_phone ON user_mfa_settings(phone_number);
```

#### password_history
```sql
CREATE TABLE password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_created ON password_history(created_at);
```

#### auth_audit_log
```sql
CREATE TABLE auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES organizations(id),
    event_type TEXT NOT NULL,
    event_details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auth_audit_user_id ON auth_audit_log(user_id);
CREATE INDEX idx_auth_audit_org_id ON auth_audit_log(organization_id);
CREATE INDEX idx_auth_audit_event_type ON auth_audit_log(event_type);
CREATE INDEX idx_auth_audit_created ON auth_audit_log(created_at);
CREATE INDEX idx_auth_audit_success ON auth_audit_log(success);
```

#### regions
```sql
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    parent_region_id UUID REFERENCES regions(id),
    level INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_regions_code ON regions(code);
CREATE INDEX idx_regions_parent ON regions(parent_region_id);
CREATE INDEX idx_regions_level ON regions(level);
```

#### organization_regions
```sql
CREATE TABLE organization_regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    region_id UUID NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
    access_level TEXT NOT NULL DEFAULT 'read',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, region_id)
);

-- Indexes
CREATE INDEX idx_org_regions_org_id ON organization_regions(organization_id);
CREATE INDEX idx_org_regions_region_id ON organization_regions(region_id);
```

### Row Level Security (RLS) Policies

#### organizations table
```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can only see organizations they belong to
CREATE POLICY "Users can view their organizations" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.organization_id = organizations.id 
            AND user_profiles.user_id = auth.uid()
        )
    );

-- Only org admins can update organizations
CREATE POLICY "Admins can update organizations" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.organization_id = organizations.id 
            AND user_profiles.user_id = auth.uid()
            AND user_profiles.role IN ('admin', 'owner')
        )
    );
```

#### user_profiles table
```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view profiles in their organization
CREATE POLICY "Users can view org profiles" ON user_profiles
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Admins can manage all profiles in their org
CREATE POLICY "Admins can manage org profiles" ON user_profiles
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );
```

#### organization_invitations table
```sql
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;

-- Users can view invitations for their organization
CREATE POLICY "View org invitations" ON organization_invitations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'owner')
        )
    );
```

#### user_sessions table
```sql
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users view own sessions" ON user_sessions
    FOR SELECT USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "Users delete own sessions" ON user_sessions
    FOR DELETE USING (user_id = auth.uid());
```

#### auth_audit_log table
```sql
ALTER TABLE auth_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can view audit logs for their organization
CREATE POLICY "Admins view org audit logs" ON auth_audit_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM user_profiles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'owner')
        )
    );
```

### Database Functions

#### Update timestamp function
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables with updated_at columns
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_mfa_settings_updated_at 
    BEFORE UPDATE ON user_mfa_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Clean expired sessions function
```sql
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR last_activity_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

#### Generate invitation token function
```sql
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;
```

## Migrations

### Migration 001: Initial Schema Setup
```sql
-- Create organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    subscription_tier TEXT DEFAULT 'free',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_domain ON organizations(domain);

-- Continue with other tables...
-- [Full table creation statements from above]
```

### Migration 002: RLS Policies
```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
-- [Continue with all RLS policy creation]
```

### Migration 003: Database Functions and Triggers
```sql
-- Create utility functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- [Continue with all function and trigger creation]
```

### Migration 004: Seed Data
```sql
-- Insert default regions
INSERT INTO regions (name, code, level) VALUES
('Global', 'GLOBAL', 0),
('North America', 'NA', 1),
('Europe', 'EU', 1),
('Asia Pacific', 'APAC', 1);

-- Insert sub-regions
INSERT INTO regions (name, code, level, parent_region_id) VALUES
('United States', 'US', 2, (SELECT id FROM regions WHERE code = 'NA')),
('Canada', 'CA', 2, (SELECT id FROM regions WHERE code = 'NA')),
('United Kingdom', 'UK', 2, (SELECT id FROM regions WHERE code = 'EU')),
('Germany', 'DE', 2, (SELECT id FROM regions WHERE code = 'EU'));
```

## Rationale

### Multi-tenant Architecture
- **organization_id scoping**: All user-related tables include organization_id to ensure data isolation
- **RLS policies**: Enforce organization-level access control at the database level
- **Performance**: Indexes on organization_id for efficient filtering

### Security Considerations
- **Password history**: Prevents password reuse (configurable policy)
- **Session management**: Tracks active sessions with device information for security monitoring
- **MFA support**: Comprehensive multi-factor authentication with backup codes and recovery options
- **Audit logging**: Complete authentication event tracking for security analysis

### Performance Optimizations
- **Strategic indexing**: Indexes on frequently queried columns (email, organization_id, role)
- **Session cleanup**: Automated cleanup of expired sessions to prevent table bloat
- **JSONB usage**: Flexible storage for settings and preferences with indexing support

### Data Integrity
- **Foreign key constraints**: Ensure referential integrity across all relationships
- **Unique constraints**: Prevent duplicate invitations and enforce business rules
- **Check constraints**: Could be added for role validation and status values

### Supabase Integration
- **auth.users reference**: Links to Supabase Auth's built-in user table
- **UUID primary keys**: Compatible with Supabase's default key generation
- **RLS policies**: Leverages Supabase's auth.uid() function for user context
- **Trigger functions**: Automatic timestamp updates using PostgreSQL functions

### Regional/Hierarchical Support
- **regions table**: Supports hierarchical region structures with parent-child relationships
- **organization_regions**: Links organizations to specific regions with access levels
- **Scalable design**: Can support complex geographical hierarchies and access patterns