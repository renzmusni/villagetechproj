-- Initialize Citus distributed database for multi-tenant HOA platform

-- Enable Citus extension
CREATE EXTENSION IF NOT EXISTS citus;

-- Create the master node
SELECT master_create_node('postgres', 5432);

-- Create shared schema for tenant metadata
CREATE SCHEMA IF NOT EXISTS shared;

-- Create tenant table in shared schema
CREATE TABLE shared.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant template schema
CREATE SCHEMA tenant_template;

-- Create base tables in tenant template
CREATE TABLE tenant_template.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_template.households (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    unit_number VARCHAR(50),
    head_user_id UUID REFERENCES tenant_template.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_template.residences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES tenant_template.households(id) NOT NULL,
    address TEXT NOT NULL,
    unit_number VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    square_footage INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    is_owner_occupied BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_template.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES tenant_template.households(id) NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_template.gate_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES tenant_template.vehicles(id) NOT NULL,
    pass_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    qr_code VARCHAR(255),
    created_by UUID REFERENCES tenant_template.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_template.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES tenant_template.households(id) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    purpose VARCHAR(255),
    expected_arrival TIMESTAMP WITH TIME ZONE,
    expected_departure TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES tenant_template.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_template.construction_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES tenant_template.households(id) NOT NULL,
    contractor_name VARCHAR(255) NOT NULL,
    work_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    approved_by UUID REFERENCES tenant_template.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_template.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    author_id UUID REFERENCES tenant_template.users(id) NOT NULL,
    target_audience VARCHAR(100) NOT NULL,
    priority VARCHAR(50) DEFAULT 'normal',
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE tenant_template.elections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    positions JSONB NOT NULL,
    nomination_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    nomination_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'upcoming',
    created_by UUID REFERENCES tenant_template.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON tenant_template.users(email);
CREATE INDEX idx_users_role ON tenant_template.users(role);
CREATE INDEX idx_households_head_user_id ON tenant_template.households(head_user_id);
CREATE INDEX idx_residences_household_id ON tenant_template.residences(household_id);
CREATE INDEX idx_vehicles_household_id ON tenant_template.vehicles(household_id);
CREATE INDEX idx_vehicles_license_plate ON tenant_template.vehicles(license_plate);
CREATE INDEX idx_gate_passes_vehicle_id ON tenant_template.gate_passes(vehicle_id);
CREATE INDEX idx_gate_passes_status ON tenant_template.gate_passes(status);
CREATE INDEX idx_guests_household_id ON tenant_template.guests(household_id);
CREATE INDEX idx_guests_status ON tenant_template.guests(status);
CREATE INDEX idx_construction_permits_household_id ON tenant_template.construction_permits(household_id);
CREATE INDEX idx_construction_permits_status ON tenant_template.construction_permits(status);
CREATE INDEX idx_announcements_target_audience ON tenant_template.announcements(target_audience);
CREATE INDEX idx_announcements_is_published ON tenant_template.announcements(is_published);
CREATE INDEX idx_elections_status ON tenant_template.elections(status);

-- Function to create tenant schema
CREATE OR REPLACE FUNCTION create_tenant_schema(tenant_uuid UUID)
RETURNS void AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := 'tenant_' || tenant_uuid::text;

    -- Create tenant schema
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || schema_name;

    -- Copy tables from template
    EXECUTE format('CREATE TABLE %I.users (LIKE tenant_template.users INCLUDING ALL)', schema_name);
    EXECUTE format('CREATE TABLE %I.households (LIKE tenant_template.households INCLUDING ALL)', schema_name);
    EXECUTE format('CREATE TABLE %I.residences (LIKE tenant_template.residences INCLUDING ALL)', schema_name);
    EXECUTE format('CREATE TABLE %I.vehicles (LIKE tenant_template.vehicles INCLUDING ALL)', schema_name);
    EXECUTE format('CREATE TABLE %I.gate_passes (LIKE tenant_template.gate_passes INCLUDING ALL)', schema_name);
    EXECUTE format('CREATE TABLE %I.guests (LIKE tenant_template.guests INCLUDING ALL)', schema_name);
    EXECUTE format('CREATE TABLE %I.construction_permits (LIKE tenant_template.construction_permits INCLUDING ALL)', schema_name);
    EXECUTE format('CREATE TABLE %I.announcements (LIKE tenant_template.announcements INCLUDING ALL)', schema_name);
    EXECUTE format('CREATE TABLE %I.elections (LIKE tenant_template.elections INCLUDING ALL)', schema_name);

    -- Create indexes
    EXECUTE format('CREATE INDEX idx_%I_users_email ON %I.users(email)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX idx_%I_users_role ON %I.users(role)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX idx_%I_households_head_user_id ON %I.households(head_user_id)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX idx_%I_residences_household_id ON %I.residences(household_id)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX idx_%I_vehicles_household_id ON %I.vehicles(household_id)', schema_name, schema_name);
    EXECUTE format('CREATE INDEX idx_%I_vehicles_license_plate ON %I.vehicles(license_plate)', schema_name, schema_name);

END;
$$ LANGUAGE plpgsql;

-- Function to drop tenant schema
CREATE OR REPLACE FUNCTION drop_tenant_schema(tenant_uuid UUID)
RETURNS void AS $$
DECLARE
    schema_name TEXT;
BEGIN
    schema_name := 'tenant_' || tenant_uuid::text;
    EXECUTE 'DROP SCHEMA IF EXISTS ' || schema_name || ' CASCADE';

    -- Remove tenant from shared table
    DELETE FROM shared.tenants WHERE id = tenant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create audit log table
CREATE TABLE shared.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES shared.tenants(id),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_tenant_id ON shared.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON shared.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON shared.audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON shared.audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON shared.audit_logs(created_at);

-- Enable Row Level Security
ALTER TABLE shared.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.audit_logs ENABLE ROW LEVEL SECURITY;