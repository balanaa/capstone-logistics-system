# ✅ User Management - Setup Checklist

## 🚀 Quick Setup (5 Minutes)

Follow these steps to get your User Management system running:

---

### ☐ Step 1: Run Database Migration (2 min)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy and paste this SQL:

```sql
-- Add granular permission columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shipment_access text DEFAULT 'no_access'
    CHECK (shipment_access IN ('no_access', 'can_view', 'can_edit')),
  ADD COLUMN IF NOT EXISTS shipment_approval_access text DEFAULT 'no_access'
    CHECK (shipment_approval_access IN ('no_access', 'can_view', 'can_edit')),
  ADD COLUMN IF NOT EXISTS trucking_access text DEFAULT 'no_access'
    CHECK (trucking_access IN ('no_access', 'can_view', 'can_edit')),
  ADD COLUMN IF NOT EXISTS finance_access text DEFAULT 'no_access'
    CHECK (finance_access IN ('no_access', 'can_view', 'can_edit'));

-- Backfill admin users with full access
UPDATE public.profiles
SET
  shipment_access = 'can_edit',
  shipment_approval_access = 'can_edit',
  trucking_access = 'can_edit',
  finance_access = 'can_edit'
WHERE 'admin' = ANY(roles);

-- Backfill viewer users with view-only access
UPDATE public.profiles
SET
  shipment_access = 'can_view',
  shipment_approval_access = 'can_view',
  trucking_access = 'can_view',
  finance_access = 'can_view'
WHERE 'viewer' = ANY(roles) AND NOT 'admin' = ANY(roles);
```

3. Click **Run** button
4. Verify: No errors shown ✅

---

### ☐ Step 2: Configure Password Reset URL (1 min)

1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Find the **Redirect URLs** section
3. Add this URL: `http://localhost:3000/reset-password`
4. Click **Save**

![URL Configuration Example]

```
Site URL: http://localhost:3000
Redirect URLs:
  - http://localhost:3000/reset-password  ← ADD THIS
```

---

### ☐ Step 3: Start Your App (30 sec)

```bash
npm start
```

Wait for the app to load...

---

### ☐ Step 4: Login as Admin (30 sec)

1. Open browser: `http://localhost:3000`
2. Login with your **admin** account
3. Verify you're logged in ✅

---

### ☐ Step 5: Navigate to User Management (15 sec)

Click on:

- The **user icon** in the header, OR
- Go directly to: `http://localhost:3000/user-management`

You should see the User Management table! 🎉

---

### ☐ Step 6: Test Features (1 min)

**Try these actions:**

1. **Create a new user:**

   - [ ] Click "Create New Account" button
   - [ ] Fill in the form (email, name, password)
   - [ ] Set some permissions
   - [ ] Click "Create Account"
   - [ ] Verify user appears in table ✅

2. **Edit permissions:**

   - [ ] Click any dropdown in the table
   - [ ] Change a permission level
   - [ ] Verify toast notification appears ✅

3. **Search:**

   - [ ] Type in the search box
   - [ ] Verify table filters ✅

4. **Password reset (optional):**

   - [ ] Click the key icon (🔑) next to any user
   - [ ] Verify toast shows "Password reset email sent" ✅
   - [ ] Check the user's email inbox

5. **Delete user (optional):**
   - [ ] Click the trash icon (🗑️) next to a test user
   - [ ] Confirm deletion
   - [ ] Verify user is removed from table ✅

---

### ☐ Step 7: Test as Viewer (Optional)

1. **Logout** from admin account
2. **Login** as a viewer account
3. Navigate to `/user-management`
4. Verify:
   - [ ] You can SEE all users ✅
   - [ ] "Create New Account" button is HIDDEN ❌
   - [ ] Dropdowns are DISABLED (grayed out) ❌
   - [ ] Action buttons (key, trash) are HIDDEN ❌
5. **Logout** and login back as admin

---

## ✅ Verification Checklist

After setup, verify these items:

- [ ] Database has 4 new columns in `profiles` table
- [ ] Redirect URL is configured in Supabase
- [ ] App starts without errors
- [ ] User Management page loads at `/user-management`
- [ ] Table shows existing users
- [ ] Can create new users (admin only)
- [ ] Can edit permissions (admin only)
- [ ] Can search and filter users
- [ ] Pagination works
- [ ] Password reset button works (admin only)
- [ ] Delete button works (admin only)
- [ ] Viewer sees read-only view

---

## 🎯 You're Done!

If all checkboxes above are checked, your User Management system is fully operational! 🎉

---

## 📚 Next Steps

Now that it's working, explore:

1. **Read the documentation:**

   - `USER_MANAGEMENT_COMPLETE.md` - Full feature overview
   - `docs/04-ops/QUICK_START_USER_MANAGEMENT.md` - Quick reference
   - `docs/04-ops/USER_MANAGEMENT_SETUP.md` - Detailed guide

2. **Customize the UI:**

   - Edit `src/pages/Auth/UserManagement.css`
   - Change colors, fonts, spacing to match your brand

3. **Extend functionality:**
   - Add more permission columns
   - Create role templates
   - Add bulk actions

---

## 🐛 Troubleshooting

### ❌ Can't create users

**Check:**

- Supabase Auth has `signUp` enabled
- No RLS policies blocking insert to `profiles`

### ❌ Password reset emails not sending

**Check:**

- Redirect URL is configured correctly
- Supabase email settings (SMTP or built-in)
- Check Supabase logs for errors

### ❌ Permissions not updating

**Check:**

- RLS policies allow admin to update `profiles`
- Browser console for errors
- Network tab for failed requests

### ❌ Table is empty

**Check:**

- You have users in the `profiles` table
- RLS policies allow viewing `profiles`
- Browser console for errors

---

## 📞 Need Help?

If you're stuck:

1. Check the **browser console** (F12) for errors
2. Check **Supabase logs** in the dashboard
3. Review the **detailed setup guide**: `docs/04-ops/USER_MANAGEMENT_SETUP.md`

---

**Happy User Managing! 🚀**
