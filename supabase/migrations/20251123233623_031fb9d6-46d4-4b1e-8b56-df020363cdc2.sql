-- Remove the overly permissive service role policy that exposes invite links
DROP POLICY IF EXISTS "Service role can manage invite links" ON public.telegram_invite_links;

-- Add proper RLS policies for authenticated bot owners only
CREATE POLICY "Bot owners can view their invite links"
ON public.telegram_invite_links
FOR SELECT
USING (
  bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Bot owners can insert invite links"
ON public.telegram_invite_links
FOR INSERT
WITH CHECK (
  bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Bot owners can update their invite links"
ON public.telegram_invite_links
FOR UPDATE
USING (
  bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Bot owners can delete their invite links"
ON public.telegram_invite_links
FOR DELETE
USING (
  bot_id IN (
    SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
  )
);