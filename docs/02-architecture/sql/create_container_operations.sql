-- Container Operations Management
-- This table tracks individual container operations for trucking
-- Each container can have departure, driver, truck details, and return information
-- Create container_operations table
CREATE TABLE IF NOT EXISTS public.container_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_number TEXT NOT NULL REFERENCES public.pro(pro_number) ON DELETE CASCADE,
    container_number TEXT NOT NULL,
    seal_number TEXT,
    -- Operation fields
    departure_date_from_port DATE,
    driver TEXT,
    truck_plate_number TEXT,
    chassis_number TEXT,
    date_of_return_to_yard DATE,
    -- Basic metadata (actions_log handles detailed tracking)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Ensure unique container per PRO
    UNIQUE(pro_number, container_number)
);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_container_operations_pro ON public.container_operations(pro_number);
CREATE INDEX IF NOT EXISTS idx_container_operations_container ON public.container_operations(container_number);
CREATE INDEX IF NOT EXISTS idx_container_operations_created ON public.container_operations(created_at);
-- Actions logging trigger (uses existing actions_log table)
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
            NEW.seal_number
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
            NEW.date_of_return_to_yard
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
            OLD.seal_number
        )
    );
RETURN OLD;
END IF;
RETURN NULL;
END;
$$ language 'plpgsql';
CREATE TRIGGER log_container_operations_actions_trigger
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.container_operations FOR EACH ROW EXECUTE FUNCTION log_container_operations_actions();
-- Enable RLS (Row Level Security)
ALTER TABLE public.container_operations ENABLE ROW LEVEL SECURITY;
-- Helper functions for role-based access (consistent with existing system)
CREATE OR REPLACE FUNCTION public.is_admin_or_verifier(uid uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.profiles pr
        WHERE pr.id = uid
            AND (
                'admin' = ANY(pr.roles)
                OR 'verifier' = ANY(pr.roles)
            )
    );
$$;
CREATE OR REPLACE FUNCTION public.has_trucking_perm(uid uuid, action text) RETURNS boolean LANGUAGE sql STABLE AS $$
SELECT CASE
        action
        WHEN 'view' THEN COALESCE(
            EXISTS (
                SELECT 1
                FROM public.permissions p
                WHERE p.user_id = uid
                    AND p.trucking_can_view = true
            ),
            false
        )
        WHEN 'write' THEN COALESCE(
            EXISTS (
                SELECT 1
                FROM public.permissions p
                WHERE p.user_id = uid
                    AND p.trucking_can_write = true
            ),
            false
        )
        WHEN 'delete' THEN COALESCE(
            EXISTS (
                SELECT 1
                FROM public.permissions p
                WHERE p.user_id = uid
                    AND p.trucking_can_delete = true
            ),
            false
        )
        ELSE false
    END;
$$;
-- RLS Policies (following existing pattern)
-- Policy 1: Users can SELECT if they have trucking view permission OR are admin/verifier
CREATE POLICY "container_operations_select" ON public.container_operations FOR
SELECT TO authenticated USING (
        public.is_admin_or_verifier(auth.uid())
        OR public.has_trucking_perm(auth.uid(), 'view')
    );
-- Policy 2: Users can INSERT if they have trucking write permission OR are admin/verifier
CREATE POLICY "container_operations_insert" ON public.container_operations FOR
INSERT TO authenticated WITH CHECK (
        public.is_admin_or_verifier(auth.uid())
        OR public.has_trucking_perm(auth.uid(), 'write')
    );
-- Policy 3: Users can UPDATE if they have trucking write permission OR are admin/verifier
CREATE POLICY "container_operations_update" ON public.container_operations FOR
UPDATE TO authenticated USING (
        public.is_admin_or_verifier(auth.uid())
        OR public.has_trucking_perm(auth.uid(), 'write')
    );
-- Policy 4: Users can DELETE if they have trucking delete permission OR are admin/verifier
CREATE POLICY "container_operations_delete" ON public.container_operations FOR DELETE TO authenticated USING (
    public.is_admin_or_verifier(auth.uid())
    OR public.has_trucking_perm(auth.uid(), 'delete')
);
-- Function to auto-generate container operations from BOL data
CREATE OR REPLACE FUNCTION create_container_operations_from_bol() RETURNS TRIGGER AS $$
DECLARE container_pair JSONB;
container_no TEXT;
seal_no TEXT;
BEGIN -- Only process if this is a BOL document
IF NEW.document_type = 'bill_of_lading' THEN -- Get container_seal_pairs from document_fields
FOR container_pair IN
SELECT df.raw_value::JSONB as pairs
FROM public.document_fields df
WHERE df.document_id = NEW.id
    AND df.canonical_key = 'container_seal_pairs' LOOP -- Parse each container/seal pair
    FOR container_no,
    seal_no IN
SELECT (pair->>'containerNo')::TEXT,
    (pair->>'sealNo')::TEXT
FROM jsonb_array_elements(container_pair.pairs) as pair LOOP -- Insert container operation record
INSERT INTO public.container_operations (
        pro_number,
        container_number,
        seal_number
    )
VALUES (
        NEW.pro_number,
        container_no,
        seal_no
    ) ON CONFLICT (pro_number, container_number) DO NOTHING;
END LOOP;
END LOOP;
END IF;
RETURN NEW;
END;
$$ language 'plpgsql';
-- Create trigger to automatically create container operations when BOL is uploaded
CREATE TRIGGER create_container_operations_trigger
AFTER
INSERT ON public.documents FOR EACH ROW EXECUTE FUNCTION create_container_operations_from_bol();
-- Verification queries
SELECT 'container_operations table created successfully' as status;
-- Check table structure
SELECT column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'container_operations'
    AND table_schema = 'public'
ORDER BY ordinal_position;
-- Check if table exists
SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND table_name = 'container_operations'
    ) as table_exists;
-- Success message
SELECT 'Container operations table setup completed successfully!' as final_status;