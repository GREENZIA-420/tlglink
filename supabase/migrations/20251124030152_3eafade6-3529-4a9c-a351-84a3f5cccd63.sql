-- Table pour stocker les clés de récupération
CREATE TABLE IF NOT EXISTS public.recovery_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  recovery_key text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  used_at timestamp with time zone,
  is_active boolean DEFAULT true NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_recovery_keys_user_id ON public.recovery_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_keys_key ON public.recovery_keys(recovery_key) WHERE is_active = true;

-- RLS policies
ALTER TABLE public.recovery_keys ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres clés
CREATE POLICY "Users can view their own recovery keys"
ON public.recovery_keys
FOR SELECT
TO authenticated
USING (user_id IN (SELECT id FROM public.users WHERE id = (
  SELECT user_id FROM public.users WHERE id = auth.uid()
)));

-- Les utilisateurs peuvent créer leurs propres clés
CREATE POLICY "Users can create their own recovery keys"
ON public.recovery_keys
FOR INSERT
TO authenticated
WITH CHECK (user_id IN (SELECT id FROM public.users WHERE id = auth.uid()));