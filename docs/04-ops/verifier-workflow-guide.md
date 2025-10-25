# Verifier Workflow Guide

This guide explains how to use the Verifier page to review and resolve document conflicts in the Deegee system.

---

## Overview

The Verifier role is a specialized Shipment department role responsible for:

- Reviewing flagged document conflicts
- Resolving data inconsistencies between documents
- Ensuring data quality and accuracy across the system
- Approving documents that have been flagged for review

**Important**: The Verifier page is designed to be rarely used. In an ideal workflow, documents are uploaded correctly and no conflicts occur. This page exists as a safety net for edge cases and exceptional situations.

---

## When Documents Reach the Verifier

### System-Detected Conflicts

Documents are automatically flagged when the system detects:

1. **Cross-Document Mismatches**

   - Consignee name or address differs between Bill of Lading and Invoice
   - Quantity totals don't match between Invoice and Packing List
   - Container numbers are inconsistent across documents
   - Gross weight differs between B/L and Packing List

2. **Calculation Errors**

   - Invoice amount ≠ (quantity × unit price)
   - Item totals don't sum to document total
   - Mathematical inconsistencies in line items

3. **Date Logic Violations**

   - Invoice date is after delivery date
   - Delivery date is before B/L issue date
   - Unrealistic date sequences

4. **Data Format Issues**
   - Product descriptions differ significantly
   - Missing critical fields after OCR extraction
   - Unrecognized data formats

### Manual Flags from Encoders

Department encoders can manually flag issues when they:

- Notice errors during data entry or review
- Identify wrong files uploaded
- Spot typos in the original documents
- Find data that doesn't match their expectations

**Encoder Workflow**:

1. Encoder uploads document and system shows validation error
2. Encoder reviews file preview and sees error is in the file itself (not their entry)
3. If they believe their encoding is correct despite the error, they can flag it for verifier review
4. Conflict appears in Verifier queue

---

## Accessing the Verifier Page

1. Log in with a `verifier` role account (or `admin`)
2. Click **Verifier** in the sidebar navigation
3. The Verifier page opens showing:
   - **Status Pie Chart**: Pending vs Resolved conflicts
   - **Conflict Reminders**: Urgent conflicts requiring attention
   - **Conflict Queue**: Table of all pending conflicts

---

## Understanding the Verifier Page

### Status Pie Chart

- **Pending (Amber)**: Open conflicts awaiting resolution
- **Resolved (Green)**: Conflicts that have been successfully resolved

**Tip**: Keep the pending count as close to zero as possible!

### Conflict Reminders

Shows high-priority conflicts sorted by urgency. Use this to prioritize your review work.

### Conflict Queue

A searchable, filterable table showing all conflicts with:

- **PRO No**: Shipment identifier
- **Document Types**: Which two documents have the conflict (e.g., "Bill of Lading vs Invoice")
- **Conflict Type**: Nature of the issue (e.g., "Consignee Mismatch")
- **Flagged By**: Who or what raised the issue (encoder name or "System Auto-Check")
- **Date Flagged**: When the conflict was detected
- **Actions**: Review or Dismiss buttons

---

## Reviewing Conflicts

### Step 1: Filter and Search

Use the queue controls to find conflicts:

- **Date Range**: Filter by when conflict was flagged
- **Type Filter**: Show only specific conflict types
- **Search**: Search by PRO number, conflict type, or document types
- **Clear Filters**: Reset all filters

### Step 2: Open a Conflict for Review

Click the **Review** button for any conflict. This opens the Conflict Resolution Overlay (nearly full-screen) showing:

- **Left Side**: First document (preview + extracted fields)
- **Right Side**: Second document (preview + extracted fields)
- **Highlighted Fields**: Conflicting fields shown in red
- **Conflict Banner**: Explains what the issue is

### Step 3: Analyze the Conflict

1. **Check Both File Previews**

   - Look at the actual uploaded documents
   - Verify what the original files say
   - Determine which data is correct

