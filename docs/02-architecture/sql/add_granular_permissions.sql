-- Granular Permissions Setup for User Management
-- This script verifies and sets up the permissions table for the User Management UI
-- Assumes permissions table already exists with RLS policies
-- ================================
-- STEP 1: Verify permissions table exists
-- ================================
-- This table should already exist from your earlier setup
-- If it doesn't exist, run the setup from docs/02-architecture/auth-and-rbac/granular-permissions-supabase.md first
-- Verify table exists (this will error if table doesn't exist - that's expected)
SELECT EXISTS (
        SELECT
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'permissions'
    ) AS permissions_table_exists;
-- ================================
-- STEP 2: Ensure all users have a permissions row
-- ================================
-- Create a permissions row for every user that doesn't have one
INSERT INTO public.permissions (user_id)
SELECT id
FROM auth.users u
WHERE NOT EXISTS (
        SELECT 1
        FROM public.permissions p
        WHERE p.user_id = u.id
    ) ON CONFLICT (user_id) DO NOTHING;
-- ================================
-- STEP 3: Backfill permissions based on existing roles (optional)
-- ================================
-- If you want to set permissions based on existing roles in profiles table:
-- Admin users get all access to everything
UPDATE public.permissions p
SET shipment_can_view = true,
    shipment_can_write = true,
    shipment_can_delete = true,
    trucking_can_view = true,
    trucking_can_write = true,
    trucking_can_delete = true,
    finance_can_view = true,
    finance_can_write = true,
    finance_can_delete = true,
    updated_at = now()
FROM public.profiles pr
WHERE pr.id = p.user_id
    AND 'admin' = ANY(pr.roles);
-- Verifier users get shipment access (view + write, no delete by default)
UPDATE public.permissions p
SET shipment_can_view = true,
    shipment_can_write = true,
    shipment_can_delete = false,
    updated_at = now()
FROM public.profiles pr
WHERE pr.id = p.user_id
    AND 'verifier' = ANY(pr.roles)
    AND NOT 'admin' = ANY(pr.roles);
-- Shipment role users get shipment access (view + write + delete)
UPDATE public.permissions p
SET shipment_can_view = true,
    shipment_can_write = true,
    shipment_can_delete = true,
    updated_at = now()
FROM public.profiles pr
WHERE pr.id = p.user_id
    AND 'shipment' = ANY(pr.roles)
    AND NOT 'admin' = ANY(pr.roles);
-- Trucking role users get trucking access (view + write + delete)
UPDATE public.permissions p
SET trucking_can_view = true,
    trucking_can_write = true,
    trucking_can_delete = true,
    updated_at = now()
FROM public.profiles pr
WHERE pr.id = p.user_id
    AND 'trucking' = ANY(pr.roles)
    AND NOT 'admin' = ANY(pr.roles);
-- Finance role users get finance access (view + write + delete)
UPDATE public.permissions p
SET finance_can_view = true,
    finance_can_write = true,
    finance_can_delete = true,
    updated_at = now()
FROM public.profiles pr
WHERE pr.id = p.user_id
    AND 'finance' = ANY(pr.roles)
    AND NOT 'admin' = ANY(pr.roles);
-- Viewer role users get view-only access to everything (no write/delete)
UPDATE public.permissions p
SET shipment_can_view = true,
    shipment_can_write = false,
    shipment_can_delete = false,
    trucking_can_view = true,
    trucking_can_write = false,
    trucking_can_delete = false,
    finance_can_view = true,
    finance_can_write = false,
    finance_can_delete = false,
    updated_at = now()
FROM public.profiles pr
WHERE pr.id = p.user_id
    AND 'viewer' = ANY(pr.roles)
    AND NOT 'admin' = ANY(pr.roles);
-- ================================
-- STEP 4: Verification queries
-- ================================
-- Check permissions table structure
SELECT column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'permissions'
    AND table_schema = 'public'
ORDER BY ordinal_position;
-- Check how many users have permissions
SELECT COUNT(*) AS total_users,
    COUNT(p.user_id) AS users_with_permissions
FROM auth.users u
    LEFT JOIN public.permissions p ON p.user_id = u.id;
-- Sample permissions data
SELECT pr.email,
    pr.full_name,
    pr.roles,
    p.shipment_can_view,
    p.shipment_can_write,
    p.shipment_can_delete,
    p.trucking_can_view,
    p.trucking_can_write,
    p.trucking_can_delete,
    p.finance_can_view,
    p.finance_can_write,
    p.finance_can_delete
FROM public.profiles pr
    LEFT JOIN public.permissions p ON p.user_id = pr.id
LIMIT 10;
-- ================================
-- NOTES
-- ================================
-- Permission Levels in UI:
-- 1. "No Access" = all flags false
-- 2. "Can View" = can_view true, can_write false, can_delete false
-- 3. "Can View, Can Upload, Can Edit" = can_view true, can_write true, can_delete false
-- 4. "All Access" = can_view true, can_write true, can_delete true
-- Shipment Approval (Verifier role):
-- - Managed via profiles.roles array (not permissions table)
-- - Add/remove 'verifier' from roles array
-- - Verifier bypasses permission checks via RLS policies
-- RLS Policies:
-- - Admin bypasses all permission checks
-- - Verifier bypasses permission checks for shipment department only
-- - Other users are governed by has_perm(department, action) function
-- - Viewer role should have view-only permissions
-- IMPORTANT: Make sure you've already run the RLS policies from:
-- docs/02-architecture/sql/create_shipment_policies.sql