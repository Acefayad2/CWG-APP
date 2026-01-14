-- Update RLS policies to allow users to create their own resources
-- Drop the old admin-only insert policy
DROP POLICY IF EXISTS "Only admins can insert resources" ON public.resources;

-- Allow all authenticated users to insert resources
CREATE POLICY "Authenticated users can insert resources"
  ON public.resources FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  );

-- Update policy to allow users to update their own resources
DROP POLICY IF EXISTS "Only admins can update resources" ON public.resources;

CREATE POLICY "Users can update their own resources"
  ON public.resources FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  );

-- Allow admins to update any resource
CREATE POLICY "Admins can update any resource"
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

-- Update policy to allow users to delete their own resources
DROP POLICY IF EXISTS "Only admins can delete resources" ON public.resources;

CREATE POLICY "Users can delete their own resources"
  ON public.resources FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  );

-- Allow admins to delete any resource
CREATE POLICY "Admins can delete any resource"
  ON public.resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update storage policies to allow users to upload resources
DROP POLICY IF EXISTS "Only admins can upload resources" ON storage.objects;

CREATE POLICY "Authenticated users can upload resources"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'resources' AND
  auth.role() = 'authenticated'
);

-- Allow users to update their own resources in storage
DROP POLICY IF EXISTS "Only admins can update resources" ON storage.objects;

CREATE POLICY "Users can update their own resources in storage"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'resources' AND
  auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'resources' AND
  auth.role() = 'authenticated'
);

-- Allow admins to update any resource in storage
CREATE POLICY "Admins can update any resource in storage"
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

-- Allow users to delete their own resources in storage
DROP POLICY IF EXISTS "Only admins can delete resources" ON storage.objects;

CREATE POLICY "Users can delete their own resources in storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resources' AND
  auth.role() = 'authenticated'
);

-- Allow admins to delete any resource in storage
CREATE POLICY "Admins can delete any resource in storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resources' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