2. **Compare Extracted Fields**

   - Conflicting fields are highlighted in red with a ⚠️ icon
   - Non-conflicting fields shown for context
   - Check if OCR extracted data correctly

3. **Understand the Issue**
   - Read the conflict description in the yellow banner
   - Consider why the conflict occurred (typo, OCR error, wrong file?)

### Common Conflict Scenarios

#### Scenario 1: OCR Misread One Document

**Situation**: B/L says "PUREGOLD PRICE CLUB INC" but Invoice extracted as "PUREGOLD PRICE CLUB IHC"

**Analysis**: The "N" was misread as "H" by OCR

**Resolution**: Keep the correct document (B/L), or manually correct the Invoice data

---

#### Scenario 2: Typo in Original File

**Situation**: Invoice shows quantity "250" but Packing List shows "240"

**Analysis**: Review both files — one has a typo in the original document

**Resolution**:

- If typo is minor and doesn't affect operations: Keep the correct document
- If significant: Request re-upload of corrected file

---

#### Scenario 3: Different Formats, Same Data

**Situation**: B/L says "PUREGOLD PRICE CLUB INC" but Invoice says "PUREGOLD PRICE CLUB INC."

**Analysis**: Just a formatting difference (period at the end)

**Resolution**: Dismiss as false positive (or keep either — they're equivalent)

---

#### Scenario 4: Both Documents Are Wrong

**Situation**: Both files have errors or outdated information

**Analysis**: Need corrected version from client

**Resolution**: Request re-upload of corrected file

---

## Resolution Actions

### Keep Left Document

**When to Use**:

- Left document has the correct data
- Right document has OCR error or typo

**What Happens**:

- System marks left document's data as canonical
- Right document's conflicting fields are flagged for review
- Conflict status changes to "Resolved"

**Action**: Click **"Keep [Document Type]"** button on the left side

---

### Keep Right Document

**When to Use**:

- Right document has the correct data
- Left document has OCR error or typo

**What Happens**:

- System marks right document's data as canonical
- Left document's conflicting fields are flagged for review
- Conflict status changes to "Resolved"

**Action**: Click **"Keep [Document Type]"** button on the right side

---

### Upload Corrected File

**When to Use**:

- Both documents have errors
- Original file needs to be replaced with corrected version
- Client provided an updated document

**What Happens**:

- System allows you to choose which document to replace
- Upload dialog opens for new file
- System re-extracts data and re-validates
- Original file is replaced in storage

**Action**: Click **"Upload Corrected File"** button

**Steps**:

1. Choose which document to replace (left or right)
2. Select corrected file from your computer
3. System uploads and processes new file
4. If no new conflicts, issue is resolved

**Note**: Currently shows as mock implementation. Backend integration required.

---

### Dismiss Conflict

**When to Use**:

- Conflict is a false positive
- Data differences are acceptable/equivalent
- Issue has been resolved outside the system

**What Happens**:

- Conflict is marked as dismissed
- Both documents remain unchanged
- Conflict removed from queue

**Action**: Click **"Dismiss"** button in the queue (or **"Close"** without resolving)

**Confirmation**: System asks you to confirm dismissal before proceeding

---

## Best Practices

### 1. Always Check Both File Previews

❌ **Don't**: Rely only on the extracted fields display

✅ **Do**: Open and examine both file previews to see the original documents

**Why**: OCR can make mistakes. The original file is the source of truth.

---

### 2. Prioritize by Business Impact

**High Priority**:

- Amount/calculation errors (affects invoicing)
- Consignee address errors (affects delivery)
- Container number mismatches (affects tracking)

**Lower Priority**:

- Minor formatting differences
- Non-critical field discrepancies
- False positives

---

### 3. Document Your Reasoning

When resolving conflicts:

- Add resolution notes explaining your decision
- Document any follow-up actions needed
- Note if client confirmation was obtained

_(This feature will be added in future backend integration)_

---

### 4. When in Doubt, Escalate

**Don't guess or assume** — If you're unsure:

1. Flag the conflict for admin review
2. Contact the department encoder who uploaded the document
3. Request clarification from the client
4. Leave the conflict unresolved until you have more information

---

### 5. Batch Similar Conflicts

If you see multiple similar conflicts (e.g., same OCR error pattern):

- Resolve them together using the same logic
- Report the pattern to admin for system improvement
- Consider if OCR model needs retraining

---

## Common Conflict Types - Quick Reference

| Conflict Type                    | What to Check                                | Likely Resolution                                   |
| -------------------------------- | -------------------------------------------- | --------------------------------------------------- |
| **Consignee Mismatch**           | Compare full names in both files             | Keep the correctly spelled version                  |
| **Quantity Mismatch**            | Check line items in both docs                | Keep document with correct calculation              |
| **Amount Calculation Error**     | Verify: qty × price = amount                 | Fix the document with wrong math                    |
| **Container Number Mismatch**    | Check container no. in both files            | Keep correct container number                       |
| **Date Discrepancy**             | Verify date logic (invoice before delivery?) | Keep logically correct dates                        |
| **Weight Discrepancy**           | Compare weights in both documents            | Keep B/L weight (usually authoritative)             |
| **Product Description Mismatch** | Check if same product, different wording     | If same product, dismiss; if different, investigate |

---

## Verifier Keyboard Shortcuts

_(Future Enhancement)_

- `R` - Open selected conflict for Review
- `D` - Dismiss selected conflict
- `←` - Keep Left document
- `→` - Keep Right document
- `Esc` - Close overlay
- `↑/↓` - Navigate queue

---

## Troubleshooting

### "Unable to Load Conflicts"

**Cause**: Network issue or database connection problem

**Solution**: Refresh the page. If persists, contact admin.

---

### "File Preview Not Loading"

**Cause**: Signed URL expired or file not found

**Solution**: Close and reopen the conflict. If persists, file may be missing from storage (contact admin).

---

### "Resolution Failed"

**Cause**: Permission issue or database error

**Solution**:

1. Verify you have verifier role permissions
2. Check if conflict was already resolved by someone else
3. Refresh page and try again
4. Contact admin if issue persists

---

## Audit Trail

All verifier actions are logged for accountability:

- Who resolved each conflict
- When it was resolved
- What resolution action was taken
- Any notes or metadata

This ensures full traceability and helps identify patterns in data quality issues.

---

## Metrics and Reporting

_(Future Feature)_

Verifier performance metrics will include:

- Average resolution time per conflict
- Resolution accuracy rate
- Number of conflicts resolved per day
- Common conflict patterns identified

---

## Training and Onboarding

### New Verifier Checklist

- [ ] Read this workflow guide thoroughly
- [ ] Review sample conflicts with experienced verifier or admin
- [ ] Practice with test conflicts in staging environment
- [ ] Understand document types (B/L, Invoice, Packing List, D/O)
- [ ] Know when to escalate vs resolve independently
- [ ] Familiarize yourself with common client naming conventions
- [ ] Understand calculation validation rules

---

## Getting Help

**For Technical Issues**:

- Contact system administrator
- Report bugs via [support channel]

**For Business Logic Questions**:

- Consult with Shipment department supervisor
- Ask experienced verifiers
- Refer to document specs in `/docs/03-specs/domain/`

**For Urgent Issues**:

- Escalate to admin role user
- Contact department manager

---

## Related Documentation

- [Verifier Backend Implementation](../05-future/verifier-backend-implementation.md) - Technical details
- [Roles & Access](../02-architecture/auth-and-rbac/roles-and-access.md) - Permission details
- [Document Flows](../03-specs/domain/document-flows.md) - Upload workflow
- [Database Schema](../03-specs/domain/db-shipment.md) - Conflict table structures

---

_Last Updated: [Date]  
Version: 1.0  
Status: Frontend Complete, Backend Pending_
