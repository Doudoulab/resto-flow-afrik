CREATE OR REPLACE FUNCTION public.get_public_restaurant(_slug text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'id', r.id,
    'name', r.name,
    'slug', r.slug,
    'description', r.description,
    'logo_url', r.logo_url,
    'cover_url', r.cover_url,
    'address', r.address,
    'phone', r.phone,
    'whatsapp', r.whatsapp,
    'instagram_url', r.instagram_url,
    'facebook_url', r.facebook_url,
    'theme_color', r.theme_color,
    'opening_hours', r.opening_hours,
    'currency', r.currency,
    'country_code', r.country_code,
    'accepts_online_orders', r.accepts_online_orders,
    'hide_powered_by', r.hide_powered_by
  )
  FROM public.restaurants r
  WHERE r.slug = _slug
  LIMIT 1;
$function$;