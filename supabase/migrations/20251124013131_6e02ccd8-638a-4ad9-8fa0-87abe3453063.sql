-- Maintenant que les données sont migrées, mettre à jour les foreign keys
-- Mise à jour de bot_configs
ALTER TABLE public.bot_configs
DROP CONSTRAINT IF EXISTS bot_configs_admin_id_fkey;

ALTER TABLE public.bot_configs
ADD CONSTRAINT bot_configs_admin_id_fkey
FOREIGN KEY (admin_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- Mise à jour de user_roles
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- Mise à jour de telegram_users banned_by
ALTER TABLE public.telegram_users
DROP CONSTRAINT IF EXISTS telegram_users_banned_by_fkey;

ALTER TABLE public.telegram_users
ADD CONSTRAINT telegram_users_banned_by_fkey
FOREIGN KEY (banned_by)
REFERENCES public.users(id)
ON DELETE SET NULL;

-- Mise à jour de bot_buttons updated_by
ALTER TABLE public.bot_buttons
DROP CONSTRAINT IF EXISTS bot_buttons_updated_by_fkey;

ALTER TABLE public.bot_buttons
ADD CONSTRAINT bot_buttons_updated_by_fkey
FOREIGN KEY (updated_by)
REFERENCES public.users(id)
ON DELETE SET NULL;

-- Mise à jour de bot_settings updated_by
ALTER TABLE public.bot_settings
DROP CONSTRAINT IF EXISTS bot_settings_updated_by_fkey;

ALTER TABLE public.bot_settings
ADD CONSTRAINT bot_settings_updated_by_fkey
FOREIGN KEY (updated_by)
REFERENCES public.users(id)
ON DELETE SET NULL;

-- Mettre à jour les policies RLS pour utiliser des sessions personnalisées
-- On va créer une fonction pour obtenir l'ID utilisateur depuis la session
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Cette fonction sera utilisée avec des JWT personnalisés
  -- Pour l'instant, on retourne auth.uid() mais ça sera mis à jour
  SELECT auth.uid();
$$;

-- Fix du warning sur search_path pour la fonction update_users_updated_at
DROP FUNCTION IF EXISTS public.update_users_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_users_updated_at();