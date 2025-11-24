-- CRITICAL SECURITY FIX: Remove overly permissive policy and implement proper RLS
-- Drop the dangerous "Temporary allow all" policy that exposes all user data
DROP POLICY IF EXISTS "Temporary allow all" ON public.users;

-- Create proper owner-scoped policies for users table
-- Users can only view their own profile
CREATE POLICY "users_view_own_profile" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "users_update_own_profile" ON public.users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Note: INSERT and DELETE are intentionally not allowed via RLS
-- User creation happens through auth-register edge function
-- User deletion should go through admin functions only