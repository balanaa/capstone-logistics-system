# Verifier Backend Implementation Guide

This document provides a comprehensive guide for implementing the backend systems to support the Verifier page functionality. The Verifier page is currently implemented with mock data and is ready for backend integration.

---

## Overview

The Verifier system manages document conflicts that arise from:

1. **System-detected conflicts**: Cross-document data mismatches found during validation
2. **Manual flags**: Issues raised by department encoders when they notice problems
3. **Automated validation**: Calculation errors, date discrepancies, format issues

---

## Database Tables

The following tables are already defined in the database schema (see `docs/02-architecture/sql/create_shipment_tables.sql`):

### 1. `document_conflicts`

Stores cross-document field-level conflicts.

```sql
CREATE TABLE document_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  canonical_key TEXT NOT NULL,
  new_value TEXT NOT NULL,
  existing_value TEXT NOT NULL,
  error_source TEXT DEFAULT 'unknown' CHECK (error_source IN ('first_upload', 'new_upload', 'unknown')),
  correct_value TEXT NULL,
  resolution_note TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved_kept', 'resolved_updated')),
  resolved_by UUID NULL REFERENCES auth.users(id),
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

**Status Flow**:

- `open` → initial state when conflict detected
- `resolved_kept` → verifier kept existing value
- `resolved_updated` → verifier updated to new value

### 2. `document_item_conflicts`

Stores line-item level conflicts (for invoices/packing lists).

```sql
CREATE TABLE document_item_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  line_no INT NOT NULL,
  conflict_type TEXT NOT NULL,
  new_value TEXT NOT NULL,
  existing_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved_kept', 'resolved_updated')),
  resolved_by UUID NULL REFERENCES auth.users(id),
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (document_id, line_no, conflict_type)
);
```

### 3. `document_issues`

Stores manually flagged issues from encoders.

```sql
CREATE TABLE document_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pro_number TEXT NOT NULL REFERENCES pro(pro_number) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('wrong_file', 'data_typo', 'data_inconsistent', 'wrong_calculation', 'other')),
  raised_by_role TEXT NOT NULL,
  raised_by_user UUID NOT NULL REFERENCES auth.users(id),
  note TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_by UUID NULL REFERENCES auth.users(id),
  resolved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now()
);
```

### 4. `actions_log`

Audit trail for all verifier actions.

```sql
CREATE TABLE actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,  -- 'resolve_conflict', 'dismiss_conflict', 'upload_corrected', etc.
  target_type TEXT NOT NULL,  -- 'document_conflict', 'document_issue'
  target_id UUID NOT NULL,
  department TEXT,  -- 'shipment', 'trucking', 'finance'
  payload JSONB,  -- Deltas, resolution details, metadata
  created_at TIMESTAMP DEFAULT now()
);
```

---

## Conflict Detection Logic

### When Conflicts Are Created

Conflicts should be detected and created during document submission:

1. **On Document Upload** (in `insertDocument` service):

   ```javascript
   // After inserting document fields
   const conflicts = await detectCrossDocumentConflicts(
     proNumber,
     documentType,
     fields
   );
   if (conflicts.length > 0) {
     await insertDocumentConflicts(documentId, conflicts);
     // Set document status to 'pending_verifier' if conflicts found
     await updateDocumentStatus(documentId, "pending_verifier");
   }
   ```

2. **Field Comparison Rules**:

   - **Consignee Name**: Normalize and compare (ignore case, trim whitespace, handle abbreviations)
   - **Consignee Address**: Full address comparison
   - **Quantities**: Must match exactly across all documents for same PRO
   - **Amounts**: Calculation validation (quantity × unit price = total)
   - **Container Numbers**: Must be consistent across B/L, D/O, Packing List
   - **Dates**: Logical date sequence (invoice date ≤ delivery date)
   - **Weights**: Gross weight consistency between B/L and Packing List

3. **Cross-Document Validation Query Example**:
   ```sql
   -- Check for consignee mismatch between Bill of Lading and Invoice
   SELECT
     d1.id as document1_id,
     d1.document_type as document1_type,
     d2.id as document2_id,
     d2.document_type as document2_type,
     df1.normalized_value as bol_consignee,
     df2.normalized_value as invoice_consignee
   FROM documents d1
   JOIN document_fields df1 ON df1.document_id = d1.id
   JOIN documents d2 ON d2.pro_number = d1.pro_number AND d2.document_type = 'invoice'
   JOIN document_fields df2 ON df2.document_id = d2.id
   WHERE d1.document_type = 'bill_of_lading'
     AND d1.pro_number = $1
     AND df1.canonical_key = 'consignee'
     AND df2.canonical_key = 'consignee'
     AND df1.normalized_value != df2.normalized_value;
   ```

---

## API Endpoints

### 1. Get Verifier Status Counts

**Endpoint**: `GET /api/verifier/status-counts`

**Purpose**: Fetch counts for the pie chart (pending vs resolved conflicts)

**Query**:

```sql
SELECT
  COUNT(*) FILTER (WHERE status = 'open') as pending,
  COUNT(*) FILTER (WHERE status IN ('resolved_kept', 'resolved_updated')) as resolved
