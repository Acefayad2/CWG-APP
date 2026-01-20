-- Enable admins to delete user data when rejecting users
-- This allows the app to clean up all user data when status is set to "rejected"

-- Make sure is_admin function exists
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admins can delete user contacts
DROP POLICY IF EXISTS "Admins can delete user contacts" ON public.user_contacts;
CREATE POLICY "Admins can delete user contacts"
  ON public.user_contacts FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Admins can delete contact history
DROP POLICY IF EXISTS "Admins can delete contact history" ON public.contact_history;
CREATE POLICY "Admins can delete contact history"
  ON public.contact_history FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Admins can delete script favorites
DROP POLICY IF EXISTS "Admins can delete script favorites" ON public.script_favorites;
CREATE POLICY "Admins can delete script favorites"
  ON public.script_favorites FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Admins can delete resource favorites
DROP POLICY IF EXISTS "Admins can delete resource favorites" ON public.resources_favorites;
CREATE POLICY "Admins can delete resource favorites"
  ON public.resources_favorites FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Admins can delete resources
DROP POLICY IF EXISTS "Admins can delete resources" ON public.resources;
CREATE POLICY "Admins can delete resources"
  ON public.resources FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Admins can delete scripts
DROP POLICY IF EXISTS "Admins can delete scripts" ON public.scripts;
CREATE POLICY "Admins can delete scripts"
  ON public.scripts FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Admins can delete profiles (if not already exists)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin(auth.uid()));
