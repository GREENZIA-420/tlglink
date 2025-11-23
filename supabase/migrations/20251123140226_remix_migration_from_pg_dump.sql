CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator'
);


--
-- Name: button_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.button_type AS ENUM (
    'telegram_invite',
    'external_link',
    'miniapp'
);


--
-- Name: cleanup_expired_captcha_codes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_captcha_codes() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.captcha_codes 
  WHERE expires_at < now() AND is_validated = false;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: update_bot_settings_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bot_settings_timestamp() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: bot_buttons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_buttons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    type public.button_type NOT NULL,
    telegram_chat_id text,
    external_url text,
    "position" integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    web_app_url text,
    bot_id uuid
);


--
-- Name: bot_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    bot_token text NOT NULL,
    bot_name text,
    webhook_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bot_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    bot_id uuid
);


--
-- Name: captcha_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.captcha_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_telegram_id bigint NOT NULL,
    code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:02:00'::interval) NOT NULL,
    is_validated boolean DEFAULT false NOT NULL,
    bot_id uuid
);


--
-- Name: telegram_invite_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_invite_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_telegram_id bigint NOT NULL,
    button_id uuid NOT NULL,
    invite_link text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    bot_id uuid
);


--
-- Name: telegram_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.telegram_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    telegram_id bigint NOT NULL,
    first_name text,
    last_name text,
    username text,
    language_code text,
    is_bot boolean DEFAULT false,
    ip_address text,
    user_agent text,
    platform text,
    first_interaction_at timestamp with time zone DEFAULT now() NOT NULL,
    last_interaction_at timestamp with time zone DEFAULT now() NOT NULL,
    total_interactions integer DEFAULT 1,
    bot_id uuid
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bot_buttons bot_buttons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_buttons
    ADD CONSTRAINT bot_buttons_pkey PRIMARY KEY (id);


--
-- Name: bot_configs bot_configs_admin_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_configs
    ADD CONSTRAINT bot_configs_admin_id_key UNIQUE (admin_id);


--
-- Name: bot_configs bot_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_configs
    ADD CONSTRAINT bot_configs_pkey PRIMARY KEY (id);


--
-- Name: bot_settings bot_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_settings
    ADD CONSTRAINT bot_settings_key_key UNIQUE (key);


--
-- Name: bot_settings bot_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_settings
    ADD CONSTRAINT bot_settings_pkey PRIMARY KEY (id);


--
-- Name: captcha_codes captcha_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.captcha_codes
    ADD CONSTRAINT captcha_codes_pkey PRIMARY KEY (id);


--
-- Name: telegram_invite_links telegram_invite_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_invite_links
    ADD CONSTRAINT telegram_invite_links_pkey PRIMARY KEY (id);


--
-- Name: telegram_users telegram_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT telegram_users_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_bot_buttons_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_buttons_bot_id ON public.bot_buttons USING btree (bot_id);


--
-- Name: idx_bot_settings_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_settings_bot_id ON public.bot_settings USING btree (bot_id);


--
-- Name: idx_captcha_codes_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_captcha_codes_bot_id ON public.captcha_codes USING btree (bot_id);


--
-- Name: idx_captcha_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_captcha_expires_at ON public.captcha_codes USING btree (expires_at);


--
-- Name: idx_captcha_user_telegram_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_captcha_user_telegram_id ON public.captcha_codes USING btree (user_telegram_id);


--
-- Name: idx_invite_links_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_links_expires ON public.telegram_invite_links USING btree (expires_at);


--
-- Name: idx_invite_links_user_button; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_links_user_button ON public.telegram_invite_links USING btree (user_telegram_id, button_id);


--
-- Name: idx_telegram_invite_links_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_invite_links_bot_id ON public.telegram_invite_links USING btree (bot_id);


--
-- Name: idx_telegram_users_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_users_bot_id ON public.telegram_users USING btree (bot_id);


--
-- Name: idx_telegram_users_first_interaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_users_first_interaction ON public.telegram_users USING btree (first_interaction_at DESC);


--
-- Name: idx_telegram_users_first_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_users_first_name ON public.telegram_users USING btree (first_name);


--
-- Name: idx_telegram_users_last_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_users_last_name ON public.telegram_users USING btree (last_name);


--
-- Name: idx_telegram_users_telegram_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_users_telegram_id ON public.telegram_users USING btree (telegram_id);


--
-- Name: idx_telegram_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_telegram_users_username ON public.telegram_users USING btree (username);


