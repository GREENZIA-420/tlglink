-- Move pg_net extension from public to extensions schema
-- This follows Supabase best practices to avoid polluting the public schema

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop the extension from public schema
DROP EXTENSION IF EXISTS pg_net;

-- Reinstall pg_net in the extensions schema
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;