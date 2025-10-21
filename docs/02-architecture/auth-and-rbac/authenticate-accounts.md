# Authentication and Accounts

## Goal

Implement Supabase Auth for user login and role-based access routing.

## Supabase setup (frontend steps)

- Add `src/services/supabaseClient.js` with createClient using environment variables.
- Use Supabase client for `signInWithPassword`, `signOut`, `onAuthStateChange` hooks.

Note: Future enhancement — integrate Gmail/Yahoo inbox for attachment intake (magic links/OAuth can be considered later; MVP keeps email/password).

### URL configuration (dev + future)

- Site URL: `http://localhost:3000`
- Additional Redirect URLs:
  - For email/password only: none (or `http://localhost:3000`)
  - For magic links / OAuth callbacks: add the exact callback URL (e.g., `http://localhost:3000/auth/callback`)
  - For password reset page: add `http://localhost:3000/reset-password`
  - For email confirmation page: add your confirmation route URL
  - Add production URLs later (e.g., `https://your-app.vercel.app`)

## User session persistence

- Use Supabase's built-in session persistence (client stores session automatically).
- On app load, check `supabase.auth.getSession()` or `supabase.auth.getUser()` to get logged-in user and metadata.

## User roles and routing decisions

- Roles: shipment, trucking, finance, verifier, viewer, admin. (Note: `analytics` role has been removed)
- Store roles in a `profiles` table (Supabase) with fields: `id` (uuid, auth.users.id), `email`, `full_name`, `roles` (text[]), `created_at`.
- After login, fetch `profiles` for the current user and place `{ user, roles }` in an `AuthProvider` context.
- Redirect rules (landing):

  - If roles include `admin` or `viewer` → `/dashboard`
  - Else highest present among: `verifier` → `/verifier`, `shipment` → `/shipment`, `finance` → `/finance`, `trucking` → `/trucking`
  - Fallback → `/dashboard`

## ProtectedRoute behavior

- Wrapper that checks auth + roles before rendering a page
- If not authenticated → redirect to `/login`
- If authenticated but roles do not intersect with `allowedRoles` → show `/403` (Unauthorized) with a "Go Back" action
- Show a loading state until auth initialization completes (avoid flicker)

## Pages to create now (auth)

- /login (Login.js): email + password; approximate design from `docs/assets/login.png`
- /dashboard (for admin/analytics/viewer read-only)
- /user-management (renamed from /settings): basic profile + roles view (admin editable later)

## Sample flow (plain text)

1. User opens /login
2. On successful Supabase sign-in, app calls API to fetch user profile (roles)
3. App stores user & roles in context (React Context or simple store)
4. App navigates user to landing page using the rules above

---

## Appendix — Example role seeding (Supabase SQL)

```sql
-- Ensure profiles table exists with roles text[] (example schema)
-- create table if not exists public.profiles (
--   id uuid primary key references auth.users(id),
--   email text,
--   full_name text,
--   roles text[] not null default '{}',
--   created_at timestamp default now()
-- );

-- Example: set roles for existing users (replace uuids/emails)
update public.profiles set roles = array['admin'] where email = 'admin@email.com';
update public.profiles set roles = array['viewer'] where email = 'viewer@email.com';
update public.profiles set roles = array['shipment'] where email = 'shipment@email.com';
update public.profiles set roles = array['trucking'] where email = 'trucking@email.com';
update public.profiles set roles = array['finance'] where email = 'finance@email.com';
update public.profiles set roles = array['verifier'] where email = 'verifier@email.com';

-- Multi-role example
update public.profiles set roles = array['shipment','finance'] where email = 'ship-fin@email.com';
```

See also: `docs/02-architecture/auth-and-rbac/roles-and-access.md` for landing rules and allowedRoles.
