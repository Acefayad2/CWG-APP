-- Storage bucket setup (run in Supabase SQL Editor)
-- First, create the bucket (you may need to do this via Supabase Dashboard or Storage API)

-- Policy: Authenticated users can read resources
CREATE POLICY "Authenticated users can read resources"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'resources' AND
  auth.role() = 'authenticated'
);

-- Policy: Only admins can upload resources
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
CREATE POLICY "Only admins can delete resources"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'resources' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
