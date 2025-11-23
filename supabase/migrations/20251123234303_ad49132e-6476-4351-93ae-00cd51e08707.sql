-- Drop the incorrect unique constraint on key alone
ALTER TABLE public.bot_settings DROP CONSTRAINT IF EXISTS bot_settings_key_key;

-- Add the correct unique constraint on (bot_id, key) combination
-- This allows multiple bots to have settings with the same key names
ALTER TABLE public.bot_settings 
ADD CONSTRAINT bot_settings_bot_id_key_unique UNIQUE (bot_id, key);