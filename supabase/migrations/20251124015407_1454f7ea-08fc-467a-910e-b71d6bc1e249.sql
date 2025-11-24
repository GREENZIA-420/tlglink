-- Create table for scheduled broadcasts
CREATE TABLE IF NOT EXISTS public.scheduled_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bot_configs(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  media_urls TEXT[],
  button_ids UUID[],
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient querying
CREATE INDEX idx_scheduled_broadcasts_pending ON public.scheduled_broadcasts(scheduled_for, is_sent) 
WHERE is_sent = FALSE;

-- Enable RLS
ALTER TABLE public.scheduled_broadcasts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their scheduled broadcasts"
  ON public.scheduled_broadcasts
  FOR SELECT
  USING (admin_id = auth.uid() OR bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Users can insert their scheduled broadcasts"
  ON public.scheduled_broadcasts
  FOR INSERT
  WITH CHECK (bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Service role can update scheduled broadcasts"
  ON public.scheduled_broadcasts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_broadcasts_updated_at
  BEFORE UPDATE ON public.scheduled_broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_users_updated_at();