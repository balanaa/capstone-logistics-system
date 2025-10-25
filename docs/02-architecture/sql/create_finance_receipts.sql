-- Create finance_receipts table for storing receipt data
CREATE TABLE IF NOT EXISTS public.finance_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_number TEXT NOT NULL REFERENCES public.pro(pro_number),
    receipt_type TEXT NOT NULL CHECK (
        receipt_type IN ('statement_of_accounts', 'service_invoice')
    ),
    receipt_data JSONB NOT NULL,
    -- Store all receipt data here
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_finance_receipts_pro_number ON public.finance_receipts(pro_number);
CREATE INDEX IF NOT EXISTS idx_finance_receipts_type ON public.finance_receipts(receipt_type);
CREATE INDEX IF NOT EXISTS idx_finance_receipts_created_at ON public.finance_receipts(created_at);
-- Enable RLS
ALTER TABLE public.finance_receipts ENABLE ROW LEVEL SECURITY;
-- Create RLS policies
-- Users can insert receipts
CREATE POLICY finance_receipts_insert ON public.finance_receipts FOR
INSERT WITH CHECK (true);
-- Users can select receipts (finance department can see all)
CREATE POLICY finance_receipts_select ON public.finance_receipts FOR
SELECT USING (true);
-- Users can update receipts
CREATE POLICY finance_receipts_update ON public.finance_receipts FOR
UPDATE USING (true);
-- Add comments
COMMENT ON TABLE public.finance_receipts IS 'Finance receipts with complete data stored in receipt_data JSONB column';
COMMENT ON COLUMN public.finance_receipts.receipt_data IS 'Complete receipt data including groups, rows, calculations, VAT settings';