CREATE OR REPLACE FUNCTION public.get_platform_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN public.is_platform_admin() THEN
    jsonb_build_object(
      'total_restaurants', (SELECT COUNT(*) FROM public.restaurants),
      'active_restaurants', (SELECT COUNT(*) FROM public.restaurants WHERE suspended_at IS NULL),
      'suspended_restaurants', (SELECT COUNT(*) FROM public.restaurants WHERE suspended_at IS NOT NULL),
      'total_users', (SELECT COUNT(*) FROM auth.users),
      'active_subscriptions', (SELECT COUNT(*) FROM public.subscriptions WHERE status IN ('active','trialing')),
      'canceled_subscriptions', (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'canceled'),
      'orders_last_30d', (SELECT COUNT(*) FROM public.orders WHERE created_at > now() - interval '30 days'),
      'revenue_last_30d', (SELECT COALESCE(SUM(total),0) FROM public.invoices WHERE issued_at > now() - interval '30 days'),
      'mrr_estimate', (
        SELECT COALESCE(SUM(
          CASE
            WHEN cp.cycle = 'monthly'  THEN cp.amount
            WHEN cp.cycle = 'yearly'   THEN cp.amount / 12.0
            WHEN cp.cycle = 'lifetime' THEN cp.amount / 24.0  -- amortized over 24 months
            ELSE 0
          END
        ), 0)
        FROM public.subscriptions s
        JOIN public.chariow_products cp
          ON cp.plan_key = s.product_id
         AND cp.is_active = true
         AND (
           (s.price_id ILIKE '%monthly%'  AND cp.cycle = 'monthly') OR
           (s.price_id ILIKE '%yearly%'   AND cp.cycle = 'yearly')  OR
           (s.price_id ILIKE '%lifetime%' AND cp.cycle = 'lifetime')
         )
        WHERE s.status IN ('active','trialing')
          AND s.environment = 'live'
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
      ),
      'mrr_currency', 'XOF'
    )
  ELSE jsonb_build_object('error', 'forbidden') END
$function$;