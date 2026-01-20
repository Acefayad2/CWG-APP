-- ============================================
-- FIX ADMIN ACCOUNT & VERIFY APPROVAL SYSTEM
-- ============================================
-- Run this script in Supabase SQL Editor to:
-- 1. Set acefayad@gmail.com as admin and approved
-- 2. Verify the approval system is working
-- 3. Check all pending users

-- Step 1: Set acefayad@gmail.com as admin and approved
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

-- Step 2: Verify the update worked
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.approval_status,
  u.email,
  u.created_at as account_created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'acefayad@gmail.com';

-- Step 3: Check all pending users (should show if approval system is working)
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.approval_status,
  u.email,
  p.created_at as profile_created_at
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.approval_status = 'pending'
ORDER BY p.created_at DESC;

-- Step 4: Check all users and their statuses
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.approval_status,
  u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;
