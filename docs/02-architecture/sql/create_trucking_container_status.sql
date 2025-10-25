-- Trucking Container Status Management
-- This table tracks individual container statuses for trucking operations
-- Each container can have different statuses (Booking, Delivering, Returned)
-- Create trucking_container_status table
CREATE TABLE IF NOT EXISTS public.trucking_container_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_number TEXT NOT NULL REFERENCES public.pro(pro_number) ON DELETE CASCADE,
    container_number TEXT NOT NULL,
    seal_number TEXT,
    status TEXT NOT NULL DEFAULT 'booking' CHECK (status IN ('booking', 'delivering', 'returned')),
    -- Container details from BOL
    port_of_discharge TEXT,
    place_of_delivery TEXT,
    shipping_line TEXT,
    empty_return_location TEXT,
    -- Dates
    detention_start DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id),
    -- Ensure unique container per PRO
    UNIQUE(pro_number, container_number)
);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trucking_container_status_pro ON public.trucking_container_status(pro_number);
CREATE INDEX IF NOT EXISTS idx_trucking_container_status_status ON public.trucking_container_status(status);
CREATE INDEX IF NOT EXISTS idx_trucking_container_status_created ON public.trucking_container_status(created_at);
-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trucking_container_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_trucking_container_updated_at_trigger BEFORE
UPDATE ON public.trucking_container_status FOR EACH ROW EXECUTE FUNCTION update_trucking_container_updated_at();
-- Enable RLS
ALTER TABLE public.trucking_container_status ENABLE ROW LEVEL SECURITY;
-- RLS Policies
-- Allow authenticated users to view trucking container status
CREATE POLICY "Allow authenticated users to view trucking container status" ON public.trucking_container_status FOR
SELECT TO authenticated USING (true);
-- Allow authenticated users to insert trucking container status
CREATE POLICY "Allow authenticated users to insert trucking container status" ON public.trucking_container_status FOR
INSERT TO authenticated WITH CHECK (true);
-- Allow authenticated users to update trucking container status
CREATE POLICY "Allow authenticated users to update trucking container status" ON public.trucking_container_status FOR
UPDATE TO authenticated USING (true) WITH CHECK (true);
-- Allow authenticated users to delete trucking container status
CREATE POLICY "Allow authenticated users to delete trucking container status" ON public.trucking_container_status FOR DELETE TO authenticated USING (true);
-- Function to automatically create trucking container records for completed shipments
CREATE OR REPLACE FUNCTION create_trucking_containers_for_completed_shipment() RETURNS TRIGGER AS $$
DECLARE bol_fields JSONB;
container_data JSONB;
container_item JSONB;
container_number TEXT;
seal_number TEXT;
BEGIN -- Only trigger when status changes to 'completed'
IF NEW.status = 'completed'
AND (
    OLD.status IS NULL
    OR OLD.status != 'completed'
) THEN -- Get BOL data for this PRO
SELECT df.normalized_value INTO bol_fields
FROM public.documents d
    JOIN public.document_fields df ON d.id = df.document_id
WHERE d.pro_number = NEW.pro_number
    AND d.document_type = 'bill_of_lading'
    AND df.canonical_key = 'container_numbers'
LIMIT 1;
-- If we have container data, create trucking records
IF bol_fields IS NOT NULL THEN -- Parse container data (assuming it's stored as JSON array)
FOR container_item IN
SELECT *
FROM jsonb_array_elements(bol_fields) LOOP container_number := container_item->>'container_number';
seal_number := container_item->>'seal_number';
-- Insert trucking container status record
INSERT INTO public.trucking_container_status (
        pro_number,
        container_number,
        seal_number,
        port_of_discharge,
        place_of_delivery,
        shipping_line,
        status
    )
SELECT NEW.pro_number,
    container_number,
    seal_number,
    df_pod.normalized_value,
    df_pod2.normalized_value,
    df_sl.normalized_value,
    'booking'
FROM public.documents d
    LEFT JOIN public.document_fields df_pod ON d.id = df_pod.document_id
    AND df_pod.canonical_key = 'port_of_discharge'
    LEFT JOIN public.document_fields df_pod2 ON d.id = df_pod2.document_id
    AND df_pod2.canonical_key = 'place_of_delivery'
    LEFT JOIN public.document_fields df_sl ON d.id = df_sl.document_id
    AND df_sl.canonical_key = 'shipping_line'
WHERE d.pro_number = NEW.pro_number
    AND d.document_type = 'bill_of_lading'
LIMIT 1 ON CONFLICT (pro_number, container_number) DO NOTHING;
END LOOP;
END IF;
END IF;
RETURN NEW;
END;
$$ language 'plpgsql';
-- Create trigger to automatically create trucking containers when shipment is completed
CREATE TRIGGER create_trucking_containers_trigger
AFTER
UPDATE ON public.pro FOR EACH ROW EXECUTE FUNCTION create_trucking_containers_for_completed_shipment();
-- Verification queries
SELECT 'trucking_container_status table created successfully' as status;
SELECT column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trucking_container_status'
    AND table_schema = 'public';
-- Add trucking_status field to existing pro table
-- This tracks the overall trucking completion status for each PRO
ALTER TABLE public.pro
ADD COLUMN IF NOT EXISTS trucking_status TEXT DEFAULT 'ongoing' CHECK (trucking_status IN ('ongoing', 'completed'));
-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_pro_trucking_status ON public.pro (trucking_status);
-- Update existing records to have default trucking status
UPDATE public.pro
SET trucking_status = 'ongoing'
WHERE trucking_status IS NULL;