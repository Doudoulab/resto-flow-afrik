CREATE OR REPLACE FUNCTION public.admin_set_clock_pin(_user_id uuid, _pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN doit être 4 à 6 chiffres';
  END IF;
  UPDATE public.profiles
    SET clock_pin_hash = extensions.crypt(_pin, extensions.gen_salt('bf'))
    WHERE id = _user_id;
END;
$$;

-- Only service role should call this (no GRANT to authenticated)
REVOKE ALL ON FUNCTION public.admin_set_clock_pin(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_clock_pin(uuid, text) FROM anon, authenticated;