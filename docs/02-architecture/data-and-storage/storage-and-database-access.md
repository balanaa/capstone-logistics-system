# Storage & Database Access

This document defines Supabase Storage and Database access rules, RLS policies, and department isolation strategies for Deegee.

---

See also:

- `docs/02-architecture/auth-and-rbac/roles-and-access.md`
- `docs/03-specs/domain/document-flows.md`
- `docs/02-architecture/auth-and-rbac/granular-permissions-supabase.md`

---

## Storage Structure (Supabase Storage)

### Bucket Name: `documents` (Private)

**Bucket Configuration:**

- **Visibility**: Private (requires authentication)
- **File Size Limit**: Default Supabase limit (50MB)
- **Allowed MIME Types** (Restricted):
  - `image/jpeg` — JPEG images
  - `image/png` — PNG images
  - `application/pdf` — PDF documents
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` — DOCX files
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` — XLSX files

**Folder Structure:**

```
documents/
  ├── shipment/    # Shipment department files
  ├── trucking/    # Trucking department files
  └── finance/     # Finance department files
```

**File Naming Convention:**

- Current (StorageTest uploader): `{department}/{timestampMs}-{filename}`

  - Example: `trucking/1728754930123-bol.pdf`
  - Reason: quick uniqueness without subfolders; simple flat listing in UI

- Future (Profile pages): `{department}/{HHMMSS}-{proNumber}-{filename}`; Shipment may include type tokens in filename when helpful (optional if type is implied by window)
  - Example: `shipment/103045-2025421-bol.pdf` (contains `bol` token for Bill of Lading)
  - Rationale: human-readable; ties file to PRO number; still flat in dept root
  - Note: Keep extension intact; sanitize parts to `[a-zA-Z0-9._-]`

**Filename tokens for type inference (profile uploads):**

- Shipment (current):
  - Bill of Lading → `bol`
  - Delivery Order → `do`
  - Invoice → `inv`
  - Packing List → `pck`
- Trucking/Finance: tokens TBA (to be added later)

---

## Storage Access Rules (RLS Policies)

### Policy Matrix

| Role       |         Upload          |       View/Download       |       Delete/Replace        |
| ---------- | :---------------------: | :-----------------------: | :-------------------------: |
| `shipment` | ✓ (to `shipment/` only) | ✓ (from `shipment/` only) | ✓ (ANY file in `shipment/`) |
| `trucking` | ✓ (to `trucking/` only) | ✓ (from `trucking/` only) | ✓ (ANY file in `trucking/`) |
| `finance`  | ✓ (to `finance/` only)  | ✓ (from `finance/` only)  | ✓ (ANY file in `finance/`)  |
| `verifier` | ✓ (to `shipment/` only) | ✓ (from `shipment/` only) | ✓ (ANY file in `shipment/`) |
| `viewer`   |   ✕ (NO file access)    |    ✕ (NO file access)     |              ✕              |
| `admin`    |     ✓ (ALL folders)     |      ✓ (ALL folders)      |        ✓ (ALL files)        |

### Key Rules

1. **Department Isolation**: Department roles can ONLY access files within their department folder(s).

   - Single-role user (e.g., `['shipment']`) can only access `shipment/` folder.
   - Multi-role user (e.g., `['shipment','finance']`) can access both `shipment/` and `finance/` folders.

2. **Verifier Scope**: Verifier operates exclusively within Shipment department.

   - Can upload/view/delete files in `shipment/` folder only.
   - Cannot access `trucking/` or `finance/` folders.

3. **Small Company Trust Model**: Any department member can delete/replace ANY file within their department folder.

   - No ownership-based restrictions at the file level.
   - Example: User A (shipment role) can delete a file uploaded by User B (also shipment role) from `shipment/` folder.

4. **Viewer Restrictions**: Viewer has NO direct file access.

   - Viewer can view profile pages but cannot download files.
   - Viewer sees only summary data from database (no file paths exposed).

