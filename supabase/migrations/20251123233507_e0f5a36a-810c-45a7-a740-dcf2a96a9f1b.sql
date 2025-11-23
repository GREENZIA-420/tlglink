-- Remove the overly permissive service role policy that exposes bot tokens
DROP POLICY IF EXISTS "Service role can read all bot configs" ON public.bot_configs;

-- The existing policies are sufficient to protect the data:
-- "Users can view their own bot config" ensures only bot owners can read their tokens
-- "Users can insert their own bot config" and "Users can update their own bot config" 
-- ensure proper ownership validation