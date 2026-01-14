-- Contacts table for storing user contacts
CREATE TABLE IF NOT EXISTS public.user_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  phone_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name, phone_number)
);

-- Enable Row Level Security
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;

-- Contacts RLS Policies
CREATE POLICY "Users can view their own contacts"
  ON public.user_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contacts"
  ON public.user_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contacts"
  ON public.user_contacts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contacts"
  ON public.user_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS user_contacts_user_id_idx ON public.user_contacts(user_id);
