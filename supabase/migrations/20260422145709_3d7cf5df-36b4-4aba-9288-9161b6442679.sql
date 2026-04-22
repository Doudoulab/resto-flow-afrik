CREATE OR REPLACE FUNCTION public.restaurant_has_write_access(_restaurant_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants r
    JOIN public.subscriptions s
      ON s.user_id = r.owner_id
     AND s.environment = 'live'
    WHERE r.id = _restaurant_id
      AND r.suspended_at IS NULL
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$function$;