-- =========================================
-- VARIANTS
-- =========================================
CREATE TABLE public.menu_item_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric,             -- prix absolu (si défini, prioritaire)
  price_delta numeric NOT NULL DEFAULT 0, -- sinon delta vs prix parent
  image_url text,
  is_default boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_variants_item ON public.menu_item_variants(menu_item_id);
CREATE INDEX idx_variants_resto ON public.menu_item_variants(restaurant_id);

ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view variants" ON public.menu_item_variants
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert variants" ON public.menu_item_variants
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update variants" ON public.menu_item_variants
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete variants" ON public.menu_item_variants
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Public can view available variants" ON public.menu_item_variants
  FOR SELECT USING (is_available = true);

CREATE TRIGGER trg_variants_updated_at
  BEFORE UPDATE ON public.menu_item_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- MODIFIER GROUPS
-- =========================================
CREATE TABLE public.menu_item_modifier_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name text NOT NULL,
  selection_type text NOT NULL DEFAULT 'single' CHECK (selection_type IN ('single','multiple')),
  is_required boolean NOT NULL DEFAULT false,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_modgroups_item ON public.menu_item_modifier_groups(menu_item_id);
CREATE INDEX idx_modgroups_resto ON public.menu_item_modifier_groups(restaurant_id);

ALTER TABLE public.menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view mod groups" ON public.menu_item_modifier_groups
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert mod groups" ON public.menu_item_modifier_groups
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update mod groups" ON public.menu_item_modifier_groups
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete mod groups" ON public.menu_item_modifier_groups
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Public can view mod groups" ON public.menu_item_modifier_groups
  FOR SELECT USING (true);

CREATE TRIGGER trg_modgroups_updated_at
  BEFORE UPDATE ON public.menu_item_modifier_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- MODIFIERS (options)
-- =========================================
CREATE TABLE public.menu_item_modifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.menu_item_modifier_groups(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_delta numeric NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_modifiers_group ON public.menu_item_modifiers(group_id);
CREATE INDEX idx_modifiers_resto ON public.menu_item_modifiers(restaurant_id);

ALTER TABLE public.menu_item_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view modifiers" ON public.menu_item_modifiers
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert modifiers" ON public.menu_item_modifiers
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update modifiers" ON public.menu_item_modifiers
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete modifiers" ON public.menu_item_modifiers
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Public can view available modifiers" ON public.menu_item_modifiers
  FOR SELECT USING (is_available = true);

CREATE TRIGGER trg_modifiers_updated_at
  BEFORE UPDATE ON public.menu_item_modifiers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();