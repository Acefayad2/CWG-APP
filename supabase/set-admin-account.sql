-- Set admin account for acefayad@gmail.com
-- Run this in Supabase SQL Editor after the user has signed up

-- First, find the user's UUID from auth.users by email
-- Then update their profile to admin and approved

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
