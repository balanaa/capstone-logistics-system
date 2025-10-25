-- Add container status field to container_operations table
-- This field will track the status of each container operation for the Container Status Chart
-- Add status column with constraint
ALTER TABLE public.container_operations
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'booking' CHECK (status IN ('booking', 'delivering', 'returned'));
-- Add index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_container_operations_status ON public.container_operations(status);
-- Update existing records to have default status
UPDATE public.container_operations
SET status = 'booking'
WHERE status IS NULL;
-- Add comment to document the status values
COMMENT ON COLUMN public.container_operations.status IS 'Container operation status: booking (default), delivering, returned';
-- Update the actions logging trigger to include status changes
CREATE OR REPLACE FUNCTION log_container_operations_actions() RETURNS TRIGGER AS $$
DECLARE actor UUID := auth.uid();
BEGIN IF TG_OP = 'INSERT' THEN
INSERT INTO public.actions_log (user_id, action, target_type, target_id, payload)
VALUES (
        actor,
        'create_container_operation',
        'container_operation',
        NEW.id,
        jsonb_build_object(
            'pro_number',
            NEW.pro_number,
            'container_number',
            NEW.container_number,
            'seal_number',
            NEW.seal_number,
            'status',
            NEW.status
        )
    );
RETURN NEW;
ELSIF TG_OP = 'UPDATE' THEN
INSERT INTO public.actions_log (user_id, action, target_type, target_id, payload)
VALUES (
        actor,
        'update_container_operation',
        'container_operation',
        NEW.id,
        jsonb_build_object(
            'pro_number',
            NEW.pro_number,
            'container_number',
            NEW.container_number,
            'seal_number',
            NEW.seal_number,
            'departure_date',
            NEW.departure_date_from_port,
            'driver',
            NEW.driver,
            'truck_plate',
            NEW.truck_plate_number,
            'chassis_number',
            NEW.chassis_number,
            'return_date',
            NEW.date_of_return_to_yard,
            'status',
            NEW.status
        )
    );
RETURN NEW;
ELSIF TG_OP = 'DELETE' THEN
INSERT INTO public.actions_log (user_id, action, target_type, target_id, payload)
VALUES (
        actor,
        'delete_container_operation',
        'container_operation',
        OLD.id,
        jsonb_build_object(
            'pro_number',
            OLD.pro_number,
            'container_number',
            OLD.container_number,
            'seal_number',
            OLD.seal_number,
            'status',
            OLD.status
        )
    );
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';
SELECT 'Container status field added successfully!' as final_status;