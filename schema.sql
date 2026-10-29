-- ============================================================================
-- K12 Hunar EdTech CRM & Inquiry System Database Schema
-- Target Database: Supabase PostgreSQL
-- Client: node-postgres (pg)
-- ============================================================================

-- Enable pgcrypto extension for UUID generation if not already active
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------------
-- 1. Admins Table
-- Stores credentials for administrative staff with bcrypt password hashing
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Index on email for fast authentication lookups
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins (email);

-- ----------------------------------------------------------------------------
-- 2. Inquiries Table
-- Stores inquiries submitted by Parents, Students, and Schools
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(25) NOT NULL,
    user_type VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'New',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints to enforce domain integrity
    CONSTRAINT chk_inquiries_user_type CHECK (user_type IN ('Parent', 'Student', 'School')),
    CONSTRAINT chk_inquiries_category CHECK (category IN ('Scholarship', 'Concert', 'Admission', 'General Query')),
    CONSTRAINT chk_inquiries_status CHECK (status IN ('New', 'In Progress', 'Resolved', 'Rejected'))
);

-- Performance indexes for dashboard filtering and search queries
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries (status);
CREATE INDEX IF NOT EXISTS idx_inquiries_category ON inquiries (category);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_type ON inquiries (user_type);
CREATE INDEX IF NOT EXISTS idx_inquiries_phone ON inquiries (phone);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries (email);
CREATE INDEX IF NOT EXISTS idx_inquiries_name_trgm ON inquiries USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_inquiries_phone_trgm ON inquiries USING GIN (phone gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 3. Automatic updated_at Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admins_updated_at ON admins;
CREATE TRIGGER trg_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_inquiries_updated_at ON inquiries;
CREATE TRIGGER trg_inquiries_updated_at
    BEFORE UPDATE ON inquiries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
