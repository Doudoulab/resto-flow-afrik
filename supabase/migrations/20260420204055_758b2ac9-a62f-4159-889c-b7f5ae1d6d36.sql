-- Provider enum
CREATE TYPE public.payment_provider AS ENUM ('paydunya', 'cinetpay', 'direct_link');
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed', 'cancelled');

-- Per-restaurant payment configuration
CREATE TABLE public.payment_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  provider public.payment_provider NOT NULL DEFAULT 'direct_link',
  test_mode BOOLEAN NOT NULL DEFAULT true,
  -- PayDunya
  paydunya_master_key TEXT,
  paydunya_public_key TEXT,
  paydunya_private_key TEXT,
  paydunya_token TEXT,
  -- CinetPay
  cinetpay_apikey TEXT,
  cinetpay_site_id TEXT,
  cinetpay_secret_key TEXT,
  -- Direct numbers
  wave_number TEXT,
  orange_money_number TEXT,
  mtn_momo_number TEXT,
  moov_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views payment config" ON public.payment_configs
  FOR SELECT USING (is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner inserts payment config" ON public.payment_configs
  FOR INSERT WITH CHECK (is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner updates payment config" ON public.payment_configs
  FOR UPDATE USING (is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner deletes payment config" ON public.payment_configs
  FOR DELETE USING (is_restaurant_owner(restaurant_id));

CREATE TRIGGER set_payment_configs_updated_at
  BEFORE UPDATE ON public.payment_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Payment transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  provider public.payment_provider NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  status public.payment_status NOT NULL DEFAULT 'pending',
  external_ref TEXT,
  checkout_url TEXT,
  customer_phone TEXT,
  customer_name TEXT,
  raw_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view payments" ON public.payments
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert payments" ON public.payments
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update payments" ON public.payments
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());

CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_restaurant_status ON public.payments(restaurant_id, status);
CREATE INDEX idx_payments_external_ref ON public.payments(external_ref);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;