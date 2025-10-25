-- Check and fix actions_log table to handle pro table structure
-- This script will help you understand the current structure and provide options
-- 1. Check the current structure of actions_log table
SELECT column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'actions_log'
ORDER BY ordinal_position;
-- 2. Check the current structure of pro table
SELECT column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pro'
ORDER BY ordinal_position;
-- 3. Check if pro table has a primary key
SELECT tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    kcu.data_type
FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'pro'
    AND tc.constraint_type = 'PRIMARY KEY';
-- OPTION 1: If actions_log.target_id is UUID and pro table uses pro_number as primary key
-- You can either:
-- A) Change actions_log.target_id to TEXT to accept pro_number
-- B) Add an id column to pro table
-- OPTION A: Change actions_log.target_id to TEXT (if you want to keep pro_number as primary key)
-- ALTER TABLE public.actions_log ALTER COLUMN target_id TYPE TEXT;
-- OPTION B: Add an id column to pro table (if you want to keep UUID in actions_log)
-- ALTER TABLE public.pro ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
-- 4. Check current data in actions_log to see what target_id values look like
SELECT DISTINCT target_type,
    target_id,
    COUNT(*) as count
FROM public.actions_log
GROUP BY target_type,
    target_id
ORDER BY target_type,
    count DESC;
-- 5. Check if there are any existing trucking status updates
SELECT *
FROM public.actions_log
WHERE action LIKE '%trucking%'
ORDER BY created_at DESC
LIMIT 10;