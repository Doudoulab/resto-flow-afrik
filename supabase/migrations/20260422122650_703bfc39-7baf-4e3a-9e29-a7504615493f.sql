-- 1. Table des super-admins de la plateforme
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 2. Helper SECURITY DEFINER (évite la récursion RLS)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
$$;

-- 3. Policies platform_admins (seuls les super-admins gèrent la liste)
CREATE POLICY "Super admins view admins"
  ON public.platform_admins FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Super admins insert admins"
  ON public.platform_admins FOR INSERT
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "Super admins delete admins"
  ON public.platform_admins FOR DELETE
  USING (public.is_platform_admin());

-- 4. Colonne suspended_at sur restaurants
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text;

-- 5. Étendre les RLS pour donner accès lecture globale aux super-admins
CREATE POLICY "Platform admins view all restaurants"
  ON public.restaurants FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins update restaurants"
  ON public.restaurants FOR UPDATE
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins delete restaurants"
  ON public.restaurants FOR DELETE
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins view all subscriptions"
  ON public.subscriptions FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins view all payments"
  ON public.payments FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins view all error logs"
  ON public.error_logs FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins view all audit logs"
  ON public.audit_log FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins view all orders"
  ON public.orders FOR SELECT
  USING (public.is_platform_admin());

CREATE POLICY "Platform admins view all invoices"
  ON public.invoices FOR SELECT
  USING (public.is_platform_admin());

-- 6. Vue agrégée pour les stats globales
CREATE OR REPLACE VIEW public.platform_stats AS
SELECT
  (SELECT COUNT(*) FROM public.restaurants) AS total_restaurants,
  (SELECT COUNT(*) FROM public.restaurants WHERE suspended_at IS NULL) AS active_restaurants,
  (SELECT COUNT(*) FROM public.restaurants WHERE suspended_at IS NOT NULL) AS suspended_restaurants,
  (SELECT COUNT(*) FROM auth.users) AS total_users,
  (SELECT COUNT(*) FROM public.subscriptions WHERE status IN ('active','trialing')) AS active_subscriptions,
  (SELECT COUNT(*) FROM public.subscriptions WHERE status = 'canceled') AS canceled_subscriptions,
  (SELECT COUNT(*) FROM public.orders WHERE created_at > now() - interval '30 days') AS orders_last_30d,
  (SELECT COALESCE(SUM(total),0) FROM public.invoices WHERE issued_at > now() - interval '30 days') AS revenue_last_30d;

-- Restreindre la vue : SELECT seulement aux super-admins via fonction
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      'mrr_estimate', (SELECT COALESCE(SUM(CASE
        WHEN price_id LIKE '%monthly%' THEN 29
        WHEN price_id LIKE '%yearly%' THEN 23.17
        ELSE 0 END), 0) FROM public.subscriptions WHERE status IN ('active','trialing'))
    )
  ELSE jsonb_build_object('error', 'forbidden') END
$$;

-- 7. Fonction admin pour suspendre un resto
CREATE OR REPLACE FUNCTION public.admin_suspend_restaurant(_restaurant_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.restaurants
  SET suspended_at = now(), suspended_reason = _reason
  WHERE id = _restaurant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_unsuspend_restaurant(_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.restaurants
  SET suspended_at = NULL, suspended_reason = NULL
  WHERE id = _restaurant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_restaurant(_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.restaurants WHERE id = _restaurant_id;
END;
$$;

-- 8. Override d'abonnement (offrir un plan gratuit)
CREATE OR REPLACE FUNCTION public.admin_grant_subscription(
  _user_id uuid,
  _product_id text,
  _price_id text,
  _days integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.subscriptions (
    user_id, paddle_subscription_id, paddle_customer_id,
    product_id, price_id, status,
    current_period_start, current_period_end, environment
  ) VALUES (
    _user_id, 'admin_grant_' || gen_random_uuid()::text, 'admin_grant',
    _product_id, _price_id, 'active',
    now(), now() + (_days || ' days')::interval, 'live'
  )
  ON CONFLICT (user_id, environment) DO UPDATE SET
    product_id = EXCLUDED.product_id,
    price_id = EXCLUDED.price_id,
    status = 'active',
    current_period_end = EXCLUDED.current_period_end,
    updated_at = now();
END;
$$;