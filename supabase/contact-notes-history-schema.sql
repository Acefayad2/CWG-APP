-- Add notes column to user_contacts table
ALTER TABLE public.user_contacts
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Contact history/activity log table
CREATE TABLE IF NOT EXISTS public.contact_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.user_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'schedule_appointment', 'follow_up_appointment', 'invited_bom', 'recruiting_interview', 'note')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.contact_history ENABLE ROW LEVEL SECURITY;

-- Contact History RLS Policies
CREATE POLICY "Users can view their own contact history"
  ON public.contact_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contact history"
  ON public.contact_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contact history"
  ON public.contact_history FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contact history"
  ON public.contact_history FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS contact_history_contact_id_idx ON public.contact_history(contact_id);
CREATE INDEX IF NOT EXISTS contact_history_user_id_idx ON public.contact_history(user_id);
CREATE INDEX IF NOT EXISTS contact_history_created_at_idx ON public.contact_history(created_at DESC);
