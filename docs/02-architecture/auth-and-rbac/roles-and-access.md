# Roles & Access

This document defines the roles used in Deegee, their permissions, routing usage for the frontend, database hints, audit logging requirements, and landing-page rules.

---

See also:

- `docs/02-architecture/data-and-storage/storage-and-database-access.md`
- `docs/03-specs/domain/document-flows.md`
- `docs/02-architecture/auth-and-rbac/granular-permissions-supabase.md`

---

## Final role list

- `shipment` — department encoder for Shipment
- `trucking` — department encoder for Trucking
- `finance` — department encoder for Finance
- `verifier` — specialized Shipment role; verifies and approves shipment documents (operates ONLY within Shipment department)
- `viewer` — read-only account across all departments
- `admin` — full system access and user management

Notes:

- `shipment`/`trucking`/`finance` are separate roles (not a single `department` role).
- Users can hold **multiple roles** concurrently (e.g., `['shipment','finance']`).
- **`verifier` is a specialized Shipment role**: Verifier has full Shipment department access plus approval powers (approve/map/make_canonical). Verifier operates exclusively within Shipment department.
- **`analytics` role has been removed**: Analytics functionality is now covered by `viewer` (read-only) and `admin` (full access).
- No implicit role inheritance: `verifier` does not automatically include `shipment`. If a verifier should perform shipment CRUD, assign both roles, e.g., `['verifier','shipment']`. Frontend behavior can treat combined roles accordingly; RLS should not assume inheritance.
- Single-role department users can ONLY access their own department. Multi-role users can access all assigned departments.

---

## Actions / Permissions (canonical names)

We use these action names in code and for server checks:

- `view` — view pages/data
- `create` / `upload` — upload a document or create a new record
- `edit` — edit draft/extracted fields before submit
- `submit` — submit upload to run conflict checks / push to verifier
- `approve` — approve a document (verifier)
- `map` — create mapping rule (verifier)
- `make_canonical` — mark an incoming doc as canonical (verifier)
- `delete` — delete a document or file (dept users can delete within their dept; admin can delete all)
- `manage_users` — create/edit roles and accounts (admin)
- `view_analytics` — view analytics pages (viewer/admin)
- `audit_log` — all important actions must be recorded

`request_correction` is intentionally **not** used.

---

## Permissions matrix (who can do what)

| Role     |       view        |   create/upload   |       edit        |      submit       |      approve      |        map        |  make_canonical   |       delete        | manage_users | view_analytics |
| -------- | :---------------: | :---------------: | :---------------: | :---------------: | :---------------: | :---------------: | :---------------: | :-----------------: | :----------: | :------------: |
| shipment |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |         ✕         |         ✕         |         ✕         | ✓ (any in own dept) |      ✕       |       ✕        |
| trucking |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |         ✕         |         ✕         |         ✕         | ✓ (any in own dept) |      ✕       |       ✕        |
| finance  |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |         ✕         |         ✕         |         ✕         | ✓ (any in own dept) |      ✕       |       ✕        |
| verifier | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (any in shipment) |      ✕       |       ✕        |
| viewer   | ✓ (all, limited)  |         ✕         |         ✕         |         ✕         |         ✕         |         ✕         |         ✕         |          ✕          |      ✕       |       ✓        |
| admin    |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |    ✓ (all depts)    |      ✓       |       ✓        |

Notes:

- **Department isolation**: `shipment`/`trucking`/`finance` roles can ONLY access their own department's data. Multi-role users (e.g., `['shipment','finance']`) can access all assigned departments.
- **Verifier scope**: `verifier` is a specialized Shipment role. Verifier has full Shipment department access (create/upload/edit/submit/delete) PLUS approval powers (approve/map/make_canonical). Verifier operates exclusively within Shipment department and cannot access Trucking or Finance.
- **Delete permission**: Department users can delete ANY file within their department folder (not just own uploads). This is a small company trust-based model.
- **Viewer scope**: `viewer` can view all pages/departments but sees only summary data on profile pages (limited database fields, no file downloads, no file previews, no edit overlays).
- **Admin scope**: `admin` has full god-mode access across all departments and all operations.
- Server endpoints must verify all permissions server-side (frontend checks are UI-level only).

---

## Routing: allowedRoles for ProtectedRoute

Use these arrays in `ProtectedRoute` guards (always include `'admin'`, and include `'viewer'` for read‑only access):

- `/dashboard`: `['admin','viewer']`
- `/analytics`: `['admin','viewer']`
- `/shipment`: `['shipment','admin','viewer']`
- `/shipment/pro-number/:proNo`: `['shipment','verifier','admin','viewer']`
- `/trucking`: `['trucking','admin','viewer']`
- `/trucking/pro-number/:proNo`: `['trucking','admin','viewer']`
- `/finance`: `['finance','admin','viewer']`
- `/finance/pro-number/:proNo`: `['finance','admin','viewer']`
- `/verifier`: `['verifier','admin','viewer']`
- `/verifier/:id`: `['verifier','admin','viewer']`
- `/user-management`: `['admin','viewer']` (admin can edit; viewer is read-only)
- `/403`: public 403 page

