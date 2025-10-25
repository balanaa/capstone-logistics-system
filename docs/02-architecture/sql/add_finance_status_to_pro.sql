-- Add finance_status column to pro table
-- This column will store the finance status (Unpaid/Paid) for each PRO
ALTER TABLE pro
ADD COLUMN finance_status VARCHAR(20) DEFAULT 'Unpaid';
-- Add constraint to ensure only valid statuses
ALTER TABLE pro
ADD CONSTRAINT check_finance_status CHECK (finance_status IN ('Unpaid', 'Paid'));
-- Add comment to document the column
COMMENT ON COLUMN pro.finance_status IS 'Finance status: Unpaid or Paid';