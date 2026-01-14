# Complete Setup Checklist - CWG APP

Use this checklist to ensure your app is fully functional. Follow each step in order.

## ✅ Prerequisites

- [ ] Node.js 18+ installed
- [ ] npm/yarn installed
- [ ] Supabase account created (free tier works)
- [ ] Expo CLI installed globally (optional, but recommended)

## 1️⃣ Install Dependencies

```bash
npm install
```

## 2️⃣ Supabase Project Setup

### Create Supabase Project
- [ ] Go to https://supabase.com and create a new project
- [ ] Wait 2-3 minutes for database to initialize
- [ ] Save your database password (you'll need it later)

### Get API Keys
- [ ] Go to Project Settings > API
- [ ] Copy your **Project URL** (looks like: `https://xxxxx.supabase.co`)
- [ ] Copy your **anon/public key** (long string starting with `eyJ...`)

## 3️⃣ Environment Variables

- [ ] Create `.env` file in the project root
- [ ] Add your Supabase credentials:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: Replace `your-project-id` and `your-anon-key-here` with your actual values.

## 4️⃣ Database Schema Setup

Run these SQL scripts in order in your Supabase SQL Editor (Dashboard > SQL Editor):

### Step 4.1: Base Schema
- [ ] Run `supabase/schema.sql`
  - Creates: profiles, scripts, script_favorites, resources, resources_favorites tables
  - Enables RLS on all tables

### Step 4.2: User Approval System
- [ ] Run `supabase/user-approval-schema.sql`
  - Adds `approval_status` column to profiles
  - Sets up admin approval policies

### Step 4.3: Profile Pictures
- [ ] Run `supabase/profile-picture-schema.sql`
  - Adds `profile_picture_url` column to profiles

### Step 4.4: Contacts
- [ ] Run `supabase/contacts-complete-schema.sql` **OR** run both:
  - `supabase/contacts-schema.sql` (creates user_contacts table)
  - `supabase/contact-notes-history-schema.sql` (adds notes and history)

### Step 4.5: Resource User Access
- [ ] Run `supabase/resources-user-access.sql`
  - Updates RLS policies to allow users to create/edit/delete their own resources

## 5️⃣ Storage Buckets Setup

Create storage buckets in Supabase Dashboard (Storage > Buckets):

### Bucket 1: `resources`
- [ ] Create bucket named `resources`
- [ ] Set as **public** (policies will control access)
- [ ] Run `supabase/storage-policies.sql` (updated by resources-user-access.sql)
- [ ] **Note**: The `resources-user-access.sql` script already updates storage policies

### Bucket 2: `avatars`
- [ ] Create bucket named `avatars`
- [ ] Set as **public** (policies will control access)
- [ ] Run `supabase/profile-picture-storage.sql`

## 6️⃣ Create Admin User

After setting up the database:

1. [ ] Sign up your first user through the app
2. [ ] Go to Supabase Dashboard > Authentication > Users
3. [ ] Copy the user's UUID (user ID)
4. [ ] Go to SQL Editor and run:

```sql
-- Set user as admin
UPDATE public.profiles 
SET role = 'admin', approval_status = 'approved'
WHERE id = 'PASTE_USER_UUID_HERE';
```

**Important**: Replace `PASTE_USER_UUID_HERE` with the actual UUID you copied.

## 7️⃣ Verify Setup

### Check Database Tables
- [ ] Go to Table Editor in Supabase Dashboard
- [ ] Verify these tables exist:
  - ✅ `profiles`
  - ✅ `scripts`
  - ✅ `script_favorites`
  - ✅ `resources`
  - ✅ `resources_favorites`
  - ✅ `user_contacts`
  - ✅ `contact_history`

### Check Storage Buckets
- [ ] Go to Storage in Supabase Dashboard
- [ ] Verify these buckets exist:
  - ✅ `resources`
  - ✅ `avatars`

### Check RLS Policies
- [ ] Go to Authentication > Policies in Supabase Dashboard
- [ ] Verify RLS is enabled on all tables
- [ ] Check that policies are present for:
  - profiles (select, update)
  - scripts (select, insert, update, delete)
  - script_favorites (select, insert, delete)
  - resources (select, insert, update, delete)
  - resources_favorites (select, insert, delete)
  - user_contacts (select, insert, update, delete)
  - contact_history (select, insert, update, delete)

## 8️⃣ Run the App

```bash
# Start development server
npm start

# Or run on specific platform
npm run ios      # iOS Simulator (Mac only)
npm run android  # Android Emulator
npm run web      # Web browser
```

## 9️⃣ Test Core Features

### Authentication
- [ ] Sign up a new user
- [ ] Verify new user sees "Awaiting Approval" screen
- [ ] Log in as admin
- [ ] Go to Profile > Admin Tools > User Approvals
- [ ] Approve the pending user
- [ ] Log in as the approved user
- [ ] Verify user can access the app

### Scripts
- [ ] Create a script (admin user)
- [ ] Mark script as admin script (universal)
- [ ] Create a personal script (admin user)
- [ ] Log in as regular user
- [ ] Verify user can see admin's universal scripts
- [ ] Verify user cannot see admin's personal scripts
- [ ] Create a script as regular user
- [ ] Edit own script
- [ ] Delete own script
- [ ] Try to delete admin script (should fail)

### Resources
- [ ] Upload a resource as admin
- [ ] Upload a resource as regular user
- [ ] View resources
- [ ] Delete own resource
- [ ] Try to delete another user's resource (should fail if not admin)

### Contacts
- [ ] Import contacts (on mobile device)
- [ ] Add contact manually
- [ ] View contacts list
- [ ] Edit contact notes
- [ ] Add contact history entry

### Profile
- [ ] Update profile name
- [ ] Upload profile picture
- [ ] View profile information

## 🔧 Troubleshooting

### Database Errors
- **Error: relation "public.profiles" does not exist**
  - Solution: Run `supabase/schema.sql` first

- **Error: column "approval_status" does not exist**
  - Solution: Run `supabase/user-approval-schema.sql`

- **Error: column "profile_picture_url" does not exist**
  - Solution: Run `supabase/profile-picture-schema.sql`

- **Error: relation "public.user_contacts" does not exist**
  - Solution: Run `supabase/contacts-complete-schema.sql` or `supabase/contacts-schema.sql`

### Storage Errors
- **Error: bucket "resources" not found**
  - Solution: Create the `resources` bucket in Storage dashboard

- **Error: bucket "avatars" not found**
  - Solution: Create the `avatars` bucket in Storage dashboard

- **Error: new row violates row-level security policy**
  - Solution: Run the appropriate storage policy SQL scripts

### Authentication Errors
- **Error: User not approved**
  - Solution: Admin needs to approve user via Profile > Admin Tools > User Approvals

- **Error: Cannot read property 'role' of undefined**
  - Solution: Verify the user's profile was created in the `profiles` table

### App Errors
- **Error: supabaseUrl is required**
  - Solution: Check `.env` file exists and has correct values
  - Restart the development server after updating `.env`

- **Blank screen / App won't load**
  - Solution: Check browser console for errors
  - Verify all dependencies are installed (`npm install`)
  - Clear cache and restart server

## 📋 SQL Files Execution Order

If you're setting up from scratch, run these SQL files in this exact order:

1. `supabase/schema.sql` - Base tables and RLS
2. `supabase/user-approval-schema.sql` - Approval system
3. `supabase/profile-picture-schema.sql` - Profile pictures
4. `supabase/contacts-complete-schema.sql` - Contacts (or run contacts-schema.sql then contact-notes-history-schema.sql)
5. `supabase/resources-user-access.sql` - Updated resource policies
6. `supabase/storage-policies.sql` - Storage policies (may be updated by resources-user-access.sql)
7. `supabase/profile-picture-storage.sql` - Avatar storage policies

**Note**: The `resources-user-access.sql` file updates policies, so it should be run after the base `schema.sql`.

## 🎯 Quick Start (If Starting Fresh)

1. Install dependencies: `npm install`
2. Create Supabase project
3. Copy API keys to `.env` file
4. Run all SQL files in order (see above)
5. Create storage buckets: `resources` and `avatars`
6. Run storage policy SQL files
7. Start app: `npm start`
8. Sign up first user
9. Set first user as admin (SQL)
10. Test features

## 📝 Notes

- The app uses Row Level Security (RLS) for all database operations
- Admin users have special permissions to manage scripts, resources, and user approvals
- Regular users can only manage their own data (scripts, resources, contacts)
- New users are set to `approval_status = 'pending'` automatically
- Admins must approve users before they can access the app
- Storage buckets must be created manually in Supabase Dashboard
- All SQL scripts can be run multiple times safely (they use `IF NOT EXISTS` and `CREATE POLICY IF NOT EXISTS`)

---

**Last Updated**: Based on current codebase structure
**For questions**: Check README.md, SETUP.md, or SUPABASE_SETUP.md for more details
