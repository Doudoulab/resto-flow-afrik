-- Public orders (from QR menu)
CREATE TABLE IF NOT EXISTS public.public_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  table_number text,
  customer_name text,
  customer_phone text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_orders ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a public order
CREATE POLICY "Anyone can create public order" ON public.public_orders
  FOR INSERT WITH CHECK (true);

-- Restaurant members manage their incoming orders
CREATE POLICY "Members view public orders" ON public.public_orders
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update public orders" ON public.public_orders
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete public orders" ON public.public_orders
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());

CREATE TRIGGER trg_public_orders_updated_at
  BEFORE UPDATE ON public.public_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_public_orders_restaurant ON public.public_orders(restaurant_id, status, created_at DESC);

-- Public read of menu (for QR clients): restaurants minimal info, categories, available items
CREATE POLICY "Public can read restaurant basics" ON public.restaurants
  FOR SELECT USING (true);

CREATE POLICY "Public can read menu categories" ON public.menu_categories
  FOR SELECT USING (true);

CREATE POLICY "Public can read available menu items" ON public.menu_items
  FOR SELECT USING (is_available = true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_orders;