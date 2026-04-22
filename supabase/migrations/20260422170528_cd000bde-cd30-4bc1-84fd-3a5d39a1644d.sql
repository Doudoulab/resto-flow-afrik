CREATE TABLE IF NOT EXISTS public.employee_leaves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  leave_type text NOT NULL DEFAULT 'paid',
  start_date date NOT NULL,
  end_date date NOT NULL,
  days_count numeric NOT NULL DEFAULT 0,
  reason text,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (leave_type IN ('paid','sick','unpaid','other')),
  CHECK (status IN ('pending','approved','rejected'))
);

CREATE INDEX IF NOT EXISTS idx_emp_leaves_restaurant ON public.employee_leaves(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_emp_leaves_user ON public.employee_leaves(user_id);

ALTER TABLE public.employee_leaves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages leaves"
  ON public.employee_leaves
  FOR ALL
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Employee views own leaves"
  ON public.employee_leaves
  FOR SELECT
  USING (user_id = auth.uid());

CREATE TRIGGER trg_employee_leaves_updated_at
  BEFORE UPDATE ON public.employee_leaves
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();