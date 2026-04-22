-- Réautoriser la lecture publique des groupes de modificateurs
-- (structure de sélection uniquement, indispensable pour les commandes en ligne)
CREATE POLICY "Public can view modifier groups"
ON public.menu_item_modifier_groups
FOR SELECT
TO anon, authenticated
USING (true);

-- Fonction de résolution slug par id pour la redirection legacy QR
CREATE OR REPLACE FUNCTION public.get_restaurant_slug_by_id(_restaurant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug FROM public.restaurants WHERE id = _restaurant_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_restaurant_slug_by_id(uuid) TO anon, authenticated;
