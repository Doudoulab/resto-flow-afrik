-- 1. Restaurant customization fields
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'sn',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS theme_color TEXT,
  ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS accepts_online_orders BOOLEAN NOT NULL DEFAULT true;

-- Auto-generate slug from name on insert/update if missing
CREATE OR REPLACE FUNCTION public.ensure_restaurant_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  n INT := 0;
BEGIN
  IF NEW.slug IS NULL OR length(NEW.slug) = 0 THEN
    base := lower(regexp_replace(coalesce(NEW.name, 'resto'), '[^a-zA-Z0-9]+', '-', 'g'));
    base := trim(both '-' from base);
    IF base = '' THEN base := 'resto'; END IF;
    candidate := base;
    WHILE EXISTS (SELECT 1 FROM public.restaurants WHERE slug = candidate AND id <> NEW.id) LOOP
      n := n + 1;
      candidate := base || '-' || n;
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurants_slug ON public.restaurants;
CREATE TRIGGER trg_restaurants_slug
  BEFORE INSERT OR UPDATE OF name, slug ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.ensure_restaurant_slug();

-- Backfill slugs for existing restaurants
UPDATE public.restaurants SET slug = NULL WHERE slug IS NULL;
-- Trigger fires per row by re-updating
UPDATE public.restaurants SET name = name WHERE slug IS NULL;

-- 2. Menu items: photo + sort
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- 3. Mobile money operator configs (multi-operator per restaurant)
CREATE TABLE IF NOT EXISTS public.mobile_money_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  operator_code TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  display_name TEXT,
  account_number TEXT,
  merchant_id TEXT,
  ussd_template TEXT,
  deeplink_template TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, operator_code)
);

ALTER TABLE public.mobile_money_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view operators"
  ON public.mobile_money_operators FOR SELECT
  USING (enabled = true);

CREATE POLICY "Owner views all operators"
  ON public.mobile_money_operators FOR SELECT
  USING (is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner inserts operators"
  ON public.mobile_money_operators FOR INSERT
  WITH CHECK (is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner updates operators"
  ON public.mobile_money_operators FOR UPDATE
  USING (is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner deletes operators"
  ON public.mobile_money_operators FOR DELETE
  USING (is_restaurant_owner(restaurant_id));

CREATE TRIGGER trg_mmo_updated_at
  BEFORE UPDATE ON public.mobile_money_operators
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Storage buckets
INSERT INTO storage.buckets (id, name, public)
  VALUES ('restaurant-assets', 'restaurant-assets', true)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
  VALUES ('menu-images', 'menu-images', true)
  ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, owner manages own folder (folder = restaurant_id)
CREATE POLICY "Public read restaurant assets"
  ON storage.objects FOR SELECT
  USING (bucket_id IN ('restaurant-assets', 'menu-images'));

CREATE POLICY "Members upload restaurant assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id IN ('restaurant-assets', 'menu-images')
    AND (storage.foldername(name))[1] = current_user_restaurant_id()::text
  );

CREATE POLICY "Members update restaurant assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id IN ('restaurant-assets', 'menu-images')
    AND (storage.foldername(name))[1] = current_user_restaurant_id()::text
  );

CREATE POLICY "Members delete restaurant assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('restaurant-assets', 'menu-images')
    AND (storage.foldername(name))[1] = current_user_restaurant_id()::text
  );

-- 5. Public lookup of restaurant by slug (security definer to avoid exposing all columns)
CREATE OR REPLACE FUNCTION public.get_public_restaurant(_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    'accepts_online_orders', r.accepts_online_orders
  )
  FROM public.restaurants r
  WHERE r.slug = _slug
  LIMIT 1;
$$;