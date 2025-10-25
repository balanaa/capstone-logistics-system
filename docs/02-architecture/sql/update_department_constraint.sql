-- Update Database Constraint to Allow Multiple Departments
-- This script updates the documents table constraint to allow both 'shipment' and 'trucking' departments
-- Run this in Supabase SQL Editor
-- Step 1: Drop the existing constraint
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_department_check;
-- Step 2: Add the new constraint that allows both departments
ALTER TABLE public.documents
ADD CONSTRAINT documents_department_check CHECK (department IN ('shipment', 'trucking'));
-- Step 3: Verify the constraint was updated
SELECT conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.documents'::regclass
    AND conname = 'documents_department_check';
-- Step 4: Test the constraint by checking existing data
SELECT department,
    document_type,
    COUNT(*) as count
FROM public.documents
GROUP BY department,
    document_type
ORDER BY department,
    document_type;
-- Step 5: Verify we can now insert trucking department documents
-- (This is just a test - don't actually insert unless needed)
-- INSERT INTO public.documents (pro_number, department, document_type, file_path, uploaded_by)
-- VALUES ('1234567', 'trucking', 'delivery_order', 'test/path', '00000000-0000-0000-0000-000000000000');
-- Success message
SELECT 'Database constraint updated successfully! Documents table now supports both shipment and trucking departments.' as status;