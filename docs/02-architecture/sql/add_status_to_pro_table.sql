-- Add status field to existing pro table
-- This is much simpler than creating a new table
-- Add status column to pro table
ALTER TABLE public.pro
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'filed_boc', 'completed'));
-- Add updated_by and updated_at columns for tracking
ALTER TABLE public.pro
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
ALTER TABLE public.pro
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT now();
-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_pro_status ON public.pro (status);
-- Update existing records to have default status
UPDATE public.pro
SET status = 'ongoing'
WHERE status IS NULL;
-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pro_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now();
RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_pro_updated_at_trigger BEFORE
UPDATE ON public.pro FOR EACH ROW EXECUTE FUNCTION update_pro_updated_at();