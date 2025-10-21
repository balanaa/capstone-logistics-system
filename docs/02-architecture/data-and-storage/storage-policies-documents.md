# Supabase Storage Policies — `documents` Bucket

This document contains copy-paste SQL to configure Supabase Storage RLS for the `documents` bucket. Note: Policies are already deployed in the current environment.

- Bucket: `documents` (private)
- Folders: `shipment/`, `trucking/`, `finance/`
- Roles covered: `shipment`, `trucking`, `finance`, `verifier` (shipment-only), `admin` (all folders)
- Multi-role users: supported via `'role' = ANY(public.profiles.roles)` checks
- Viewer: intentionally has no storage access (no policies)

See also: `docs/02-architecture/data-and-storage/storage-and-database-access.md` for rationale, matrix, and extended guidance.

---

## Quick Start (Copy/Paste in Supabase SQL Editor)

```sql
-- ========= Sanity: bucket exists and is private =========
select id, public from storage.buckets where id = 'documents';

-- ========= Cleanup (safe to run repeatedly) =========
drop policy if exists "shipment_upload" on storage.objects;
drop policy if exists "trucking_upload" on storage.objects;
drop policy if exists "finance_upload" on storage.objects;
drop policy if exists "verifier_upload" on storage.objects;
drop policy if exists "admin_upload" on storage.objects;

drop policy if exists "shipment_select" on storage.objects;
drop policy if exists "trucking_select" on storage.objects;
drop policy if exists "finance_select" on storage.objects;
drop policy if exists "verifier_select" on storage.objects;
drop policy if exists "admin_select" on storage.objects;

drop policy if exists "shipment_delete" on storage.objects;
drop policy if exists "trucking_delete" on storage.objects;
drop policy if exists "finance_delete" on storage.objects;
drop policy if exists "verifier_delete" on storage.objects;
drop policy if exists "admin_delete" on storage.objects;

-- ========= INSERT (Upload) =========
create policy "shipment_upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'shipment'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'shipment' = any(p.roles)
  )
);

create policy "trucking_upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'trucking'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'trucking' = any(p.roles)
  )
);

create policy "finance_upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'finance'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'finance' = any(p.roles)
  )
);

-- Verifier is shipment-only
create policy "verifier_upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'shipment'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'verifier' = any(p.roles)
  )
);

-- Admin can upload anywhere
create policy "admin_upload" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'admin' = any(p.roles)
  )
);

-- ========= SELECT (View/Download/List) =========
create policy "shipment_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'shipment'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'shipment' = any(p.roles)
  )
);

create policy "trucking_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'trucking'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'trucking' = any(p.roles)
  )
);

create policy "finance_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'finance'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'finance' = any(p.roles)
  )
);

create policy "verifier_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'shipment'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'verifier' = any(p.roles)
  )
);

create policy "admin_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'admin' = any(p.roles)
  )
);

-- ========= DELETE =========
create policy "shipment_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'shipment'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'shipment' = any(p.roles)
  )
);

create policy "trucking_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'trucking'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'trucking' = any(p.roles)
  )
);

create policy "finance_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'finance'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'finance' = any(p.roles)
  )
);

create policy "verifier_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'documents'
  and (storage.foldername(name))[1] = 'shipment'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'verifier' = any(p.roles)
  )
);

create policy "admin_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and 'admin' = any(p.roles)
  )
);
```

---

## Notes

- Multi-role users: A user with roles like `['shipment','finance']` will match both folders.
- Viewer: No policy is defined; viewers cannot access Storage.
- Subfolders: Policies key off the first folder segment — `(storage.foldername(name))[1]`.
- If you change folder layout, update policies accordingly.