--
-- Name: telegram_users_telegram_id_bot_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX telegram_users_telegram_id_bot_id_unique ON public.telegram_users USING btree (telegram_id, bot_id);


--
-- Name: bot_buttons update_bot_buttons_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bot_buttons_timestamp BEFORE UPDATE ON public.bot_buttons FOR EACH ROW EXECUTE FUNCTION public.update_bot_settings_timestamp();


--
-- Name: bot_settings update_bot_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bot_settings_updated_at BEFORE UPDATE ON public.bot_settings FOR EACH ROW EXECUTE FUNCTION public.update_bot_settings_timestamp();


--
-- Name: bot_buttons bot_buttons_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_buttons
    ADD CONSTRAINT bot_buttons_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bot_configs(id) ON DELETE CASCADE;


--
-- Name: bot_buttons bot_buttons_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_buttons
    ADD CONSTRAINT bot_buttons_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: bot_configs bot_configs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_configs
    ADD CONSTRAINT bot_configs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bot_settings bot_settings_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_settings
    ADD CONSTRAINT bot_settings_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bot_configs(id) ON DELETE CASCADE;


--
-- Name: bot_settings bot_settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_settings
    ADD CONSTRAINT bot_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: captcha_codes captcha_codes_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.captcha_codes
    ADD CONSTRAINT captcha_codes_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bot_configs(id) ON DELETE CASCADE;


--
-- Name: telegram_invite_links telegram_invite_links_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_invite_links
    ADD CONSTRAINT telegram_invite_links_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bot_configs(id) ON DELETE CASCADE;


--
-- Name: telegram_invite_links telegram_invite_links_button_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_invite_links
    ADD CONSTRAINT telegram_invite_links_button_id_fkey FOREIGN KEY (button_id) REFERENCES public.bot_buttons(id) ON DELETE CASCADE;


--
-- Name: telegram_users telegram_users_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.telegram_users
    ADD CONSTRAINT telegram_users_bot_id_fkey FOREIGN KEY (bot_id) REFERENCES public.bot_configs(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: bot_buttons Admins can delete their bot buttons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete their bot buttons" ON public.bot_buttons FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid())))));


--
-- Name: bot_buttons Admins can insert their bot buttons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert their bot buttons" ON public.bot_buttons FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid())))));


--
-- Name: bot_settings Admins can insert their bot settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert their bot settings" ON public.bot_settings FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid())))));


--
-- Name: bot_configs Admins can insert their own bot config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert their own bot config" ON public.bot_configs FOR INSERT WITH CHECK (((admin_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bot_buttons Admins can update their bot buttons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their bot buttons" ON public.bot_buttons FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid()))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid())))));


--
-- Name: bot_settings Admins can update their bot settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their bot settings" ON public.bot_settings FOR UPDATE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid()))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid())))));


--
-- Name: bot_configs Admins can update their own bot config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their own bot config" ON public.bot_configs FOR UPDATE USING (((admin_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bot_buttons Admins can view their bot buttons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view their bot buttons" ON public.bot_buttons FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid())))));


--
-- Name: bot_settings Admins can view their bot settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view their bot settings" ON public.bot_settings FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid())))));


--
-- Name: telegram_users Admins can view their bot users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view their bot users" ON public.telegram_users FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND (bot_id IN ( SELECT bot_configs.id
   FROM public.bot_configs
  WHERE (bot_configs.admin_id = auth.uid())))));


--
-- Name: bot_configs Admins can view their own bot config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view their own bot config" ON public.bot_configs FOR SELECT USING (((admin_id = auth.uid()) AND public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: captcha_codes Service role can manage all captcha codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all captcha codes" ON public.captcha_codes TO service_role USING (true) WITH CHECK (true);


--
-- Name: telegram_invite_links Service role can manage invite links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage invite links" ON public.telegram_invite_links USING (true);


--
-- Name: telegram_users Service role can manage telegram users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage telegram users" ON public.telegram_users USING (true) WITH CHECK (true);


--
-- Name: bot_configs Service role can read all bot configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read all bot configs" ON public.bot_configs FOR SELECT USING (true);


--
-- Name: bot_buttons Service role can read all buttons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can read all buttons" ON public.bot_buttons FOR SELECT USING (true);


--
-- Name: bot_buttons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_buttons ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: captcha_codes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.captcha_codes ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_invite_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_invite_links ENABLE ROW LEVEL SECURITY;

--
-- Name: telegram_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


