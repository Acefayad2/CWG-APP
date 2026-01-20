# Supabase SQL Setup - Complete List

Run these SQL scripts in **this exact order** in your Supabase SQL Editor (Dashboard > SQL Editor > New Query).

## ✅ Required SQL Files (In Order)

### 1. Base Schema
**File**: `supabase/schema.sql`
- Creates all base tables (profiles, scripts, script_favorites, resources, resources_favorites)
- Sets up Row Level Security (RLS) policies
- **Must run first** - other scripts depend on this

### 2. User Approval System
**File**: `supabase/user-approval-schema.sql`
- Adds `approval_status` column to profiles table
- Sets up admin approval policies
- Allows admins to view and update all profiles

### 3. Profile Pictures
**File**: `supabase/profile-picture-schema.sql`
- Adds `profile_picture_url` column to profiles table

### 4. Contacts System
**File**: `supabase/contacts-complete-schema.sql`
- Creates `user_contacts` table
- Creates `contact_history` table
- Adds notes column to contacts
- Sets up RLS policies for contacts

**Note**: This is a combined file. Alternatively, you can run:
- `supabase/contacts-schema.sql` (first)
- `supabase/contact-notes-history-schema.sql` (second)

### 5. Resources Admin-Only Policies
**File**: `supabase/resources-admin-only.sql`
- Updates RLS policies so only admins can create/edit/delete resources
- Updates storage policies so only admins can upload resources
- Users can still view/download resources

### 6. Storage Policies
**File**: `supabase/storage-policies.sql`
- Sets up storage policies for the `resources` bucket
- Allows authenticated users to read resources
- Only admins can upload/update/delete

### 7. Profile Picture Storage
**File**: `supabase/profile-picture-storage.sql`
- Sets up storage policies for the `avatars` bucket
- Allows users to upload/manage their own profile pictures

### 8. Set Admin Account (Optional)
**File**: `supabase/set-admin-account.sql`
- Sets `acefayad@gmail.com` as admin and approves the account
- Only run this if you want to use this specific email as admin

## 📋 Quick Checklist

Run these in order:
- [ ] `schema.sql`
- [ ] `user-approval-schema.sql`
- [ ] `profile-picture-schema.sql`
- [ ] `contacts-complete-schema.sql`
- [ ] `resources-admin-only.sql`
- [ ] `storage-policies.sql`
- [ ] `profile-picture-storage.sql`
- [ ] `set-admin-account.sql` (optional)

## 🗄️ Storage Buckets to Create

After running the SQL, create these buckets in Supabase Dashboard (Storage > Buckets):

1. **Bucket: `resources`**
   - Set as **public**
   - Used for admin-uploaded resources (images, videos, PDFs)
   - Policies are handled by SQL scripts

2. **Bucket: `avatars`**
   - Set as **public**
   - Used for user profile pictures
   - Policies are handled by SQL scripts

## ⚠️ Important Notes

- **Order matters**: Run the SQL files in the exact order listed above
- **Storage buckets**: Create the buckets manually in the Storage dashboard
- **Admin account**: If you use `set-admin-account.sql`, make sure you've already signed up with `acefayad@gmail.com` in the app first
- **Safe to re-run**: All scripts use `IF NOT EXISTS` and `CREATE POLICY IF NOT EXISTS`, so they're safe to run multiple times

## 🧪 Verify Setup

After running all SQL scripts, verify in Supabase Dashboard:

### Tables (Table Editor)
- ✅ `profiles`
- ✅ `scripts`
- ✅ `script_favorites`
- ✅ `resources`
- ✅ `resources_favorites`
- ✅ `user_contacts`
- ✅ `contact_history`

### Storage Buckets (Storage)
- ✅ `resources` (public)
- ✅ `avatars` (public)

### RLS Enabled (Authentication > Policies)
All tables should have RLS enabled with appropriate policies.

## 🎯 That's It!

Once you've run all 7-8 SQL files (depending on whether you use set-admin-account.sql) and created the 2 storage buckets, your Supabase setup is complete!
