CREATE OR REPLACE FUNCTION public.grant_trial_on_restaurant_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = NEW.owner_id
      AND environment = 'live'
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) THEN
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
    ON CONFLICT (paddle_subscription_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_grant_subscription(_user_id uuid, _product_id text, _price_id text, _days integer DEFAULT 30)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_subscription_id text := 'admin_grant_' || _user_id::text;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.subscriptions (
    user_id, paddle_subscription_id, paddle_customer_id,
    product_id, price_id, status,
    current_period_start, current_period_end, environment, provider
  ) VALUES (
    _user_id, v_subscription_id, 'admin_grant',
    _product_id, _price_id, 'active',
    now(), now() + (_days || ' days')::interval, 'live', 'admin_grant'
  )
  ON CONFLICT (paddle_subscription_id) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    price_id = EXCLUDED.price_id,
    status = 'active',
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    environment = EXCLUDED.environment,
    provider = EXCLUDED.provider,
    updated_at = now();
END;
$function$;