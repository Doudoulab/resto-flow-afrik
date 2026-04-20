-- 1. Cost per unit on stock items
ALTER TABLE public.stock_items
  ADD COLUMN IF NOT EXISTS cost_per_unit numeric NOT NULL DEFAULT 0;

-- 2. Recipes table: link menu items to stock ingredients
CREATE TABLE IF NOT EXISTS public.menu_item_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  menu_item_id uuid NOT NULL,
  stock_item_id uuid NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, stock_item_id)
);

ALTER TABLE public.menu_item_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view recipes"
  ON public.menu_item_recipes FOR SELECT
  USING (restaurant_id = current_user_restaurant_id());

CREATE POLICY "Members insert recipes"
  ON public.menu_item_recipes FOR INSERT
  WITH CHECK (restaurant_id = current_user_restaurant_id());

CREATE POLICY "Members update recipes"
  ON public.menu_item_recipes FOR UPDATE
  USING (restaurant_id = current_user_restaurant_id());

CREATE POLICY "Members delete recipes"
  ON public.menu_item_recipes FOR DELETE
  USING (restaurant_id = current_user_restaurant_id());

CREATE TRIGGER trg_menu_item_recipes_updated_at
  BEFORE UPDATE ON public.menu_item_recipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON public.menu_item_recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_recipes_stock_item ON public.menu_item_recipes(stock_item_id);

-- 3. Auto-decrement stock when order is paid
CREATE OR REPLACE FUNCTION public.decrement_stock_on_paid_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    UPDATE public.stock_items s
    SET quantity = GREATEST(0, s.quantity - sub.total_used),
        updated_at = now()
    FROM (
      SELECT r.stock_item_id, SUM(r.quantity * oi.quantity) AS total_used
      FROM public.order_items oi
      JOIN public.menu_item_recipes r ON r.menu_item_id = oi.menu_item_id
      WHERE oi.order_id = NEW.id
      GROUP BY r.stock_item_id
    ) sub
    WHERE s.id = sub.stock_item_id
      AND s.restaurant_id = NEW.restaurant_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock_on_paid ON public.orders;
CREATE TRIGGER trg_decrement_stock_on_paid
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_paid_order();