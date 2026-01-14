-- Revert resources access to admin-only
-- This restores the original behavior where only admins can create, update, and delete resources

-- Drop user-access policies
DROP POLICY IF EXISTS "Authenticated users can insert resources" ON public.resources;
DROP POLICY IF EXISTS "Users can update their own resources" ON public.resources;
DROP POLICY IF EXISTS "Users can delete their own resources" ON public.resources;

-- Restore admin-only insert policy
CREATE POLICY "Only admins can insert resources"
  ON public.resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Restore admin-only update policy (the admin update policy should already exist, but ensure it's the only one)
DROP POLICY IF EXISTS "Admins can update any resource" ON public.resources;

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

-- Restore admin-only delete policy (the admin delete policy should already exist, but ensure it's the only one)
DROP POLICY IF EXISTS "Admins can delete any resource" ON public.resources;

CREATE POLICY "Only admins can delete resources"
  ON public.resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Revert storage policies to admin-only
DROP POLICY IF EXISTS "Authenticated users can upload resources" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own resources in storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own resources in storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update any resource in storage" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any resource in storage" ON storage.objects;

-- Restore admin-only storage policies
CREATE POLICY "Only admins can upload resources"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'resources' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can update resources in storage"
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

CREATE POLICY "Only admins can delete resources in storage"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'resources' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
