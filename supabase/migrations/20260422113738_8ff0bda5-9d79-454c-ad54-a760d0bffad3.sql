-- ============================================================
-- VAGUE SÉCURITÉ — Correction des fuites de données
-- ============================================================

-- 1) RESTAURANTS : retirer lecture publique de toutes les colonnes
DROP POLICY IF EXISTS "Public can read restaurant basics" ON public.restaurants;

-- 2) MOBILE MONEY OPERATORS : retirer lecture publique
DROP POLICY IF EXISTS "Public can view operators" ON public.mobile_money_operators;
DROP POLICY IF EXISTS "Public view enabled operators" ON public.mobile_money_operators;

-- 3) MENU MODIFIER GROUPS / MODIFIERS / VARIANTS / TRANSLATIONS : retirer lecture publique large
DROP POLICY IF EXISTS "Public can view mod groups" ON public.menu_item_modifier_groups;
DROP POLICY IF EXISTS "Public view modifier groups" ON public.menu_item_modifier_groups;
DROP POLICY IF EXISTS "Public can view modifiers" ON public.menu_item_modifiers;
DROP POLICY IF EXISTS "Public view modifiers" ON public.menu_item_modifiers;
DROP POLICY IF EXISTS "Public can view variants" ON public.menu_item_variants;
DROP POLICY IF EXISTS "Public view variants" ON public.menu_item_variants;
DROP POLICY IF EXISTS "Public can view item translations" ON public.menu_item_translations;
DROP POLICY IF EXISTS "Public can view category translations" ON public.menu_category_translations;

-- Fonction publique pour récupérer les extras menu d'UN restaurant donné
CREATE OR REPLACE FUNCTION public.get_public_menu_extras(_restaurant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'variants', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', v.id, 'menu_item_id', v.menu_item_id, 'name', v.name,
        'price', v.price, 'price_delta', v.price_delta, 'is_default', v.is_default,
        'sort_order', v.sort_order, 'image_url', v.image_url
      ))
      FROM public.menu_item_variants v
      WHERE v.restaurant_id = _restaurant_id AND v.is_available = true
    ), '[]'::jsonb),
    'modifier_groups', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', g.id, 'menu_item_id', g.menu_item_id, 'name', g.name,
        'selection_type', g.selection_type, 'min_select', g.min_select,
        'max_select', g.max_select, 'is_required', g.is_required, 'sort_order', g.sort_order
      ))
      FROM public.menu_item_modifier_groups g
      WHERE g.restaurant_id = _restaurant_id
    ), '[]'::jsonb),
    'modifiers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id, 'group_id', m.group_id, 'name', m.name,
        'price_delta', m.price_delta, 'is_default', m.is_default, 'sort_order', m.sort_order
      ))
      FROM public.menu_item_modifiers m
      WHERE m.restaurant_id = _restaurant_id AND m.is_available = true
    ), '[]'::jsonb),
    'item_translations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'menu_item_id', t.menu_item_id, 'language_code', t.language_code,
        'name', t.name, 'description', t.description
      ))
      FROM public.menu_item_translations t
      WHERE t.restaurant_id = _restaurant_id
    ), '[]'::jsonb),
    'category_translations', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'category_id', t.category_id, 'language_code', t.language_code, 'name', t.name
      ))
      FROM public.menu_category_translations t
      WHERE t.restaurant_id = _restaurant_id
    ), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_menu_extras(uuid) TO anon, authenticated;

-- 4) WINE PAIRINGS : retirer lecture publique non scopée
DROP POLICY IF EXISTS "Public view pairings" ON public.menu_wine_pairings;
DROP POLICY IF EXISTS "Public can view pairings" ON public.menu_wine_pairings;

-- 5) PROFILES : protéger clock_pin_hash
DROP POLICY IF EXISTS "View own profile or same restaurant" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Owners view restaurant profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  restaurant_id IS NOT NULL
  AND public.is_restaurant_owner(restaurant_id)
);

CREATE OR REPLACE VIEW public.profiles_safe
WITH (security_invoker = true) AS
SELECT id, first_name, last_name, restaurant_id, is_owner, hourly_rate, created_at, updated_at
FROM public.profiles
WHERE restaurant_id = public.current_user_restaurant_id();

GRANT SELECT ON public.profiles_safe TO authenticated;

-- 6) EMPLOYEE_DETAILS : restreindre champs sensibles
DROP POLICY IF EXISTS "Members view employee details" ON public.employee_details;
DROP POLICY IF EXISTS "Restaurant members view employee details" ON public.employee_details;

CREATE POLICY "Owners view all employee details"
ON public.employee_details FOR SELECT TO authenticated
USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Employee views own details"
ON public.employee_details FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE OR REPLACE VIEW public.employee_details_safe
WITH (security_invoker = true) AS
SELECT id, restaurant_id, user_id, job_title, contract_type, hired_at, contract_end_date,
       is_active, annual_leave_days, created_at, updated_at
FROM public.employee_details
WHERE restaurant_id = public.current_user_restaurant_id();

GRANT SELECT ON public.employee_details_safe TO authenticated;

-- 7) PUBLIC_ORDERS : valider l'existence du restaurant + accepts_online_orders
DROP POLICY IF EXISTS "Anyone can create public order" ON public.public_orders;
DROP POLICY IF EXISTS "Public can create order" ON public.public_orders;

CREATE POLICY "Public can create order for accepting restaurant"
ON public.public_orders FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = restaurant_id AND r.accepts_online_orders = true
  )
);

-- 8) STORAGE employee-documents : corriger la policy cassée
-- Convention chemin : <restaurant_id>/<user_id>/<filename>
DROP POLICY IF EXISTS "Owner views employee docs files" ON storage.objects;
DROP POLICY IF EXISTS "Owner uploads employee docs files" ON storage.objects;
DROP POLICY IF EXISTS "Owner deletes employee docs files" ON storage.objects;
DROP POLICY IF EXISTS "Owner updates employee docs files" ON storage.objects;
DROP POLICY IF EXISTS "Employee views own docs files" ON storage.objects;

CREATE POLICY "Owner views employee docs files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Owner uploads employee docs files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents'
  AND public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Owner updates employee docs files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Owner deletes employee docs files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND public.is_restaurant_owner(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Employee views own docs files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'employee-documents'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
