-- ========================================
-- CORRECTION DES POLITIQUES RLS 
-- Restreindre l'accès aux données par propriétaire uniquement
-- ========================================

-- 1. TELEGRAM_USERS : Seulement le propriétaire du bot peut voir ses utilisateurs
DROP POLICY IF EXISTS "Users can view their bot users" ON public.telegram_users;
CREATE POLICY "Users can view their bot users"
ON public.telegram_users
FOR SELECT
TO authenticated
USING (
  bot_id IN (
    SELECT id FROM bot_configs WHERE admin_id IN (
      SELECT id FROM users WHERE id = (
        SELECT userId::uuid FROM (
          SELECT (regexp_matches(
            current_setting('request.jwt.claims', true)::json->>'sub',
            '([a-f0-9-]{36})'
          ))[1] as userId
        ) sub
      )
    )
  )
);

-- 2. BOT_BUTTONS : Seulement le propriétaire du bot peut voir ses boutons
DROP POLICY IF EXISTS "Users can view their bot buttons" ON public.bot_buttons;
CREATE POLICY "Users can view their bot buttons"
ON public.bot_buttons
FOR SELECT
TO authenticated
USING (
  bot_id IN (
    SELECT id FROM bot_configs WHERE admin_id IN (
      SELECT id FROM users WHERE id = (
        SELECT userId::uuid FROM (
          SELECT (regexp_matches(
            current_setting('request.jwt.claims', true)::json->>'sub',
            '([a-f0-9-]{36})'
          ))[1] as userId
        ) sub
      )
    )
  )
);

-- 3. Ajouter DELETE policy pour bot_configs
DROP POLICY IF EXISTS "Users can delete their own bot config" ON public.bot_configs;
CREATE POLICY "Users can delete their own bot config"
ON public.bot_configs
FOR DELETE
TO authenticated
USING (
  admin_id IN (
    SELECT id FROM users WHERE id = (
      SELECT userId::uuid FROM (
        SELECT (regexp_matches(
          current_setting('request.jwt.claims', true)::json->>'sub',
          '([a-f0-9-]{36})'
        ))[1] as userId
      ) sub
    )
  )
);

-- 4. Ajouter DELETE policy pour bot_settings
DROP POLICY IF EXISTS "Users can delete their bot settings" ON public.bot_settings;
CREATE POLICY "Users can delete their bot settings"
ON public.bot_settings
FOR DELETE
TO authenticated
USING (
  bot_id IN (
    SELECT id FROM bot_configs WHERE admin_id IN (
      SELECT id FROM users WHERE id = (
        SELECT userId::uuid FROM (
          SELECT (regexp_matches(
            current_setting('request.jwt.claims', true)::json->>'sub',
            '([a-f0-9-]{36})'
          ))[1] as userId
        ) sub
      )
    )
  )
);

-- 5. Ajouter UPDATE/DELETE policies pour recovery_keys
DROP POLICY IF EXISTS "Users can update their recovery keys" ON public.recovery_keys;
CREATE POLICY "Users can update their recovery keys"
ON public.recovery_keys
FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE id = (
      SELECT userId::uuid FROM (
        SELECT (regexp_matches(
          current_setting('request.jwt.claims', true)::json->>'sub',
          '([a-f0-9-]{36})'
        ))[1] as userId
      ) sub
    )
  )
);

DROP POLICY IF EXISTS "Users can delete their recovery keys" ON public.recovery_keys;
CREATE POLICY "Users can delete their recovery keys"
ON public.recovery_keys
FOR DELETE
TO authenticated
USING (
  user_id IN (
    SELECT id FROM users WHERE id = (
      SELECT userId::uuid FROM (
        SELECT (regexp_matches(
          current_setting('request.jwt.claims', true)::json->>'sub',
          '([a-f0-9-]{36})'
        ))[1] as userId
      ) sub
    )
  )
);

-- 6. Ajouter DELETE policy pour scheduled_broadcasts
DROP POLICY IF EXISTS "Users can delete their scheduled broadcasts" ON public.scheduled_broadcasts;
CREATE POLICY "Users can delete their scheduled broadcasts"
ON public.scheduled_broadcasts
FOR DELETE
TO authenticated
USING (
  bot_id IN (
    SELECT id FROM bot_configs WHERE admin_id IN (
      SELECT id FROM users WHERE id = (
        SELECT userId::uuid FROM (
          SELECT (regexp_matches(
            current_setting('request.jwt.claims', true)::json->>'sub',
            '([a-f0-9-]{36})'
          ))[1] as userId
        ) sub
      )
    )
  )
);

-- 7. Ajouter UPDATE/DELETE policies pour telegram_users (pour les bot owners)
DROP POLICY IF EXISTS "Bot owners can update their telegram users" ON public.telegram_users;
CREATE POLICY "Bot owners can update their telegram users"
ON public.telegram_users
FOR UPDATE
TO authenticated
USING (
  bot_id IN (
    SELECT id FROM bot_configs WHERE admin_id IN (
      SELECT id FROM users WHERE id = (
        SELECT userId::uuid FROM (
          SELECT (regexp_matches(
            current_setting('request.jwt.claims', true)::json->>'sub',
            '([a-f0-9-]{36})'
          ))[1] as userId
        ) sub
      )
    )
  )
);

DROP POLICY IF EXISTS "Bot owners can delete their telegram users" ON public.telegram_users;
CREATE POLICY "Bot owners can delete their telegram users"
ON public.telegram_users
FOR DELETE
TO authenticated
USING (
  bot_id IN (
    SELECT id FROM bot_configs WHERE admin_id IN (
      SELECT id FROM users WHERE id = (
        SELECT userId::uuid FROM (
          SELECT (regexp_matches(
            current_setting('request.jwt.claims', true)::json->>'sub',
            '([a-f0-9-]{36})'
          ))[1] as userId
        ) sub
      )
    )
  )
);