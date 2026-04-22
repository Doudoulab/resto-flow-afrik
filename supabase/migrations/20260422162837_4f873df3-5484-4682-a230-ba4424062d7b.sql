-- Helper: get the active product_id of a restaurant's owner
CREATE OR REPLACE FUNCTION public.restaurant_owner_product(_restaurant_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.product_id
  FROM public.restaurants r
  JOIN public.subscriptions s
    ON s.user_id = r.owner_id
   AND s.environment = 'live'
   AND s.status IN ('active','trialing')
   AND (s.current_period_end IS NULL OR s.current_period_end > now())
  WHERE r.id = _restaurant_id
  ORDER BY s.updated_at DESC
  LIMIT 1
$$;

-- Trigger: limit menu items to 50 for Starter plan
CREATE OR REPLACE FUNCTION public.enforce_starter_menu_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product text;
  v_count integer;
BEGIN
  v_product := public.restaurant_owner_product(NEW.restaurant_id);
  IF v_product = 'starter_plan' THEN
    SELECT COUNT(*) INTO v_count FROM public.menu_items WHERE restaurant_id = NEW.restaurant_id;
    IF v_count >= 50 THEN
      RAISE EXCEPTION 'starter_menu_quota_exceeded: le plan Starter est limité à 50 articles. Passez au plan Pro pour un menu illimité.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_starter_menu_quota ON public.menu_items;
CREATE TRIGGER trg_enforce_starter_menu_quota
  BEFORE INSERT ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_starter_menu_quota();

-- Trigger: limit employees (invitations + accepted profiles) to 3 for Starter
CREATE OR REPLACE FUNCTION public.enforce_starter_staff_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product text;
  v_active integer;
  v_pending integer;
  v_total integer;
BEGIN
  v_product := public.restaurant_owner_product(NEW.restaurant_id);
  IF v_product = 'starter_plan' THEN
    SELECT COUNT(*) INTO v_active
      FROM public.profiles
     WHERE restaurant_id = NEW.restaurant_id AND is_owner = false;
    SELECT COUNT(*) INTO v_pending
      FROM public.employee_invitations
     WHERE restaurant_id = NEW.restaurant_id AND accepted_at IS NULL AND expires_at > now();
    v_total := v_active + v_pending;
    IF v_total >= 3 THEN
      RAISE EXCEPTION 'starter_staff_quota_exceeded: le plan Starter est limité à 3 employés. Passez au plan Pro pour un staff illimité.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_starter_staff_quota ON public.employee_invitations;
CREATE TRIGGER trg_enforce_starter_staff_quota
  BEFORE INSERT ON public.employee_invitations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_starter_staff_quota();