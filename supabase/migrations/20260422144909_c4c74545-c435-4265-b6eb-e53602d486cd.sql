
-- 1) Enum of platform-level roles
CREATE TYPE public.platform_role AS ENUM ('super_admin', 'support', 'finance', 'viewer');

-- 2) Active assignments
CREATE TABLE public.platform_role_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  role public.platform_role NOT NULL,
  granted_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_platform_role_assignments_updated
  BEFORE UPDATE ON public.platform_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.platform_role_assignments ENABLE ROW LEVEL SECURITY;

-- 3) Pre-authorized emails (will become assignments on first login)
CREATE TABLE public.platform_role_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role public.platform_role NOT NULL,
  invited_by UUID,
  notes TEXT,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_role_invites ENABLE ROW LEVEL SECURITY;

-- 4) Helper functions
CREATE OR REPLACE FUNCTION public.has_platform_role(_role public.platform_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_role_assignments
    WHERE user_id = auth.uid() AND role = _role
  )
  -- Backward compat: legacy platform_admins entries count as super_admin
  OR (_role = 'super_admin' AND EXISTS (
    SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()
  ));
$$;

CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_platform_role('super_admin');
$$;

CREATE OR REPLACE FUNCTION public.current_platform_role()
RETURNS public.platform_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.platform_role_assignments WHERE user_id = auth.uid()
  UNION ALL
  SELECT 'super_admin'::public.platform_role FROM public.platform_admins WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- 5) Update existing is_platform_admin() to honor the new system
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.platform_role_assignments
                 WHERE user_id = auth.uid() AND role IN ('super_admin','support','finance','viewer'));
$$;

-- 6) RLS policies
CREATE POLICY "Super admins manage role assignments"
  ON public.platform_role_assignments
  FOR ALL
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

CREATE POLICY "Users can read their own assignment"
  ON public.platform_role_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins manage invites"
  ON public.platform_role_invites
  FOR ALL
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

-- 7) Auto-consume invite on signup / first login
CREATE OR REPLACE FUNCTION public.consume_platform_invite()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.platform_role_invites;
BEGIN
  SELECT * INTO v_invite
  FROM public.platform_role_invites
  WHERE lower(email) = lower(NEW.email) AND consumed_at IS NULL
  LIMIT 1;

  IF FOUND THEN
    INSERT INTO public.platform_role_assignments (user_id, email, role, granted_by, notes)
    VALUES (NEW.id, NEW.email, v_invite.role, v_invite.invited_by, v_invite.notes)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, updated_at = now();

    UPDATE public.platform_role_invites
    SET consumed_at = now()
    WHERE id = v_invite.id;

    -- Also keep legacy platform_admins in sync for super_admin
    IF v_invite.role = 'super_admin' THEN
      INSERT INTO public.platform_admins (user_id, email, notes, created_by)
      VALUES (NEW.id, NEW.email, COALESCE(v_invite.notes, 'Auto from invite'), v_invite.invited_by)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_consume_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_consume_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.consume_platform_invite();

-- 8) Pre-authorize founder
INSERT INTO public.platform_role_invites (email, role, notes)
VALUES ('restoflow.afrik@gmail.com', 'super_admin', 'Founder account')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- 9) If user already exists, grant immediately
INSERT INTO public.platform_role_assignments (user_id, email, role, notes)
SELECT id, email, 'super_admin'::public.platform_role, 'Founder account'
FROM auth.users WHERE lower(email) = 'restoflow.afrik@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';

INSERT INTO public.platform_admins (user_id, email, notes)
SELECT id, email, 'Founder account'
FROM auth.users WHERE lower(email) = 'restoflow.afrik@gmail.com'
ON CONFLICT DO NOTHING;
