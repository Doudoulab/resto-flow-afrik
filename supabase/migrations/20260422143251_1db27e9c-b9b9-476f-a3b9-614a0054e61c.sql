
-- Enforce restaurant quota per subscription tier
CREATE OR REPLACE FUNCTION public.enforce_restaurant_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_product text;
  v_status text;
  v_period_end timestamptz;
  v_max integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.restaurants
  WHERE owner_id = NEW.owner_id;

  -- 0 restaurants = always allow first creation (will get a trial via the other trigger)
  IF v_count = 0 THEN
    RETURN NEW;
  END IF;

  SELECT product_id, status, current_period_end
    INTO v_product, v_status, v_period_end
  FROM public.subscriptions
  WHERE user_id = NEW.owner_id
    AND environment = 'live'
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Determine max allowed
  IF v_status IN ('active', 'trialing')
     AND (v_period_end IS NULL OR v_period_end > now()) THEN
    IF v_product = 'business_plan' THEN
      v_max := 9999;
    ELSIF v_product = 'pro_plan' THEN
      v_max := 1;
    ELSE
      v_max := 1;
    END IF;
  ELSE
    v_max := 1; -- free / expired: keep existing but no new
  END IF;

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'restaurant_quota_exceeded: max % restaurants for current plan (%). Upgrade to Business for unlimited.', v_max, COALESCE(v_product, 'free');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_restaurant_quota ON public.restaurants;
CREATE TRIGGER trg_enforce_restaurant_quota
  BEFORE INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_restaurant_quota();
