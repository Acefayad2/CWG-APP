-- Complete fix for admin delete profiles functionality
-- Run this entire script in Supabase SQL Editor

-- Step 1: Ensure the is_admin function exists and is correct
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop existing delete policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Step 3: Create the delete policy
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Step 4: Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies 
WHERE tablename = 'profiles' AND policyname = 'Admins can delete profiles';

-- If the above query returns a row, the policy is set up correctly!
