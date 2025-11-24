-- Add is_banned column to telegram_users table
ALTER TABLE public.telegram_users ADD COLUMN is_banned boolean NOT NULL DEFAULT false;

-- Add banned_at column to track when the user was banned
ALTER TABLE public.telegram_users ADD COLUMN banned_at timestamp with time zone;

-- Add banned_by column to track who banned the user
ALTER TABLE public.telegram_users ADD COLUMN banned_by uuid REFERENCES auth.users(id);

-- Create index for faster queries on banned users
CREATE INDEX idx_telegram_users_banned ON public.telegram_users(bot_id, is_banned) WHERE is_banned = true;