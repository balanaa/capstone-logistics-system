# Developer Checklist — Today (Frontend + Auth)

## Priority tasks (status)

1. Routing & page scaffolding — Done

- Pages and stubs created per front-end-routing-map.md
- ProtectedRoute implemented with authReady gating; viewer read-only included
- Header + Sidebar built; Sidebar hides unauthorized links; Download/Edit/Delete in document window per roles

2. Authentication — Done

- Supabase client in src/services/supabaseClient.js
- Login page using signInWithPassword
- AuthProvider provides { user, roles, authReady }
- Landing redirect per rules (admin/viewer → /dashboard; else verifier > shipment > finance > trucking)

3. Create New Shipment (Overlay 1 → Overlay 2) — In progress

- Overlay 1: PRO + local file; instant preview (object URL); client-side MIME validation
- Overlay 2: preview + fields; submit blocks until validations pass; upload on submit

4. Verifier queue — Deferred (route kept; features later)

- Keep route; notifications later; mapping UI later

5. Analytics page — Basic

- Simple charts from mock data; date-range shortcuts

- Profiles table with roles text[]; roles seeded via authenticate-accounts.md appendix
- Roles fetched into AuthContext; localStorage roles cache for fast load

## Testing & sanity (today)

- Confirm routing, login, and ProtectedRoute (403/login) work
- Verify direct URL/refresh on protected pages works (no blank)
- Test Download/Edit/Delete visibility by role

## Next steps

- Finish DB schema, insert rows on submit, and connect profile windows to DB
- Implement storage RLS tests by role; finalize Delete/Replace flows
- Mapping/verification flows (later)
