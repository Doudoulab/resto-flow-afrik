
-- ============ CRM GASTRONOMIQUE ENRICHI ============
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS preferred_table text,
  ADD COLUMN IF NOT EXISTS preferred_seating text,
  ADD COLUMN IF NOT EXISTS preferred_wine text,
  ADD COLUMN IF NOT EXISTS maitre_notes text,
  ADD COLUMN IF NOT EXISTS total_visits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifetime_value numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_visit_at timestamptz;

-- Historique des visites
CREATE TABLE IF NOT EXISTS public.customer_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  order_id uuid,
  visit_date timestamptz NOT NULL DEFAULT now(),
  party_size integer NOT NULL DEFAULT 1,
  total_spent numeric NOT NULL DEFAULT 0,
  items_summary jsonb NOT NULL DEFAULT '[]',
  wines_consumed jsonb NOT NULL DEFAULT '[]',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view customer visits" ON public.customer_visits
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert customer visits" ON public.customer_visits
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update customer visits" ON public.customer_visits
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete customer visits" ON public.customer_visits
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());

CREATE INDEX IF NOT EXISTS idx_customer_visits_customer ON public.customer_visits(customer_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_visits_restaurant ON public.customer_visits(restaurant_id, visit_date DESC);

-- Trigger : enregistrer une visite quand une commande passe à 'paid'
CREATE OR REPLACE FUNCTION public.record_customer_visit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' AND NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.customer_visits (restaurant_id, customer_id, order_id, total_spent, items_summary)
    SELECT NEW.restaurant_id, NEW.customer_id, NEW.id, NEW.total,
           COALESCE(jsonb_agg(jsonb_build_object('name', oi.name_snapshot, 'qty', oi.quantity)), '[]'::jsonb)
    FROM public.order_items oi WHERE oi.order_id = NEW.id;

    UPDATE public.customers
    SET total_visits = total_visits + 1,
        lifetime_value = lifetime_value + NEW.total,
        last_visit_at = now(),
        updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_customer_visit ON public.orders;
CREATE TRIGGER trg_record_customer_visit
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.record_customer_visit();

-- ============ SOMMELLERIE / CAVE À VINS ============
CREATE TABLE IF NOT EXISTS public.wines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  producer text,
  region text,
  country text,
  vintage integer,
  wine_type text NOT NULL DEFAULT 'red',
  grape_varieties text[] DEFAULT '{}',
  bottle_size_ml integer NOT NULL DEFAULT 750,
  bottle_price numeric NOT NULL DEFAULT 0,
  glass_price numeric,
  glasses_per_bottle integer NOT NULL DEFAULT 6,
  cost_per_bottle numeric NOT NULL DEFAULT 0,
  bottles_in_stock integer NOT NULL DEFAULT 0,
  cellar_location text,
  serving_temperature text,
  tasting_notes text,
  food_pairing_notes text,
  is_available boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view wines" ON public.wines
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Public view available wines" ON public.wines
  FOR SELECT USING (is_available = true);
CREATE POLICY "Members insert wines" ON public.wines
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update wines" ON public.wines
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Owner delete wines" ON public.wines
  FOR DELETE USING (is_restaurant_owner(restaurant_id));

CREATE TRIGGER trg_wines_updated BEFORE UPDATE ON public.wines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.wine_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  movement_type text NOT NULL,
  quantity numeric NOT NULL,
  reason text,
  order_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wine_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view wine movements" ON public.wine_movements
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert wine movements" ON public.wine_movements
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());

-- Accords mets-vins
CREATE TABLE IF NOT EXISTS public.menu_wine_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  is_recommended boolean NOT NULL DEFAULT true,
  sommelier_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, wine_id)
);
ALTER TABLE public.menu_wine_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view pairings" ON public.menu_wine_pairings
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Public view pairings" ON public.menu_wine_pairings
  FOR SELECT USING (true);
CREATE POLICY "Members manage pairings ins" ON public.menu_wine_pairings
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage pairings upd" ON public.menu_wine_pairings
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage pairings del" ON public.menu_wine_pairings
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());

-- ============ MENU DÉGUSTATION ============
CREATE TABLE IF NOT EXISTS public.tasting_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price_per_person numeric NOT NULL DEFAULT 0,
  wine_pairing_price numeric NOT NULL DEFAULT 0,
  estimated_duration_min integer NOT NULL DEFAULT 120,
  min_party_size integer NOT NULL DEFAULT 2,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasting_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tasting menus" ON public.tasting_menus
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Public view active tasting menus" ON public.tasting_menus
  FOR SELECT USING (is_active = true);
CREATE POLICY "Members manage tasting menus ins" ON public.tasting_menus
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage tasting menus upd" ON public.tasting_menus
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage tasting menus del" ON public.tasting_menus
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());

CREATE TRIGGER trg_tasting_menus_updated BEFORE UPDATE ON public.tasting_menus
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.tasting_menu_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  tasting_menu_id uuid NOT NULL REFERENCES public.tasting_menus(id) ON DELETE CASCADE,
  menu_item_id uuid,
  wine_id uuid REFERENCES public.wines(id) ON DELETE SET NULL,
  course_order integer NOT NULL DEFAULT 1,
  course_label text,
  cooking_time_min integer NOT NULL DEFAULT 10,
  custom_name text,
  custom_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasting_menu_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tasting courses" ON public.tasting_menu_courses
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Public view tasting courses" ON public.tasting_menu_courses
  FOR SELECT USING (true);
CREATE POLICY "Members manage tasting courses ins" ON public.tasting_menu_courses
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage tasting courses upd" ON public.tasting_menu_courses
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage tasting courses del" ON public.tasting_menu_courses
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());

-- ============ TRADUCTIONS MENU MULTI-LANGUE ============
CREATE TABLE IF NOT EXISTS public.menu_item_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  language_code text NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, language_code)
);
ALTER TABLE public.menu_item_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view item translations" ON public.menu_item_translations
  FOR SELECT USING (true);
CREATE POLICY "Members manage item translations ins" ON public.menu_item_translations
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage item translations upd" ON public.menu_item_translations
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage item translations del" ON public.menu_item_translations
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());

CREATE TRIGGER trg_item_trans_updated BEFORE UPDATE ON public.menu_item_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.menu_category_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  category_id uuid NOT NULL,
  language_code text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_id, language_code)
);
ALTER TABLE public.menu_category_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view cat translations" ON public.menu_category_translations
  FOR SELECT USING (true);
CREATE POLICY "Members manage cat translations ins" ON public.menu_category_translations
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage cat translations upd" ON public.menu_category_translations
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members manage cat translations del" ON public.menu_category_translations
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());

CREATE TRIGGER trg_cat_trans_updated BEFORE UPDATE ON public.menu_category_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PRÉ-PAIEMENT RÉSERVATION ============
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS deposit_payment_url text,
  ADD COLUMN IF NOT EXISTS deposit_payment_id uuid,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS deposit_provider text,
  ADD COLUMN IF NOT EXISTS deposit_external_ref text;
