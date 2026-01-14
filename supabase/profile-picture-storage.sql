-- Storage bucket setup for profile pictures (run in Supabase SQL Editor)
-- Note: Create the "avatars" bucket in Supabase Dashboard first (Storage > Create Bucket)

-- Policy: Users can read any profile picture
CREATE POLICY "Authenticated users can read profile pictures"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- Policy: Users can upload their own profile picture
CREATE POLICY "Users can upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own profile picture
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
CREATE POLICY "Users can delete their own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
