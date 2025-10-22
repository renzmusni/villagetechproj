-- Initialize PostgreSQL database for HOA Platform Demo

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS shared;
CREATE SCHEMA IF NOT EXISTS demo_tenant;

-- Create tenant table
CREATE TABLE shared.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    contact_email VARCHAR(255),
    head_user_id UUID,
    is_active BOOLEAN DEFAULT TRUE,
    max_households INTEGER DEFAULT 1000,
    max_users INTEGER DEFAULT 5000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table
CREATE TABLE demo_tenant.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL DEFAULT 'resident',
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    tenant_id UUID REFERENCES shared.tenants(id),
    household_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create households table
CREATE TABLE demo_tenant.households (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    unit_number VARCHAR(50),
    type VARCHAR(50) DEFAULT 'owned',
    square_footage INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    head_user_id UUID REFERENCES demo_tenant.users(id),
    is_active BOOLEAN DEFAULT TRUE,
    tenant_id UUID REFERENCES shared.tenants(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicles table
CREATE TABLE demo_tenant.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES demo_tenant.households(id),
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50) NOT NULL,
    license_plate VARCHAR(20) NOT NULL,
    state VARCHAR(50) NOT NULL,
    vin VARCHAR(50),
    registration_expiry DATE,
    insurance_expiry DATE,
    vehicle_type VARCHAR(50) DEFAULT 'car',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gate passes table
CREATE TABLE demo_tenant.gate_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES demo_tenant.vehicles(id),
    pass_type VARCHAR(50) NOT NULL DEFAULT 'temporary',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    qr_code TEXT,
    approved_by UUID REFERENCES demo_tenant.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create guests table
CREATE TABLE demo_tenant.guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES demo_tenant.households(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),
    expected_arrival TIMESTAMP WITH TIME ZONE NOT NULL,
    expected_departure TIMESTAMP WITH TIME ZONE NOT NULL,
    purpose TEXT,
    status VARCHAR(50) DEFAULT 'registered',
    gate_pass_id UUID REFERENCES demo_tenant.gate_passes(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE demo_tenant.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    target_audience VARCHAR(50) DEFAULT 'all',
    priority VARCHAR(20) DEFAULT 'medium',
    is_published BOOLEAN DEFAULT FALSE,
    publish_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expire_at TIMESTAMP WITH TIME ZONE,
    allow_comments BOOLEAN DEFAULT TRUE,
    author_id UUID REFERENCES demo_tenant.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE demo_tenant.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES demo_tenant.users(id),
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    channel VARCHAR(50) DEFAULT 'in_app',
    status VARCHAR(50) DEFAULT 'pending',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments table
CREATE TABLE demo_tenant.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    household_id UUID REFERENCES demo_tenant.households(id),
    user_id UUID REFERENCES demo_tenant.users(id),
    type VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'pending',
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    gateway VARCHAR(50),
    gateway_transaction_id VARCHAR(255),
    description TEXT,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert demo tenant
INSERT INTO shared.tenants (name, address, contact_email) VALUES
('Demo Community', '123 Main St, Demo City, DC 12345', 'admin@demo.com');

-- Insert demo users with passwords (password: 'demo123')
INSERT INTO demo_tenant.users (email, password_hash, first_name, last_name, role, tenant_id) VALUES
('admin@demo.com', '$2b$10$rQZ8kHWKtGY5uKx4v2Eq7O7WJJjNgNhYgXjBkK3YdEqBvR2Qjz3eC', 'Admin', 'User', 'tenant_admin', (SELECT id FROM shared.tenants WHERE name = 'Demo Community')),
('resident@demo.com', '$2b$10$rQZ8kHWKtGY5uKx4v2Eq7O7WJJjNgNhYgXjBkK3YdEqBvR2Qjz3eC', 'Resident', 'User', 'resident', (SELECT id FROM shared.tenants WHERE name = 'Demo Community'));

-- Insert demo household
INSERT INTO demo_tenant.households (name, address, head_user_id, tenant_id) VALUES
('Resident Household', '456 Oak Ave, Apt 7B, Demo City, DC 12345',
 (SELECT id FROM demo_tenant.users WHERE email = 'resident@demo.com'),
 (SELECT id FROM shared.tenants WHERE name = 'Demo Community'));

-- Update resident with household
UPDATE demo_tenant.users SET household_id = (SELECT id FROM demo_tenant.households WHERE name = 'Resident Household') WHERE email = 'resident@demo.com';

-- Insert demo vehicle
INSERT INTO demo_tenant.vehicles (household_id, make, model, year, color, license_plate, state) VALUES
((SELECT id FROM demo_tenant.households WHERE name = 'Resident Household'), 'Toyota', 'Camry', 2022, 'Blue', 'DEMO-123', 'DC');

-- Insert demo announcement
INSERT INTO demo_tenant.announcements (title, content, author_id, is_published) VALUES
('Welcome to Demo Community!', 'This is a demo announcement for the HOA Community Platform.',
 (SELECT id FROM demo_tenant.users WHERE email = 'admin@demo.com'), TRUE);

-- Insert demo payment
INSERT INTO demo_tenant.payments (household_id, user_id, type, amount, due_date, description) VALUES
((SELECT id FROM demo_tenant.households WHERE name = 'Resident Household'),
 (SELECT id FROM demo_tenant.users WHERE email = 'resident@demo.com'),
 'hoa_dues', 150.00, CURRENT_DATE + INTERVAL '1 month', 'Monthly HOA dues');

-- Create indexes for performance
CREATE INDEX idx_users_email ON demo_tenant.users(email);
CREATE INDEX idx_users_tenant ON demo_tenant.users(tenant_id);
CREATE INDEX idx_users_household ON demo_tenant.users(household_id);
CREATE INDEX idx_households_tenant ON demo_tenant.households(tenant_id);
CREATE INDEX idx_vehicles_household ON demo_tenant.vehicles(household_id);
CREATE INDEX idx_gate_passes_vehicle ON demo_tenant.gate_passes(vehicle_id);
CREATE INDEX idx_guests_household ON demo_tenant.guests(household_id);
CREATE INDEX idx_announcements_published ON demo_tenant.announcements(is_published, publish_at);
CREATE INDEX idx_notifications_user ON demo_tenant.notifications(user_id, status);
CREATE INDEX idx_payments_household ON demo_tenant.payments(household_id, status);