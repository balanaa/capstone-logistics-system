# Deegee — Customs Document Management System

## Overview

Deegee is a private internal app for a shipping/import company. It automates the extraction, verification, storage, and reporting of import/shipping documents (e.g. Bill of Lading, Invoice, Packing List, Delivery Order, Receipts). The goal is to reduce manual data entry, catch inconsistencies, and provide dashboards & exportable reports.

---

## Departments & Roles

- **Shipment** — uploads BOL and shipment docs; encodes shipment data
- **Trucking** — manages delivery orders, container movements, equipment interchange
- **Finance** — encodes port charges, container fees, receipts; issues invoices/official receipts
- **Verifier** — Shipment-only; reviews extracted data, approves/makes canonical
- **Viewer** — read-only across all departments (limited fields; no file access)
- **Admin** — full access across all departments

Users can have multiple roles. Typical concurrent users: ~12–20.

---

## Document Types & Structure

| Document Type         | Form Fields (~count) | Table / Item Rows         | Notes                       |
| --------------------- | -------------------- | ------------------------- | --------------------------- |
| Bill of Lading        | ~13                  | Products list (≤ 20 rows) | Mixed form + table          |
| Invoice               | ~7                   | Product price rows        | Price, qty, total           |
| Packing List          | ~7                   | Product weight/size rows  | Weight/size, qty            |
| Delivery Order        | ~2                   | None (or minimal)         | Form-only                   |
| Advice from Importer  | ~3                   | None                      | Warehouse, safety notes     |
| Equipment Interchange | ~4                   | None                      | Truck/container interchange |
| Finance / Receipts    | ~8                   | None or small             | Payment fields, reference   |

- Documents are mostly **single-page**; multi-page is rare
- Language: English; currency: USD
- Documents often follow a pattern: form label/value section first, then a tabular items section

---

## Workflows & Business Rules

1. **Upload → Extract → Draft**

   - User (any department) uploads document (file/image)
   - System calls Google Document AI / Vision API → parses form fields + table rows
   - Draft record saved with `document_fields` & `document_items`

2. **Conflict Checking / Validation**

   - Cross-document field consistency (e.g. address in BoL vs Invoice)
   - Sum of table rows vs total field
   - Duplicate document numbers
   - Flag inconsistencies; if new doc is correct, update prior records

3. **Verification**

   - Verifier sees a **uniform form interface** (labels with extracted values, not editing inline original)
   - Verifier can Edit the values in the form (not manipulating the physical document)
   - Actions: Approve / Reject / Edit
   - On Approve → mark as published; run post-checks; audit log

4. **Notifications & Task Queue**

   - In-app real-time notifications (Supabase Realtime)
   - Notification types:  
     • Reminders (deadlines)  
     • Tasks-to-be-done (new docs needing review)  
     • Completion / Done (for management)
   - Verifier queue ordered newest first

5. **Deletion / Retention**

   - Raw uploaded files stored temporarily
   - After transaction completion (shipping or finance done), file is deleted or archived
   - Structured data (fields, items, audit logs) retained indefinitely

6. **Reporting & Dashboards**
   - Department dashboards: Pending / Verified / Rejected counts (pie charts)
   - Charts: docs per user, average verify time, volumes
   - Export profit report: CSV / Excel for finance

---

## Tech Stack (Prototype)

| Layer                    | Tool / Service                  | Role                                                              |
| ------------------------ | ------------------------------- | ----------------------------------------------------------------- |
| Frontend                 | React + plain CSS (no Tailwind) | UI / PWA interface                                                |
| Hosting (frontend)       | Vercel                          | Git→deploy, HTTPS, CDN                                            |
| Backend / Functions      | Supabase Edge Functions         | Call OCR, orchestration, background logic                         |
| Database & Auth          | Supabase (PostgreSQL + Auth)    | Structured data, login, policies                                  |
| File storage             | Supabase Storage                | Private `documents` bucket; per-dept folders; signed URL previews |
| OCR / Extraction         | Google Document AI + Vision API | Parse document images / PDFs                                      |
| Realtime / Notifications | Supabase Realtime (WebSockets)  | In-app notifications                                              |
| Push Notifications       | Firebase Cloud Messaging (FCM)  | PWA browser push outside app                                      |
| Charts / Reports         | Recharts + XLSX (React)         | Visual dashboards, Excel export                                   |

---

## Goals & Constraints

- **Prototype within 5 days**
- Use **popular tools** with strong documentation and tutorials
- Stay in **free tiers / credits** if possible
- Focus first on core workflow, defer advanced custom ML models
- No inline editing of original documents (legal constraint)

---

## Future Upgrades

- Train **custom Document AI models** per document type for better accuracy
- Implement **Gmail auto-import** for attachments
- Wrap into native app via **Capacitor** for offline support and local notifications
- Archive older documents in cloud storage or cold storage
- Add **SSO (Google Workspace)** for enterprise users
- Add monitoring, cost alerts, usage dashboards

---

## Summary

Deegee is aimed at making a small import/shipping business more efficient by automating document intake, data extraction, consistency checking, verification, and reporting. The system is role-driven, organized around document types with mixed form + table structures, and uses React + Supabase + Google Document AI to deliver quick, reliable prototype functionality with upgrade paths for mobile pushes, custom models, and archiving.

---
