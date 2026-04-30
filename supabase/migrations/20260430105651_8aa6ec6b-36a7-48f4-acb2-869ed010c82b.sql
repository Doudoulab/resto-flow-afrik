
-- Fonction SECURITY DEFINER pour vérifier qu'un restaurant accepte les commandes en ligne
CREATE OR REPLACE FUNCTION public.restaurant_accepts_orders(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = _restaurant_id
      AND accepts_online_orders = true
      AND suspended_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.restaurant_accepts_orders(uuid) TO anon, authenticated;

-- Remplacer la policy INSERT défaillante
DROP POLICY IF EXISTS "Public can create order for accepting restaurant" ON public.public_orders;

CREATE POLICY "Public can create order for accepting restaurant"
ON public.public_orders
FOR INSERT
TO anon, authenticated
WITH CHECK (public.restaurant_accepts_orders(restaurant_id));

-- Donner les grants nécessaires (les policies RLS ne suffisent pas sans les GRANTs)
GRANT INSERT ON public.public_orders TO anon, authenticated;
GRANT SELECT ON public.public_orders TO anon, authenticated;
