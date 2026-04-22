CREATE OR REPLACE FUNCTION public.claim_first_platform_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid;
  _email text;
  _count int;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT COUNT(*) INTO _count FROM public.platform_admins;
  IF _count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_initialized');
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  INSERT INTO public.platform_admins (user_id, email, notes, created_by)
  VALUES (_uid, _email, 'Premier super-admin (bootstrap)', _uid);

  RETURN jsonb_build_object('success', true, 'user_id', _uid, 'email', _email);
END;
$$;