## Document Window v2 — UI behavior now, DB/Storage integration later

Purpose

- Define the current mock-phase behavior for the per-document window inside department profile pages.
- Outline future integration with database and Supabase Storage without implementing it yet.

Scope (current milestone)

- Department: Shipment primary; behavior generalized to Trucking and Finance.
- Data: Mock data from `src/data.js` (`proDocumentList`, `documentStyles`, `departmentDocuments`).
- Components involved now: `src/components/Document.js`, `src/components/OverlayForm.js`, department profile pages.

Core concepts

- documentType (enum, persisted later): `bill_of_lading`, `invoice`, `packing_list`, `delivery_order`, ...
- humanLabel (display only): "Bill of Lading", "Invoice", "Packing List", "Delivery Order", ...
- department (enum): `shipment` | `trucking` | `finance` — indicates which department owns/uses the document.
- style source: `documentStyles` in `src/data.js` controls `bgColor`, `columns`, and `columnWidth` per humanLabel.

Enum ↔ label mapping (used for display + styles)

- bill_of_lading → "Bill of Lading"
- invoice → "Invoice"
- packing_list → "Packing List"
- delivery_order → "Delivery Order"

Rendering rules (Document Window)

- Location: Render inside the department’s profile page; one window per document TYPE in the department’s allowed set ("ghost window" concept).
- Title: Display the human label (e.g., "Bill of Lading"). Also show the original filename for normal windows (as a small subtitle/metadata line). Uploaded date and uploaded by are shown only inside the Edit overlay.
- Grid of fields:
  - Use `documentStyles` to set background color, column count, and column width.
  - Render all available label/value rows from the document data.
  - If a value is missing/null/empty, show "--" (never hide the row).
- Line-items table: only for Invoice and Packing List.
  - Position: directly below the field grid within the same document window.
  - Invoice columns: Product | Quantity | Unit Price | Amount.
  - Packing List columns: Product | Quantity | Weight.
  - Business rule: these documents always have items; no "No items" placeholder.
- Buttons (action row at bottom, same size):
  - Ghost window (no file yet):
    - Upload (primary/blue) — opens the upload flow directly for that type (no type chooser needed).
  - Normal window (file exists):
    - Left side: Download (if role has storage SELECT for this department; not visible to viewer). Download forces a direct file download (no new-tab preview).
    - Right side: Edit (secondary) and Delete (danger/red). Visible to permitted roles.
  - Replace is not a window-level button. It is available inside the Edit overlay (below the file preview) and performs a delete+upload flow under one action (with confirmation).

Profile page composition

- Render windows in a fixed order per department. For each document type, exactly two states are possible:
  - Ghost (missing) — shows Upload.
  - Normal (present) — shows Edit and Delete.
- No generic "Add Document" inside profile; users click the specific ghost window’s Upload button to add that document.

Data model (mock now; future-proof fields)

- Document object should reserve the following fields for future integration:
  - dbId: UUID of the document in the database (null in mock phase).
  - storagePath: Supabase Storage object key for the uploaded file (e.g., `shipment/1728754930123-bol.pdf`).
  - department: `shipment` | `trucking` | `finance` (for ownership, visibility, and permissions).
  - documentType: normalized enum (e.g., `invoice`), mapped to human label for display/styles.
  - proNumber: string; globally unique across departments.

Behavior summary (mock phase)

- Show ghost windows in fixed order; each window indicates whether a file exists.
- Line-items table for Invoice and Packing List under the grid (when present).
- Edit opens overlay (current `OverlayForm`); Delete is a hard delete (UI only for now).

Create New Shipment flow (Shipment department)

1. User clicks "Create New Shipment" in the list/table (formerly Add Document).
2. Overlay 1 opens: Enter PRO Number + upload Bill of Lading (BOL). Instantly show the filename and a local preview. Do not upload to Storage yet; hold the file locally.
3. On Confirm: open `OverlayForm` (Overlay 2) for BOL fields.
4. On Submit: perform a single transaction-like flow:
   - Upload BOL to `documents/shipment/HHMMSS-{proNumber}-{filename}`.
   - Insert DB row for BOL with `department='shipment'`, `document_type='bill_of_lading'`, `pro_number`, `file_path`.
   - Navigate to `/shipment/pro-number/{proNumber}`.
5. Profile page shows ghost windows in fixed order; BOL now present; other windows show Upload.

Future integration — database and Supabase Storage

- Tables: final names TBA. A typical document row will include `id (UUID)`, `pro_number` (globally unique shipment id), `document_type` (enum), `department` (enum), `file_path` (storagePath), timestamps, and extracted fields/metadata.
- Storage bucket: `documents` with folders `shipment/`, `trucking/`, `finance/` as already documented.
- RLS/permissions: follow `docs/02-architecture/data-and-storage/storage-and-database-access.md` and `docs/02-architecture/data-and-storage/storage-policies-documents.md` (department isolation; viewer has no file access; admin unrestricted; verifier shipment-only).

Delete flow (future)

1. Validate permissions for the acting user (role-based).
2. Show a confirmation mini-overlay centered on screen; proceed only on confirm.
3. Hard delete: remove the database row by `dbId`.
4. Delete the file from Supabase Storage using `storagePath` (bucket `documents`).
5. Update UI state to remove the window.
6. Error handling: if one service fails, show a clear error; prefer deleting storage and DB within a server endpoint to coordinate consistency and audit logging.

Edit flow (future)

- Overlay contains curated fields per document type (to be defined later).
  - Edit overlay displays metadata: original filename (readonly), uploaded by, uploaded date/time. Exact placement inside the overlay is TBD (not necessarily in the header).
- Replace action includes a confirmation mini-overlay centered on screen before proceeding with delete+upload.
- On save: update DB record (and optionally write an audit log entry).
- UI refresh fetches updated data and re-renders grid/table.

Permissions & visibility (future)

- UI may keep Edit/Delete visible to all roles, but unauthorized actions return friendly error feedback.
- Optionally disable buttons preemptively if the user clearly lacks permission.

Error handling (mini-overlay)

- On action failure (Upload/Replace/Delete/Download) and on validation conflicts: show a centered mini-overlay with:
  - Title: `Error: <error type>` (e.g., `Error: Permission denied`, `Error: Network`)
  - Body: error message string (concise)
  - Actions: Close only
  - Blocks background interaction until dismissed
  - Expired signed URL handling: for previews, automatically regenerate the signed URL once and retry; for downloads, do not auto-retry (user re-initiates)

Conflict mini-overlay (Escalate mode)

- Title: `Data Conflict`
- Body: a numbered list of conflicts, e.g.:
  1: Consignee Address is different from existing B/L document
  2: Total Amount miscalculation of Product 1
- Footer: two buttons
  - Submit for Verifier Review (primary): uploads, sets status='pending_verifier', records conflicts (and, if user raised a manual issue, creates a document_issues row)
  - Review Fields (secondary): returns to overlay fields to adjust values

Open items to define later

- Exact "important data" per document type for the grid.
- PRO number formatting rules.
- Detailed line-item schemas (additional columns, currency/units).
- Audit logging fields and events.
- Final database schema and table names.
