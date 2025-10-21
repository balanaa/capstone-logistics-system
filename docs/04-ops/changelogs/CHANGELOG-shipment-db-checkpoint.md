# Project Checkpoint — Shipment DB, Fields, Flows, and RLS (current)

Date: current

Scope

- Finalize first version of Shipment database (BOL, Invoice, Packing List), Escalate mode, conflict/issue handling, and granular RLS alignment.

Decisions and confirmations

- Canonical ID: `pro_number` is the universal shipment key (table `pro`).
- Field naming: snake_case across all docs/specs and DB.
- Escalate mode (default): uploader can submit with conflicts; verifier resolves and approves.
- Replace flow: sets `requires_reencode=true`; Approve blocked until fields updated/saved; auto-creates `document_issues(wrong_file)`.
- Manual flagging: “Flag Issue” dialog creates `document_issues` with `issue_type in ('wrong_file','data_typo','data_inconsistent','wrong_calculation','other')` + optional note; statuses: `open → resolved`.
- Conflict UI: mini-overlay styled as “Data Conflict” with large danger icon (provided later), numbered list, actions: Submit for Verifier Review (primary), Review Fields (secondary).
- Verifier role: no implicit inheritance; assign both roles when needed (e.g., `['verifier','shipment']`).
- RLS model: granular permissions via `permissions` table + `has_perm(dept,'view|write|delete')`; admin override; verifier shipment-only override; viewer later via read-only views.

Canonical fields (what we store)

- Bill of Lading (document_type='bill_of_lading')
  - Header: `bl_number`, `shipper` (multiline), `consignee` (multiline), `shipping_line` (normalized short name), `vessel_name`, `voyage_no`, `port_of_loading`, `port_of_discharge`, `place_of_delivery` (SUBIC|CLARK|MANILA; derived; fallback MANILA)
  - Line/summary region: `container_specs`, `container_seal_pairs` (JSON string of ordered pairs), `no_of_packages` (int), `packaging_kind`, `goods_classification`, `description_of_goods` (multiline), `gross_weight` (KGS)
- Invoice (document_type='invoice')
  - Header: `invoice_no`, `invoice_date` (DATE; uploader confirms if ambiguous; UI shows “Month DD, YYYY”), `invoice_currency` (TEXT, default 'USD'; detect 'EUR' when present; uploader can override)
  - Items: `product`/`product_description`, `product_quantity` (integer-only), `unit_price`, `product_amount`
  - Totals: `total_quantity` (int), `total_amount`
- Packing List (document_type='packing_list')
  - Items: `product`/`product_description`, `product_quantity` (integer-only), `net_weight`, `gross_weight`
  - Totals: `total_quantity`, `total_net_weight`, `total_gross_weight`

DB structure (public schema)

- `pro(pro_number pk, created_at)`
- `documents(id uuid pk, pro_number fk→pro, department='shipment', document_type enum, file_path, uploaded_by, uploaded_at, status enum, deleted_at, doc_no, sequence_no, requires_reencode bool)`
- `document_fields(id uuid pk, document_id fk, canonical_key, raw_label, raw_value, normalized_value, value_number, value_date)`
- `document_items(id uuid pk, document_id fk, line_no, product, quantity int, unit_price, amount, net_weight, gross_weight)`
- `document_conflicts(id uuid pk, document_id fk, canonical_key, new_value, existing_value, error_source enum, correct_value, resolution_note, status enum, resolved_by, resolved_at, created_at)`
- `document_item_conflicts(id uuid pk, document_id fk, line_no, conflict_type, new_value, existing_value, status enum, resolved_by, resolved_at, created_at)`
- `document_issues(id uuid pk, pro_number fk, document_id fk, issue_type enum, raised_by_role, raised_by_user, note, status enum, resolved_by, resolved_at, created_at)`
- `label_mappings(id uuid pk, department='shipment', document_type enum, raw_label, canonical_key, created_by, created_at)`
- `actions_log(id uuid pk, user_id, action, target_type, target_id, payload jsonb, created_at)`

Typed helpers rationale

- `document_fields.value_number`: enables numeric queries (sum/filter/sort) on totals/prices/weights recorded as fields.
- `document_fields.value_date`: stores true DATE for date fields (e.g., `invoice_date`).
- raw vs normalized: raw preserves original capture; normalized aids comparison (e.g., punctuation-stripped `bl_number`).

Indexes

- `documents (pro_number, document_type)`
- `document_fields (document_id, canonical_key)`
- `document_items (document_id, line_no)`
- `document_conflicts (document_id)`
- `document_item_conflicts (document_id, line_no)`
- `document_issues (pro_number, document_id)`
- `label_mappings (department, document_type, raw_label)`

Run artifacts

- Tables + RLS enable: `docs/sql/create_shipment_tables.sql`
- Policies (RLS): `docs/sql/create_shipment_policies.sql`
- Granular permissions helper and table: `docs/02-architecture/auth-and-rbac/granular-permissions-supabase.md`

Verification (performed)

- Tables present (9), columns correct; pgcrypto installed.
- Indexes present (18 across tables).
- RLS enabled on all target tables.
- Policies installed (counts): actions_log=3; document_conflicts=4; document_fields=4; document_issues=3; document_item_conflicts=4; document_items=4; documents=6; label_mappings=4; storage bucket has 3 granular policies.
- Test insert succeeded (retrieved a new document id).

Notes

- Viewer will be implemented via read-only views returning curated summary fields; no direct file access.
- Multiples per type supported by schema (`doc_no`, `sequence_no`), UI flows for multiples are future work.
- ETA will be added later (outside documents) per product decision.

End of checkpoint.