FROM document_conflicts
WHERE document_id IN (
  SELECT id FROM documents WHERE department = 'shipment'
);
```

**Response**:

```json
{
  "pending": 8,
  "resolved": 42
}
```

**RLS**: Verifier and admin can access all shipment conflicts.

---

### 2. Get Conflict List

**Endpoint**: `GET /api/verifier/conflicts`

**Query Parameters**:

- `search` (string): Search in PRO number, conflict type, document types
- `conflict_type` (string): Filter by conflict type
- `start_date` (ISO date): Filter by flagged date >= start
- `end_date` (ISO date): Filter by flagged date <= end
- `status` (string): Filter by status (default: 'open')

**Query**:

```sql
SELECT
  dc.id,
  dc.canonical_key,
  dc.new_value,
  dc.existing_value,
  dc.status,
  dc.created_at as flagged_date,
  d.pro_number,
  d.document_type,
  d.uploaded_by,
  p.full_name as flagged_by_name,
  -- Join with other documents for comparison
  d2.id as related_doc_id,
  d2.document_type as related_doc_type
FROM document_conflicts dc
JOIN documents d ON dc.document_id = d.id
JOIN profiles p ON d.uploaded_by = p.id
LEFT JOIN documents d2 ON d2.pro_number = d.pro_number AND d2.id != d.id
WHERE d.department = 'shipment'
  AND dc.status = $1
  AND ($2::text IS NULL OR d.pro_number ILIKE '%' || $2 || '%')
  AND ($3::timestamp IS NULL OR dc.created_at >= $3)
  AND ($4::timestamp IS NULL OR dc.created_at <= $4)
ORDER BY dc.created_at DESC;
```

**Response**: Array of conflict objects (see mock data structure in `verifierStatus.js`)

---

### 3. Get Conflict Details

**Endpoint**: `GET /api/verifier/conflicts/:conflictId`

**Purpose**: Get full conflict details including both documents and their fields

**Query**:

```sql
-- Get conflict details
SELECT
  dc.*,
  d1.id as doc1_id,
  d1.document_type as doc1_type,
  d1.file_path as doc1_file,
  d1.original_filename as doc1_filename,
  d2.id as doc2_id,
  d2.document_type as doc2_type,
  d2.file_path as doc2_file,
  d2.original_filename as doc2_filename
FROM document_conflicts dc
JOIN documents d1 ON dc.document_id = d1.id
JOIN documents d2 ON d2.pro_number = d1.pro_number
  AND d2.document_type != d1.document_type
  AND d2.department = 'shipment'
WHERE dc.id = $1;

-- Get all fields for both documents
SELECT
  df.document_id,
  df.canonical_key,
  df.normalized_value
