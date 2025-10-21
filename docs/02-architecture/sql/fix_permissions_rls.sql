-- Fix RLS Policies for Permissions Table
-- Run this if you're getting 403 errors when updating permissions
-- ================================
-- STEP 1: Verify your admin user
-- ================================
-- Check if your current user has admin role
SELECT id,
    email,
    roles,
    'admin' = ANY(roles) as is_admin
FROM public.profiles
WHERE id = auth.uid();
-- ================================
-- STEP 2: Check existing RLS policies on permissions table
-- ================================
-- List all policies on permissions table
SELECT schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'permissions'
ORDER BY policyname;
-- ================================
-- STEP 3: Drop and recreate RLS policies
-- ================================
-- Drop existing policies
DROP POLICY IF EXISTS permissions_select_own ON public.permissions;
DROP POLICY IF EXISTS permissions_admin_insert ON public.permissions;
DROP POLICY IF EXISTS permissions_admin_update ON public.permissions;
DROP POLICY IF EXISTS permissions_admin_delete ON public.permissions;
-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
-- Policy 1: Users can SELECT only their own row
CREATE POLICY permissions_select_own ON public.permissions FOR
SELECT TO authenticated USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND 'admin' = ANY(profiles.roles)
        )
    );
-- Policy 2: Admin can INSERT any permissions row
CREATE POLICY permissions_admin_insert ON public.permissions FOR
INSERT TO authenticated WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND 'admin' = ANY(profiles.roles)
        )
    );
-- Policy 3: Admin can UPDATE any permissions row
CREATE POLICY permissions_admin_update ON public.permissions FOR
UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND 'admin' = ANY(profiles.roles)
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND 'admin' = ANY(profiles.roles)
        )
    );
-- Policy 4: Admin can DELETE any permissions row
CREATE POLICY permissions_admin_delete ON public.permissions FOR DELETE TO authenticated USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE profiles.id = auth.uid()
            AND 'admin' = ANY(profiles.roles)
    )
);
-- ================================
-- STEP 4: Verify policies were created
-- ================================
SELECT policyname,
    cmd as operation,
    CASE
        WHEN policyname LIKE '%admin%' THEN 'Admin only'
        WHEN policyname LIKE '%own%' THEN 'Own records + Admin'
        ELSE 'Other'
    END as description
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'permissions'
ORDER BY cmd,
    policyname;
-- ================================
-- STEP 5: Test the policies
-- ================================
-- Try to select from permissions (should work for admin)
SELECT COUNT(*) as total_permission_rows
FROM public.permissions;
-- Try to update a test permission (replace user_id with actual ID)
-- UPDATE public.permissions 
-- SET shipment_can_view = true
-- WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- ================================
-- TROUBLESHOOTING
-- ================================
-- If still getting 403 errors:
-- 1. Verify you're logged in as admin:
SELECT auth.uid() as current_user_id,
    p.email,
    p.roles,
    'admin' = ANY(p.roles) as has_admin_role
FROM public.profiles p
WHERE p.id = auth.uid();
-- 2. Check if profiles table has RLS enabled (it should)
SELECT tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'permissions');
-- 3. Make sure your user's roles array actually contains 'admin'
-- If not, add it manually:
-- UPDATE public.profiles 
-- SET roles = array_append(roles, 'admin')
-- WHERE email = 'your-admin-email@example.com';
-- ================================
-- NOTES
-- ================================
-- The RLS policies use this pattern:
-- EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
-- This means:
-- 1. Get the current authenticated user's ID via auth.uid()
-- 2. Look up that user in the profiles table
-- 3. Check if 'admin' is in their roles array
-- 4. If yes, allow the operation
-- Common issues:
-- - User doesn't have 'admin' in roles array
-- - Profiles table has RLS that blocks the lookup
-- - auth.uid() is null (user not authenticated)