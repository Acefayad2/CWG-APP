-- Fix existing profiles that don't have full_name set
-- This updates profiles where full_name is NULL or empty by extracting it from user metadata

UPDATE public.profiles p
SET full_name = COALESCE(
  NULLIF((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = p.id), ''),
  split_part((SELECT email FROM auth.users WHERE id = p.id), '@', 1)
)
WHERE p.full_name IS NULL OR p.full_name = '';

-- Verify the update
SELECT 
  p.id,
  p.full_name,
  p.role,
  p.approval_status,
  u.email,
  u.raw_user_meta_data->>'full_name' as metadata_full_name
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 10;
