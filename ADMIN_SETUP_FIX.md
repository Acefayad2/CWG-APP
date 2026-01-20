# Admin Setup Fix - Quick Guide

## Problem
Your account (`acefayad@gmail.com`) is not set as admin, and you can't see the "User Approvals" section.

## Solution

### Step 1: Set Your Account as Admin

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste this SQL script:

```sql
-- Set acefayad@gmail.com as admin and approved
UPDATE public.profiles 
SET 
  role = 'admin',
  approval_status = 'approved'
WHERE id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'acefayad@gmail.com'
  LIMIT 1
);

-- Verify it worked
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.approval_status,
  u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'acefayad@gmail.com';
```

4. Click **Run**
5. You should see your account with `role = 'admin'` and `approval_status = 'approved'`

### Step 2: Refresh Your App

1. **Sign out** of the app
2. **Sign back in** with `acefayad@gmail.com`
3. Go to the **Profile** tab
4. You should now see an **"Admin Tools"** section at the bottom with:
   - Manage Scripts
   - Upload Resources
   - **User Approvals** ← This is what you need!

### Step 3: Verify Approval System Works

After running the SQL above, also check if there are any pending users:

```sql
-- Check all pending users
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.approval_status,
  u.email,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.approval_status = 'pending'
ORDER BY p.created_at DESC;
```

## Why You Could Log In Without Approval

If you were able to log in immediately after signing up, it means one of these:

1. **The SQL setup wasn't run yet** - The `approval_status` column might not exist, or the default value wasn't set to 'pending'
2. **Your account was auto-approved somehow** - The trigger might have set it differently

**Important**: If you haven't run the `COMPLETE_SETUP.sql` file yet, you need to do that first! This sets up:
- The `approval_status` column
- The trigger that sets new users to 'pending'
- All the RLS policies
- Storage buckets

## Finding the Admin Approvals Page

Once your account is admin, you can access User Approvals in two ways:

1. **From Profile Tab**: Scroll down to "Admin Tools" section → Click "User Approvals"
2. **Direct URL**: `http://localhost:3939/admin/approvals` (or your app URL)

The page will show:
- All users with `approval_status = 'pending'`
- Approve/Deny buttons for each user
- User details (name, email, created date)

## Need Help?

If the SQL doesn't work or you see errors:
1. Make sure you ran `COMPLETE_SETUP.sql` first
2. Check that the `profiles` table exists
3. Verify your email matches exactly: `acefayad@gmail.com`
