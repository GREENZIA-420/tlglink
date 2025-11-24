-- ========================================
-- CORRECTION DES FAILLES DE SÉCURITÉ CRITIQUES
-- Blocage de l'accès anonyme à toutes les tables sensibles
-- ========================================

-- 1. BLOQUER L'ACCÈS PUBLIC À LA TABLE USERS
-- Actuellement : emails, password_hash, etc. sont publiquement lisibles
DROP POLICY IF EXISTS "Prevent anonymous access to users" ON public.users;
CREATE POLICY "Prevent anonymous access to users"
ON public.users
FOR SELECT
TO anon
USING (false);

-- 2. BLOQUER L'ACCÈS PUBLIC À LA TABLE BOT_CONFIGS
-- Actuellement : bot_token est publiquement lisible (CRITIQUE!)
DROP POLICY IF EXISTS "Prevent anonymous access to bot_configs" ON public.bot_configs;
CREATE POLICY "Prevent anonymous access to bot_configs"
ON public.bot_configs
FOR SELECT
TO anon
USING (false);

-- 3. BLOQUER L'ACCÈS PUBLIC À LA TABLE TELEGRAM_USERS
-- Actuellement : IPs, noms, données personnelles publiquement lisibles
DROP POLICY IF EXISTS "Prevent anonymous access to telegram_users" ON public.telegram_users;
CREATE POLICY "Prevent anonymous access to telegram_users"
ON public.telegram_users
FOR SELECT
TO anon
USING (false);

-- 4. BLOQUER L'ACCÈS PUBLIC À LA TABLE RECOVERY_KEYS
-- Actuellement : clés de récupération publiquement lisibles (CRITIQUE!)
DROP POLICY IF EXISTS "Prevent anonymous access to recovery_keys" ON public.recovery_keys;
CREATE POLICY "Prevent anonymous access to recovery_keys"
ON public.recovery_keys
FOR SELECT
TO anon
USING (false);

-- 5. BLOQUER L'ACCÈS PUBLIC À LA TABLE CAPTCHA_CODES
DROP POLICY IF EXISTS "Prevent anonymous access to captcha_codes" ON public.captcha_codes;
CREATE POLICY "Prevent anonymous access to captcha_codes"
ON public.captcha_codes
FOR SELECT
TO anon
USING (false);

-- 6. BLOQUER L'ACCÈS PUBLIC À LA TABLE BOT_SETTINGS
DROP POLICY IF EXISTS "Prevent anonymous access to bot_settings" ON public.bot_settings;
CREATE POLICY "Prevent anonymous access to bot_settings"
ON public.bot_settings
FOR SELECT
TO anon
USING (false);

-- 7. BLOQUER L'ACCÈS PUBLIC À LA TABLE TELEGRAM_INVITE_LINKS
DROP POLICY IF EXISTS "Prevent anonymous access to telegram_invite_links" ON public.telegram_invite_links;
CREATE POLICY "Prevent anonymous access to telegram_invite_links"
ON public.telegram_invite_links
FOR SELECT
TO anon
USING (false);

-- 8. BLOQUER L'ACCÈS PUBLIC À LA TABLE USER_ROLES
DROP POLICY IF EXISTS "Prevent anonymous access to user_roles" ON public.user_roles;
CREATE POLICY "Prevent anonymous access to user_roles"
ON public.user_roles
FOR SELECT
TO anon
USING (false);

-- 9. BLOQUER L'ACCÈS PUBLIC À LA TABLE BOT_BUTTONS
DROP POLICY IF EXISTS "Prevent anonymous access to bot_buttons" ON public.bot_buttons;
CREATE POLICY "Prevent anonymous access to bot_buttons"
ON public.bot_buttons
FOR SELECT
TO anon
USING (false);

-- 10. BLOQUER L'ACCÈS PUBLIC À LA TABLE BROADCAST_DRAFTS
DROP POLICY IF EXISTS "Prevent anonymous access to broadcast_drafts" ON public.broadcast_drafts;
CREATE POLICY "Prevent anonymous access to broadcast_drafts"
ON public.broadcast_drafts
FOR SELECT
TO anon
USING (false);

-- 11. BLOQUER L'ACCÈS PUBLIC À LA TABLE SCHEDULED_BROADCASTS
DROP POLICY IF EXISTS "Prevent anonymous access to scheduled_broadcasts" ON public.scheduled_broadcasts;
CREATE POLICY "Prevent anonymous access to scheduled_broadcasts"
ON public.scheduled_broadcasts
FOR SELECT
TO anon
USING (false);