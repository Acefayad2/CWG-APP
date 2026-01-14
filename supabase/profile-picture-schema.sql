-- Add profile_picture_url column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Note: Profile pictures will be stored in Supabase Storage bucket "avatars"
-- Users can upload their own profile pictures, which will be stored in the avatars bucket
