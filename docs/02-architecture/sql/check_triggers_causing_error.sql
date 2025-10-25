-- Check for triggers on pro table that might be causing the actions_log error
-- Run this in your database to see if there are any triggers
-- 1. Check for triggers on pro table
SELECT trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'pro';
-- 2. Check for triggers on actions_log table
SELECT trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'actions_log';
-- 3. Check if there are any functions that might be inserting into actions_log
SELECT routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_definition LIKE '%actions_log%'
    OR routine_definition LIKE '%insert%actions_log%';
-- 4. Check the current structure of both tables
SELECT 'pro table structure:' as info;
SELECT column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'pro'
ORDER BY ordinal_position;
SELECT 'actions_log table structure:' as info;
SELECT column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'actions_log'
ORDER BY ordinal_position;
-- 5. If there's a trigger causing this, you might need to disable it temporarily
-- DISABLE TRIGGER trigger_name ON pro;
-- Or drop it if it's not needed:
-- DROP TRIGGER IF EXISTS trigger_name ON pro;