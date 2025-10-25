-- Future Reminders System Implementation
-- This SQL script documents the planned reminders system for cross-departmental notifications
-- Run this when ready to implement real reminders functionality
-- Step 1: Add UUID column to pro table (Option B from plan)
ALTER TABLE public.pro
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_pro_id ON public.pro(id);
-- Backfill existing PROs (optional, run once)
UPDATE public.pro
SET id = gen_random_uuid()
WHERE id IS NULL;
-- Step 2: Create reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pro_number TEXT NOT NULL REFERENCES public.pro(pro_number),
    department TEXT NOT NULL CHECK (
        department IN ('shipment', 'trucking', 'finance')
    ),
    reminder_type TEXT NOT NULL,
    -- e.g., 'document_approval_needed', 'payment_overdue'
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'dismissed')),
    created_by UUID REFERENCES auth.users(id),
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT now(),
    completed_at TIMESTAMP
);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reminders_pro ON public.reminders(pro_number);
CREATE INDEX IF NOT EXISTS idx_reminders_department ON public.reminders(department);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status, due_date);
CREATE INDEX IF NOT EXISTS idx_reminders_assigned ON public.reminders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON public.reminders(due_date);
-- Step 3: Enhance actions_log
ALTER TABLE public.actions_log
ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS pro_number TEXT;
CREATE INDEX IF NOT EXISTS idx_actions_log_created ON public.actions_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_actions_log_dept ON public.actions_log(department);
CREATE INDEX IF NOT EXISTS idx_actions_log_pro ON public.actions_log(pro_number);
-- Enable RLS
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
-- RLS Policies for reminders
-- Users can view reminders assigned to them or created by them
CREATE POLICY "users_view_own_reminders" ON public.reminders FOR
SELECT USING (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND 'admin' = ANY(profiles.roles)
        )
    );
-- Users can create reminders
CREATE POLICY "users_create_reminders" ON public.reminders FOR
INSERT WITH CHECK (
        created_by = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND 'admin' = ANY(profiles.roles)
        )
    );
-- Users can update reminders assigned to them
CREATE POLICY "users_update_assigned_reminders" ON public.reminders FOR
UPDATE USING (
        assigned_to = auth.uid()
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE profiles.id = auth.uid()
                AND 'admin' = ANY(profiles.roles)
        )
    );
-- Sample reminder types by department
-- Shipment reminders
INSERT INTO public.reminders (
        pro_number,
        department,
        reminder_type,
        title,
        description,
        due_date,
        priority,
        assigned_to
    )
VALUES (
        'PRO-2025001',
        'shipment',
        'document_approval_needed',
        'BOL approval needed',
        'Bill of Lading requires approval',
        NOW() + INTERVAL '2 hours',
        'high',
        NULL
    ),
    (
        'PRO-2025002',
        'shipment',
        'invoice_verification',
        'Invoice verification pending',
        'Invoice needs verification',
        NOW() + INTERVAL '1 day',
        'normal',
        NULL
    );
-- Trucking reminders
INSERT INTO public.reminders (
        pro_number,
        department,
        reminder_type,
        title,
        description,
        due_date,
        priority,
        assigned_to
    )
VALUES (
        'PRO-2025003',
        'trucking',
        'container_return',
        'Container return deadline',
        'Container must be returned to yard',
        NOW() + INTERVAL '3 hours',
        'urgent',
        NULL
    ),
    (
        'PRO-2025004',
        'trucking',
        'driver_assignment',
        'Driver assignment needed',
        'No driver assigned to container',
        NOW() + INTERVAL '6 hours',
        'high',
        NULL
    );
-- Finance reminders
INSERT INTO public.reminders (
        pro_number,
        department,
        reminder_type,
        title,
        description,
        due_date,
        priority,
        assigned_to
    )
VALUES (
        'PRO-2025005',
        'finance',
        'payment_followup',
        'Payment follow-up',
        'Payment overdue, follow-up required',
        NOW() - INTERVAL '1 day',
        'urgent',
        NULL
    ),
    (
        'PRO-2025006',
        'finance',
        'receipt_upload',
        'Receipt upload required',
        'Service receipt needs to be uploaded',
        NOW() + INTERVAL '2 days',
        'normal',
        NULL
    );
-- Comments
COMMENT ON TABLE public.reminders IS 'Cross-departmental reminders and notifications system';
COMMENT ON COLUMN public.reminders.reminder_type IS 'Type of reminder: document_approval_needed, payment_overdue, container_return, etc.';
COMMENT ON COLUMN public.reminders.priority IS 'Priority level: low, normal, high, urgent';
COMMENT ON COLUMN public.reminders.status IS 'Status: active, completed, dismissed';
COMMENT ON COLUMN public.reminders.assigned_to IS 'User assigned to handle this reminder (NULL for unassigned)';
COMMENT ON COLUMN public.reminders.due_date IS 'When this reminder is due (NULL for no specific deadline)';