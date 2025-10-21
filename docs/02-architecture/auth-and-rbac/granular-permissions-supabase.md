# Granular Per-User Permissions (Supabase Tutorial)

This guide adds fine-grained, per-user CRUD permissions per department, while keeping existing roles for navigation and keeping `verifier` and `admin` behavior unchanged.

---

See also:

- `docs/02-architecture/auth-and-rbac/roles-and-access.md`
- `docs/02-architecture/data-and-storage/storage-and-database-access.md`

---

## What you’ll build

- A `permissions` table with per-user flags per department using three actions:
  - `view`
  - `write` (covers BOTH insert and update)
  - `delete`
- A helper function `has_perm(department, action)` used by RLS.
- RLS policies for database tables (example: `documents`) and for Storage bucket `documents` that consult those flags.
- A backfill script that preserves today’s behavior, then you can tighten later via the User Management page.

Verifier (shipment-only) and Admin (all) keep their powers regardless of these flags. Viewer will later use views (not covered here).

---

## Prerequisites

- Supabase project set up, with `profiles` table mapping `auth.users.id` → `roles text[]`.
- Storage bucket `documents` with folders: `shipment/`, `trucking/`, `finance/`.

---

## Step 1 — Create `permissions` table (single row per user)

```sql
CREATE TABLE IF NOT EXISTS permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Shipment flags
  shipment_can_view   boolean DEFAULT false,
  shipment_can_write  boolean DEFAULT false, -- write = insert + update
  shipment_can_delete boolean DEFAULT false,

  -- Trucking flags
  trucking_can_view   boolean DEFAULT false,
  trucking_can_write  boolean DEFAULT false,
  trucking_can_delete boolean DEFAULT false,

  -- Finance flags
  finance_can_view    boolean DEFAULT false,
  finance_can_write   boolean DEFAULT false,
  finance_can_delete  boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permissions_user ON permissions(user_id);
```

Why: We decouple “where a user can go” (roles) from “what they can do” (flags), and collapse insert/update into a single `write` toggle as requested.

---

## Step 1.1 — Enable RLS on `public.permissions` and add minimal policies

Enabling RLS removes the warning and ensures only safe access paths are allowed.

```sql
-- Enable RLS (safe, non-destructive, but will block access until policies exist)
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Users can SELECT only their own row
DROP POLICY IF EXISTS permissions_select_own ON public.permissions;
CREATE POLICY permissions_select_own ON public.permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Only admin can INSERT/UPDATE/DELETE permissions rows by default
DROP POLICY IF EXISTS permissions_admin_insert ON public.permissions;
CREATE POLICY permissions_admin_insert ON public.permissions
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

DROP POLICY IF EXISTS permissions_admin_update ON public.permissions;
CREATE POLICY permissions_admin_update ON public.permissions
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

DROP POLICY IF EXISTS permissions_admin_delete ON public.permissions;
CREATE POLICY permissions_admin_delete ON public.permissions
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
);

-- Optional hardening for the helper function
ALTER FUNCTION has_perm(text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION has_perm(text, text) TO authenticated;
```

Why: Only admins can change permission flags; users can read their own row for UI display. This eliminates the Supabase RLS warning on `public.permissions`.

---

## Step 2 — Helper function `has_perm(department, action)`

```sql
CREATE OR REPLACE FUNCTION has_perm(dept text, action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT CASE
      WHEN dept = 'shipment' AND action = 'view'   THEN shipment_can_view
      WHEN dept = 'shipment' AND action = 'write'  THEN shipment_can_write
      WHEN dept = 'shipment' AND action = 'delete' THEN shipment_can_delete

      WHEN dept = 'trucking' AND action = 'view'   THEN trucking_can_view
      WHEN dept = 'trucking' AND action = 'write'  THEN trucking_can_write
      WHEN dept = 'trucking' AND action = 'delete' THEN trucking_can_delete

      WHEN dept = 'finance'  AND action = 'view'   THEN finance_can_view
      WHEN dept = 'finance'  AND action = 'write'  THEN finance_can_write
      WHEN dept = 'finance'  AND action = 'delete' THEN finance_can_delete
    END
    FROM permissions p
    WHERE p.user_id = auth.uid()
  ), false);
$$;
```

Why: Policies stay clean and readable.

---

## Step 3 — Backfill to preserve current behavior

This assumes your `profiles.roles` still include department roles (`'shipment'`, `'trucking'`, `'finance'`). It sets all three flags to true for the departments a user currently has, so nothing breaks when policies go live.

