-- Add Completion Timestamps to pro table for Bottleneck Analysis
-- These columns enable tracking time spent in each department
-- Run this in Supabase SQL Editor when ready to enable full bottleneck analytics
-- Add timestamp columns
ALTER TABLE public.pro
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS trucking_completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS finance_completed_at TIMESTAMP;
-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pro_status_updated_at ON public.pro(status_updated_at);
CREATE INDEX IF NOT EXISTS idx_pro_trucking_completed_at ON public.pro(trucking_completed_at);
CREATE INDEX IF NOT EXISTS idx_pro_finance_completed_at ON public.pro(finance_completed_at);
-- Add comments to document the columns
COMMENT ON COLUMN public.pro.status_updated_at IS 'Timestamp when shipment status changed to completed';
COMMENT ON COLUMN public.pro.trucking_completed_at IS 'Timestamp when trucking status changed to completed';
COMMENT ON COLUMN public.pro.finance_completed_at IS 'Timestamp when finance status changed to Paid';
-- ============================================
-- AUTOMATIC TIMESTAMP UPDATES via TRIGGERS
-- ============================================
-- Trigger 1: Update status_updated_at when shipment status becomes 'completed'
CREATE OR REPLACE FUNCTION update_status_completed_timestamp() RETURNS TRIGGER AS $$ BEGIN -- Only update if status changes to 'completed' and timestamp is null
    IF NEW.status = 'completed'
    AND (
        OLD.status IS NULL
        OR OLD.status != 'completed'
    )
    AND NEW.status_updated_at IS NULL THEN NEW.status_updated_at := now();
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_status_completed_timestamp_trigger ON public.pro;
CREATE TRIGGER update_status_completed_timestamp_trigger BEFORE
UPDATE ON public.pro FOR EACH ROW EXECUTE FUNCTION update_status_completed_timestamp();
-- Trigger 2: Update trucking_completed_at when trucking status becomes 'completed'
CREATE OR REPLACE FUNCTION update_trucking_completed_timestamp() RETURNS TRIGGER AS $$ BEGIN -- Only update if trucking_status changes to 'completed' and timestamp is null
    IF NEW.trucking_status = 'completed'
    AND (
        OLD.trucking_status IS NULL
        OR OLD.trucking_status != 'completed'
    )
    AND NEW.trucking_completed_at IS NULL THEN NEW.trucking_completed_at := now();
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_trucking_completed_timestamp_trigger ON public.pro;
CREATE TRIGGER update_trucking_completed_timestamp_trigger BEFORE
UPDATE ON public.pro FOR EACH ROW EXECUTE FUNCTION update_trucking_completed_timestamp();
-- Trigger 3: Update finance_completed_at when finance status becomes 'Paid'
CREATE OR REPLACE FUNCTION update_finance_completed_timestamp() RETURNS TRIGGER AS $$ BEGIN -- Only update if finance_status changes to 'Paid' and timestamp is null
    IF NEW.finance_status = 'Paid'
    AND (
        OLD.finance_status IS NULL
        OR OLD.finance_status != 'Paid'
    )
    AND NEW.finance_completed_at IS NULL THEN NEW.finance_completed_at := now();
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_finance_completed_timestamp_trigger ON public.pro;
CREATE TRIGGER update_finance_completed_timestamp_trigger BEFORE
UPDATE ON public.pro FOR EACH ROW EXECUTE FUNCTION update_finance_completed_timestamp();
-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Check that columns were added
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'pro'
    AND table_schema = 'public'
    AND column_name IN (
        'status_updated_at',
        'trucking_completed_at',
        'finance_completed_at'
    );
-- Check that indexes were created
SELECT indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'pro'
    AND schemaname = 'public'
    AND indexname IN (
        'idx_pro_status_updated_at',
        'idx_pro_trucking_completed_at',
        'idx_pro_finance_completed_at'
    );
-- Check that triggers were created
SELECT trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'pro'
    AND trigger_schema = 'public'
    AND trigger_name IN (
        'update_status_completed_timestamp_trigger',
        'update_trucking_completed_timestamp_trigger',
        'update_finance_completed_timestamp_trigger'
    );
-- Sample query to view completion timestamps
SELECT pro_number,
    status,
    trucking_status,
    finance_status,
    created_at,
    status_updated_at,
    trucking_completed_at,
    finance_completed_at,
    -- Calculate days in each department
    CASE
        WHEN status_updated_at IS NOT NULL THEN EXTRACT(
            EPOCH
            FROM (status_updated_at - created_at)
        ) / 86400
        ELSE NULL
    END AS shipment_days,
    CASE
        WHEN trucking_completed_at IS NOT NULL
        AND status_updated_at IS NOT NULL THEN EXTRACT(
            EPOCH
            FROM (trucking_completed_at - status_updated_at)
        ) / 86400
        ELSE NULL
    END AS trucking_days,
    CASE
        WHEN finance_completed_at IS NOT NULL
        AND trucking_completed_at IS NOT NULL THEN EXTRACT(
            EPOCH
            FROM (finance_completed_at - trucking_completed_at)
        ) / 86400
        ELSE NULL
    END AS finance_days
FROM public.pro
WHERE status = 'completed'
    OR trucking_status = 'completed'
    OR finance_status = 'Paid'
ORDER BY created_at DESC
LIMIT 10;
SELECT 'Completion timestamp columns added successfully!' AS result;