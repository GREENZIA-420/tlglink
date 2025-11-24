-- Create table for broadcast drafts
CREATE TABLE IF NOT EXISTS public.broadcast_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bot_configs(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  media_urls TEXT[],
  button_ids UUID[],
  is_scheduled BOOLEAN DEFAULT FALSE,
  scheduled_date TEXT,
  scheduled_time TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.broadcast_drafts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their drafts"
  ON public.broadcast_drafts
  FOR SELECT
  USING (admin_id = auth.uid() OR bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Users can insert their drafts"
  ON public.broadcast_drafts
  FOR INSERT
  WITH CHECK (bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Users can update their drafts"
  ON public.broadcast_drafts
  FOR UPDATE
  USING (admin_id = auth.uid() OR bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  ));

CREATE POLICY "Users can delete their drafts"
  ON public.broadcast_drafts
  FOR DELETE
  USING (admin_id = auth.uid() OR bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_broadcast_drafts_updated_at
  BEFORE UPDATE ON public.broadcast_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_users_updated_at();