5. **Replace Operation**: "Replacing" a file = DELETE old file + UPLOAD new file (two separate operations).
   - Users with upload + delete permissions can replace files.

### Supabase Storage RLS Policy Examples (SQL)

#### Policy 1: Upload to Own Department Folder

```sql
-- Shipment role can upload to shipment/ folder
CREATE POLICY "shipment_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- Trucking role can upload to trucking/ folder
CREATE POLICY "trucking_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'trucking'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'trucking' = ANY(profiles.roles)
  )
);

-- Finance role can upload to finance/ folder
CREATE POLICY "finance_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'finance'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'finance' = ANY(profiles.roles)
  )
);

-- Verifier can upload to shipment/ folder (verifier is shipment-scoped)
CREATE POLICY "verifier_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- Admin can upload to ALL folders
CREATE POLICY "admin_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);
```

#### Policy 2: View/Download from Own Department Folder

```sql
-- Shipment role can download from shipment/ folder
CREATE POLICY "shipment_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- Trucking role can download from trucking/ folder
CREATE POLICY "trucking_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'trucking'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'trucking' = ANY(profiles.roles)
  )
);

-- Finance role can download from finance/ folder
CREATE POLICY "finance_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'finance'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'finance' = ANY(profiles.roles)
  )
);

-- Verifier can download from shipment/ folder only
CREATE POLICY "verifier_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- Admin can download from ALL folders
CREATE POLICY "admin_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- Viewer has NO SELECT policy (cannot download files)
```

#### Policy 3: Delete from Own Department Folder (Trust-Based)

```sql
-- Shipment role can delete ANY file in shipment/ folder
CREATE POLICY "shipment_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- Trucking role can delete ANY file in trucking/ folder
CREATE POLICY "trucking_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'trucking'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'trucking' = ANY(profiles.roles)
  )
);

-- Finance role can delete ANY file in finance/ folder
CREATE POLICY "finance_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'finance'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'finance' = ANY(profiles.roles)
  )
);

-- Verifier can delete ANY file in shipment/ folder
CREATE POLICY "verifier_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- Admin can delete from ALL folders
CREATE POLICY "admin_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);
```

---

## Database Access Rules (RLS Policies)

### Current Tables

**Existing:**

- `profiles` (Supabase Auth users → roles mapping)

**Future (To Be Created):**

- Document tables (e.g., `documents`, `document_fields`, `document_items`)
- `actions_log` (audit logging)
- Shipment tracking tables (e.g., `shipments`, `reminders`)

### Database CRUD Permissions (Conceptual)

| Role       |      SELECT (View)      |  INSERT (Create)  |       UPDATE (Edit)        |       DELETE        |
| ---------- | :---------------------: | :---------------: | :------------------------: | :-----------------: |
| `shipment` |      ✓ (own dept)       |   ✓ (own dept)    |   ✓ (own dept, forever)    | ✓ (any in own dept) |
| `trucking` |      ✓ (own dept)       |   ✓ (own dept)    |   ✓ (own dept, forever)    | ✓ (any in own dept) |
| `finance`  |      ✓ (own dept)       |   ✓ (own dept)    |   ✓ (own dept, forever)    | ✓ (any in own dept) |
| `verifier` |    ✓ (shipment only)    | ✓ (shipment only) | ✓ (shipment only, forever) | ✓ (any in shipment) |
| `viewer`   | ✓ (all, limited fields) |         ✕         |             ✕              |          ✕          |
| `admin`    |      ✓ (all depts)      |   ✓ (all depts)   |       ✓ (all depts)        |    ✓ (all depts)    |

### Key Database Rules

1. **Department Isolation**: Department roles can ONLY query/modify data for their assigned department(s).

   - Use `department` column or similar field to filter by department.
   - RLS policies should check user's roles against document's department.

2. **Verifier Scope**: Verifier can query/modify ONLY Shipment department data.

   - RLS policies should restrict verifier to `WHERE department = 'shipment'`.

