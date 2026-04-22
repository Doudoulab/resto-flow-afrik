
-- Helper: returns true if the restaurant's owner has an active subscription (active or trialing, not expired)
CREATE OR REPLACE FUNCTION public.restaurant_has_write_access(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants r
    JOIN public.subscriptions s
      ON s.user_id = r.owner_id
     AND s.environment = 'live'
    WHERE r.id = _restaurant_id
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;

-- ===== orders =====
DROP POLICY IF EXISTS "Restaurant members create orders" ON public.orders;
CREATE POLICY "Restaurant members create orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

DROP POLICY IF EXISTS "Restaurant members update orders" ON public.orders;
CREATE POLICY "Restaurant members update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (restaurant_id = current_user_restaurant_id())
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

DROP POLICY IF EXISTS "Restaurant members delete orders" ON public.orders;
CREATE POLICY "Restaurant members delete orders" ON public.orders
  FOR DELETE TO authenticated
  USING (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

-- ===== order_items =====
DROP POLICY IF EXISTS "Restaurant members create order items" ON public.order_items;
CREATE POLICY "Restaurant members create order items" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.restaurant_id = current_user_restaurant_id()
        AND public.restaurant_has_write_access(o.restaurant_id)
    )
  );

DROP POLICY IF EXISTS "Restaurant members update order items" ON public.order_items;
CREATE POLICY "Restaurant members update order items" ON public.order_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.restaurant_id = current_user_restaurant_id())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.restaurant_id = current_user_restaurant_id()
        AND public.restaurant_has_write_access(o.restaurant_id)
    )
  );

DROP POLICY IF EXISTS "Restaurant members delete order items" ON public.order_items;
CREATE POLICY "Restaurant members delete order items" ON public.order_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND o.restaurant_id = current_user_restaurant_id()
        AND public.restaurant_has_write_access(o.restaurant_id)
    )
  );

-- ===== invoices =====
DROP POLICY IF EXISTS "Members insert invoices" ON public.invoices;
CREATE POLICY "Members insert invoices" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

DROP POLICY IF EXISTS "Members update invoices" ON public.invoices;
CREATE POLICY "Members update invoices" ON public.invoices
  FOR UPDATE TO authenticated
  USING (restaurant_id = current_user_restaurant_id())
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

-- ===== order_payments =====
DROP POLICY IF EXISTS "Members insert order payments" ON public.order_payments;
CREATE POLICY "Members insert order payments" ON public.order_payments
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

DROP POLICY IF EXISTS "Members update order payments" ON public.order_payments;
CREATE POLICY "Members update order payments" ON public.order_payments
  FOR UPDATE TO authenticated
  USING (restaurant_id = current_user_restaurant_id())
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

DROP POLICY IF EXISTS "Members delete order payments" ON public.order_payments;
CREATE POLICY "Members delete order payments" ON public.order_payments
  FOR DELETE TO authenticated
  USING (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

-- ===== menu_items =====
DROP POLICY IF EXISTS "Restaurant members manage menu items - insert" ON public.menu_items;
CREATE POLICY "Restaurant members manage menu items - insert" ON public.menu_items
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

DROP POLICY IF EXISTS "Restaurant members manage menu items - update" ON public.menu_items;
CREATE POLICY "Restaurant members manage menu items - update" ON public.menu_items
  FOR UPDATE TO authenticated
  USING (restaurant_id = current_user_restaurant_id())
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

DROP POLICY IF EXISTS "Restaurant members manage menu items - delete" ON public.menu_items;
CREATE POLICY "Restaurant members manage menu items - delete" ON public.menu_items
  FOR DELETE TO authenticated
  USING (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

-- ===== expenses =====
DROP POLICY IF EXISTS "Restaurant members create expenses" ON public.expenses;
CREATE POLICY "Restaurant members create expenses" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

DROP POLICY IF EXISTS "Restaurant members update expenses" ON public.expenses;
CREATE POLICY "Restaurant members update expenses" ON public.expenses
  FOR UPDATE TO authenticated
  USING (restaurant_id = current_user_restaurant_id())
  WITH CHECK (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );

DROP POLICY IF EXISTS "Restaurant members delete expenses" ON public.expenses;
CREATE POLICY "Restaurant members delete expenses" ON public.expenses
  FOR DELETE TO authenticated
  USING (
    restaurant_id = current_user_restaurant_id()
    AND public.restaurant_has_write_access(restaurant_id)
  );
