# Actions Log Audit Trail - Complete Guide

## Table of Contents

- [Part 1: Why This Exists](#part-1-why-this-exists)
- [Part 2: Understanding the System](#part-2-understanding-the-system)
- [Part 3: ACTION PLAN](#part-3-action-plan) ⭐ **Implementation Checklist**
- [Part 4: Verification & Testing](#part-4-verification--testing)

---

## Part 1: Why This Exists

### Purpose and Goals

**Primary Goal**: Track all document operations (upload, edit, delete) in the `actions_log` table to answer:

- **Who** did the action?
- **What** action was performed?
- **Which** document was affected?
- **When** did it happen?

**Future Use**: Power a notification/activity feed showing "John uploaded Invoice for PRO 2025001" style messages.

### Design Decisions and Rationale

#### Q: Why log ONLY metadata (not actual data values)?

**A**: Because the actual data is already stored in the proper tables:

- `documents` table: file_path, uploaded_by, uploaded_at, updated_at, updated_by
- `document_fields` table: all field values
- `document_items` table: all line item data

The `actions_log` provides a **timeline** of WHO did WHAT and WHEN, while the actual data lives in its proper tables.

**Benefits**:

- Keeps actions_log lean and fast
- No data duplication
- Simple queries for notifications
- Can always join to get current values if needed

#### Q: Why target_type: 'document' always?

**A**: For future extensibility. Your `actions_log` table will track multiple entity types:

- `target_type: 'document'` - document operations (current implementation)
- `target_type: 'issue'` - verifier issue creation/resolution (future)
- `target_type: 'conflict'` - conflict resolution (future)
- `target_type: 'pro'` - PRO status changes (future)

This makes querying specific action types easy: `WHERE target_type = 'document'`

#### Q: Why five specific action types?

**Decision**: Use five distinct action types:

- `document_file_uploaded` - New document with file (Create Shipment)
- `document_data_uploaded` - Upload document to existing PRO (Ghost document window)
- `document_file_replaced` - Replace existing file (File replacement in edit overlay)
- `document_data_updated` - Edit existing document data (no file change)
- `document_deleted` - Remove document and file

**Rationale**:

- **Clarity**: Each action type clearly indicates what happened
- **File vs Data distinction**: Separates file operations from data-only operations
- **Business logic**: File replacement requires verifier review (`requires_reencode = true`)
- **Context awareness**: Different UI contexts (new PRO vs existing PRO) have different action types
- **Notification text**: Easy to generate specific user-friendly messages
- **Audit trail**: Complete separation of file and data operations for better tracking

#### Q: When does 'missing userId or documentId' trigger?

**A**: This warning triggers when:

1. User is not authenticated (session expired) - `userId` is null
2. Document creation failed but code tries to log anyway - `documentId` is null
3. The warning prevents a database error and allows the operation to continue

The operation will still succeed even if logging is skipped.

### What Gets Logged

**Log Entry Structure**:

```javascript
{
  user_id: "uuid",              // WHO performed the action
  action: "document_...",       // WHAT action was performed
  target_type: "document",      // TYPE of target (always 'document')
  target_id: "document-uuid",   // WHICH document was affected
  payload: {                    // CONTEXT
    pro_number: "2025001",
    department: "shipment",
    document_type: "invoice"    // Stored in JSONB payload
  },
  created_at: "timestamp"       // WHEN it happened (automatic)
}
```

**What is NOT Logged**:

- Actual field values (e.g., invoice amounts, BL numbers)
- File contents
- Specific field changes (old vs new values)
- These can be added later if needed, but current requirement is just "who did what when"

---

## Part 2: Understanding the System

### Document Workflows

#### 1. Create Shipment (New PRO + BOL)

**Component**: `CreateShipmentOverlay.js` OR `SimpleCreateShipmentOverlay.js`

**Flow**: Two-step process

1. User enters PRO number + selects BOL file → Confirm
2. User fills BOL form fields → Submit

**Where it happens**: `src/pages/Shipment/Shipment.js` - `handleSubmitStep2` function

**Database operations**:

```javascript
// 1. Upload file to storage
const path = `shipment/${timeTag}-${safePro}-bol-${safeName}`;
await supabase.storage.from("documents").upload(path, file);

// 2. Upsert PRO
await upsertPro(proNumber);

// 3. Insert document (LOGS HERE via insertDocument())
const documentId = await insertDocument({
  proNumber,
  department: "shipment",
  documentType: "bill_of_lading",
  filePath: path,
  uploadedBy: userId,
});

// 4. Insert document_fields
await supabase.from("document_fields").insert(fieldRows);
```

**Action logged**: `document_file_uploaded` (already implemented)

#### 2. Upload Document (Existing PRO)

**Component**: Ghost document window in `Department.js`

**Triggers**: Click on dashed box "Click to upload"

**Upload overlays by type**:

- **Invoice**: `InvoiceUploadAndEditOverlay.js`
- **Packing List**: `PackingListUploadAndEditOverlay.js`
- **BOL**: `BolUploadAndEditOverlay.js`
- **Delivery Order**: `DeliveryOrderUploadAndEditOverlay.js`

**Database operations**:

```javascript
// 1. Upload file to storage
const path = `shipment/${timeTag}-${safePro}-${docType}-${safeName}`;
await supabase.storage.from("documents").upload(path, file);

// 2. Insert document (LOGS HERE via insertDocument())
const documentId = await insertDocument({
  proNumber,
  department: "shipment",
  documentType: documentType,
  filePath: path,
  uploadedBy: userId,
});

// 3. Insert document_fields + document_items
```

**Action logged**: `document_data_uploaded` (NEW - to be implemented)

#### 3. Edit Document

**Component**: Document window in `Document.js`

**Trigger**: "Edit" button

**Opens**: Type-specific edit overlay

**Two types of edits**:

**A. File Replacement** (InvoiceEditOverlay only):

- User uploads new file to replace existing file
- Updates `documents.file_path` and sets `requires_reencode = true`
- Existing `document_fields` and `document_items` remain unchanged

**B. Data Update** (All edit overlays):

- User modifies form fields or table items
- No file change

**Database operations**:

```javascript
// File Replacement (A)
// 1. Upload new file to storage
// 2. UPDATE documents table (file_path, requires_reencode = true)
// 3. ADD LOGGING HERE (NEW) ← document_file_replaced

// Data Update (B)
// 1. DELETE all document_fields
// 2. INSERT new document_fields
// 3. DELETE all document_items (if applicable)
// 4. INSERT new document_items (if applicable)
// 5. UPDATE documents table (updated_at, updated_by)
// 6. ADD LOGGING HERE (NEW) ← document_data_updated
```

**Actions logged**:

- `document_file_replaced` (NEW - for file replacement)
- `document_data_updated` (NEW - for data-only updates)

#### 4. Delete Document

**Component**: Document window in `Document.js`

**Trigger**: "Delete" button → Confirmation modal

**Database operations**:

```javascript
// 1. Get user session
// 2. Delete file from storage
// 3. Delete document (cascades to fields and items)
// 4. ADD LOGGING HERE (NEW) ← This is what we're implementing
// 5. Update local state
```

**Action logged**: `document_deleted` (NEW - to be implemented)

### Database Schema

#### actions_log Table (Current)

```sql
CREATE TABLE actions_log (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### Document Type Breakdown

| Document Type      | documents | document_fields    | document_items | Notes                                       |
| ------------------ | --------- | ------------------ | -------------- | ------------------------------------------- |
| **Bill of Lading** | ✓         | ✓ (15+ fields)     | ✗              | Container/seal pairs stored as JSON         |
| **Invoice**        | ✓         | ✓ (6 fields)       | ✓              | Line items with product, qty, price, amount |
| **Packing List**   | ✓         | ✓ (3 totals)       | ✓              | Line items with product, qty, weights       |
| **Delivery Order** | ✓         | ✓ (similar to BOL) | ✗              | Similar structure to BOL                    |

**Invoice Fields**: invoice_no, invoice_date, incoterms, invoice_currency, total_quantity, total_amount

**Packing List Fields**: total_quantity, total_net_weight, total_gross_weight (ONLY totals)

**BOL Fields**: bl_number, shipper, consignee, shipping_line, vessel_name, voyage_no, port_of_loading, port_of_discharge, place_of_delivery, container_specs, no_of_packages, packaging_kind, goods_classification, description_of_goods, gross_weight, container_seal_pairs (JSON), eta, detention_free_time_start, detention_free_time_end

### Action Types Summary

| Action                   | When                   | File Operation                 | DB Tables Affected                                                                                  |
| ------------------------ | ---------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `document_file_uploaded` | New document uploaded  | File uploaded to storage       | documents + document_fields + document_items (if applicable)                                        |
| `document_data_uploaded` | Upload to existing PRO | File uploaded to storage       | documents + document_fields + document_items (if applicable)                                        |
| `document_file_replaced` | File replaced          | New file uploaded, old deleted | documents (UPDATE file_path) + requires_reencode = true                                             |
| `document_data_updated`  | Document edited        | No file change                 | documents (UPDATE) + document_fields (DELETE+INSERT) + document_items (DELETE+INSERT if applicable) |
| `document_deleted`       | Document deleted       | File deleted from storage      | documents (DELETE cascades to fields and items)                                                     |

### Query Examples for Notifications

#### Recent Activity Feed (Last 50 actions)

```sql
SELECT
  al.created_at,
  al.action,
  al.payload->>'document_type' as document_type,
  al.payload->>'pro_number' as pro_number,
  u.email as user_email,
  u.raw_user_meta_data->>'full_name' as user_name
FROM actions_log al
JOIN auth.users u ON al.user_id = u.id
WHERE al.target_type = 'document'
ORDER BY al.created_at DESC
LIMIT 50;
```

#### Activity for Specific PRO

```sql
SELECT
  al.created_at,
  al.action,
  al.payload->>'document_type' as document_type,
  u.email as user_email
FROM actions_log al
JOIN auth.users u ON al.user_id = u.id
WHERE al.target_type = 'document'
  AND al.payload->>'pro_number' = '2025001'
ORDER BY al.created_at DESC;
```

#### Activity by User

```sql
SELECT
  al.created_at,
  al.action,
  al.payload->>'document_type' as document_type,
  al.payload->>'pro_number' as pro_number
FROM actions_log al
WHERE al.user_id = 'user-uuid-here'
  AND al.target_type = 'document'
ORDER BY al.created_at DESC
LIMIT 100;
```

#### Document Type Summary (Last 30 days)

```sql
SELECT
  al.payload->>'document_type' as document_type,
  al.action,
  COUNT(*) as count
FROM actions_log al
WHERE al.target_type = 'document'
  AND al.created_at >= NOW() - INTERVAL '30 days'
GROUP BY al.payload->>'document_type', al.action
ORDER BY count DESC;
```

**Example Output**:

```
created_at              | action                  | document_type | pro_number | user_email
2025-01-15 10:30:00    | document_data_updated   | invoice       | 2025001    | john@example.com
2025-01-15 09:45:00    | document_file_replaced  | invoice       | 2025001    | jane@example.com
2025-01-15 09:15:00    | document_data_uploaded | bill_of_lading| 2025001    | jane@example.com
2025-01-14 16:45:00    | document_deleted        | packing_list  | 2024999    | admin@example.com
```

---

## Part 3: ACTION PLAN

⭐ **THIS IS YOUR IMPLEMENTATION CHECKLIST** ⭐

**Read this section repeatedly during implementation. Use search patterns to find code locations.**

### Step 1: Create Audit Logging Helper Function

**File**: `src/services/supabase/documents.js`

**Where to add**: After the `insertDocument()` function

**Code to add**:

```javascript
/**
 * Log document action to actions_log table for audit trail
 * @param {Object} params
 * @param {string} params.userId - User ID performing the action
 * @param {string} params.action - Action type: 'document_file_uploaded', 'document_data_uploaded', 'document_file_replaced', 'document_data_updated', 'document_deleted'
 * @param {string} params.documentId - Document UUID
 * @param {string} params.proNumber - PRO number
 * @param {string} params.department - Department (e.g., 'shipment')
 * @param {string} params.documentType - Document type: 'bill_of_lading', 'invoice', 'packing_list', 'delivery_order'
 */
export async function logDocumentAction({
  userId,
  action,
  documentId,
  proNumber,
  department,
  documentType,
}) {
  // Validate required fields
  if (!userId || !documentId) {
    console.warn("⚠️ Skipping action log: missing userId or documentId", {
      userId,
      documentId,
    });
    return;
  }

  const { error } = await supabase.from("actions_log").insert({
    user_id: userId,
    action: action,
    target_type: "document",
    target_id: documentId,
    payload: {
      pro_number: String(proNumber),
      department: department || "shipment",
      document_type: documentType,
    },
  });

  if (error) {
    console.error("❌ Error logging document action:", error);
    // Don't throw - the actual operation was successful
  } else {
    console.log(
      `✅ Logged action: ${action} for ${documentType} (${documentId})`
    );
  }
}
```

### Step 2: Update Upload Logging Action Names

**File**: `src/services/supabase/documents.js`

**Current**: `insertDocument()` logs `document_file_uploaded` for all uploads

**Change to**: Differentiate between new PRO uploads and existing PRO uploads

**Option A**: Modify `insertDocument()` to accept action type parameter
**Option B**: Create separate functions for different upload contexts

**Why**: Distinguishes between "Create Shipment" (new PRO) and "Upload Document" (existing PRO) contexts

### Step 3: Add Audit Logging to Document Edit Operations

**File**: `src/components/Document.js`

#### Step 3a: Add Import

**Search for**: `import { insertDocumentFields`

**Change to**:

```javascript
import {
  insertDocumentFields,
  logDocumentAction,
} from "../services/supabase/documents";
```

#### Step 3b: Find ALL Edit Handlers

**How to find them**:

- Search for: `.update({ updated_at: new Date().toISOString()`
- This pattern appears in every edit handler
- Each occurrence needs logging added AFTER the update

**What to add AFTER each `.update()` call**:

```javascript
// Log the update action to actions_log
await logDocumentAction({
  userId: userId,
  action: "document_data_updated", // For data-only updates
  documentId: documentId,
  proNumber: proNo,
  department: "shipment",
  documentType: documentType,
});
```

**For file replacement in InvoiceEditOverlay**:

```javascript
// Log the file replacement action to actions_log
await logDocumentAction({
  userId: userId,
  action: "document_file_replaced", // For file replacement
  documentId: documentId,
  proNumber: proNumber,
  department: "shipment",
  documentType: "invoice",
});
```

**Expected edit handlers to update**:

- Invoice edit handler
- BOL edit handler
- Packing List edit handler
- Delivery Order edit handler

**Note**: The `documentType` variable should already exist in each handler's scope. If not, determine it from the context (e.g., from the overlay type or document data).

### Step 4: Add Audit Logging to Document Deletion

**File**: `src/components/Document.js`

**Search for**: The delete button's `onClick` handler that contains:

```javascript
await supabase.from("documents").delete().eq("id", documentId);
```

**Add AFTER the delete, BEFORE updating local state**:

```javascript
// Log the deletion action
const { data: sess } = await supabase.auth.getSession();
const userId = sess?.session?.user?.id;
if (userId && documentId) {
  await logDocumentAction({
    userId: userId,
    action: "document_deleted",
    documentId: documentId,
    proNumber: proNo,
    department: "shipment",
    documentType: documentType,
  });
}
```

**Note**: You may need to get the user session at the start of the delete handler if it's not already available.

### Files Summary

**Files to modify**:

1. `src/services/supabase/documents.js` - Add helper function + update action name
2. `src/components/Document.js` - Add import + logging to all edit handlers + delete handler

**No schema changes needed** - works with existing `actions_log` table structure.

---

## Part 4: Verification & Testing

### Testing Checklist

#### Upload Operations (Already Logged)

- [ ] Create new shipment with BOL - verify `document_file_uploaded` in actions_log
- [ ] Upload Invoice to existing PRO - verify `document_data_uploaded` (NEW)
- [ ] Upload Packing List to existing PRO - verify `document_data_uploaded` (NEW)
- [ ] Upload Delivery Order to existing PRO - verify `document_data_uploaded` (NEW)

#### Edit Operations (NEW - What You're Implementing)

- [ ] Edit Invoice data (no file change) - verify `document_data_updated` in actions_log
- [ ] Replace Invoice file - verify `document_file_replaced` in actions_log (NEW)
- [ ] Edit BOL data - verify `document_data_updated`
- [ ] Edit Packing List data - verify `document_data_updated`
- [ ] Edit Delivery Order data - verify `document_data_updated`

#### Delete Operations (NEW - What You're Implementing)

- [ ] Delete Invoice - verify `document_deleted` (check 3 tables deleted: documents, document_fields, document_items)
- [ ] Delete BOL - verify `document_deleted` (check 2 tables deleted: documents, document_fields)
- [ ] Delete Packing List - verify `document_deleted` (check 3 tables deleted)
- [ ] Delete Delivery Order - verify `document_deleted` (check 2 tables deleted)

### Verification Queries

#### Check Recent Logs

```sql
SELECT
  id,
  created_at,
  action,
  target_type,
  target_id,
  payload->>'document_type' as doc_type,
  payload->>'pro_number' as pro,
  user_id
FROM actions_log
WHERE target_type = 'document'
ORDER BY created_at DESC
LIMIT 20;
```

#### Verify Payload Structure

```sql
SELECT
  action,
  payload
FROM actions_log
WHERE target_type = 'document'
LIMIT 5;
```

**Expected payload**:

```json
{
  "pro_number": "2025001",
  "department": "shipment",
  "document_type": "invoice"
}
```

### Verification Checklist

- [ ] All entries have correct `document_type` in payload
- [ ] All entries have correct `pro_number` in payload
- [ ] All entries have valid `user_id`
- [ ] Query actions_log to generate notification list
- [ ] Test with expired session (should skip logging with warning)
- [ ] Verify operations succeed even if logging fails

### Troubleshooting

#### Issue: Logging not appearing in actions_log

**Check**:

1. Is the helper function exported? `export async function logDocumentAction`
2. Is it imported in Document.js? `import { ..., logDocumentAction } from ...`
3. Is the function being called? Check console for `✅ Logged action:` messages
4. Check for errors in console: `❌ Error logging document action:`

#### Issue: "missing userId or documentId" warning

**Check**:

1. Is user authenticated? Check session
2. Is documentId available in scope?
3. This is expected if session expired - operation should still succeed

#### Issue: Operations failing after adding logging

**Check**:

1. Make sure logging errors are caught and don't throw
2. Verify the try-catch in helper function doesn't throw
3. Check that logging happens AFTER the main operation, not before

### Error Handling

**Philosophy**: Operations must succeed even if logging fails.

**Implementation**:

- Logging errors are caught in the helper function
- Errors are logged to console but don't throw
- Operations continue normally
- Missing userId/documentId triggers warning and skips logging

**Example**:

```javascript
if (!userId || !documentId) {
  console.warn("⚠️ Skipping action log: missing userId or documentId");
  return; // Skip logging, don't throw
}
```

---

## Future Enhancements

### Short Term (Next Sprint)

- Add indexes on actions_log for performance:
  ```sql
  CREATE INDEX idx_actions_log_user ON actions_log(user_id);
  CREATE INDEX idx_actions_log_created ON actions_log(created_at DESC);
  CREATE INDEX idx_actions_log_target_type ON actions_log(target_type);
  CREATE INDEX idx_actions_log_payload_pro ON actions_log((payload->>'pro_number'));
  ```
- Create notification component to display activity
- Add real-time updates with Supabase subscriptions

### Medium Term (Next Quarter)

- Filter/search functionality in notification feed
- Export audit logs for compliance
- Retention policy (archive logs older than 2 years)

### Long Term (Future)

- Field-level change tracking (if needed)
- Automated alerts for suspicious activity
- Analytics dashboard for document operations
- Bulk operation logging

### Verifier Actions (Not in this implementation)

Your actions_log will also track:

- `issue_created` - Verifier raises an issue
- `issue_resolved` - Verifier resolves an issue
- `conflict_resolved` - Verifier resolves a conflict

These use the same table structure with different `target_type` values.

---

## Implementation Strategy

**Use search patterns, not line numbers** - the codebase is messy and lines change.

### Phase 1: Update Upload Context Differentiation

1. **Modify insertDocument()**: Add action parameter to distinguish upload contexts
2. **Create Shipment**: Use `document_file_uploaded` (new PRO)
3. **Ghost Upload**: Use `document_data_uploaded` (existing PRO)

### Phase 2: Add Edit Logging

1. **Data Updates**: Search for `.update({ updated_at:` - add `document_data_updated` logging
2. **File Replacement**: Search for file upload in InvoiceEditOverlay - add `document_file_replaced` logging

### Phase 3: Add Delete Logging

1. **Deletes**: Search for `.delete().eq('id', documentId)` - add `document_deleted` logging

### Phase 4: Update Imports

1. **For imports**: Search for existing imports at top of file - add `logDocumentAction` to them

This approach works regardless of how the code is reorganized.

---

## Success Criteria

### Must Have

- [x] All document uploads logged (already implemented)
- [ ] Upload context differentiation (NEW - document_file_uploaded vs document_data_uploaded)
- [ ] All document edits logged (to be implemented)
- [ ] File replacement logging (NEW - document_file_replaced)
- [ ] All document deletes logged (to be implemented)
- [ ] Correct payload structure
- [ ] Operations succeed even if logging fails

### Should Have

- [ ] Documentation complete
- [ ] Query examples provided
- [ ] Error handling robust

### Nice to Have

- [ ] Indexes created for performance
- [ ] Notification component built
- [ ] Real-time updates implemented

---

**End of Guide**

_This guide provides everything you need to implement comprehensive audit logging for document operations. Part 3 (ACTION PLAN) is your implementation checklist - refer to it repeatedly while coding._
