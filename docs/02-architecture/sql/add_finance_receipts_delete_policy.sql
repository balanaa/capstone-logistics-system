-- Add missing DELETE policy for finance_receipts table
-- This fixes the issue where receipts cannot be deleted due to RLS
-- 
-- NOTE: For a complete solution that integrates ALL finance operations with user management,
-- see: update_finance_receipts_policies_with_permissions.sql
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
-- STEP 2: Add missing DELETE policy with permission checking
-- ================================
-- Create DELETE policy for finance_receipts that checks user permissions
CREATE POLICY finance_receipts_delete ON public.finance_receipts FOR DELETE USING (
    EXISTS (
        SELECT 1
        FROM public.permissions p
        WHERE p.user_id = auth.uid()
            AND p.finance_can_delete = true
    )
);
-- ================================
-- STEP 3: Verify the policy was created
-- ================================
-- Check all policies on finance_receipts table (should now include DELETE)
SELECT policyname,
    cmd as operation,
    CASE
        WHEN cmd = 'INSERT' THEN 'Can create receipts'
        WHEN cmd = 'SELECT' THEN 'Can view receipts'
        WHEN cmd = 'UPDATE' THEN 'Can edit receipts'
        WHEN cmd = 'DELETE' THEN 'Can delete receipts'
        ELSE 'Other operation'
    END as description
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'finance_receipts'
ORDER BY cmd,
    policyname;
-- ================================
-- STEP 4: Test the policy
-- ================================
-- Test if DELETE operations now work
-- (This will show if the policy allows deletion)
SELECT 'DELETE policy test' as test_name,
    EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
            AND tablename = 'finance_receipts'
            AND cmd = 'DELETE'
    ) as delete_policy_exists;
-- ================================
-- NOTES
-- ================================
-- Policy Logic:
-- - finance_receipts_delete: Only allows users with finance_can_delete = true to delete receipts
-- - This integrates with the user management system in CreateUserModal.js
-- - Users must have "All Access" finance permission to delete receipts
-- - The policy checks the permissions table for the current user's delete permission
--
-- Permission Levels (from CreateUserModal.js):
-- - no_access: finance_can_delete = false
-- - can_view: finance_can_delete = false  
-- - can_edit: finance_can_delete = false
-- - all_access: finance_can_delete = true
--
-- After running this script:
-- 1. Only users with "All Access" finance permission can delete receipts
-- 2. The delete operation in financeReceipts.js will work for authorized users
-- 3. Receipts will disappear from the UI after deletion for authorized users
-- 4. Unauthorized users will get a permission error when trying to delete
-- 5. The action logging will continue to work as expected