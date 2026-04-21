-- 1. Mode de décrément stock
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS stock_decrement_mode text NOT NULL DEFAULT 'fired'
  CHECK (stock_decrement_mode IN ('paid', 'fired'));

-- 2. Fournisseurs
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view suppliers" ON public.suppliers FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update suppliers" ON public.suppliers FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete suppliers" ON public.suppliers FOR DELETE USING (restaurant_id = current_user_restaurant_id());
CREATE TRIGGER set_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Bons de réception
CREATE TABLE IF NOT EXISTS public.stock_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  receipt_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  total numeric NOT NULL DEFAULT 0,
  notes text,
  validated_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view receipts" ON public.stock_receipts FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert receipts" ON public.stock_receipts FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update receipts" ON public.stock_receipts FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete receipts" ON public.stock_receipts FOR DELETE USING (restaurant_id = current_user_restaurant_id());
CREATE TRIGGER set_stock_receipts_updated_at BEFORE UPDATE ON public.stock_receipts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.stock_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.stock_receipts(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view receipt items" ON public.stock_receipt_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stock_receipts r WHERE r.id = receipt_id AND r.restaurant_id = current_user_restaurant_id())
);
CREATE POLICY "Members insert receipt items" ON public.stock_receipt_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.stock_receipts r WHERE r.id = receipt_id AND r.restaurant_id = current_user_restaurant_id())
);
CREATE POLICY "Members update receipt items" ON public.stock_receipt_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.stock_receipts r WHERE r.id = receipt_id AND r.restaurant_id = current_user_restaurant_id())
);
CREATE POLICY "Members delete receipt items" ON public.stock_receipt_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.stock_receipts r WHERE r.id = receipt_id AND r.restaurant_id = current_user_restaurant_id())
);

-- 4. Inventaires
CREATE TABLE IF NOT EXISTS public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  count_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'validated')),
  notes text,
  validated_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view counts" ON public.stock_counts FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert counts" ON public.stock_counts FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update counts" ON public.stock_counts FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete counts" ON public.stock_counts FOR DELETE USING (restaurant_id = current_user_restaurant_id());
CREATE TRIGGER set_stock_counts_updated_at BEFORE UPDATE ON public.stock_counts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.stock_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  expected_quantity numeric NOT NULL DEFAULT 0,
  counted_quantity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stock_count_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view count items" ON public.stock_count_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stock_counts c WHERE c.id = count_id AND c.restaurant_id = current_user_restaurant_id())
);
CREATE POLICY "Members insert count items" ON public.stock_count_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.stock_counts c WHERE c.id = count_id AND c.restaurant_id = current_user_restaurant_id())
);
CREATE POLICY "Members update count items" ON public.stock_count_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.stock_counts c WHERE c.id = count_id AND c.restaurant_id = current_user_restaurant_id())
);
CREATE POLICY "Members delete count items" ON public.stock_count_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.stock_counts c WHERE c.id = count_id AND c.restaurant_id = current_user_restaurant_id())
);

-- 5. Validation réception => maj quantité + coût moyen pondéré
CREATE OR REPLACE FUNCTION public.apply_stock_receipt()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; old_qty numeric; old_cost numeric; new_qty numeric; new_cost numeric;
BEGIN
  IF NEW.status = 'validated' AND (OLD.status IS DISTINCT FROM 'validated') THEN
    FOR r IN SELECT stock_item_id, quantity, unit_cost FROM public.stock_receipt_items WHERE receipt_id = NEW.id LOOP
      SELECT quantity, cost_per_unit INTO old_qty, old_cost FROM public.stock_items WHERE id = r.stock_item_id;
      new_qty := COALESCE(old_qty, 0) + r.quantity;
      IF new_qty > 0 THEN
        new_cost := ((COALESCE(old_qty,0) * COALESCE(old_cost,0)) + (r.quantity * r.unit_cost)) / new_qty;
      ELSE
        new_cost := r.unit_cost;
      END IF;
      UPDATE public.stock_items
        SET quantity = new_qty, cost_per_unit = new_cost, updated_at = now()
        WHERE id = r.stock_item_id;
    END LOOP;
    NEW.validated_at := now();
    INSERT INTO public.audit_log (restaurant_id, action, entity_type, entity_id, user_id, after_data)
      VALUES (NEW.restaurant_id, 'validate', 'stock_receipt', NEW.id, auth.uid(), jsonb_build_object('total', NEW.total));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_apply_stock_receipt ON public.stock_receipts;
