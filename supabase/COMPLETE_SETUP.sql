-- ============================================
-- CWG APP - COMPLETE SUPABASE SETUP
-- ============================================
-- Run this entire file in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- This combines all necessary SQL scripts in the correct order
-- ============================================

-- ============================================
-- 1. BASE SCHEMA - Tables and Core RLS Policies
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scripts table
CREATE TABLE IF NOT EXISTS public.scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Script favorites table
CREATE TABLE IF NOT EXISTS public.script_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id UUID NOT NULL REFERENCES public.scripts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, script_id)
);

-- Resources table
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'pdf')),
  storage_path TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Resources favorites table
CREATE TABLE IF NOT EXISTS public.resources_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, resource_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.script_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources_favorites ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Scripts RLS Policies
DROP POLICY IF EXISTS "Authenticated users can read admin scripts or their own scripts" ON public.scripts;
CREATE POLICY "Authenticated users can read admin scripts or their own scripts"
  ON public.scripts FOR SELECT
  USING (
    auth.role() = 'authenticated' AND (
      is_admin = TRUE OR
      created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create their own scripts" ON public.scripts;
CREATE POLICY "Authenticated users can create their own scripts"
  ON public.scripts FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    created_by = auth.uid() AND
    is_admin = FALSE
  );

DROP POLICY IF EXISTS "Users can update their own scripts" ON public.scripts;
CREATE POLICY "Users can update their own scripts"
  ON public.scripts FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can update any script and set is_admin" ON public.scripts;
CREATE POLICY "Admins can update any script and set is_admin"
  ON public.scripts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Users can delete their own scripts" ON public.scripts;
CREATE POLICY "Users can delete their own scripts"
  ON public.scripts FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can delete any script" ON public.scripts;
CREATE POLICY "Admins can delete any script"
  ON public.scripts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admin can also insert admin scripts
DROP POLICY IF EXISTS "Admins can create admin scripts" ON public.scripts;
CREATE POLICY "Admins can create admin scripts"
  ON public.scripts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Script Favorites RLS Policies
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.script_favorites;
CREATE POLICY "Users can view their own favorites"
  ON public.script_favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorites" ON public.script_favorites;
CREATE POLICY "Users can insert their own favorites"
  ON public.script_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.script_favorites;
CREATE POLICY "Users can delete their own favorites"
  ON public.script_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Resources RLS Policies (Admin-only for insert/update/delete)
DROP POLICY IF EXISTS "Authenticated users can read resources" ON public.resources;
CREATE POLICY "Authenticated users can read resources"
  ON public.resources FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Only admins can insert resources" ON public.resources;
CREATE POLICY "Only admins can insert resources"
  ON public.resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update resources" ON public.resources;
CREATE POLICY "Only admins can update resources"
  ON public.resources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete resources" ON public.resources;
CREATE POLICY "Only admins can delete resources"
  ON public.resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Resources Favorites RLS Policies
DROP POLICY IF EXISTS "Users can view their own resource favorites" ON public.resources_favorites;
CREATE POLICY "Users can view their own resource favorites"
  ON public.resources_favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own resource favorites" ON public.resources_favorites;
CREATE POLICY "Users can insert their own resource favorites"
  ON public.resources_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own resource favorites" ON public.resources_favorites;
CREATE POLICY "Users can delete their own resource favorites"
  ON public.resources_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Try to get full_name from raw_user_meta_data first
  user_full_name := NEW.raw_user_meta_data->>'full_name';
  
  -- If not found, try to get from email as fallback (first part before @)
  IF user_full_name IS NULL OR user_full_name = '' THEN
    user_full_name := split_part(NEW.email, '@', 1);
  END IF;
  
  -- Insert profile with the extracted name
  INSERT INTO public.profiles (id, full_name, role, approval_status)
  VALUES (NEW.id, user_full_name, 'user', 'pending');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. USER APPROVAL SYSTEM
-- ============================================

-- Add approval_status field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing users to be approved (if any exist)
UPDATE public.profiles
SET approval_status = 'approved'
WHERE approval_status = 'pending' AND role = 'admin';

-- RLS Policy: Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Admins can update approval status
DROP POLICY IF EXISTS "Admins can update approval status" ON public.profiles;
CREATE POLICY "Admins can update approval status"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 3. PROFILE PICTURES
-- ============================================

-- Add profile_picture_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- ============================================
-- 4. CONTACTS SYSTEM
-- ============================================

-- Contacts table for storing user contacts
CREATE TABLE IF NOT EXISTS public.user_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  phone_label TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name, phone_number)
);

