-- Fix profile name trigger to properly extract full_name from user metadata
-- This ensures the name from signup is properly saved to the profile

-- Update the trigger function to better handle metadata extraction
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Try to get full_name from raw_user_meta_data first
  user_full_name := NEW.raw_user_meta_data->>'full_name';
  
  -- If not found, try to get from email as fallback (first part before @)
  IF user_full_name IS NULL OR user_full_name = '' THEN
    user_full_name := split_part(NEW.email, '@', 1);
  END IF;
  
  -- Insert profile with the extracted name
  INSERT INTO public.profiles (id, full_name, role, approval_status)
  VALUES (NEW.id, user_full_name, 'user', 'pending');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
