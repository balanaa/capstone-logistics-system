# Document Flows — Shipment, Trucking, Finance

This spec describes end-to-end flows for creating shipments, uploading files, editing data, and how ghost vs normal document windows behave across departments.

---

See also:

- `docs/02-architecture/auth-and-rbac/roles-and-access.md`
- `docs/02-architecture/data-and-storage/storage-and-database-access.md`

---

## Definitions

- Ghost document window: a placeholder card shown in a profile only when a document type doesn’t yet exist for that PRO. It has an Upload action, no Edit/Delete.
- Normal document window: shown when a file + data exist for that document type. It has Edit and Delete actions.
- PRO Number: globally unique shipment ID across all departments (see `docs/03-specs/domain/pro-number.md`).
- Storage bucket: `documents` with folders `shipment/`, `trucking/`, `finance/` (see `docs/02-architecture/data-and-storage/storage-and-database-access.md`).
- Filename tokens for type inference (profile uploads): `bol` (Bill of Lading), `do` (Delivery Order), `inv` (Invoice), `pck` (Packing List).
- Signed URL TTL: default 10 minutes for previews; configurable in code.

---

## Department document order

Use fixed order per department (ghost windows render in this exact order, and normal windows occupy the same slots):

```js
export const departmentDocuments = {
  shipment: ["Bill of Lading", "Invoice", "Packing List", "Delivery Order"],
  trucking: ["Delivery Order", "Importer Advice", "Equipment Interchange"],
  finance: [
    "Delivery Order",
    "Billing Invoice",
    "Shipping Line OR",
    "ICTSI Port OR",
  ],
};
```

---

## Create New Shipment (Shipment department)

1. User clicks "Create New Shipment" in the shipments table list.
2. Overlay 1 opens (on `/shipment`): Enter PRO Number + upload Bill of Lading (BOL). Instantly show filename and preview. Do NOT upload to Storage yet; keep file in memory. If PRO already exists, show error and disable Confirm. Enforce client-side MIME allowlist before preview (jpg, png, pdf, docx, xlsx). On mismatch, show inline: `Error: unsupported file type` and detail: `Filetype <mime> is unsupported`.
3. On Confirm (still on `/shipment`), switch to Overlay 2 (OverlayForm): show preview on the left and BOL data fields on the right (fields are initially empty and editable). Preview uses the locally held file from Overlay 1.
4. On Submit: block submission until validations pass. For the first BOL of a new PRO, run format validations; cross‑document checks are skipped.
   - Upload BOL to Storage path: `shipment/HHMMSS-{proNumber}-bol-{filename}` (includes the `bol` token).
   - Insert DB row for document (fields TBA) including: `pro_number`, `department='shipment'`, `document_type='bill_of_lading'`, `file_path`.
   - Navigate to `/shipment/pro-number/{proNumber}`.
5. The profile page now shows a normal window for BOL; other document types in Shipment show as ghost windows with Upload.

Notes

- PRO Number is globally unique; one PRO represents one shipment across all departments.
- Hard delete policy: deleting a document removes the Storage object (and later its DB row).

---

## Profile page — Ghost vs Normal windows

- The profile page renders windows in fixed department order.
- If a document type exists (file + data present): render a normal window with Edit and Delete.
- If a document type is missing: render a ghost window with Upload (no Edit/Delete).

Ghost Upload flow (e.g., user clicks ghost "Packing List")

1. Open Upload overlay (no PRO input here; PRO is already established from the profile URL).
2. User selects the file; enforce client-side MIME allowlist (jpg, png, pdf, docx, xlsx); on mismatch, show inline `Error: unsupported file type` and detail `Filetype <mime> is unsupported`. If allowed, instantly show filename and preview.
3. On Confirm: open Overlay 2 (OverlayForm) to capture fields for that specific document type (empty fields, user-encoded).
4. On Submit (Escalate mode default): if cross-document consistency checks detect conflicts, uploader can still submit for verifier review:
   - Submit creates the document in DB with `status='pending_verifier'` and records conflicts.
   - Verifier later resolves conflicts and approves. If no conflicts, submit proceeds normally.
   - Upload file to Storage path: `{department}/HHMMSS-{proNumber}-{filename}` (filename contains token: `pck` for Packing List, etc.).
   - Insert DB row recording `pro_number`, `department`, `document_type`, `file_path`, plus encoded fields.
   - Refresh the profile; the ghost window becomes a normal window.

Replace flow (normal window)

- Replace action is available inside the Edit overlay (below the file preview). It performs a delete + upload under one action. No versioning in MVP.

Delete flow (normal window)

- Hard delete: Show confirmation mini-overlay: `Delete '<filename>'? This removes the file and all encoded data in this '<Document Name>' document.` Remove file from Storage (and later the associated DB row). UI then shows the ghost window again for that type.

---

## File naming scheme

- Current (test uploader): `{department}/{timestampMs}-{filename}`.
- Profile uploads (target): `{department}/{HHMMSS}-{proNumber}-{filename}`.
- Include type tokens in filename so the system can infer document type on the profile page when needed:
  - Bill of Lading → `bol`
  - Delivery Order → `do`
  - Invoice → `inv`
  - Packing List → `pck`
- Keep file extension intact; sanitize all parts with `[a-zA-Z0-9._-]`.

---

## Signed URL TTL (preview duration)

- Signed URLs are time-limited links generated by the app for private files in Supabase Storage. They are not stored in the bucket; they are created via the API and expire automatically.
- Where configured in code (example): `createSignedUrl(path, 60 * 10)` which is 10 minutes.
- Default is 10 minutes; the UI should request a fresh signed URL when needed.

---

## Table list ordering

- The top-level table (e.g., shipments list) sorts by `proNo` descending (newest by PRO numbering, not upload time).
- This does not affect the order of windows in the profile page (which is fixed by department).

---

## Open items (TBA)

- Validation rules for OverlayForm submit.
- Final DB schema for documents and shipment linking.
- Replace/versioning policy per document type.
- OCR/mapping pipeline triggers and field extraction.

---

## Implementation status

Live now (frontend + Storage)

- Shipment: two-step overlays on `/shipment` (Create New Shipment → BOL OverlayForm), with instant local preview and editable empty fields.
- PRO uniqueness check in overlay 1; disables Confirm when duplicate.
- Upload on step-2 submit to `documents/shipment/HHMMSS-{proNumber}-bol-{filename}`; then route to `/shipment/pro-number/{proNumber}`.
- Fixed department order for rendering; profile will later swap ghost → normal windows as data exists.

Planned (DB integration)

- Create `shipments` (unique `pro_number`) and `documents` (per-file metadata: `department`, `document_type`, `file_path`, fields).
- After uploads, insert rows into DB; profile windows show based on DB presence (ghost only when absent).
- Replace/versioning policy per type; optional single-path upsert vs. versioned filenames.
- Hard delete both Storage file and DB row; later, audit log (`actions_log`).
- Signed URL TTL configurable per overlay as needed.
