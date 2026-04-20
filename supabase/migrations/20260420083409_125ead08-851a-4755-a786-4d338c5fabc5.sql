-- 1. Time entries (pointage employés)
CREATE TABLE public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_restaurant ON public.time_entries(restaurant_id, clock_in DESC);
CREATE INDEX idx_time_entries_user ON public.time_entries(user_id, clock_in DESC);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Employees see/manage their own entries; owners see all in their restaurant
CREATE POLICY "Users view own time entries or owner views all"
ON public.time_entries FOR SELECT
USING (
  user_id = auth.uid()
  OR (restaurant_id = current_user_restaurant_id() AND is_restaurant_owner(restaurant_id))
);

CREATE POLICY "Users clock in/out themselves"
ON public.time_entries FOR INSERT
WITH CHECK (user_id = auth.uid() AND restaurant_id = current_user_restaurant_id());

CREATE POLICY "Users update own open entry, owner updates any"
ON public.time_entries FOR UPDATE
USING (
  user_id = auth.uid()
  OR (restaurant_id = current_user_restaurant_id() AND is_restaurant_owner(restaurant_id))
);

CREATE POLICY "Owner deletes time entries"
ON public.time_entries FOR DELETE
USING (restaurant_id = current_user_restaurant_id() AND is_restaurant_owner(restaurant_id));

CREATE TRIGGER set_time_entries_updated_at
BEFORE UPDATE ON public.time_entries
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Restaurant tables (plan de salle)
CREATE TYPE public.table_status AS ENUM ('available', 'occupied', 'needs_cleaning', 'reserved');

CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  seats INTEGER NOT NULL DEFAULT 4,
  status public.table_status NOT NULL DEFAULT 'available',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, label)
);

CREATE INDEX idx_tables_restaurant ON public.restaurant_tables(restaurant_id, sort_order);

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view tables"
ON public.restaurant_tables FOR SELECT
USING (restaurant_id = current_user_restaurant_id());

CREATE POLICY "Members update table status"
ON public.restaurant_tables FOR UPDATE
USING (restaurant_id = current_user_restaurant_id());

CREATE POLICY "Owner manages tables - insert"
ON public.restaurant_tables FOR INSERT
WITH CHECK (restaurant_id = current_user_restaurant_id() AND is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner manages tables - delete"
ON public.restaurant_tables FOR DELETE
USING (restaurant_id = current_user_restaurant_id() AND is_restaurant_owner(restaurant_id));

CREATE TRIGGER set_tables_updated_at
BEFORE UPDATE ON public.restaurant_tables
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();