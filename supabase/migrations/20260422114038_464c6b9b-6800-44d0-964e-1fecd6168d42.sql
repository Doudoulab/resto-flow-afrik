DROP POLICY IF EXISTS "Public view available wines" ON public.wines;

CREATE OR REPLACE FUNCTION public.get_public_wine_list(_restaurant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', w.id,
    'name', w.name,
    'producer', w.producer,
    'region', w.region,
    'country', w.country,
    'vintage', w.vintage,
    'wine_type', w.wine_type,
    'grape_varieties', w.grape_varieties,
    'bottle_size_ml', w.bottle_size_ml,
    'bottle_price', w.bottle_price,
    'glass_price', w.glass_price,
    'serving_temperature', w.serving_temperature,
    'tasting_notes', w.tasting_notes,
    'food_pairing_notes', w.food_pairing_notes,
    'is_featured', w.is_featured,
    'image_url', w.image_url
  )), '[]'::jsonb)
  FROM public.wines w
  WHERE w.restaurant_id = _restaurant_id
    AND w.is_available = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_wine_list(uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public view active tasting menus" ON public.tasting_menus;
DROP POLICY IF EXISTS "Public view tasting courses" ON public.tasting_menu_courses;
DROP POLICY IF EXISTS "Public can view tasting courses" ON public.tasting_menu_courses;

CREATE OR REPLACE FUNCTION public.get_public_tasting_menus(_restaurant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'menu', to_jsonb(t.*),
    'courses', COALESCE((
      SELECT jsonb_agg(to_jsonb(c.*) ORDER BY c.course_order)
      FROM public.tasting_menu_courses c
      WHERE c.tasting_menu_id = t.id
    ), '[]'::jsonb)
  )), '[]'::jsonb)
  FROM public.tasting_menus t
  WHERE t.restaurant_id = _restaurant_id
    AND t.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tasting_menus(uuid) TO anon, authenticated;
