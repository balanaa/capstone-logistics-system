-- Add Change Tracking to Documents Table
-- This adds updated_by and updated_at columns to track document edits
-- Run this in Supabase SQL Editor

-- Add tracking columns to documents table
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at);
CREATE INDEX IF NOT EXISTS idx_documents_updated_by ON public.documents(updated_by);

-- Backfill updated_at with uploaded_at for existing documents (one-time)
UPDATE public.documents
SET updated_at = uploaded_at,
    updated_by = uploaded_by
WHERE updated_at IS NULL;

-- Verification query
SELECT 
  id,
  document_type,
  uploaded_by,
  uploaded_at,
  updated_by,
  updated_at
FROM public.documents
LIMIT 5;

-- Check column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'documents'
  AND table_schema = 'public'
  AND column_name IN ('updated_by', 'updated_at');