```sql
-- Create a row for every user (if missing)
INSERT INTO permissions (user_id)
SELECT id FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- Shipment role → full flags true
UPDATE permissions p
SET shipment_can_view = true,
    shipment_can_write = true,
    shipment_can_delete = true,
    updated_at = now()
FROM profiles pr
WHERE pr.id = p.user_id AND 'shipment' = ANY(pr.roles);

-- Trucking role → full flags true
UPDATE permissions p
SET trucking_can_view = true,
    trucking_can_write = true,
    trucking_can_delete = true,
    updated_at = now()
FROM profiles pr
WHERE pr.id = p.user_id AND 'trucking' = ANY(pr.roles);

-- Finance role → full flags true
UPDATE permissions p
SET finance_can_view = true,
    finance_can_write = true,
    finance_can_delete = true,
    updated_at = now()
FROM profiles pr
WHERE pr.id = p.user_id AND 'finance' = ANY(pr.roles);
```

Why: Users keep the same effective powers as today. You will tighten later via UI.

---

## Step 4 — Database RLS (example: `documents`)

Assumptions: table has `department text` in `('shipment','trucking','finance')` and `uploaded_by uuid`.

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Admin: everything
CREATE POLICY admin_all_documents ON documents
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles)))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles)));

-- Verifier: all on shipment only (unchanged)
CREATE POLICY verifier_all_shipment ON documents
FOR ALL TO authenticated
USING (
  department = 'shipment'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'verifier' = ANY(roles))
)
WITH CHECK (
  department = 'shipment'
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'verifier' = ANY(roles))
);

-- SELECT: needs view
CREATE POLICY perm_select_documents ON documents
FOR SELECT TO authenticated
USING (has_perm(department, 'view'));

-- INSERT: needs write; also bind creator
CREATE POLICY perm_insert_documents ON documents
FOR INSERT TO authenticated
WITH CHECK (
  has_perm(department, 'write')
  AND uploaded_by = auth.uid()
);

-- UPDATE: needs write (edit forever is allowed)
CREATE POLICY perm_update_documents ON documents
FOR UPDATE TO authenticated
USING (has_perm(department, 'write'));

-- DELETE: needs delete
CREATE POLICY perm_delete_documents ON documents
FOR DELETE TO authenticated
USING (has_perm(department, 'delete'));
```

Optional: Let original uploader update even without `write` by OR-ing `uploaded_by = auth.uid()` in the UPDATE policy.

---

## Step 5 — Storage RLS for `documents` bucket

Department is the first folder: `(storage.foldername(name))[1]`.

```sql
-- SELECT (download)
CREATE POLICY storage_select_granular ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
    OR ( (storage.foldername(name))[1] = 'shipment' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'verifier' = ANY(roles)) )
    OR has_perm((storage.foldername(name))[1], 'view')
  )
);

-- INSERT (upload)
CREATE POLICY storage_insert_granular ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
    OR ( (storage.foldername(name))[1] = 'shipment' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'verifier' = ANY(roles)) )
    OR has_perm((storage.foldername(name))[1], 'write')
  )
);

-- DELETE
CREATE POLICY storage_delete_granular ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'admin' = ANY(roles))
    OR ( (storage.foldername(name))[1] = 'shipment' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND 'verifier' = ANY(roles)) )
    OR has_perm((storage.foldername(name))[1], 'delete')
  )
);

-- UPDATE (metadata) can remain admin-only if needed
```

---

## Step 6 — Test

1. Log in as admin → upload/download/delete anywhere → should work.
2. Log in as verifier → shipment folder/table only → should work.
3. Log in as a user with only `shipment_can_view=true` → can read shipment, cannot upload/edit/delete.
4. Toggle `shipment_can_write=true` → now can insert and edit.
5. Toggle `shipment_can_delete=true` → now can delete.
6. Ensure trucking/finance behave according to their flags.

---

## Step 7 — Wire to User Management UI

For each department column in the grid, map to these levels:

- No Access → all three flags false
- View → `*_can_view`
- View + Write → `*_can_view` + `*_can_write`
- Full (View + Write + Delete) → all three true

“Access To Shipment Approval” column continues to toggle membership of `'verifier'` in `profiles.roles`.

Example upsert for shipment write on one user:

```sql
INSERT INTO permissions AS p (user_id, shipment_can_view, shipment_can_write)
VALUES ('00000000-0000-0000-0000-000000000000', true, true)
ON CONFLICT (user_id)
DO UPDATE SET
  shipment_can_view = EXCLUDED.shipment_can_view,
  shipment_can_write = EXCLUDED.shipment_can_write,
  updated_at = now();
```

---

## Notes

- Keep using `profiles.roles` for navigation and high-level access; these flags only control CRUD.
- Verifier stays shipment-scoped and bypasses flags; admin bypasses everywhere.
- Viewer will be implemented later via read-only views that return curated columns.

---

End of tutorial.
