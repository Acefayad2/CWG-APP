-- Test script to verify admin delete policy is working
-- Run this to check if the policy exists and is configured correctly

-- Check if the is_admin function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'is_admin';

-- Check if the delete policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname = 'Admins can delete profiles';

-- Test if current user can see the policy
SELECT * FROM pg_policies 
WHERE tablename = 'profiles';
