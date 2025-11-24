-- Create a function to count total registered users (from auth.users)
-- This function uses security definer to access auth schema
CREATE OR REPLACE FUNCTION public.count_registered_users()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM auth.users);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.count_registered_users() TO authenticated;