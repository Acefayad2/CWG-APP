-- Add RLS policy for admins to delete profiles
-- This allows admins to completely remove users from the system

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin(auth.uid()));