FROM document_fields df
WHERE df.document_id IN ($doc1_id, $doc2_id);
```

**Response**: Full conflict object with both documents' fields and file paths

**Note**: Generate signed URLs for file previews before sending response.

---

### 4. Resolve Conflict

**Endpoint**: `POST /api/verifier/conflicts/:conflictId/resolve`

**Body**:

```json
{
  "resolution": "keep_left" | "keep_right" | "upload_new",
  "note": "Optional resolution note",
  "corrected_value": "Only if upload_new"
}
```

**Logic**:

1. Validate verifier role and permissions
2. Update `document_conflicts` table:

   - Set `status` = 'resolved_kept' or 'resolved_updated'
   - Set `resolved_by` = current user ID
   - Set `resolved_at` = now()
   - Set `correct_value` if provided
   - Set `resolution_note` if provided

3. If `resolution` = 'keep_left' or 'keep_right':

   - Update canonical fields in `document_fields`
   - Mark incorrect document for review or deletion

4. If `resolution` = 'upload_new':

   - Mark both documents as `requires_reencode = true`
   - Await new file upload from verifier

5. Create audit log entry:
   ```sql
   INSERT INTO actions_log (user_id, action, target_type, target_id, payload)
   VALUES ($userId, 'resolve_conflict', 'document_conflict', $conflictId, $payload);
   ```

**Response**:

```json
{
  "success": true,
  "message": "Conflict resolved successfully"
}
```

---

### 5. Dismiss Conflict

**Endpoint**: `POST /api/verifier/conflicts/:conflictId/dismiss`

**Body**:

```json
{
  "reason": "Optional dismissal reason"
}
```

**Logic**:

1. Update `document_conflicts` to set `status` = 'resolved_kept' (no change needed)
2. Add resolution note: "Dismissed - false positive"
3. Create audit log entry

**Response**:

```json
{
  "success": true,
  "message": "Conflict dismissed successfully"
}
```

---

## RLS (Row Level Security) Policies

### `document_conflicts` Table

```sql
-- Verifier can SELECT all shipment conflicts
CREATE POLICY "verifier_select_conflicts" ON document_conflicts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_conflicts.document_id
    AND d.department = 'shipment'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'verifier' = ANY(profiles.roles)
    )
  )
);

-- Verifier can UPDATE conflicts (resolve/dismiss)
CREATE POLICY "verifier_update_conflicts" ON document_conflicts
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.id = document_conflicts.document_id
    AND d.department = 'shipment'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND 'verifier' = ANY(profiles.roles)
    )
  )
);

-- Admin god-mode access
CREATE POLICY "admin_all_conflicts" ON document_conflicts
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);
```

---

## Conflict Types Reference

### Field-Level Conflicts

| Conflict Type                | canonical_key                         | Description                              |
| ---------------------------- | ------------------------------------- | ---------------------------------------- |
| Consignee Mismatch           | `consignee`                           | Consignee name differs between documents |
| Consignee Address Mismatch   | `consignee_address`                   | Full address differs                     |
| Quantity Mismatch            | `quantity`                            | Total quantity differs                   |
| Amount Mismatch              | `total_amount`                        | Invoice amount differs                   |
| Container Number Mismatch    | `container_no`                        | Container number inconsistent            |
| Product Description Mismatch | `product_description`                 | Product names differ significantly       |
| Date Discrepancy             | `delivery_date`, `invoice_date`, etc. | Date logic violation                     |
| Weight Discrepancy           | `gross_weight`, `net_weight`          | Weight values differ                     |
| Calculation Error            | `amount` (item level)                 | qty × unit_price ≠ amount                |

### Issue Types (Manual Flags)

| Issue Type          | Description                                        |
| ------------------- | -------------------------------------------------- |
| `wrong_file`        | Uploaded file is incorrect or corrupted            |
| `data_typo`         | OCR or manual entry typo in extracted data         |
| `data_inconsistent` | Data doesn't match reality (encoder noticed error) |
| `wrong_calculation` | Mathematical calculation error                     |
| `other`             | Other issue (requires note)                        |

---

## Conflict Resolution Workflow

### State Machine

```
[Upload Document]
    ↓
[Run Validations]
    ↓
[Conflicts Found?] --No--> [Document Status = 'complete']
    ↓ Yes
[Create document_conflicts rows]
    ↓
[Document Status = 'pending_verifier']
    ↓
[Verifier Reviews] ← User can also manually flag issues
    ↓
[Resolution Action]
    ├─ Keep Left → Update canonical fields from left doc
    ├─ Keep Right → Update canonical fields from right doc
    ├─ Upload New → Mark docs for re-upload, await new file
    └─ Dismiss → Mark as false positive, no change
    ↓
[Update conflict status to 'resolved_*']
    ↓
[Log action to actions_log]
    ↓
