# Roles & Access Update - Changelog

**Date:** October 12, 2025  
**Status:** ✅ Completed

---

## Summary

This update finalizes the role-based access control system for Deegee, removing the `analytics` role and establishing comprehensive storage and database access rules. The system now has 6 roles (down from 7) with clear department isolation and operation-level permissions.

---

## Key Changes

### 1. **Removed `analytics` Role**

- **Rationale:** Analytics functionality is now covered by `viewer` (read-only) and `admin` (full access).
- **Impact:** All references to `analytics` role removed from docs and code.

### 2. **Verifier Role Clarification**

- **Verifier is now explicitly a "specialized Shipment role"**
- Verifier operates **exclusively within Shipment department**
- Verifier has:
  - Full Shipment department access (view/create/upload/edit/submit/delete)
  - PLUS approval powers (approve/map/make_canonical)
- **Verifier CANNOT access Trucking or Finance departments**

### 3. **Department User Delete Permission**

- **Small company trust model**: Department users can delete ANY file within their department folder (not just own uploads)
- Applies to: `shipment`, `trucking`, `finance`, `verifier` (within shipment only)
- **Admin** can delete across all departments

### 4. **Viewer Access Restrictions**

- Viewer can view all pages/departments
- Viewer sees **only summary data** on profile pages (limited database fields)
- Viewer has **NO direct file access** (cannot download files)
- Viewer **cannot open edit overlays** or perform write operations

### 5. **Storage Access Rules (Supabase Storage)**

- Created comprehensive RLS policy documentation for `documents` bucket
- Folder structure: `shipment/`, `trucking/`, `finance/`
- Role-based folder access (users can only access their department folders)
- Replace operation = DELETE old + UPLOAD new (2 separate permissions required)

### 6. **Database Access Rules (Supabase Database)**

- Department isolation: Single-role users can ONLY access their own department's data
- Multi-role users can access ALL assigned departments
- **Update forever**: Uploaders can UPDATE their documents indefinitely (no status-based restrictions)
- Audit logging table schema defined for future implementation

---

## Final Role List (6 Roles)

| Role       | Description                                    | Scope                                            |
| ---------- | ---------------------------------------------- | ------------------------------------------------ |
| `admin`    | Full system access and user management         | All departments, all operations                  |
| `viewer`   | Read-only account                              | All departments (limited fields), no file access |
| `shipment` | Department encoder for Shipment                | Shipment department only                         |
| `trucking` | Department encoder for Trucking                | Trucking department only                         |
| `finance`  | Department encoder for Finance                 | Finance department only                          |
| `verifier` | Specialized Shipment role with approval powers | Shipment department only                         |

---

## Updated Files

### Documentation Files

1. ✅ **`docs/02-architecture/auth-and-rbac/roles-and-access.md`**

   - Removed `analytics` role from role list
   - Updated permissions matrix (added `delete` column, updated verifier permissions)
   - Added department isolation notes
   - Updated routing `allowedRoles` (removed analytics)
   - Updated landing page rules (removed analytics)
   - Updated sidebar visibility rules
   - Added operation-level permission check notes

2. ✅ **`docs/02-architecture/data-and-storage/storage-and-database-access.md`** (NEW)

   - Comprehensive storage access rules (Supabase Storage RLS policies)
   - Database access rules and RLS policy examples
   - Multi-role user handling
   - Audit logging table schema
   - Implementation checklist

3. ✅ **`docs/02-architecture/auth-and-rbac/authenticate-accounts.md`**

   - Removed `analytics` from role list
   - Updated landing page redirect rules (removed analytics)

4. ✅ **`docs/02-architecture/frontend/front-end-routing-map.md`**
   - Updated all `allowedRoles` arrays (removed `'analytics'`)
   - Updated notes about sidebar visibility
   - Updated user management route access

### Frontend Code Files

5. ✅ **`src/App.js`**

   - Updated `/dashboard` route: `['admin','viewer']` (removed analytics)
   - Updated `/analytics` route: `['admin','viewer']` (removed analytics)
   - Updated `/user-management` route: `['admin','viewer']` (removed analytics)

6. ✅ **`src/context/AuthContext.js`**

   - Updated `getLandingPath()` logic (removed analytics check)
   - Landing priority: admin/viewer → dashboard; else verifier > shipment > finance > trucking

7. ✅ **`src/components/layout/Header.js`**

   - Updated `homeHref` logic (removed analytics check)
   - Logo now redirects correctly based on user's highest-priority role

