-- ============== ENUMS ==============
CREATE TYPE public.app_role AS ENUM ('manager', 'waiter', 'kitchen', 'cashier');
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'paid', 'cancelled');

-- ============== TABLES ==============

-- Restaurants
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  currency TEXT NOT NULL DEFAULT 'FCFA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate table — security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, restaurant_id, role)
);

-- Menu categories
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Menu items
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_number SERIAL NOT NULL,
  table_number TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name_snapshot TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock items
CREATE TABLE public.stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unité',
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  alert_threshold NUMERIC(12,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============== INDEXES ==============
CREATE INDEX idx_profiles_restaurant ON public.profiles(restaurant_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_restaurant ON public.user_roles(restaurant_id);
CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX idx_menu_categories_restaurant ON public.menu_categories(restaurant_id);
CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_stock_items_restaurant ON public.stock_items(restaurant_id);

-- ============== SECURITY DEFINER FUNCTIONS ==============

-- Get the restaurant_id the current user belongs to
CREATE OR REPLACE FUNCTION public.current_user_restaurant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Check if current user is the owner of given restaurant
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(_restaurant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants
    WHERE id = _restaurant_id AND owner_id = auth.uid()
  )
$$;

-- Check role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _restaurant_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND restaurant_id = _restaurant_id AND role = _role
  )
$$;

-- ============== TRIGGER: auto-create profile + restaurant on signup ==============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_restaurant_id UUID;
  v_first_name TEXT;
  v_last_name TEXT;
  v_restaurant_name TEXT;
BEGIN
  v_first_name := NEW.raw_user_meta_data ->> 'first_name';
  v_last_name := NEW.raw_user_meta_data ->> 'last_name';
  v_restaurant_name := NEW.raw_user_meta_data ->> 'restaurant_name';

  -- Only create restaurant for owners (signups). Employees are inserted manually by manager.
  IF v_restaurant_name IS NOT NULL THEN
    INSERT INTO public.restaurants (owner_id, name)
    VALUES (NEW.id, v_restaurant_name)
    RETURNING id INTO new_restaurant_id;

    INSERT INTO public.profiles (id, first_name, last_name, restaurant_id, is_owner)
    VALUES (NEW.id, v_first_name, v_last_name, new_restaurant_id, true);

    INSERT INTO public.user_roles (user_id, restaurant_id, role)
    VALUES (NEW.id, new_restaurant_id, 'manager');
  ELSE
    -- Employee profile w/o restaurant; manager assigns later
    INSERT INTO public.profiles (id, first_name, last_name, is_owner)
    VALUES (NEW.id, v_first_name, v_last_name, false);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============== TRIGGER: updated_at ==============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_restaurants_updated BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_menu_items_updated BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_stock_items_updated BEFORE UPDATE ON public.stock_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============== ENABLE RLS ==============
ALTER TABLE public.restaurants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_items      ENABLE ROW LEVEL SECURITY;

-- ============== RLS POLICIES ==============

-- restaurants
CREATE POLICY "View own restaurant" ON public.restaurants FOR SELECT
  USING (id = public.current_user_restaurant_id() OR owner_id = auth.uid());
CREATE POLICY "Owner can update restaurant" ON public.restaurants FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "Owner can delete restaurant" ON public.restaurants FOR DELETE
  USING (owner_id = auth.uid());
-- INSERT happens via trigger only (security definer); no policy needed for users.

-- profiles
CREATE POLICY "View own profile or same restaurant" ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR restaurant_id = public.current_user_restaurant_id()
  );
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE
  USING (id = auth.uid());
CREATE POLICY "Owner can update employees in their restaurant" ON public.profiles FOR UPDATE
  USING (
    restaurant_id IS NOT NULL
    AND public.is_restaurant_owner(restaurant_id)
  );

-- user_roles
CREATE POLICY "View roles in own restaurant" ON public.user_roles FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id() OR user_id = auth.uid());
CREATE POLICY "Owner manages roles - insert" ON public.user_roles FOR INSERT
  WITH CHECK (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner manages roles - update" ON public.user_roles FOR UPDATE
  USING (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner manages roles - delete" ON public.user_roles FOR DELETE
  USING (public.is_restaurant_owner(restaurant_id));

-- menu_categories
CREATE POLICY "Restaurant members view categories" ON public.menu_categories FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members manage categories - insert" ON public.menu_categories FOR INSERT
  WITH CHECK (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members manage categories - update" ON public.menu_categories FOR UPDATE
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members manage categories - delete" ON public.menu_categories FOR DELETE
  USING (restaurant_id = public.current_user_restaurant_id());

-- menu_items
CREATE POLICY "Restaurant members view menu items" ON public.menu_items FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members manage menu items - insert" ON public.menu_items FOR INSERT
  WITH CHECK (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members manage menu items - update" ON public.menu_items FOR UPDATE
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members manage menu items - delete" ON public.menu_items FOR DELETE
  USING (restaurant_id = public.current_user_restaurant_id());

-- orders
CREATE POLICY "Restaurant members view orders" ON public.orders FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members create orders" ON public.orders FOR INSERT
  WITH CHECK (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members update orders" ON public.orders FOR UPDATE
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members delete orders" ON public.orders FOR DELETE
  USING (restaurant_id = public.current_user_restaurant_id());

-- order_items
CREATE POLICY "Restaurant members view order items" ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.restaurant_id = public.current_user_restaurant_id()
  ));
CREATE POLICY "Restaurant members create order items" ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.restaurant_id = public.current_user_restaurant_id()
  ));
CREATE POLICY "Restaurant members update order items" ON public.order_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.restaurant_id = public.current_user_restaurant_id()
  ));
CREATE POLICY "Restaurant members delete order items" ON public.order_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.restaurant_id = public.current_user_restaurant_id()
  ));

-- stock_items
CREATE POLICY "Restaurant members view stock" ON public.stock_items FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members manage stock - insert" ON public.stock_items FOR INSERT
  WITH CHECK (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members manage stock - update" ON public.stock_items FOR UPDATE
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members manage stock - delete" ON public.stock_items FOR DELETE
  USING (restaurant_id = public.current_user_restaurant_id());