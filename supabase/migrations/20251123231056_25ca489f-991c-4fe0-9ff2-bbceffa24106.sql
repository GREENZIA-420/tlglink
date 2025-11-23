-- Remove admin-only restrictions and allow all authenticated users to manage their own bots

-- Update bot_configs policies
DROP POLICY IF EXISTS "Admins can view their own bot config" ON public.bot_configs;
DROP POLICY IF EXISTS "Admins can insert their own bot config" ON public.bot_configs;
DROP POLICY IF EXISTS "Admins can update their own bot config" ON public.bot_configs;

CREATE POLICY "Users can view their own bot config"
ON public.bot_configs
FOR SELECT
TO authenticated
USING (admin_id = auth.uid());

CREATE POLICY "Users can insert their own bot config"
ON public.bot_configs
FOR INSERT
TO authenticated
WITH CHECK (admin_id = auth.uid());

CREATE POLICY "Users can update their own bot config"
ON public.bot_configs
FOR UPDATE
TO authenticated
USING (admin_id = auth.uid());

-- Update bot_settings policies
DROP POLICY IF EXISTS "Admins can view their bot settings" ON public.bot_settings;
DROP POLICY IF EXISTS "Admins can insert their bot settings" ON public.bot_settings;
DROP POLICY IF EXISTS "Admins can update their bot settings" ON public.bot_settings;

CREATE POLICY "Users can view their bot settings"
ON public.bot_settings
FOR SELECT
TO authenticated
USING (bot_id IN (
  SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
));

CREATE POLICY "Users can insert their bot settings"
ON public.bot_settings
FOR INSERT
TO authenticated
WITH CHECK (bot_id IN (
  SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
));

CREATE POLICY "Users can update their bot settings"
ON public.bot_settings
FOR UPDATE
TO authenticated
USING (bot_id IN (
  SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
));

-- Update bot_buttons policies
DROP POLICY IF EXISTS "Admins can view their bot buttons" ON public.bot_buttons;
DROP POLICY IF EXISTS "Admins can insert their bot buttons" ON public.bot_buttons;
DROP POLICY IF EXISTS "Admins can update their bot buttons" ON public.bot_buttons;
DROP POLICY IF EXISTS "Admins can delete their bot buttons" ON public.bot_buttons;

CREATE POLICY "Users can view their bot buttons"
ON public.bot_buttons
FOR SELECT
TO authenticated
USING (bot_id IN (
  SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
));

CREATE POLICY "Users can insert their bot buttons"
ON public.bot_buttons
FOR INSERT
TO authenticated
WITH CHECK (bot_id IN (
  SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
));

CREATE POLICY "Users can update their bot buttons"
ON public.bot_buttons
FOR UPDATE
TO authenticated
USING (bot_id IN (
  SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
))
WITH CHECK (bot_id IN (
  SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
));

CREATE POLICY "Users can delete their bot buttons"
ON public.bot_buttons
FOR DELETE
TO authenticated
USING (bot_id IN (
  SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
));

-- Update telegram_users policies
DROP POLICY IF EXISTS "Admins can view their bot users" ON public.telegram_users;

CREATE POLICY "Users can view their bot users"
ON public.telegram_users
FOR SELECT
TO authenticated
USING (bot_id IN (
  SELECT id FROM public.bot_configs WHERE admin_id = auth.uid()
));