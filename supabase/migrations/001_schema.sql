-- ============================================================================
-- GRUPO NEW ENERGY — Fase 1: Schema (tabla profiles, funciones, RLS, triggers)
-- Pegar en Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================================

-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM (
  'ADMIN', 'BACKOFFICE', 'DIRECTOR', 'KAM', 'CANAL', 'COMERCIAL'
);

-- 2. Tabla profiles
CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name  TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  role       public.app_role NOT NULL DEFAULT 'COMERCIAL',
  parent_id  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_parent_id ON public.profiles(parent_id);
CREATE INDEX idx_profiles_role      ON public.profiles(role);

-- 3. Funciones recursivas de jerarquía
CREATE OR REPLACE FUNCTION public.get_descendants(root_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH RECURSIVE tree AS (
    SELECT id FROM public.profiles WHERE parent_id = root_id
    UNION ALL
    SELECT p.id FROM public.profiles p INNER JOIN tree t ON p.parent_id = t.id
  )
  SELECT id FROM tree;
$$;

CREATE OR REPLACE FUNCTION public.is_descendant_of(child_id UUID, ancestor_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT child_id IN (SELECT public.get_descendants(ancestor_id));
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- 4. RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('ADMIN', 'BACKOFFICE')
    OR public.is_descendant_of(id, auth.uid())
  );

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 5. Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'COMERCIAL')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
