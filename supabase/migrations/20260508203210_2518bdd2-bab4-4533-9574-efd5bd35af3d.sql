
-- 1) Soft delete columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.employee_details ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- 2) Soft delete RPC
CREATE OR REPLACE FUNCTION public.soft_delete_employee(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_resto uuid;
  v_caller_owner boolean;
  v_target_is_owner boolean;
BEGIN
  IF auth.uid() = _user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez pas vous supprimer vous-même.';
  END IF;
  SELECT restaurant_id INTO v_resto FROM public.profiles WHERE id = _user_id;
  IF v_resto IS NULL THEN
    RAISE EXCEPTION 'Employé introuvable.';
  END IF;
  SELECT is_owner INTO v_caller_owner FROM public.profiles WHERE id = auth.uid() AND restaurant_id = v_resto;
  IF NOT COALESCE(v_caller_owner, false) THEN
    RAISE EXCEPTION 'Seul le propriétaire peut supprimer un employé.';
  END IF;
  SELECT is_owner INTO v_target_is_owner FROM public.profiles WHERE id = _user_id;
  IF COALESCE(v_target_is_owner, false) THEN
    RAISE EXCEPTION 'Le propriétaire ne peut pas être supprimé.';
  END IF;

  UPDATE public.profiles SET deleted_at = now(), restaurant_id = NULL WHERE id = _user_id;
  UPDATE public.employee_details SET deleted_at = now(), is_active = false
    WHERE user_id = _user_id AND restaurant_id = v_resto;
  DELETE FROM public.user_roles WHERE user_id = _user_id AND restaurant_id = v_resto;

  INSERT INTO public.audit_log (restaurant_id, action, entity_type, entity_id, user_id, reason)
  VALUES (v_resto, 'delete', 'employee', _user_id, auth.uid(), 'Suppression douce employé');
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_employee(_user_id uuid, _restaurant_id uuid, _role app_role DEFAULT 'waiter')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller_owner boolean;
BEGIN
  SELECT is_owner INTO v_caller_owner FROM public.profiles WHERE id = auth.uid() AND restaurant_id = _restaurant_id;
  IF NOT COALESCE(v_caller_owner, false) THEN
    RAISE EXCEPTION 'Seul le propriétaire peut restaurer un employé.';
  END IF;

  UPDATE public.profiles SET deleted_at = NULL, restaurant_id = _restaurant_id WHERE id = _user_id;
  UPDATE public.employee_details SET deleted_at = NULL, is_active = true
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id;
  INSERT INTO public.user_roles(user_id, restaurant_id, role) VALUES (_user_id, _restaurant_id, _role)
    ON CONFLICT DO NOTHING;

  INSERT INTO public.audit_log (restaurant_id, action, entity_type, entity_id, user_id, reason)
  VALUES (_restaurant_id, 'restore', 'employee', _user_id, auth.uid(), 'Restauration employé');
END;
$$;

-- 3) Push tokens table
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios','android','web')),
  token text NOT NULL,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_resto ON public.push_tokens(restaurant_id);
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage their own tokens" ON public.push_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owners see restaurant tokens" ON public.push_tokens
  FOR SELECT TO authenticated
  USING (restaurant_id = current_user_restaurant_id());

CREATE TRIGGER push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
