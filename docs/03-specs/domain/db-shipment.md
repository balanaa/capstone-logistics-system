# Shipment Database Schema (Escalate Mode Default)

Purpose: support uploads for Shipment department documents (BOL, Invoice, Packing List, Delivery Order), field storage, item rows, conflict recording, and verifier approvals.

## Tables

### pro

- pro_number TEXT PRIMARY KEY -- universal shipment ID (pattern ^\d{7}$, year 2000–2099)
- created_at TIMESTAMP default now()

### documents

- id UUID PK default gen_random_uuid()
- pro_number TEXT NOT NULL REFERENCES pro(pro_number) ON DELETE CASCADE
- department TEXT NOT NULL CHECK (department='shipment')
- document_type TEXT NOT NULL CHECK (document_type IN ('bill_of_lading','invoice','packing_list','delivery_order'))
- file_path TEXT NOT NULL -- Supabase Storage key
- uploaded_by UUID NOT NULL REFERENCES auth.users(id)
- uploaded_at TIMESTAMP default now()
- status TEXT NOT NULL DEFAULT 'pending_verifier' CHECK (status IN ('pending_verifier','approved'))
- deleted_at TIMESTAMP
- doc_no TEXT NULL -- e.g., invoice_no if present
- sequence_no INT NULL -- for multiple docs of same type per PRO
- requires_reencode BOOLEAN NOT NULL DEFAULT false -- set true on Replace; block approve until fields reviewed/saved

### document_fields

- id UUID PK default gen_random_uuid()
- document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- canonical_key TEXT NOT NULL -- e.g., 'consignee_name','consignee_address','eta'
- raw_label TEXT
- raw_value TEXT
- normalized_value TEXT -- trimmed/case-normalized for comparisons (e.g., punctuation-stripped, uppercased)
- value_number NUMERIC(18,4) NULL -- optional typed storage for numeric fields (totals, prices, weights)
- value_date DATE NULL -- optional typed storage for date fields (e.g., invoice_date)
- UNIQUE(document_id, canonical_key)

### document_items (for invoice/packing_list)

- id UUID PK default gen_random_uuid()
- document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- line_no INT NOT NULL
- product TEXT
- quantity NUMERIC(18,0) -- integer-only per specs
- unit_price NUMERIC(18,4) NULL -- invoice only
- amount NUMERIC(18,4) NULL -- invoice only
- net_weight NUMERIC(18,4) NULL -- packing list only
- gross_weight NUMERIC(18,4) NULL -- packing list only
- UNIQUE(document_id, line_no)

### document_item_conflicts (optional, item-level)

- id UUID PK default gen_random_uuid()
- document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- line_no INT NOT NULL
- conflict_type TEXT NOT NULL -- e.g., 'product_name_mismatch'
- new_value TEXT NOT NULL
- existing_value TEXT NOT NULL
- status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved_kept','resolved_updated'))
- resolved_by UUID NULL REFERENCES auth.users(id)
- resolved_at TIMESTAMP NULL
- created_at TIMESTAMP default now()
- UNIQUE(document_id, line_no, conflict_type)

### document_conflicts

- id UUID PK default gen_random_uuid()
- document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- canonical_key TEXT NOT NULL
- new_value TEXT NOT NULL
- existing_value TEXT NOT NULL
- error_source TEXT DEFAULT 'unknown' CHECK (error_source IN ('first_upload','new_upload','unknown'))
- correct_value TEXT NULL -- set when verifier/uploader selects the correct value
- resolution_note TEXT NULL
- status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved_kept','resolved_updated'))
- resolved_by UUID NULL REFERENCES auth.users(id)
- resolved_at TIMESTAMP NULL
- created_at TIMESTAMP default now()
- INDEX(document_id)

### label_mappings (normalize raw labels to canonical keys)

- id UUID PK default gen_random_uuid()
- department TEXT NOT NULL CHECK (department='shipment')
- document_type TEXT NOT NULL CHECK (document_type IN ('bill_of_lading','invoice','packing_list','delivery_order'))
- raw_label TEXT NOT NULL
- canonical_key TEXT NOT NULL -- e.g., maps 'Consignee Addr' → 'consignee_address'
- created_by UUID NULL REFERENCES auth.users(id)
- created_at TIMESTAMP DEFAULT now()
- UNIQUE(department, document_type, raw_label)

### actions_log (minimal for prototype)

- id UUID PK default gen_random_uuid()
- user_id UUID NOT NULL REFERENCES auth.users(id)
- action TEXT NOT NULL -- 'upload_document','approve_document','make_canonical','replace_file','delete_document','open_conflicts','resolve_conflict'
- target_type TEXT NOT NULL -- 'document'|'shipment'
- target_id UUID NOT NULL
- payload JSONB NULL
- created_at TIMESTAMP default now()

### document_issues (manual high-level flags)

