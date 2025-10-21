# Deegee — Overview

**Project:** Deegee — Document Encoding & Verification (Frontend Prototype)

## Purpose

Deegee is a private internal web app that reduces manual data entry for shipping/import documents (Bill of Lading, Invoice, Packing List, Delivery Orders, Receipts). The prototype focuses on the frontend experience: uploads, prefilled forms, verifier workflow, and analytics.

## Today’s Phase Goals

1. Complete frontend page routing and navigation between pages.
2. Implement login and user account handling (Supabase Auth).
3. Provide UI components and flow ready for small-volume real usage (2–10 docs/day).

## Company / Business Context (short)

- Small logistics/brokerage company handling import shipments.
- Departments: Shipment (brokerage), Trucking (delivery), Finance (accounting).
- Roles: Admin, Viewer (read-only), Shipment, Trucking, Finance, Verifier (shipment-only). Analytics role removed.
- Documents are mostly English, usually single-page; files arrive via Gmail or direct upload.

## Tech Stack (frontend-focused)

- React (Create React App — existing project)
- Styling: plain CSS (co-located with components)
- State & realtime: Supabase (Auth + DB + Realtime)
- OCR & parsing (planned): Google Cloud Vision & Document AI (server-side)
- PWA-ready (for mobile camera capture later)
- Storage: Supabase Storage (`documents` bucket, private) with per-department folders
- Access: RLS policies enforce department isolation; viewer has no file access
- Preview: Signed URLs (10 min TTL) for private file previews

## Constraints & Assumptions

- One developer, fast prototype (5 days).
- Low traffic, few concurrent users (≤ 20).
- Keep secrets out of client build; server-side keys live in server/ (gitignored).
- No native local notifications in prototype (future: Capacitor).
