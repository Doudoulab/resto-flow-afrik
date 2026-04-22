
CREATE TABLE public.subscription_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'chariow',
  event_type TEXT NOT NULL,
  external_id TEXT,
  plan_key TEXT,
  cycle TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status TEXT NOT NULL DEFAULT 'paid',
  invoice_url TEXT,
  raw_payload JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_invoices_user ON public.subscription_invoices(user_id, occurred_at DESC);
CREATE UNIQUE INDEX idx_subscription_invoices_external ON public.subscription_invoices(provider, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription invoices"
  ON public.subscription_invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Platform admins can view all subscription invoices"
  ON public.subscription_invoices FOR SELECT
  USING (public.is_platform_admin());