- id UUID PK default gen_random_uuid()
- pro_number TEXT NOT NULL REFERENCES pro(pro_number) ON DELETE CASCADE
- document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
- issue_type TEXT NOT NULL CHECK (issue_type IN ('wrong_file','data_typo','data_inconsistent','wrong_calculation','other'))
- raised_by_role TEXT NOT NULL
- raised_by_user UUID NOT NULL REFERENCES auth.users(id)
- note TEXT NULL
- status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved'))
- resolved_by UUID NULL REFERENCES auth.users(id)
- resolved_at TIMESTAMP NULL
- created_at TIMESTAMP DEFAULT now()

## Flows (Escalate)

- Upload with conflicts:
  - Insert documents (status='pending_verifier') + document_fields/items
  - Insert document_conflicts rows for each differing canonical_key
  - Log actions: upload_document, open_conflicts
- Verifier resolves:
  - For each conflict: mark status to 'resolved_kept' or 'resolved_updated' (and update document_fields if verifier edits values)
  - Approve: set documents.status='approved'; log approve_document
- Replace file:
  - Delete prior storage file; upload new; update file_path; re-validate values; log replace_file
- Delete document:
  - Hard delete: remove storage + DB rows; log delete_document

## SQL (PostgreSQL snippets)

```sql
create extension if not exists pgcrypto; -- for gen_random_uuid()

create table if not exists pro (
  pro_number text primary key,
  created_at timestamp default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  pro_number text not null references pro(pro_number) on delete cascade,
  department text not null check (department='shipment'),
  document_type text not null check (document_type in ('bill_of_lading','invoice','packing_list','delivery_order')),
  file_path text not null,
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamp default now(),
  status text not null default 'pending_verifier' check (status in ('pending_verifier','approved')),
  deleted_at timestamp,
  doc_no text,
  sequence_no int,
  requires_reencode boolean not null default false
);

create table if not exists document_fields (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  canonical_key text not null,
  raw_label text,
  raw_value text,
  normalized_value text,
  value_number numeric(18,4),
  value_date date,
  unique (document_id, canonical_key)
);

create table if not exists document_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  line_no int not null,
  product text,
  quantity numeric(18,0),
  unit_price numeric(18,4),
  amount numeric(18,4),
  net_weight numeric(18,4),
  gross_weight numeric(18,4),
  unique (document_id, line_no)
);

create table if not exists document_item_conflicts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  line_no int not null,
  conflict_type text not null,
  new_value text not null,
  existing_value text not null,
  status text not null default 'open' check (status in ('open','resolved_kept','resolved_updated')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamp,
  created_at timestamp default now(),
  unique (document_id, line_no, conflict_type)
);

create table if not exists document_conflicts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  canonical_key text not null,
  new_value text not null,
  existing_value text not null,
  error_source text default 'unknown' check (error_source in ('first_upload','new_upload','unknown')),
  correct_value text,
  resolution_note text,
  status text not null default 'open' check (status in ('open','resolved_kept','resolved_updated')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamp,
  created_at timestamp default now()
);

create table if not exists actions_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  action text not null,
  target_type text not null,
  target_id uuid not null,
  payload jsonb,
  created_at timestamp default now()
);

create table if not exists document_issues (
  id uuid primary key default gen_random_uuid(),
  pro_number text not null references pro(pro_number) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  issue_type text not null check (issue_type in ('wrong_file','data_typo','data_inconsistent','wrong_calculation','other')),
  raised_by_role text not null,
  raised_by_user uuid not null references auth.users(id),
  note text,
  status text not null default 'open' check (status in ('open','resolved')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamp,
  created_at timestamp default now()
);

-- Recommended indexes
create index if not exists idx_documents_pro_type on documents (pro_number, document_type);
create index if not exists idx_fields_doc_key on document_fields (document_id, canonical_key);
create index if not exists idx_items_doc_line on document_items (document_id, line_no);
create index if not exists idx_conflicts_doc on document_conflicts (document_id);
create index if not exists idx_item_conflicts_doc_line on document_item_conflicts (document_id, line_no);
create index if not exists idx_issues_pro_doc on document_issues (pro_number, document_id);
create index if not exists idx_label_map_lookup on label_mappings (department, document_type, raw_label);

create table if not exists label_mappings (
  id uuid primary key default gen_random_uuid(),
  department text not null check (department='shipment'),
  document_type text not null check (document_type in ('bill_of_lading','invoice','packing_list','delivery_order')),
  raw_label text not null,
  canonical_key text not null,
  created_by uuid references auth.users(id),
  created_at timestamp default now(),
  unique (department, document_type, raw_label)
);

create table if not exists document_item_conflicts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  line_no int not null,
  conflict_type text not null,
  new_value text not null,
  existing_value text not null,
  status text not null default 'open' check (status in ('open','resolved_kept','resolved_updated')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamp,
  created_at timestamp default now(),
  unique (document_id, line_no, conflict_type)
);
```

## RLS (concept outline)

- Enable RLS on all tables.
- documents/doc_fields/doc_items/doc_conflicts: shipment role can insert/select/update/delete for department='shipment'; verifier/admin same; viewer select limited fields via views.
- Use `profiles.roles` to gate roles.