8. ✅ **`src/components/layout/Sidebar.js`**
   - Updated Dashboard tab roles: `['admin','viewer']` (removed analytics)
   - Updated Analytics tab roles: `['admin','viewer']` (removed analytics)

---

## Permissions Matrix (Updated)

| Role     |       view        |   create/upload   |       edit        |      submit       |      approve      |        map        |  make_canonical   |       delete        | manage_users | view_analytics |
| -------- | :---------------: | :---------------: | :---------------: | :---------------: | :---------------: | :---------------: | :---------------: | :-----------------: | :----------: | :------------: |
| shipment |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |         ✕         |         ✕         |         ✕         | ✓ (any in own dept) |      ✕       |       ✕        |
| trucking |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |         ✕         |         ✕         |         ✕         | ✓ (any in own dept) |      ✕       |       ✕        |
| finance  |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |   ✓ (own dept)    |         ✕         |         ✕         |         ✕         | ✓ (any in own dept) |      ✕       |       ✕        |
| verifier | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (shipment only) | ✓ (any in shipment) |      ✕       |       ✕        |
| viewer   | ✓ (all, limited)  |         ✕         |         ✕         |         ✕         |         ✕         |         ✕         |         ✕         |          ✕          |      ✕       |       ✓        |
| admin    |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |   ✓ (all depts)   |    ✓ (all depts)    |      ✓       |       ✓        |

---

## Storage Access Matrix (Supabase Storage: `documents` bucket)

| Role       |         Upload          |       View/Download       |       Delete/Replace        |
| ---------- | :---------------------: | :-----------------------: | :-------------------------: |
| `shipment` | ✓ (to `shipment/` only) | ✓ (from `shipment/` only) | ✓ (ANY file in `shipment/`) |
| `trucking` | ✓ (to `trucking/` only) | ✓ (from `trucking/` only) | ✓ (ANY file in `trucking/`) |
| `finance`  | ✓ (to `finance/` only)  | ✓ (from `finance/` only)  | ✓ (ANY file in `finance/`)  |
| `verifier` | ✓ (to `shipment/` only) | ✓ (from `shipment/` only) | ✓ (ANY file in `shipment/`) |
| `viewer`   |   ✕ (NO file access)    |    ✕ (NO file access)     |              ✕              |
| `admin`    |     ✓ (ALL folders)     |      ✓ (ALL folders)      |        ✓ (ALL files)        |

---

## Routing Updates

### Before (with analytics):

```javascript
'/dashboard': ['analytics','admin','viewer']
'/analytics': ['analytics','admin','viewer']
'/user-management': ['admin','analytics','viewer']
```

### After (analytics removed):

```javascript
'/dashboard': ['admin','viewer']
'/analytics': ['admin','viewer']
'/user-management': ['admin','viewer']
```

### Landing Page Priority:

```javascript
if (roles.includes("admin") || roles.includes("viewer")) return "/dashboard";
if (roles.includes("verifier")) return "/verifier";
if (roles.includes("shipment")) return "/shipment";
if (roles.includes("finance")) return "/finance";
if (roles.includes("trucking")) return "/trucking";
return "/dashboard"; // fallback
```

---

## Next Steps (Manual Actions Required)

### 1. Delete `analytics` User from Supabase

- [x] Go to Supabase Dashboard → Authentication → Users
- [x] Find `analytics@email.com` user
- [x] Delete the user account

### 2. Test Role-Based Access

- [ ] Test login with each role (admin, viewer, shipment, trucking, finance, verifier)
- [ ] Verify landing pages redirect correctly
- [ ] Verify sidebar shows correct tabs for each role
- [ ] Test multi-role users (e.g., `['shipment','finance']`)
- [ ] Verify 403 page for unauthorized access attempts

### 3. Storage RLS Policies (Ready to Implement - SQL Provided)

The `documents` bucket is configured with:

- ✅ MIME type restrictions (jpg, png, pdf, docx, xlsx only)
- ✅ Private visibility
- ✅ Folder structure (shipment/, trucking/, finance/)

**Next steps** (SQL script ready in `docs/02-architecture/data-and-storage/storage-and-database-access.md`):