3. **Update Forever**: Uploaders can UPDATE their documents indefinitely (no status-based restrictions).

   - Documents do NOT become read-only after approval.
   - This allows corrections even after verification.

4. **Viewer Limited SELECT**: Viewer can SELECT from all tables but should only fetch summary fields.

   - Application logic (not RLS) should limit which columns are returned for viewer.
   - Example: Viewer query should NOT include `file_path` or full `extracted_fields` JSONB.

5. **Admin God-Mode**: Admin has full CRUD access across all tables and all departments.

### Example Database RLS Policy (Documents Table)

```sql
-- Example: documents table structure
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_number TEXT NOT NULL,
  document_type TEXT NOT NULL,
  department TEXT NOT NULL CHECK (department IN ('shipment','trucking','finance')),
  file_path TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'pending',
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP,
  extracted_fields JSONB,
  complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- SELECT: Shipment role can view shipment documents
CREATE POLICY "shipment_select_documents" ON documents
FOR SELECT TO authenticated
USING (
  department = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- SELECT: Verifier can view shipment documents
CREATE POLICY "verifier_select_documents" ON documents
FOR SELECT TO authenticated
USING (
  department = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- SELECT: Viewer can view ALL documents (limited fields handled by app logic)
CREATE POLICY "viewer_select_documents" ON documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'viewer' = ANY(profiles.roles)
  )
);

-- SELECT: Admin can view ALL documents
CREATE POLICY "admin_select_documents" ON documents
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- INSERT: Shipment role can create shipment documents
CREATE POLICY "shipment_insert_documents" ON documents
FOR INSERT TO authenticated
WITH CHECK (
  department = 'shipment'
  AND uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- INSERT: Verifier can create shipment documents
CREATE POLICY "verifier_insert_documents" ON documents
FOR INSERT TO authenticated
WITH CHECK (
  department = 'shipment'
  AND uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- INSERT: Admin can create documents in ALL departments
CREATE POLICY "admin_insert_documents" ON documents
FOR INSERT TO authenticated
WITH CHECK (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- UPDATE: Shipment role can update shipment documents (forever)
CREATE POLICY "shipment_update_documents" ON documents
FOR UPDATE TO authenticated
USING (
  department = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- UPDATE: Verifier can update shipment documents (forever)
CREATE POLICY "verifier_update_documents" ON documents
FOR UPDATE TO authenticated
USING (
  department = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- UPDATE: Admin can update ALL documents
CREATE POLICY "admin_update_documents" ON documents
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- DELETE: Shipment role can delete ANY shipment document
CREATE POLICY "shipment_delete_documents" ON documents
FOR DELETE TO authenticated
USING (
  department = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- DELETE: Verifier can delete ANY shipment document
CREATE POLICY "verifier_delete_documents" ON documents
FOR DELETE TO authenticated
USING (
  department = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- DELETE: Admin can delete ALL documents
CREATE POLICY "admin_delete_documents" ON documents
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- Repeat similar policies for trucking and finance departments...
```

---

## Multi-Role User Handling

### Storage Access for Multi-Role Users

Users with multiple department roles can access files from ALL their assigned departments.

**Example: User with `['shipment','finance']` roles**

- Can upload to `shipment/` and `finance/` folders
- Can download from `shipment/` and `finance/` folders
- Can delete any file in `shipment/` and `finance/` folders
- Cannot access `trucking/` folder

**Implementation:** RLS policies use `ANY(profiles.roles)` to check if user has at least one matching role.

### Database Access for Multi-Role Users

Multi-role users can query/modify data for ALL their assigned departments.

**Example: User with `['trucking','finance']` roles**

- Can SELECT documents WHERE `department IN ('trucking','finance')`
- Can INSERT documents with `department = 'trucking'` OR `department = 'finance'`
- Can UPDATE/DELETE documents in both trucking and finance departments

**Implementation:** RLS policies check if user's roles array contains the document's department role.

---

## Audit Logging Table (Future)

