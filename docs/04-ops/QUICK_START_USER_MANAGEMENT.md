# Quick Start: User Management

Get your User Management feature up and running in 5 minutes!

## Step 1: Run the Database Migration ⚡

Open your **Supabase SQL Editor** and copy-paste this:

```sql
-- Add granular permission columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shipment_access text DEFAULT 'no_access' CHECK (shipment_access IN ('no_access', 'can_view', 'can_edit')),
  ADD COLUMN IF NOT EXISTS shipment_approval_access text DEFAULT 'no_access' CHECK (shipment_approval_access IN ('no_access', 'can_view', 'can_edit')),
  ADD COLUMN IF NOT EXISTS trucking_access text DEFAULT 'no_access' CHECK (trucking_access IN ('no_access', 'can_view', 'can_edit')),
  ADD COLUMN IF NOT EXISTS finance_access text DEFAULT 'no_access' CHECK (finance_access IN ('no_access', 'can_view', 'can_edit'));

-- Backfill admin users with full access
UPDATE public.profiles
SET
  shipment_access = 'can_edit',
  shipment_approval_access = 'can_edit',
  trucking_access = 'can_edit',
  finance_access = 'can_edit'
WHERE 'admin' = ANY(roles);

-- Backfill viewer users with view access
UPDATE public.profiles
SET
  shipment_access = 'can_view',
  shipment_approval_access = 'can_view',
  trucking_access = 'can_view',
  finance_access = 'can_view'
WHERE 'viewer' = ANY(roles) AND NOT 'admin' = ANY(roles);
```

Click **Run** ✅

## Step 2: Configure Password Reset URL 🔐

1. Go to your **Supabase Dashboard**
2. Navigate to: **Authentication** → **URL Configuration**
3. Add to **Redirect URLs**:
   ```
   http://localhost:3000/reset-password
   ```
4. Click **Save**

## Step 3: Test It Out 🎉

1. **Start your app:**

   ```bash
   npm start
   ```

2. **Login as an admin user**

3. **Navigate to User Management:**

   - Click the user icon in the header, OR
   - Go to: `http://localhost:3000/user-management`

4. **Try creating a new user:**

   - Click "Create New Account"
   - Fill in the form
   - Set permissions
   - Click "Create Account"

5. **Test password reset:**
   - Click the key icon (🔑) next to any user
   - Check the user's email for the reset link

## What You Can Do

### As Admin 👑

- ✅ Create new users
- ✅ Edit permissions for any user
- ✅ Send password reset emails
- ✅ Delete users
- ✅ Search and filter users

### As Viewer 👀

- ✅ View all users
- ✅ Search and filter users
- ❌ Cannot create, edit, or delete

## Permission Levels Explained

| Permission             | What it means                              |
| ---------------------- | ------------------------------------------ |
| **No Access**          | User cannot see this department at all     |
| **Can View**           | User can see data but cannot create/edit   |
| **Can View, Can Edit** | User has full access to create/edit/delete |

## Departments

1. **Shipment** - Bill of Lading, Invoices, Packing Lists
2. **Shipment Approval** - Verifier role (approve/reject shipment docs)
3. **Trucking** - Trucking department documents
4. **Finance** - Finance department documents

## Password Reset Flow

When you click the key icon:

1. **Admin** clicks reset button for user
2. **Supabase** sends email to user with reset link
3. **User** clicks link in email
4. **User** redirects to `/reset-password` page (create this page if needed)
5. **User** enters new password
6. **Done!** ✅

## Common Issues

### "Error updating permission"

- **Fix:** Check your Supabase RLS policies allow admins to update profiles

### "Error sending password reset email"

- **Fix:** Check Supabase email settings and redirect URL configuration

### "Permission dropdowns are disabled"

- **Fix:** You're logged in as a viewer (read-only). Login as admin to edit.

### "Can't create users"

- **Fix:** Ensure you have the `signUp` feature enabled in Supabase Auth settings

## Next Steps

Once this is working, you can:

1. ✨ **Customize the UI** - Update colors/styles in `UserManagement.css`
2. 🔒 **Add more permission levels** - Extend the granular permissions
3. 📊 **Add activity logging** - Track who changed what
4. 📧 **Customize email templates** - Make password reset emails match your brand
5. 🎨 **Create a reset password page** - Build `/reset-password` route

## Quick Reference

**Route:** `/user-management`

**Files:**

- `src/pages/Auth/UserManagement.js` - Main component
- `src/pages/Auth/UserManagement.css` - Styles
- `src/components/overlays/CreateUserModal.js` - Create user modal
- `src/components/overlays/CreateUserModal.css` - Modal styles
- `docs/02-architecture/sql/add_granular_permissions.sql` - Database migration

**Supabase Functions:**

- Create user: `supabase.auth.signUp()`
- Update permissions: `supabase.from('profiles').update()`
- Password reset: `supabase.auth.resetPasswordForEmail()`
- Delete user: `supabase.from('profiles').delete()`

---

🎉 **That's it!** You now have a fully functional User Management system!
