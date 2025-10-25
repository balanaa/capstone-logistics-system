-- Add trucking_status column to pro table
-- This will persist the trucking completion status for each PRO
-- Add trucking_status column with constraint
ALTER TABLE public.pro
ADD COLUMN IF NOT EXISTS trucking_status TEXT DEFAULT 'ongoing' CHECK (trucking_status IN ('ongoing', 'completed'));
-- Add index for better performance on trucking status queries
CREATE INDEX IF NOT EXISTS idx_pro_trucking_status ON public.pro(trucking_status);
-- Update existing records to have default trucking status
UPDATE public.pro
SET trucking_status = 'ongoing'
WHERE trucking_status IS NULL;
-- Add comment to document the trucking status values
COMMENT ON COLUMN public.pro.trucking_status IS 'Trucking completion status: ongoing (default), completed';
-- Update the actions logging trigger to include trucking status changes
-- Note: This assumes there's already an actions_log trigger on the pro table
-- If not, we'll need to create one
-- Create a function to log trucking status changes
CREATE OR REPLACE FUNCTION log_trucking_status_changes() RETURNS TRIGGER AS $$
DECLARE actor UUID := auth.uid();
BEGIN -- Only log if trucking_status actually changed
IF OLD.trucking_status IS DISTINCT
FROM NEW.trucking_status THEN
INSERT INTO public.actions_log (user_id, action, target_type, target_id, payload)
VALUES (
        actor,
        'update_trucking_status',
        'pro',
        NEW.pro_number,
        jsonb_build_object(
            'pro_number',
            NEW.pro_number,
            'old_trucking_status',
            OLD.trucking_status,
            'new_trucking_status',
            NEW.trucking_status,
            'updated_at',
            NEW.updated_at
        )
    );
END IF;
RETURN NEW;
END;
$$ language 'plpgsql';
-- Create trigger for trucking status changes
DROP TRIGGER IF EXISTS log_trucking_status_changes_trigger ON public.pro;
CREATE TRIGGER log_trucking_status_changes_trigger
AFTER
UPDATE ON public.pro FOR EACH ROW EXECUTE FUNCTION log_trucking_status_changes();
-- Add RLS policy for trucking status updates (if needed)
-- This ensures only authorized users can update trucking status
CREATE POLICY "pro_trucking_status_update" ON public.pro FOR
UPDATE TO authenticated USING (
        public.is_admin_or_verifier(auth.uid())
        OR public.has_trucking_perm(auth.uid(), 'write')
    );
SELECT 'Trucking status column added successfully to pro table!' as final_status;