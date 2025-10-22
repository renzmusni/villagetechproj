-- Fix Supabase Database - Drop and Recreate Tables
-- This will handle the existing users table issue

-- First, let's see what tables exist and handle conflicts
-- WARNING: This will drop existing tables and recreate them

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS guests CASCADE;
DROP TABLE IF EXISTS gate_passes CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS households CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS communities CASCADE;

-- Create Communities Table
CREATE TABLE communities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    description TEXT,
    admin_contact VARCHAR(255),
    total_units INTEGER DEFAULT 0,
    occupied_units INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Users Table (with correct structure)
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    tenant_id UUID REFERENCES communities(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Announcements Table
CREATE TABLE announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    published BOOLEAN DEFAULT false,
    author_id UUID REFERENCES users(id),
    tenant_id UUID REFERENCES communities(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Households Table
CREATE TABLE households (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tenant_id UUID REFERENCES communities(id),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Vehicles Table
CREATE TABLE vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    household_id UUID REFERENCES households(id),
    registration_expiry DATE,
    insurance_expiry DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Gate Passes Table
CREATE TABLE gate_passes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_name VARCHAR(255) NOT NULL,
    purpose TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'used')),
    type VARCHAR(20) DEFAULT 'single' CHECK (type IN ('single', 'multiple', 'permanent')),
    household_id UUID REFERENCES households(id),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Guests Table
CREATE TABLE guests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(50),
    purpose TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'checked_out')),
    household_id UUID REFERENCES households(id),
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Payments Table
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    household_id UUID REFERENCES households(id),
    due_date DATE,
    paid_date DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_published ON announcements(published);
CREATE INDEX idx_announcements_tenant_id ON announcements(tenant_id);
CREATE INDEX idx_households_tenant_id ON households(tenant_id);
CREATE INDEX idx_vehicles_household_id ON vehicles(household_id);
CREATE INDEX idx_gate_passes_status ON gate_passes(status);
CREATE INDEX idx_guests_status ON guests(status);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_household_id ON payments(household_id);

-- Insert default community
INSERT INTO communities (id, name, address, description, admin_contact, total_units, occupied_units) VALUES
('00000000-0000-0000-0000-000000000001', 'Sunny Meadows Community', '123 Sunshine Boulevard, Pleasantville', 'A beautiful residential community with modern amenities', 'admin@sunnymeadows.com', 150, 142);

-- Insert default users (password: demo123 for all users)
INSERT INTO users (id, email, password, role, first_name, last_name, tenant_id, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'superadmin@demo.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'superadmin', 'Super', 'Admin', NULL, true),
('00000000-0000-0000-0000-000000000002', 'maria.garcia@sunnymeadows.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'admin_head', 'Maria', 'Garcia', '00000000-0000-0000-0000-000000000001', true),
('00000000-0000-0000-0000-000000000003', 'emily.chen@residence.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'household_head', 'Emily', 'Chen', '00000000-0000-0000-0000-000000000001', true),
('00000000-0000-0000-0000-000000000004', 'resident@demo.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'household_member', 'John', 'Smith', '00000000-0000-0000-0000-000000000001', true),
('00000000-0000-0000-0000-000000000005', 'security@sunnymeadows.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'security_head', 'David', 'Wilson', '00000000-0000-0000-0000-000000000001', true),
('00000000-0000-0000-0000-000000000006', 'security.officer@demo.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'security_officer', 'James', 'Taylor', '00000000-0000-0000-0000-000000000001', true);

-- Insert sample announcements
INSERT INTO announcements (title, content, priority, published, author_id, tenant_id) VALUES
('Welcome to Sunny Meadows Community', 'We are excited to have you as part of our community. This platform will help you manage all your residential needs.', 'high', true, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
('Security Update: New Access Cards', 'All residents will receive new access cards by next week. Please update your information at the security office.', 'urgent', true, '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001'),
('Community Meeting This Saturday', 'Join us for our monthly community meeting to discuss upcoming projects and improvements.', 'normal', true, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
('Pool Maintenance Notice', 'The community pool will be closed for maintenance from Monday to Wednesday next week.', 'low', true, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001');

-- Insert sample households
INSERT INTO households (name, tenant_id, address) VALUES
('Chen Family', '00000000-0000-0000-0000-000000000001', 'Unit 101, Building A'),
('Smith Family', '00000000-0000-0000-0000-000000000001', 'Unit 102, Building A'),
('Wilson Residence', '00000000-0000-0000-0000-000000000001', 'Unit 201, Building B');

-- Insert sample vehicles
INSERT INTO vehicles (make, model, plate_number, household_id, registration_expiry, insurance_expiry) VALUES
('Toyota', 'Camry', 'DEMO-123', (SELECT id FROM households WHERE name = 'Chen Family'), '2024-12-31', '2024-11-30'),
('Honda', 'Civic', 'ABC-456', (SELECT id FROM households WHERE name = 'Smith Family'), '2024-10-15', '2024-09-30'),
('Tesla', 'Model 3', 'EV-789', (SELECT id FROM households WHERE name = 'Wilson Residence'), '2025-01-31', '2024-12-15');