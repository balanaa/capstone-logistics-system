Component: DocumentWindow.jsx
Deprecation notice:

- This spec is kept for styling reference only. See `docs/03-specs/ui/document-window-v2.md` for the current behavior and actions (Download left; Edit/Delete right; Replace inside Edit overlay; error mini-overlay).

Purpose:
Render a self-contained document window for a single document type showing extracted fields, metadata, and actions.

Props:

- document: {
  id: string,
  type: string, // e.g., 'bill_of_lading'
  uploaded_by: string,
  uploaded_on: ISOString,
  status: 'draft'|'pending'|'verified'|'rejected',
  fields: [{ label, value, canonical_key }]
  }
- role: string // user role (shipment|trucking|finance|verifier|analytics|viewer)
- onPreview(documentId)
- onEdit(documentId)
- onAddNote(documentId, note)
- onSubmitEdits(documentId, editedFields)

UI Layout:

- Header row: doc type (humanized) + status badge + Uploaded by/date
- Body: vertical list of label:value pairs. Each row:
  - label (muted), value (bold)
  - if role has edit permission: inline edit icon that opens a small edit modal or toggles an input
- Footer actions:
  - Preview (calls onPreview)
  - Edit / Save (if editable) (calls onEdit / onSubmitEdits)
  - Add Note (small button that triggers a note modal)
  - View Audit (future)

Behavior:

- Values are shown normalized if available (e.g., dates in YYYY-MM-DD, numbers normalized).
- If a field has `canonical_key == null` show a small red badge "UNMAPPED".
- If status=='pending' highlight border in orange; if 'verified' use green border.
- When Edit is clicked, the component must maintain local edited state and call onSubmitEdits with { fieldKey: newValue }.

Accessibility:

- All interactive buttons keyboard accessible.
- Buttons labeled with aria-labels.

Example usage in parent:
<DocumentWindow document={doc} role={'verifier'}
onPreview={id => openPreview(id)}
onEdit={id => openEditOverlay(id)}
onAddNote={(id,n) => addNoteToDoc(id,n)}
onSubmitEdits={(id,fields) => submitEdits(id, fields)} />