-- Enable Row Level Security
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

-- Contacts RLS Policies
DROP POLICY IF EXISTS "Users can view their own contacts" ON public.user_contacts;
CREATE POLICY "Users can view their own contacts"
  ON public.user_contacts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own contacts" ON public.user_contacts;
CREATE POLICY "Users can insert their own contacts"
  ON public.user_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own contacts" ON public.user_contacts;
CREATE POLICY "Users can update their own contacts"
  ON public.user_contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own contacts" ON public.user_contacts;
CREATE POLICY "Users can delete their own contacts"
  ON public.user_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_contacts_user_id_idx ON public.user_contacts(user_id);

-- Contact history/activity log table
CREATE TABLE IF NOT EXISTS public.contact_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.user_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'schedule_appointment', 'follow_up_appointment', 'invited_bom', 'recruiting_interview', 'note')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.contact_history ENABLE ROW LEVEL SECURITY;

-- Contact History RLS Policies
DROP POLICY IF EXISTS "Users can view their own contact history" ON public.contact_history;
CREATE POLICY "Users can view their own contact history"
  ON public.contact_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own contact history" ON public.contact_history;
CREATE POLICY "Users can insert their own contact history"
  ON public.contact_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own contact history" ON public.contact_history;
CREATE POLICY "Users can update their own contact history"
  ON public.contact_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own contact history" ON public.contact_history;
CREATE POLICY "Users can delete their own contact history"
  ON public.contact_history FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS contact_history_contact_id_idx ON public.contact_history(contact_id);
CREATE INDEX IF NOT EXISTS contact_history_user_id_idx ON public.contact_history(user_id);
CREATE INDEX IF NOT EXISTS contact_history_created_at_idx ON public.contact_history(created_at DESC);

-- ============================================
-- 5. STORAGE BUCKETS CREATION
-- ============================================

-- Create "resources" bucket (for admin-uploaded resources)
INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Create "avatars" bucket (for user profile pictures)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6. STORAGE POLICIES - Resources Bucket
-- ============================================

-- Policy: Authenticated users can read resources
DROP POLICY IF EXISTS "Authenticated users can read resources" ON storage.objects;
CREATE POLICY "Authenticated users can read resources"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resources' AND
  auth.role() = 'authenticated'
);

-- Policy: Only admins can upload resources
DROP POLICY IF EXISTS "Only admins can upload resources" ON storage.objects;
CREATE POLICY "Only admins can upload resources"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resources' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Only admins can update resources
DROP POLICY IF EXISTS "Only admins can update resources" ON storage.objects;
CREATE POLICY "Only admins can update resources"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resources' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'resources' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Only admins can delete resources
DROP POLICY IF EXISTS "Only admins can delete resources" ON storage.objects;
CREATE POLICY "Only admins can delete resources"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resources' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- 7. STORAGE POLICIES - Avatars Bucket
-- ============================================

-- Policy: Users can read any profile picture
DROP POLICY IF EXISTS "Authenticated users can read profile pictures" ON storage.objects;
CREATE POLICY "Authenticated users can read profile pictures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- Policy: Users can upload their own profile picture
DROP POLICY IF EXISTS "Users can upload their own profile picture" ON storage.objects;
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own profile picture
DROP POLICY IF EXISTS "Users can update their own profile picture" ON storage.objects;
CREATE POLICY "Users can update their own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own profile picture
DROP POLICY IF EXISTS "Users can delete their own profile picture" ON storage.objects;
CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- 8. SET ADMIN ACCOUNT (OPTIONAL)
-- ============================================
-- Uncomment and run this section AFTER you've signed up with acefayad@gmail.com
-- This will set that user as admin and approve their account

/*
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

-- Verify the update
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.approval_status,
  u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'acefayad@gmail.com';
*/

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Next steps:
-- 1. (Optional) Sign up with acefayad@gmail.com, then uncomment and run section 8 above to set as admin
-- 2. Verify all tables exist in Table Editor
-- 3. Verify storage buckets exist in Storage dashboard (resources and avatars)
-- 4. Test your app!
-- ============================================