```sql
CREATE TABLE actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,  -- 'upload', 'edit', 'approve', 'delete', 'map_label', 'make_canonical'
  target_type TEXT NOT NULL,  -- 'document', 'shipment', 'file'
  target_id UUID NOT NULL,
  department TEXT,  -- 'shipment', 'trucking', 'finance'
  payload JSONB,  -- Deltas, old/new values, metadata
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE actions_log ENABLE ROW LEVEL SECURITY;

-- All roles can INSERT their own actions
CREATE POLICY "authenticated_insert_log" ON actions_log
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Admin can view ALL logs
CREATE POLICY "admin_select_log" ON actions_log
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- Users can view their own logs
CREATE POLICY "user_select_own_log" ON actions_log
FOR SELECT TO authenticated
USING (user_id = auth.uid());
```

---

## Implementation Checklist

### Phase 1: Storage Setup ✅ (Already Done)

- [x] Created `documents` bucket (Private)
- [x] Created folders: `shipment/`, `trucking/`, `finance/`
- [x] Set MIME type restrictions (jpg, png, pdf, docx, xlsx only)

### Phase 2: Storage RLS Policies (Ready to Implement)

**Status**: Bucket exists with no policies. Ready to add RLS policies.

- [ ] Enable RLS on `documents` bucket in Supabase Dashboard (Storage → documents → Policies)
- [ ] Create upload policies (per department + verifier + admin) — SQL examples provided below
- [ ] Create download policies (per department + verifier + admin) — SQL examples provided below
- [ ] Create delete policies (per department + verifier + admin) — SQL examples provided below
- [ ] Test with each role account (upload/download/delete files)

**To enable RLS**: Go to Supabase Dashboard → Storage → `documents` bucket → Click "New Policy" or run SQL below.

---

## Quick Start: Enable RLS Policies on `documents` Bucket

### Step 1: Enable RLS on Storage Bucket

Go to **Supabase Dashboard** → **Storage** → Select `documents` bucket → Click **Policies** tab → Click **Enable RLS**.

Or run this SQL in the **SQL Editor**:

```sql
-- Enable RLS on storage.objects for the documents bucket
-- (RLS is enabled on storage.objects table, filtered by bucket_id)
-- This command is informational; RLS is typically enabled via dashboard
```

### Step 2: Add All Storage Policies (Copy & Paste)

Go to **SQL Editor** in Supabase Dashboard and run this complete SQL script:

```sql
-- ===================================
-- STORAGE RLS POLICIES FOR 'documents' BUCKET
-- ===================================

-- ============ UPLOAD POLICIES (INSERT) ============

-- Shipment: Upload to shipment/ folder only
CREATE POLICY "shipment_upload_to_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- Trucking: Upload to trucking/ folder only
CREATE POLICY "trucking_upload_to_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'trucking'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'trucking' = ANY(profiles.roles)
  )
);

-- Finance: Upload to finance/ folder only
CREATE POLICY "finance_upload_to_own_folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'finance'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'finance' = ANY(profiles.roles)
  )
);

-- Verifier: Upload to shipment/ folder only (shipment-scoped)
CREATE POLICY "verifier_upload_to_shipment"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- Admin: Upload to ALL folders
CREATE POLICY "admin_upload_all_folders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- ============ DOWNLOAD POLICIES (SELECT) ============

-- Shipment: Download from shipment/ folder only
CREATE POLICY "shipment_download_from_own_folder"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- Trucking: Download from trucking/ folder only
CREATE POLICY "trucking_download_from_own_folder"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'trucking'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'trucking' = ANY(profiles.roles)
  )
);

-- Finance: Download from finance/ folder only
CREATE POLICY "finance_download_from_own_folder"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'finance'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'finance' = ANY(profiles.roles)
  )
);

-- Verifier: Download from shipment/ folder only
CREATE POLICY "verifier_download_from_shipment"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- Admin: Download from ALL folders
CREATE POLICY "admin_download_all_folders"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- Viewer: NO download policy (cannot access files)

-- ============ DELETE POLICIES (DELETE) ============

-- Shipment: Delete ANY file in shipment/ folder (trust-based)
CREATE POLICY "shipment_delete_from_own_folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'shipment' = ANY(profiles.roles)
  )
);

-- Trucking: Delete ANY file in trucking/ folder (trust-based)
CREATE POLICY "trucking_delete_from_own_folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'trucking'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'trucking' = ANY(profiles.roles)
  )
);

-- Finance: Delete ANY file in finance/ folder (trust-based)
CREATE POLICY "finance_delete_from_own_folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'finance'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'finance' = ANY(profiles.roles)
  )
);

-- Verifier: Delete ANY file in shipment/ folder
CREATE POLICY "verifier_delete_from_shipment"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'shipment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'verifier' = ANY(profiles.roles)
  )
);

-- Admin: Delete from ALL folders
CREATE POLICY "admin_delete_all_folders"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- ============ UPDATE POLICIES (UPDATE) - For file metadata updates ============

-- Admin only: Update file metadata
CREATE POLICY "admin_update_file_metadata"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);

-- End of Storage RLS Policies
```

