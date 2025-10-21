-- Shipment DB: Tables + Indexes + RLS enabled (no policies yet)
-- Safe to run multiple times; includes drop guards.
-- 0) Required for gen_random_uuid()
create extension if not exists pgcrypto;
-- 1) Drop (optional) — comment out in production if you don’t want destructive ops
drop table if exists public.document_item_conflicts cascade;
drop table if exists public.document_conflicts cascade;
drop table if exists public.document_issues cascade;
drop table if exists public.label_mappings cascade;
drop table if exists public.document_items cascade;
drop table if exists public.document_fields cascade;
drop table if exists public.documents cascade;
drop table if exists public.pro cascade;
drop table if exists public.actions_log cascade;
-- 2) Base tables
create table if not exists public.pro (
    pro_number text primary key,
    created_at timestamp default now()
);
create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    pro_number text not null references public.pro(pro_number) on delete cascade,
    department text not null check (department = 'shipment'),
    document_type text not null check (
        document_type in (
            'bill_of_lading',
            'invoice',
            'packing_list',
            'delivery_order'
        )
    ),
    file_path text not null,
    uploaded_by uuid not null references auth.users(id),
    uploaded_at timestamp default now(),
    status text not null default 'pending_verifier' check (status in ('pending_verifier', 'approved')),
    deleted_at timestamp,
    doc_no text,
    sequence_no int,
    requires_reencode boolean not null default false
);
create table if not exists public.document_fields (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    canonical_key text not null,
    raw_label text,
    raw_value text,
    normalized_value text,
    value_number numeric(18, 4),
    value_date date,
    unique (document_id, canonical_key)
);
create table if not exists public.document_items (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    line_no int not null,
    product text,
    quantity numeric(18, 0),
    -- integer-only per specs
    unit_price numeric(18, 4),
    -- invoice only
    amount numeric(18, 4),
    -- invoice only
    net_weight numeric(18, 4),
    -- packing list only
    gross_weight numeric(18, 4),
    -- packing list only
    unique (document_id, line_no)
);
create table if not exists public.document_conflicts (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    canonical_key text not null,
    new_value text not null,
    existing_value text not null,
    error_source text default 'unknown' check (
        error_source in ('first_upload', 'new_upload', 'unknown')
    ),
    correct_value text,
    resolution_note text,
    status text not null default 'open' check (
        status in ('open', 'resolved_kept', 'resolved_updated')
    ),
    resolved_by uuid references auth.users(id),
    resolved_at timestamp,
    created_at timestamp default now()
);
create table if not exists public.document_item_conflicts (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    line_no int not null,
    conflict_type text not null,
    new_value text not null,
    existing_value text not null,
    status text not null default 'open' check (
        status in ('open', 'resolved_kept', 'resolved_updated')
    ),
    resolved_by uuid references auth.users(id),
    resolved_at timestamp,
    created_at timestamp default now(),
    unique (document_id, line_no, conflict_type)
);
create table if not exists public.document_issues (
    id uuid primary key default gen_random_uuid(),
    pro_number text not null references public.pro(pro_number) on delete cascade,
    document_id uuid not null references public.documents(id) on delete cascade,
    issue_type text not null check (
        issue_type in (
            'wrong_file',
            'data_typo',
            'data_inconsistent',
            'wrong_calculation',
            'other'
        )
    ),
    raised_by_role text not null,
    raised_by_user uuid not null references auth.users(id),
    note text,
    status text not null default 'open' check (status in ('open', 'resolved')),
    resolved_by uuid references auth.users(id),
    resolved_at timestamp,
    created_at timestamp default now()
);
create table if not exists public.label_mappings (
    id uuid primary key default gen_random_uuid(),
    department text not null check (department = 'shipment'),
    document_type text not null check (
        document_type in (
            'bill_of_lading',
            'invoice',
            'packing_list',
            'delivery_order'
        )
    ),
    raw_label text not null,
    canonical_key text not null,
    created_by uuid references auth.users(id),
    created_at timestamp default now(),
    unique (department, document_type, raw_label)
);
create table if not exists public.actions_log (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id),
    action text not null,
    target_type text not null,
    target_id uuid not null,
    payload jsonb,
    created_at timestamp default now()
);
-- 3) Indexes
create index if not exists idx_documents_pro_type on public.documents (pro_number, document_type);
create index if not exists idx_fields_doc_key on public.document_fields (document_id, canonical_key);
create index if not exists idx_items_doc_line on public.document_items (document_id, line_no);
create index if not exists idx_conflicts_doc on public.document_conflicts (document_id);
create index if not exists idx_item_conflicts_doc_line on public.document_item_conflicts (document_id, line_no);
create index if not exists idx_issues_pro_doc on public.document_issues (pro_number, document_id);
create index if not exists idx_label_map_lookup on public.label_mappings (department, document_type, raw_label);
-- 4) Enable RLS (policies will be added in a separate script)
alter table public.pro enable row level security;
alter table public.documents enable row level security;
alter table public.document_fields enable row level security;
alter table public.document_items enable row level security;
alter table public.document_conflicts enable row level security;
alter table public.document_item_conflicts enable row level security;
alter table public.document_issues enable row level security;
alter table public.label_mappings enable row level security;
alter table public.actions_log enable row level security;