Implementation notes:

- Always include `'admin'` in allowed lists for admin access.
- Always include `'viewer'` for read-only access across all pages.
- `analytics` role has been removed (replaced by viewer + admin).

---

## Landing page / redirect rules after login

Priority order (check in this sequence):

```javascript
if (roles.includes("admin") || roles.includes("viewer")) return "/dashboard";
if (roles.includes("verifier")) return "/verifier";
if (roles.includes("shipment")) return "/shipment";
if (roles.includes("finance")) return "/finance";
if (roles.includes("trucking")) return "/trucking";
return "/dashboard"; // fallback
```

Examples:

- User with `['admin']` → `/dashboard`
- User with `['viewer']` → `/dashboard` (read-only)
- User with `['verifier']` → `/verifier`
- User with `['shipment']` → `/shipment`
- User with `['shipment','finance']` → `/shipment` (higher priority)
- User with `['trucking','verifier']` → `/verifier` (verifier > trucking)

Sidebar visibility:

- Users with ONLY department roles (e.g., `['shipment']` or `['shipment','finance']`) do NOT see Dashboard or Analytics tabs in the Sidebar.
- `admin` and `viewer` see all tabs (Dashboard, Shipment, Trucking, Finance, Analytics).
- Multi-department users see ALL tabs for their assigned departments (e.g., `['shipment','finance']` sees Shipment + Finance tabs).

---

## Notifications (prototype behaviour)

- New upload pending verification → send to:
  - `admin`
  - `verifier` (only if upload is for Shipment department)
  - optionally notify department uploaders/department role users (e.g., show in their Dashboard) — recommendation: show in-app notifications for department staff.
- Document approved → show in-app feedback via the verifier overlay and to uploader (no external email required for prototype).
- Conflict flagged → show inline feedback on upload/submit overlay (not external notification for prototype).

---

## UI / Workflow rules (enforced by frontend & verified server-side)

- Uploaders (department roles) must fill required fields before submitting; server runs conflict checks.
- If the conflict is detected and the uploader believes the upload is correct: workflow is to flag and send to Verifier; Verifier can `make_canonical` if correct (verifier can directly change canonical record). Changes are logged.
- Verifier actions that change canonical data should **not** delete history — mark previous canonical records as `superseded` (DB status field) for auditability.

---

## Audit logging (required)

All mutating or approval actions must be recorded in `actions_log` with:

- `id` (uuid)
- `user_id` (uuid)
- `action` (text, e.g., 'approve_document', 'map_label', 'make_canonical')
- `target_type` (e.g., 'document', 'shipment')
- `target_id` (id)
- `payload` (jsonb with deltas)
- `created_at` (timestamp)

---

## DB hints (Supabase)

Use a `profiles` table for mapping Supabase auth users -> roles.

Example fields:

- `id` UUID (same as auth.users.id)
- `email` text
- `full_name` text
- `roles` text[] (['shipment','verifier'])
- `created_at` timestamp default now()

(See SQL examples below in the appendices.)

---

## Developer notes

- **Frontend**: implement `ProtectedRoute` as described; always check `profile.roles`. On role mismatch, show a 403 page with a "Go Back" action.
- **Server**: every endpoint mutating data must verify user role server-side (e.g., only allow `verifier` to call approval endpoints).
- **Auditing**: every approve, map, make_canonical, edit action must produce a row in `actions_log`.

---

## Appendix A — Example allowedRoles for ProtectedRoute usage

- Dashboard: `allowedRoles=['admin','viewer']`
- Analytics: `allowedRoles=['admin','viewer']`
- Shipment list: `allowedRoles=['shipment','admin','viewer']`
- Shipment profile: `allowedRoles=['shipment','verifier','admin','viewer']` (verifier has access to shipment profiles)
- Trucking list/profile: `allowedRoles=['trucking','admin','viewer']`
- Finance list/profile: `allowedRoles=['finance','admin','viewer']`
- Verifier queue/review: `allowedRoles=['verifier','admin','viewer']`
- User management page: `allowedRoles=['admin','viewer']` (admin can edit; viewer is read-only)

Frontend UI rules:

- Sidebar hides links the user lacks roles for.
- `admin` and `viewer` see all tabs in Sidebar (Dashboard, Shipment, Trucking, Finance, Analytics).
- Department-only users see only their department tabs (e.g., `['shipment']` sees only Shipment tab).
- Multi-department users see all their assigned department tabs (e.g., `['shipment','finance']` sees Shipment + Finance tabs, NO Dashboard/Analytics).
- Operation-level checks: Buttons/actions are NOT hidden by default. When a user attempts an operation (e.g., "Add Document", "Edit Document"), check permissions and show access error if denied.
- User Management icon is in the Header (not Sidebar), visible to `admin` and `viewer` only.

---