CREATE TRIGGER trg_apply_stock_receipt BEFORE UPDATE ON public.stock_receipts
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_receipt();

-- 6. Validation inventaire => écrase quantity avec counted
CREATE OR REPLACE FUNCTION public.apply_stock_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.status = 'validated' AND (OLD.status IS DISTINCT FROM 'validated') THEN
    FOR r IN SELECT stock_item_id, expected_quantity, counted_quantity FROM public.stock_count_items WHERE count_id = NEW.id LOOP
      UPDATE public.stock_items
        SET quantity = r.counted_quantity, updated_at = now()
        WHERE id = r.stock_item_id;
      INSERT INTO public.audit_log (restaurant_id, action, entity_type, entity_id, user_id, before_data, after_data, reason)
        VALUES (NEW.restaurant_id, 'inventory_adjust', 'stock_item', r.stock_item_id, auth.uid(),
                jsonb_build_object('quantity', r.expected_quantity),
                jsonb_build_object('quantity', r.counted_quantity),
                'Inventaire ' || NEW.count_date::text);
    END LOOP;
    NEW.validated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_apply_stock_count ON public.stock_counts;
CREATE TRIGGER trg_apply_stock_count BEFORE UPDATE ON public.stock_counts
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_count();

-- 7. Décrément stock à l'envoi cuisine (mode 'fired')
CREATE OR REPLACE FUNCTION public.decrement_stock_on_fired()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _resto uuid; _mode text;
BEGIN
  IF NEW.fired_at IS NOT NULL AND OLD.fired_at IS NULL AND NEW.menu_item_id IS NOT NULL THEN
    SELECT o.restaurant_id INTO _resto FROM public.orders o WHERE o.id = NEW.order_id;
    SELECT stock_decrement_mode INTO _mode FROM public.restaurants WHERE id = _resto;
    IF _mode = 'fired' THEN
      UPDATE public.stock_items s
        SET quantity = GREATEST(0, s.quantity - (r.quantity * NEW.quantity)), updated_at = now()
        FROM public.menu_item_recipes r
        WHERE r.menu_item_id = NEW.menu_item_id
          AND s.id = r.stock_item_id
          AND s.restaurant_id = _resto;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_decrement_stock_on_fired ON public.order_items;
CREATE TRIGGER trg_decrement_stock_on_fired AFTER UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_fired();

-- 8. Mise à jour : décrément 'paid' uniquement si mode = 'paid'
CREATE OR REPLACE FUNCTION public.decrement_stock_on_paid_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _mode text;
BEGIN
  IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
    SELECT stock_decrement_mode INTO _mode FROM public.restaurants WHERE id = NEW.restaurant_id;
    IF _mode = 'paid' THEN
      UPDATE public.stock_items s
        SET quantity = GREATEST(0, s.quantity - sub.total_used), updated_at = now()
        FROM (
          SELECT r.stock_item_id, SUM(r.quantity * oi.quantity) AS total_used
          FROM public.order_items oi
          JOIN public.menu_item_recipes r ON r.menu_item_id = oi.menu_item_id
          WHERE oi.order_id = NEW.id
          GROUP BY r.stock_item_id
        ) sub
        WHERE s.id = sub.stock_item_id AND s.restaurant_id = NEW.restaurant_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;