- [ ] Enable RLS on `documents` bucket in Supabase
- [ ] Copy & paste SQL script to create 19 RLS policies:
  - 5 INSERT policies (upload per department + verifier + admin)
  - 5 SELECT policies (download per department + verifier + admin)
  - 5 DELETE policies (trust-based within dept)
  - 1 UPDATE policy (admin only)
  - 0 policies for viewer (no file access)
- [ ] Test file upload/download/delete with each role

**See "Quick Start: Enable RLS Policies" section in `storage-and-database-access.md` for complete SQL script.**

### 4. Database RLS Policies (Future)

- [ ] Create document tables schema
- [ ] Enable RLS on all tables
- [ ] Implement SELECT/INSERT/UPDATE/DELETE policies
- [ ] Test database operations with each role

---

## Developer Notes

- **Frontend role checks are UI-level only**: All security must be enforced server-side via RLS policies.
- **Small company trust model**: Department members can delete any file within their dept folder (no ownership checks).
- **Verifier is Shipment-scoped**: All verifier policies should restrict to `department = 'shipment'` or `shipment/` folder.
- **Viewer file restrictions**: Viewer has NO storage access. Profile pages should fetch only summary data (no file paths).
- **Multi-role flexibility**: RLS policies should use `ANY(profiles.roles)` to support users with multiple department roles.
- **Operation-level checks**: Buttons/actions are NOT hidden by default. Check permissions onClick and show access error if denied.

---

## Testing Checklist

### Role Testing

- [ ] Login as `admin@email.com` → Should see Dashboard with all tabs
- [ ] Login as `viewer@email.com` → Should see Dashboard with all tabs (read-only)
- [ ] Login as `shipment@email.com` → Should land on /shipment, see only Shipment tab
- [ ] Login as `trucking@email.com` → Should land on /trucking, see only Trucking tab
- [ ] Login as `finance@email.com` → Should land on /finance, see only Finance tab
- [ ] Login as `verifier@email.com` → Should land on /verifier, see only Verifier-related pages

### Multi-Role Testing

- [ ] Create user with `['shipment','finance']` → Should land on /shipment, see Shipment + Finance tabs (NO Dashboard)
- [ ] Create user with `['trucking','verifier']` → Should land on /verifier, see Verifier + Trucking tabs

### 403 Testing

- [ ] Login as `shipment@email.com`, manually navigate to `/trucking` → Should redirect to /403
- [ ] Login as `viewer@email.com`, try to perform write operation → Should show access error

### Navigation Testing

- [ ] Click logo in header → Should redirect to user's landing page (not always /dashboard)
- [ ] Navigate to profile page (e.g., /shipment/pro-number/PRO-0001) → Header should show "Shipment - Profile"
- [ ] Sidebar should highlight correct tab when on profile pages

---

## Success Criteria

✅ All 8 files updated successfully  
✅ No linter errors  
✅ `analytics` role completely removed from codebase  
✅ `analytics` user deleted from Supabase  
✅ Verifier role clarified as Shipment-scoped  
✅ Department isolation rules documented  
✅ Storage and database access rules comprehensively documented  
✅ MIME type restrictions added to `documents` bucket (jpg, png, pdf, docx, xlsx)  
✅ Complete SQL script for 19 RLS policies provided  
✅ Temporary logout button added to Header for testing  
✅ TODOs updated (3 tasks completed)

## Additional Changes (Post-Initial Update)

### Header Logout Button (Temporary for Testing)

- ✅ Added logout button to Header (`<i className="fi fi-rr-user-logout"></i>`)
- ✅ Clicking logout clears session and redirects to `/login`
- Located in Header next to user management icon
- Can be removed or styled later

### Storage Bucket Configuration

- ✅ Documented MIME type restrictions in `storage-and-database-access.md`
- ✅ Added comprehensive "Quick Start" guide for implementing RLS policies
- ✅ Provided complete copy-paste SQL script for storage policies (INSERT/SELECT/DELETE only; no UPDATE policy needed)
- ✅ Added testing instructions for each role's file access
- ✅ Default Signed URL TTL set to 10 minutes; preview auto-refreshes once on expiry
- ✅ Download forces direct file download (no new-tab preview)
- ✅ Replace moved inside Edit overlay with confirmation mini-overlay
- ✅ Delete confirmation includes filename and states encoded data deletion
- ✅ Viewer cannot preview/download files; profile shows curated fields only (presentation-only limitation)
- ✅ Client-side MIME validation: show "Error: unsupported file type" with detail `Filetype <mime> is unsupported`

---

**End of Changelog**
