-- Minimal HOA Database Setup - Run This First!

-- Create Communities Table
CREATE TABLE IF NOT EXISTS communities (
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

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
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
CREATE TABLE IF NOT EXISTS announcements (
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

-- Insert default community
INSERT INTO communities (id, name, address, description, admin_contact, total_units, occupied_units) VALUES
('00000000-0000-0000-0000-000000000001', 'Sunny Meadows Community', '123 Sunshine Boulevard, Pleasantville', 'A beautiful residential community with modern amenities', 'admin@sunnymeadows.com', 150, 142)
ON CONFLICT (id) DO NOTHING;

-- Insert default users (password: demo123 for all users)
INSERT INTO users (id, email, password, role, first_name, last_name, tenant_id, is_active) VALUES
('00000000-0000-0000-0000-000000000001', 'superadmin@demo.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'superadmin', 'Super', 'Admin', NULL, true),
('00000000-0000-0000-0000-000000000002', 'maria.garcia@sunnymeadows.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'admin_head', 'Maria', 'Garcia', '00000000-0000-0000-0000-000000000001', true),
('00000000-0000-0000-0000-000000000003', 'emily.chen@residence.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'household_head', 'Emily', 'Chen', '00000000-0000-0000-0000-000000000001', true),
('00000000-0000-0000-0000-000000000004', 'resident@demo.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'household_member', 'John', 'Smith', '00000000-0000-0000-0000-000000000001', true),
('00000000-0000-0000-0000-000000000005', 'security@sunnymeadows.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'security_head', 'David', 'Wilson', '00000000-0000-0000-0000-000000000001', true),
('00000000-0000-0000-0000-000000000006', 'security.officer@demo.com', '$2b$10$vcG3h.RydzmwS6fDeDC4D.uU96uoJ.iUlVJZd5OsWaYjk6r2MnTWi', 'security_officer', 'James', 'Taylor', '00000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample announcements
INSERT INTO announcements (title, content, priority, published, author_id, tenant_id) VALUES
('Welcome to Sunny Meadows Community', 'We are excited to have you as part of our community. This platform will help you manage all your residential needs.', 'high', true, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
('Security Update: New Access Cards', 'All residents will receive new access cards by next week. Please update your information at the security office.', 'urgent', true, '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001'),
('Community Meeting This Saturday', 'Join us for our monthly community meeting to discuss upcoming projects and improvements.', 'normal', true, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;