[Document Status = 'complete' if all conflicts resolved]
```

### Canonical Data Updates

When a conflict is resolved by keeping one document's data:

1. Identify the "correct" document (left or right)
2. Update `document_fields` for the "incorrect" document:

   ```sql
   UPDATE document_fields
   SET normalized_value = $correctValue,
       raw_value = $correctValue  -- or mark as needs review
   WHERE document_id = $incorrectDocId
     AND canonical_key = $conflictKey;
   ```

3. Optionally mark incorrect document:
   ```sql
   UPDATE documents
   SET requires_reencode = true,
       notes = 'Field updated by verifier due to conflict resolution'
   WHERE id = $incorrectDocId;
   ```

---

## Frontend Integration Points

Replace mock functions in `src/services/supabase/verifierStatus.js`:

1. **`getVerifierStatusCounts()`** → Call `GET /api/verifier/status-counts`
2. **`getVerifierConflicts(filters)`** → Call `GET /api/verifier/conflicts` with query params
3. **`getConflictById(id)`** → Call `GET /api/verifier/conflicts/:id`
4. **`resolveConflict(id, resolution, metadata)`** → Call `POST /api/verifier/conflicts/:id/resolve`
5. **`dismissConflict(id, reason)`** → Call `POST /api/verifier/conflicts/:id/dismiss`

### Example Real Implementation

```javascript
// src/services/supabase/verifierStatus.js (real version)
import { supabase } from "./client";

export async function getVerifierStatusCounts() {
  const { data, error } = await supabase.rpc("get_verifier_status_counts");
  if (error) throw error;
  return data;
}

export async function getVerifierConflicts(filters = {}) {
  let query = supabase
    .from("document_conflicts")
    .select(
      `
      *,
      documents!inner(
        pro_number,
        document_type,
        department,
        uploaded_by,
        profiles!uploaded_by(full_name)
      )
    `
    )
    .eq("documents.department", "shipment")
    .order("created_at", { ascending: false });

  if (filters.search) {
    query = query.or(`pro_number.ilike.%${filters.search}%`);
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  // ... more filters

  const { data, error } = await query;
  if (error) throw error;
  return data;
}
```

---

## Performance Considerations

1. **Indexing**: Add indexes on frequently queried columns:

   ```sql
   CREATE INDEX idx_conflicts_status ON document_conflicts(status);
   CREATE INDEX idx_conflicts_created ON document_conflicts(created_at DESC);
   CREATE INDEX idx_conflicts_doc_id ON document_conflicts(document_id);
   ```

2. **Pagination**: Implement cursor-based pagination for large conflict lists

3. **Caching**: Cache status counts (refresh every 5 minutes)

4. **Signed URLs**: Generate signed URLs on-demand with 10-minute TTL

---

## Testing Checklist

- [ ] Conflict detection triggers on document upload
- [ ] Verifier can view all shipment conflicts
- [ ] Verifier can resolve conflicts (keep left/right)
- [ ] Canonical fields update correctly after resolution
- [ ] Dismiss conflict marks as false positive
- [ ] Audit log entries created for all actions
- [ ] RLS policies prevent unauthorized access
- [ ] Viewer role can see conflicts but cannot resolve (read-only)
- [ ] Admin can perform all verifier actions
- [ ] Conflict counts update in real-time after resolution

---

## Future Enhancements

1. **Real-time Updates**: Use Supabase real-time subscriptions to auto-refresh queue
2. **Conflict Prioritization**: Add priority/severity levels
3. **Bulk Actions**: Resolve multiple similar conflicts at once
4. **ML-Assisted Resolution**: Suggest likely correct value based on historical data
5. **File Diff View**: Show actual file differences side-by-side with annotations
6. **Notification System**: Email/in-app notifications for new conflicts
7. **Conflict History**: Track all resolutions for a PRO number
8. **Auto-Resolution Rules**: Define rules to auto-resolve certain conflict types

---

## Related Documentation

- `docs/02-architecture/data-and-storage/storage-and-database-access.md` - RLS policies
- `docs/02-architecture/auth-and-rbac/roles-and-access.md` - Verifier role permissions
- `docs/03-specs/domain/db-shipment.md` - Database schema details
- `docs/04-ops/verifier-workflow-guide.md` - User guide for verifiers

---

_This document will be updated as the backend implementation progresses._
