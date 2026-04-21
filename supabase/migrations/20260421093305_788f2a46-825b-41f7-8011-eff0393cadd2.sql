-- =====================================================
-- GROUPE 2 — SERVICE HAUT DE GAMME
-- =====================================================

-- 1) Postes de cuisine (chaud, froid, bar, dessert, etc.)
CREATE TABLE IF NOT EXISTS public.kitchen_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kitchen_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view kitchen stations"
  ON public.kitchen_stations FOR SELECT
  USING (restaurant_id = current_user_restaurant_id());

CREATE POLICY "Owner inserts kitchen stations"
  ON public.kitchen_stations FOR INSERT
  WITH CHECK (is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner updates kitchen stations"
  ON public.kitchen_stations FOR UPDATE
  USING (is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner deletes kitchen stations"
  ON public.kitchen_stations FOR DELETE
  USING (is_restaurant_owner(restaurant_id));

CREATE TRIGGER kitchen_stations_updated_at
  BEFORE UPDATE ON public.kitchen_stations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Routage catégorie -> poste cuisine
ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES public.kitchen_stations(id) ON DELETE SET NULL;

-- Possible override par item
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES public.kitchen_stations(id) ON DELETE SET NULL;

-- 3) Cours de service + état "envoyé en cuisine"
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS course_number integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fired_at timestamptz,
  ADD COLUMN IF NOT EXISTS station_id uuid REFERENCES public.kitchen_stations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS special_request text,
  ADD COLUMN IF NOT EXISTS is_allergy_alert boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_order_items_station ON public.order_items(station_id) WHERE station_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_fired ON public.order_items(fired_at) WHERE fired_at IS NULL;

-- 4) Allergies / régime sur fiche client
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS dietary_preferences text;

-- 5) Réservations améliorées
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS deposit_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS estimated_duration_min integer NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS special_occasion text;

CREATE INDEX IF NOT EXISTS idx_reservations_reserved_at ON public.reservations(restaurant_id, reserved_at);

-- 6) Plan de salle visuel : position x/y
ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS pos_x integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pos_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS assigned_waiter_id uuid;

-- 7) Lien commande <-> plusieurs tables (fusion)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS merged_tables text[];

-- 8) Fonction utilitaire pour transférer un item entre commandes (avec audit)
CREATE OR REPLACE FUNCTION public.transfer_order_item(
  _item_id uuid,
  _to_order_id uuid,
  _reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _from_order_id uuid;
  _restaurant_id uuid;
BEGIN
  SELECT oi.order_id, o.restaurant_id INTO _from_order_id, _restaurant_id
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = _item_id;

  IF _restaurant_id IS NULL OR _restaurant_id <> current_user_restaurant_id() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Vérifier que la commande cible appartient au même resto
  IF NOT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _to_order_id AND restaurant_id = _restaurant_id
  ) THEN
    RAISE EXCEPTION 'target_order_invalid';
  END IF;

  UPDATE public.order_items
  SET order_id = _to_order_id
  WHERE id = _item_id;

  INSERT INTO public.audit_log (restaurant_id, action, entity_type, entity_id, reason, user_id, before_data, after_data)
  VALUES (
    _restaurant_id,
    'transfer',
    'order_item',
    _item_id,
    _reason,
    auth.uid(),
    jsonb_build_object('from_order_id', _from_order_id),
    jsonb_build_object('to_order_id', _to_order_id)
  );
END;
$$;