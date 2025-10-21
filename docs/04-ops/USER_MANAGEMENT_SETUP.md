# User Management Setup Guide

This guide will help you set up the User Management feature with granular permissions.

## Overview

The User Management system allows admins to:

- Create new user accounts
- Assign granular permissions per department
- Send password reset emails
- Delete users
- View all users in a searchable, paginated table

Viewers can see the user list but cannot make any changes (read-only).

## Database Setup

### Step 1: Run the SQL Migration

Open your Supabase SQL Editor and run the migration script:

```bash
docs/02-architecture/sql/add_granular_permissions.sql
```

This will:

- Add 4 new permission columns to the `profiles` table:
  - `shipment_access`
  - `shipment_approval_access`
  - `trucking_access`
  - `finance_access`
- Backfill existing users based on their current roles
- Create indexes for better performance

### Step 2: Verify the Schema

After running the migration, verify your `profiles` table has these columns:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public';
```

You should see:

- `id` (uuid)
- `email` (text)
- `full_name` (text)
- `roles` (text[])
- `created_at` (timestamp)
- `shipment_access` (text) - NEW
- `shipment_approval_access` (text) - NEW
- `trucking_access` (text) - NEW
- `finance_access` (text) - NEW

## Permission Levels

Each department permission can have one of three values:

1. **No Access** (`no_access`) - User cannot access this department
2. **Can View** (`can_view`) - User can view but not edit
3. **Can View, Can Edit** (`can_edit`) - User has full access

## Features

### 1. Create New Users

**Admin Only**

- Click "Create New Account" button
- Fill in:
  - Email (required)
  - Full Name (required)
  - Password (min 6 characters, required)
  - Confirm Password (required)
  - Permissions for each department (optional, defaults to "No Access")
- Click "Create Account"

The new user will be created in Supabase Auth and their profile will be updated with the specified permissions.

### 2. Edit Permissions

**Admin Only**

- Use the dropdown menus in each column to change permissions
- Changes are saved immediately (no need to click a save button)
- A toast notification will confirm the update

### 3. Send Password Reset Email

**Admin Only**

- Click the key icon (🔑) in the Actions column
- A password reset email will be sent to the user's email address
- The user will receive a link to reset their password
- Toast notification confirms the email was sent

**Note:** Make sure you've configured the password reset redirect URL in Supabase:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add `http://localhost:3000/reset-password` to Redirect URLs

### 4. Delete Users

**Admin Only**

- Click the trash icon (🗑️) in the Actions column
- Confirm the deletion in the popup dialog
- The user will be permanently deleted from the system
- Toast notification confirms the deletion

**Warning:** This action cannot be undone!

### 5. Search and Filter

**All Users**

- **Search:** Type in the search box to filter by email, name, or account ID
- **Date Filter:** Select an "Ending To" date to show only users created before that date
- **Pagination:** Navigate through pages using the page numbers and arrows

## Supabase Auth Configuration

### Enable Email Confirmations (Optional)

By default, new users are created without email confirmation. To enable it:

1. Go to Supabase Dashboard → Authentication → Providers
2. Scroll to Email
3. Toggle "Enable email confirmations"

### Configure Email Templates

Customize the password reset email template:

1. Go to Supabase Dashboard → Authentication → Email Templates
2. Select "Reset Password"
3. Customize the template as needed

## Access Control

### Admin Role

- Full access to all features
- Can create, edit, and delete users
- Can send password reset emails
- Can view all users

### Viewer Role

- Read-only access
- Can view the user list
- Cannot create, edit, or delete users
- Cannot send password reset emails
- All dropdowns and action buttons are disabled

### Other Roles

- Cannot access the User Management page
- Will see 403 Forbidden if they try to access `/user-management`

## Troubleshooting

### Users are created but permissions don't save

**Check RLS Policies:**

Ensure your `profiles` table has UPDATE policies that allow the authenticated user to update their own profile and admins to update any profile.

Example policy:

```sql
CREATE POLICY "Admin can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND 'admin' = ANY(profiles.roles)
  )
);
```

### Password reset emails aren't being sent

**Check Supabase Email Settings:**

1. Verify you've configured SMTP in Supabase (or use Supabase's built-in email service)
2. Check the Supabase logs for email send errors
3. Ensure the redirect URL is configured correctly

### Permission dropdowns don't update

**Check Browser Console:**

Open the browser console (F12) and look for errors. Common issues:

- CORS errors (check Supabase CORS settings)
- RLS policy blocks (check Supabase logs)
- Network errors (check your internet connection)

## Future Enhancements

Planned features for future versions:

1. **Bulk Actions** - Select multiple users and apply permissions in bulk
2. **Role Templates** - Pre-defined permission sets for common roles
3. **Activity Log** - Track all user management actions in an audit log
4. **Export Users** - Export user list to CSV/Excel
5. **User Deactivation** - Temporarily disable users without deleting them
6. **Last Login Tracking** - Show when users last logged in
7. **Advanced Filters** - Filter by permission level, role, creation date range

## Security Best Practices

1. **Always verify admin role** on both frontend and backend
2. **Never expose passwords** - they're handled securely by Supabase Auth
3. **Log all user management actions** for audit purposes
4. **Use HTTPS** in production to protect sensitive data
5. **Regularly review user permissions** to ensure least-privilege access

## API Reference

### Supabase Functions Used

**Create User:**

```javascript
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "securePassword123",
  options: {
    data: { full_name: "John Doe" },
  },
});
```

**Update Permissions:**

```javascript
const { error } = await supabase
  .from("profiles")
  .update({ shipment_access: "can_edit" })
  .eq("id", userId);
```

**Send Password Reset:**

```javascript
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: "http://localhost:3000/reset-password",
});
```

**Delete User:**

```javascript
const { error } = await supabase.from("profiles").delete().eq("id", userId);
```

---

## Contact & Support

For issues or questions, check:

- Supabase Documentation: https://supabase.com/docs
- Project documentation in `docs/` folder
- Supabase Dashboard logs for debugging
