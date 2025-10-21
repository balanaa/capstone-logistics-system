# Auth Routing Bug Report — Direct URL/Refresh shows blank page

Date: 2025-10-12
Status: Investigating

## Context

- Frontend: React (CRA), React Router v6
- Auth: Supabase (AuthContext exposes `{ user, roles, loading, signIn, signOut, getLandingPath }`)
- Routing: `ProtectedRoute` for RBAC; `Shell` layout renders `Header`, `Sidebar`, and `<main>` except on `/login` and `/403`.
- Roles: `admin`, `viewer`, `shipment`, `trucking`, `finance`, `verifier`.

## Expected Behavior

1. Unauthenticated:
   - `/` → `/login`.
   - Any protected path (e.g., `/dashboard`, `/shipment`) → `/403`.
   - On `/403`, “Go Home” → `/login`.
2. Authenticated (e.g., `viewer`):
   - Sidebar navigation to any allowed page works.
   - Typing a valid URL directly (e.g., `/shipment`) or refreshing on that page renders normally (no blank page).
   - Role-mismatch URLs redirect to `/403`.

## Observed Behavior

- As `viewer`, navigating via Sidebar works correctly.
- As `viewer`, typing a valid URL (e.g., `/shipment`, `/trucking`, `/finance`) or refreshing on those pages shows a blank white page (no content). No redirect to `/403` (and the user is authenticated).
- Unauthenticated direct URL to protected routes correctly redirects to `/403`, and “Go Home” now goes to `/login` as expected.

## Changes Attempted (chronological)

1. Logout button and header fixes

   - Added a proper logout button; fixed icon anchors; ensured navigation to `/login` with fallback hard redirect.
   - Result: Logout flows reliably.

2. Protected route behavior

   - Changed unauthenticated access in `ProtectedRoute` to redirect to `/403` instead of `/login`.
   - Result: Unauthenticated deep-links now go to `/403` as intended.

3. 403 page behavior

   - Fixed “Go Home” to route to `/login` when no user; kept role-based home when authenticated.
   - Result: No more loop to `/403` when logged out.

4. Shell-level guard

   - Added guard in `Shell` to navigate unauthenticated visitors on protected routes to `/403` after auth loading completes.
   - Result: Prevents rendering an empty shell for logged-out deep links.

5. Auth initialization robustness

   - Ensured `AuthContext` sets `loading=false` even if `getSession()` or profile fetch fails; set `user=null` on error to unblock UI.
   - Result: Reduces chance of hanging in a loading state (white screen due to `return null`).

6. Root landing behavior
   - Replaced root route `/` with a `LandingRedirect` that:
     - Sends unauthenticated users to `/login`.
     - Sends authenticated users to their role-based landing page.
   - Result: `/` works both fresh and when logged in.

## Current Result

- Unauthenticated paths behave correctly.
- Logged-in `viewer`: Sidebar navigation works; typing URL / refreshing on department routes yields a blank page.

## Working Hypotheses

- Route rendering occurs before roles are available on first paint after refresh, causing a transient state that returns nothing.
- A runtime error in one of the department pages during initial mount on direct navigation (but not when reached via Sidebar) is causing React to render nothing (no error boundary to catch and display).
- `ProtectedRoute` may be resolving access differently between Sidebar navigation vs. direct load (e.g., `roles=[]` momentarily after refresh); however, we would expect `/403`, not a blank page, if access were denied.
- The blank state may be caused by layout returning `null` during `loading` without a visual fallback, combined with a render timing edge case.

## Next Diagnostic Steps

1. Add a minimal global Error Boundary to surface any runtime errors that would otherwise blank the page.
2. Add lightweight logging (behind a debug flag) in:
   - `ProtectedRoute` (log `{ path, user?, roles, allowedRoles, decision }`).
   - `Shell` effect (log `{ path, loading, user? }` on changes).
   - Each department page root component mount (`Shipment`, `Trucking`, `Finance`).
3. Temporarily show a tiny loader instead of `return null` in `Shell` and `ProtectedRoute` when `loading` is true, to confirm whether the issue is stuck-loading vs. error.
4. Verify `roles` after refresh for `viewer` contains `'viewer'` before `ProtectedRoute` access check.
5. Confirm React Router navigation history and route resolution on hard refresh (ensure no stale Navigate loops).

## Proposed Fixes (after diagnostics)

- If roles are momentarily empty after refresh, gate the `ProtectedRoute` with `loading || rolesInitialized` to avoid premature deny/blank.
- Introduce an ErrorBoundary around `<Routes>` to catch and render a friendly message.
- Ensure department pages don’t assume data that isn’t present on a direct load (guard with defaults).

## Reproduction Steps

1. Log in as `viewer`.
2. In the address bar, navigate to `/shipment`, press Enter.
3. Observe: blank white page.
4. Navigate via Sidebar to Shipment: works.
5. Refresh on `/shipment`: blank white page returns.

## Open Questions

- Do we ever get console errors on the blank page (production logs or warnings)?
- Are `roles` consistently present as `['viewer']` in `AuthContext` immediately after refresh?

---

Owner: Frontend
Next Update: After adding ErrorBoundary + debug logs

## Resolution (working now)

Status: Fixed

Root cause:

- After refresh, `user` was truthy but `roles` was temporarily `[]`; the guard decided before roles populated, causing blank/spinner or 403.

Fixes applied:

- Added `authReady` gating in `AuthContext`; unblocks UI and guards only after initial auth flow.
- Applied roles cache (localStorage) to pre-populate roles immediately on load; refresh from Supabase in background.
- `ProtectedRoute` now waits briefly (≈800ms) when `user` exists but `roles` is empty before deciding.
- Shell only redirects unauthenticated users after `authReady` to avoid flashing empty Shell.
- Added small `Loading` screen and an `ErrorBoundary` to avoid blank pages and surface errors.

Validated scenarios (manual):

- Unauthenticated
  - `/` → `/login` ✅
  - Protected URLs (e.g., `/dashboard`, `/shipment`) → `/403` ✅
  - On `/403`, Go Home → `/login` (no loop) ✅
- Viewer (authenticated)
  - Landed on `/dashboard` after login ✅
  - Sidebar navigation to `/shipment`, `/trucking`, `/finance` ✅
  - Direct URL to those pages and refresh renders correctly (no blank/403) ✅
  - Navigated to a profile route and back via URL; refresh works ✅
- Role mismatch
  - Guard returns `/403` (previously validated) ✅

Notes:

- Keep roles cache warmed when updating roles; a background refresh will reconcile shortly after auth change.
