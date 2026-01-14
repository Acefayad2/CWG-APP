# Admin Account Setup Instructions

## Setting Up the Admin Account

To set up the admin account for `acefayad@gmail.com`:

### Step 1: Sign Up the Admin User

1. Go to the app (or signup page if you have one)
2. Sign up with:
   - **Email**: `acefayad@gmail.com`
   - **Password**: `abcd1234@`
   - **Full Name**: (enter your name)

### Step 2: Set User as Admin in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Users**
3. Find the user with email `acefayad@gmail.com`
4. Copy the user's **UUID** (User ID)

### Step 3: Update Profile to Admin Role

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this SQL (replace `USER_UUID_HERE` with the UUID you copied):

```sql
-- Set user as admin and approve them
UPDATE public.profiles 
SET role = 'admin', approval_status = 'approved'
WHERE id = 'USER_UUID_HERE';
```

### Step 4: Verify Admin Access

1. Log in to the app with `acefayad@gmail.com` / `abcd1234@`
2. Go to the **Profile** tab
3. You should see the **Admin Tools** section with:
   - Manage Scripts
   - Upload Resources
   - User Approvals

## Admin Approval System

**Important**: The system already allows admins to approve **other admins**. There are no restrictions on approving users based on their role.

### How It Works

- All new users (including admins) start with `approval_status = 'pending'`
- Admins can view all pending users (regular users and admins) in the **User Approvals** page
- Admins can approve or deny any pending user, regardless of their role
- When you set a user as admin via SQL, you should also set `approval_status = 'approved'` so they can access the app immediately

### Creating Additional Admins

To create additional admin users:

1. **Option 1: Sign up then update via SQL** (requires approval)
   - User signs up normally
   - Admin approves them via User Approvals page
   - Then update their role to 'admin' via SQL:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin'
   WHERE id = 'USER_UUID_HERE';
   ```

2. **Option 2: Sign up then update via SQL** (immediate access)
   - User signs up normally
   - Immediately update both role and approval_status via SQL:
   ```sql
   UPDATE public.profiles 
   SET role = 'admin', approval_status = 'approved'
   WHERE id = 'USER_UUID_HERE';
   ```

## Admin Pages

Once logged in as admin, you can access:

- **Manage Scripts**: `http://localhost:3939/admin/scripts`
- **Upload Resources**: `http://localhost:3939/admin/resources`
- **User Approvals**: `http://localhost:3939/admin/approvals`

Or via the Profile tab → Admin Tools section.

## Notes

- The approval system works for **all users** regardless of role
- Admins can approve both regular users and other admins
- The `usePendingUsers` hook returns ALL pending users (no role filtering)
- The `useApproveUser` hook can approve any user (no role restrictions)
