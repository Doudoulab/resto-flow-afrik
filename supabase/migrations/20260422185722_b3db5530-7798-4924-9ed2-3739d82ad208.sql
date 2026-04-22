-- 1. Liste tous les restaurants possédés par l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.user_owned_restaurants()
RETURNS TABLE(id uuid, name text, slug text, logo_url text, suspended_at timestamptz, is_active boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.name, r.slug, r.logo_url, r.suspended_at,
         (r.id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())) AS is_active
  FROM public.restaurants r
  WHERE r.owner_id = auth.uid()
  ORDER BY r.created_at ASC;
$$;

-- 2. Bascule le restaurant actif (vérifie ownership)
CREATE OR REPLACE FUNCTION public.switch_active_restaurant(_restaurant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owns boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.restaurants
    WHERE id = _restaurant_id AND owner_id = _uid
  ) INTO _owns;

  IF NOT _owns THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  UPDATE public.profiles
  SET restaurant_id = _restaurant_id, updated_at = now()
  WHERE id = _uid;

  -- S'assurer que le rôle manager existe sur ce resto pour cet owner
  INSERT INTO public.user_roles (user_id, restaurant_id, role)
  VALUES (_uid, _restaurant_id, 'manager')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('success', true, 'restaurant_id', _restaurant_id);
END;
$$;

-- 3. Crée un nouvel établissement (réutilise le quota déjà en place)
CREATE OR REPLACE FUNCTION public.create_additional_restaurant(_name text, _switch boolean DEFAULT true)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _name IS NULL OR length(trim(_name)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'name_required');
  END IF;

  -- L'INSERT déclenche enforce_restaurant_quota qui bloque si pas Business
  INSERT INTO public.restaurants (owner_id, name)
  VALUES (_uid, trim(_name))
  RETURNING id INTO _new_id;

  INSERT INTO public.user_roles (user_id, restaurant_id, role)
  VALUES (_uid, _new_id, 'manager')
  ON CONFLICT DO NOTHING;

  IF _switch THEN
    UPDATE public.profiles
    SET restaurant_id = _new_id, updated_at = now()
    WHERE id = _uid;
  END IF;

  RETURN jsonb_build_object('success', true, 'restaurant_id', _new_id);
END;
$$;