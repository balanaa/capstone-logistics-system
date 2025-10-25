-- Add Missing SELECT Policies for pro Table
-- This fixes the issue where department users can't see PRO records
-- Run this after add_granular_permissions.sql
-- ================================
-- STEP 1: Verify pro table has RLS enabled
-- ================================
-- Check if RLS is enabled on pro table
SELECT tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'pro';
-- ================================
-- STEP 2: Drop existing policies (if any)
-- ================================
-- Drop any existing SELECT policies on pro table
DROP POLICY IF EXISTS pro_admin_select ON public.pro;
DROP POLICY IF EXISTS pro_verifier_select ON public.pro;
DROP POLICY IF EXISTS pro_department_select ON public.pro;
-- ================================
-- STEP 3: Create SELECT policies for pro table
-- ================================
-- Policy 1: Admin can see all PROs
CREATE POLICY pro_admin_select ON public.pro FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
                AND 'admin' = ANY(p.roles)
        )
    );
-- Policy 2: Verifier can see all PROs (shipment-related)
CREATE POLICY pro_verifier_select ON public.pro FOR
SELECT TO authenticated USING (
        EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = auth.uid()
                AND 'verifier' = ANY(p.roles)
        )
    );
-- Policy 3: Department users can see PROs if they have view permission for ANY department
-- (Since a PRO can have documents from multiple departments)
CREATE POLICY pro_department_select ON public.pro FOR
SELECT TO authenticated USING (
        has_perm('shipment', 'view')
        OR has_perm('trucking', 'view')
        OR has_perm('finance', 'view')
    );
-- ================================
-- STEP 4: Verify policies were created
-- ================================
-- Check all policies on pro table
SELECT policyname,
    cmd as operation,
    CASE
        WHEN policyname LIKE '%admin%' THEN 'Admin only'
        WHEN policyname LIKE '%verifier%' THEN 'Verifier only'
        WHEN policyname LIKE '%department%' THEN 'Department users'
        ELSE 'Other'
    END as description
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'pro'
ORDER BY cmd,
    policyname;
-- ================================
-- STEP 5: Test the policies
-- ================================
-- Test 1: Check if you can select from pro table (should work for admin)
SELECT COUNT(*) as total_pros
FROM public.pro;
-- Test 2: Check if has_perm function works
SELECT has_perm('shipment', 'view') as shipment_view,
    has_perm('trucking', 'view') as trucking_view,
    has_perm('finance', 'view') as finance_view;
-- Test 3: Check your current user's roles and permissions
SELECT p.email,
    p.roles,
    perm.shipment_can_view,
    perm.trucking_can_view,
    perm.finance_can_view
FROM public.profiles p
    LEFT JOIN public.permissions perm ON perm.user_id = p.id
WHERE p.id = auth.uid();
-- ================================
-- STEP 6: Verify the fix works
-- ================================
-- This query should now work for department users
-- (Replace 'PRO001' with an actual PRO number from your database)
-- SELECT pro_number, created_at, status 
-- FROM public.pro 
-- WHERE pro_number = 'PRO001';
-- ================================
-- NOTES
-- ================================
-- Policy Logic:
-- 1. Admin: Can see all PROs (bypasses all restrictions)
-- 2. Verifier: Can see all PROs (shipment-related access)
-- 3. Department users: Can see PROs if they have view permission for ANY department
--    - This is because a PRO can have documents from multiple departments
--    - If user has shipment view permission, they can see PROs with shipment docs
--    - If user has trucking view permission, they can see PROs with trucking docs
--    - etc.
--
-- The has_perm() function checks the permissions table flags:
-- - has_perm('shipment', 'view') checks shipment_can_view flag
-- - has_perm('trucking', 'view') checks trucking_can_view flag  
-- - has_perm('finance', 'view') checks finance_can_view flag
--
-- After running this script:
-- 1. Users with shipment role should see PROs with shipment documents
-- 2. Users with trucking role should see PROs with trucking documents
-- 3. Users with finance role should see PROs with finance documents
-- 4. Admin and verifier should see all PROs
-- 5. UserManagement.js can be used to fine-tune individual permissions