
-- Add PIN column (hashed) to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS clock_pin_hash text;

-- Helper to set PIN (hashed)
CREATE OR REPLACE FUNCTION public.set_clock_pin(_user_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_restaurant uuid;
  v_caller_owner boolean;
BEGIN
  IF _pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN doit être 4 à 6 chiffres';
  END IF;

  SELECT restaurant_id INTO v_restaurant FROM public.profiles WHERE id = _user_id;
  IF v_restaurant IS NULL THEN
    RAISE EXCEPTION 'Employé introuvable';
  END IF;

  -- caller must be owner of same restaurant OR be the user themselves
  SELECT is_owner INTO v_caller_owner FROM public.profiles WHERE id = auth.uid() AND restaurant_id = v_restaurant;

  IF auth.uid() <> _user_id AND COALESCE(v_caller_owner, false) = false THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  UPDATE public.profiles
    SET clock_pin_hash = extensions.crypt(_pin, extensions.gen_salt('bf'))
    WHERE id = _user_id;
END;
$$;

-- Punch via PIN: returns the resulting time entry id and action
CREATE OR REPLACE FUNCTION public.punch_with_pin(_restaurant_id uuid, _pin text)
RETURNS TABLE(action text, employee_name text, entry_id uuid, at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user uuid;
  v_name text;
  v_open uuid;
  v_now timestamptz := now();
  v_new_id uuid;
BEGIN
  IF _pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN invalide';
  END IF;

  -- caller must belong to the restaurant
  IF current_user_restaurant_id() <> _restaurant_id THEN
    RAISE EXCEPTION 'Non autorisé';
  END IF;

  SELECT p.id, COALESCE(NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''), 'Employé')
    INTO v_user, v_name
    FROM public.profiles p
   WHERE p.restaurant_id = _restaurant_id
     AND p.clock_pin_hash IS NOT NULL
     AND p.clock_pin_hash = extensions.crypt(_pin, p.clock_pin_hash)
   LIMIT 1;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'PIN incorrect';
  END IF;

  -- look for an open entry today
  SELECT id INTO v_open
    FROM public.time_entries
   WHERE restaurant_id = _restaurant_id
     AND user_id = v_user
     AND clock_out IS NULL
   ORDER BY clock_in DESC
   LIMIT 1;

  IF v_open IS NOT NULL THEN
    UPDATE public.time_entries SET clock_out = v_now WHERE id = v_open;
    RETURN QUERY SELECT 'clock_out'::text, v_name, v_open, v_now;
  ELSE
    INSERT INTO public.time_entries(restaurant_id, user_id, clock_in)
      VALUES (_restaurant_id, v_user, v_now)
      RETURNING id INTO v_new_id;
    RETURN QUERY SELECT 'clock_in'::text, v_name, v_new_id, v_now;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_clock_pin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.punch_with_pin(uuid, text) TO authenticated;
