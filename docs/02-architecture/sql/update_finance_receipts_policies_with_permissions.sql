-- Update ALL finance_receipts policies to use proper user permissions
-- This integrates finance receipt operations with the user management system
-- ================================
-- STEP 1: Check current policies
-- ================================
-- Check all policies on finance_receipts table
SELECT policyname,
    cmd as operation,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'finance_receipts'
ORDER BY cmd,
    policyname;
-- ================================
-- STEP 2: Drop existing policies (if they exist)
-- ================================
-- Drop all existing finance_receipts policies
-- Note: These will only drop if they exist, no error if they don't
DROP POLICY IF EXISTS finance_receipts_insert ON public.finance_receipts;
DROP POLICY IF EXISTS finance_receipts_select ON public.finance_receipts;
DROP POLICY IF EXISTS finance_receipts_update ON public.finance_receipts;
DROP POLICY IF EXISTS finance_receipts_delete ON public.finance_receipts;
-- ================================
-- STEP 3: Create permission-based policies
-- ================================
-- Policy 1: INSERT - Users can create receipts if they have finance write permission
CREATE POLICY finance_receipts_insert ON public.finance_receipts FOR
INSERT WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.permissions p
            WHERE p.user_id = auth.uid()
                AND p.finance_can_write = true
        )
    );
-- Policy 2: SELECT - Users can view receipts if they have finance view permission
CREATE POLICY finance_receipts_select ON public.finance_receipts FOR
SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.permissions p
            WHERE p.user_id = auth.uid()
                AND p.finance_can_view = true
        )
    );
-- Policy 3: UPDATE - Users can edit receipts if they have finance write permission
CREATE POLICY finance_receipts_update ON public.finance_receipts FOR
UPDATE USING (
        EXISTS (
            SELECT 1
            FROM public.permissions p
            WHERE p.user_id = auth.uid()
                AND p.finance_can_write = true
        )
    );
-- Policy 4: DELETE - Users can delete receipts if they have finance delete permission
CREATE POLICY finance_receipts_delete ON public.finance_receipts FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.permissions p
        WHERE p.user_id = auth.uid()
            AND p.finance_can_delete = true
    )
);
-- ================================
-- STEP 4: Verify the policies were created
-- ================================
-- Check all policies on finance_receipts table (should now include all operations with permissions)
SELECT policyname,
    cmd as operation,
    CASE
        WHEN cmd = 'INSERT' THEN 'Can create receipts (finance_can_write)'
        WHEN cmd = 'SELECT' THEN 'Can view receipts (finance_can_view)'
        WHEN cmd = 'UPDATE' THEN 'Can edit receipts (finance_can_write)'
        WHEN cmd = 'DELETE' THEN 'Can delete receipts (finance_can_delete)'
        ELSE 'Other operation'
    END as description
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'finance_receipts'
ORDER BY cmd,
    policyname;
-- ================================
-- STEP 5: Test the policies
-- ================================
-- Test if all operations now work with proper permissions
SELECT 'Finance policies test' as test_name,
    EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'finance_receipts'
            AND cmd = 'INSERT'
    ) as insert_policy_exists,
    EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'finance_receipts'
            AND cmd = 'SELECT'
    ) as select_policy_exists,
    EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'finance_receipts'
            AND cmd = 'UPDATE'
    ) as update_policy_exists,
    EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'finance_receipts'
            AND cmd = 'DELETE'
    ) as delete_policy_exists;
-- ================================
-- STEP 6: Check current user's finance permissions
-- ================================
-- Check your current user's finance permissions
SELECT p.email,
    p.roles,
    perm.finance_can_view,
    perm.finance_can_write,
    perm.finance_can_delete
FROM public.profiles p
    LEFT JOIN public.permissions perm ON perm.user_id = p.id
WHERE p.id = auth.uid();
-- ================================
-- NOTES
-- ================================
-- Policy Logic:
-- - finance_receipts_insert: Only users with finance_can_write = true can create receipts
-- - finance_receipts_select: Only users with finance_can_view = true can view receipts
-- - finance_receipts_update: Only users with finance_can_write = true can edit receipts
-- - finance_receipts_delete: Only users with finance_can_delete = true can delete receipts
--
-- This integrates with the user management system in CreateUserModal.js:
-- Permission Levels (from CreateUserModal.js):
-- - no_access: finance_can_view = false, finance_can_write = false, finance_can_delete = false
-- - can_view: finance_can_view = true, finance_can_write = false, finance_can_delete = false
-- - can_edit: finance_can_view = true, finance_can_write = true, finance_can_delete = false
-- - all_access: finance_can_view = true, finance_can_write = true, finance_can_delete = true
--
-- After running this script:
-- 1. Only users with appropriate finance permissions can perform operations
-- 2. Users with "No Access" cannot see or interact with receipts
-- 3. Users with "Can View" can only see receipts
-- 4. Users with "Can Edit" can view, create, and edit receipts but cannot delete
-- 5. Users with "All Access" can perform all operations including deletion
-- 6. The action logging will continue to work as expected
-- 7. Unauthorized users will get permission errors when trying to perform restricted operations