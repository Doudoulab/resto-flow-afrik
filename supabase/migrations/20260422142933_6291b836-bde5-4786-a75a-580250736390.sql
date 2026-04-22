
-- Auto-grant a 7-day Pro trial when a new restaurant is created
CREATE OR REPLACE FUNCTION public.grant_trial_on_restaurant_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only insert a trial if the owner has no existing subscription in the live env
  INSERT INTO public.subscriptions (
    user_id, paddle_subscription_id, paddle_customer_id,
    product_id, price_id, status,
    current_period_start, current_period_end, environment, provider
  ) VALUES (
    NEW.owner_id,
    'trial_' || NEW.id::text,
    'trial',
    'pro_plan',
    'trial_pro',
    'trialing',
    now(),
    now() + interval '7 days',
    'live',
    'trial'
  )
  ON CONFLICT (user_id, environment) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_trial_on_restaurant_created ON public.restaurants;
CREATE TRIGGER trg_grant_trial_on_restaurant_created
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_trial_on_restaurant_created();

-- Backfill: grant trial to existing restaurant owners that don't have any subscription yet
INSERT INTO public.subscriptions (
  user_id, paddle_subscription_id, paddle_customer_id,
  product_id, price_id, status,
  current_period_start, current_period_end, environment, provider
)
SELECT
  r.owner_id,
  'trial_' || r.id::text,
  'trial',
  'pro_plan',
  'trial_pro',
  'trialing',
  now(),
  now() + interval '7 days',
  'live',
  'trial'
FROM public.restaurants r
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s
  WHERE s.user_id = r.owner_id AND s.environment = 'live'
)
ON CONFLICT (user_id, environment) DO NOTHING;
