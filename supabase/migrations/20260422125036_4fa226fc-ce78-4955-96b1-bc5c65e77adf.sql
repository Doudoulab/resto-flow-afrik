
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'paddle';

CREATE TABLE IF NOT EXISTS public.chariow_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key text NOT NULL,
  cycle text NOT NULL,
  chariow_product_id text NOT NULL,
  chariow_price_id text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_key, cycle)
);

ALTER TABLE public.chariow_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform admins manage chariow_products"
  ON public.chariow_products FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "anyone authenticated can read active chariow_products"
  ON public.chariow_products FOR SELECT
  TO authenticated
  USING (is_active = true);
