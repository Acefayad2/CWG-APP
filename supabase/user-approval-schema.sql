-- Add approval_status field to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing users to be approved (if any exist)
UPDATE public.profiles
SET approval_status = 'approved'
WHERE approval_status = 'pending' AND role = 'admin';

-- RLS Policy: Users can view their own profile (including approval status)
-- This policy already exists, but we need to ensure it works with approval_status

-- RLS Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Admins can update approval status
CREATE POLICY "Admins can update approval status"
  ON public.profiles FOR UPDATE
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