### Step 3: Verify Policies

After running the SQL:

1. Go to **Storage** → `documents` bucket → **Policies** tab
2. You should see 15 policies total:
   - 5 INSERT policies (upload)
   - 5 SELECT policies (download)
   - 5 DELETE policies

### Step 4: Test with Each Role

**Test Upload:**

- Login as `shipment@email.com` → Try uploading to `shipment/` folder → ✅ Should succeed
- Login as `shipment@email.com` → Try uploading to `trucking/` folder → ❌ Should fail

**Test Download:**

- Login as `trucking@email.com` → Try downloading from `trucking/` folder → ✅ Should succeed
- Login as `trucking@email.com` → Try downloading from `shipment/` folder → ❌ Should fail

**Test Delete:**

- Login as `finance@email.com` → Upload a file to `finance/` folder
- Login with different `finance` user → Try deleting that file → ✅ Should succeed (trust model)

**Test Viewer Restriction:**

- Login as `viewer@email.com` → Try any file operation → ❌ Should fail (no policies for viewer)

**Test Admin God-Mode:**

- Login as `admin@email.com` → Upload/download/delete from ANY folder → ✅ All should succeed

---

### Phase 3: Database Schema (Future)

- [ ] Design `documents` table schema
- [ ] Design `shipments` table schema (PRO Number tracking)
- [ ] Design `reminders` table schema
- [ ] Design `actions_log` table schema

### Phase 4: Database RLS Policies (Future)

- [ ] Enable RLS on all tables
- [ ] Create SELECT policies (department isolation + viewer limited + admin all)
- [ ] Create INSERT policies (department-scoped)
- [ ] Create UPDATE policies (forever editing allowed)
- [ ] Create DELETE policies (trust-based within dept)
- [ ] Test with each role account

### Phase 5: Application Logic (Future)

- [ ] Implement viewer limited field fetching (exclude file_path, full extracted_fields)
- [ ] Implement operation-level permission checks (before upload/edit/delete actions)
- [ ] Implement audit logging (on all mutating operations)
- [ ] Implement file replacement workflow (delete old + upload new)

---

## Developer Notes

- **Frontend role checks are UI-level only**: All security must be enforced server-side via RLS policies.
- **Small company trust model**: Department members can delete any file within their dept folder (no ownership checks).
- **Verifier is Shipment-scoped**: All verifier policies should restrict to `department = 'shipment'` or `shipment/` folder.
- **Viewer file restrictions**: Viewer has NO storage access. Profile pages should fetch only summary data (no file paths).
- **Multi-role flexibility**: RLS policies should use `ANY(profiles.roles)` to support users with multiple department roles.
- **Audit everything**: All mutating actions (upload, edit, approve, delete, map, make_canonical) must create an `actions_log` entry.

---
