
-- ============ RESTAURANTS : champs fiscaux ============
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS tax_id text,
  ADD COLUMN IF NOT EXISTS business_register text,
  ADD COLUMN IF NOT EXISTS default_vat_rate numeric NOT NULL DEFAULT 18,
  ADD COLUMN IF NOT EXISTS vat_mode text NOT NULL DEFAULT 'exclusive',
  ADD COLUMN IF NOT EXISTS invoice_prefix text NOT NULL DEFAULT 'FAC',
  ADD COLUMN IF NOT EXISTS next_invoice_number bigint NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS invoice_footer text,
  ADD COLUMN IF NOT EXISTS default_service_pct numeric NOT NULL DEFAULT 0;

-- ============ MENU_ITEMS : TVA par plat ============
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS vat_rate numeric;

-- ============ ORDERS : totaux détaillés + cycle paiement ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS tax_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tip_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_id uuid,
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- ============ ORDER_ITEMS : TVA + remises + annulations ligne ============
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS vat_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_reason text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- ============ INVOICES ============
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  order_id uuid,
  invoice_number text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid,
  customer_name text,
  customer_tax_id text,
  customer_address text,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  service_amount numeric NOT NULL DEFAULT 0,
  tip_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'FCFA',
  payment_method text,
  restaurant_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  items_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  legal_footer text,
  pdf_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, invoice_number)
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view invoices" ON public.invoices
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert invoices" ON public.invoices
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update invoices" ON public.invoices
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
-- Pas de DELETE : factures légalement immuables

CREATE TRIGGER set_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_invoices_restaurant ON public.invoices(restaurant_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);

-- ============ ORDER_PAYMENTS (split bill) ============
CREATE TABLE IF NOT EXISTS public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  order_id uuid NOT NULL,
  amount numeric NOT NULL,
  method text NOT NULL,
  payer_name text,
  reference text,
  invoice_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view order payments" ON public.order_payments
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert order payments" ON public.order_payments
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update order payments" ON public.order_payments
  FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete order payments" ON public.order_payments
  FOR DELETE USING (restaurant_id = current_user_restaurant_id());

CREATE INDEX IF NOT EXISTS idx_order_payments_order ON public.order_payments(order_id);

-- ============ AUDIT LOG ============
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views audit log" ON public.audit_log
  FOR SELECT USING (is_restaurant_owner(restaurant_id));
CREATE POLICY "Members insert audit log" ON public.audit_log
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
-- Pas d'UPDATE ni DELETE : log immuable

CREATE INDEX IF NOT EXISTS idx_audit_log_restaurant ON public.audit_log(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);

-- ============ FONCTION : numéro facture séquentiel atomique ============
CREATE OR REPLACE FUNCTION public.next_invoice_number(_restaurant_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prefix text;
  _num bigint;
  _year text;
BEGIN
  -- Vérifier appartenance
  IF _restaurant_id <> current_user_restaurant_id() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.restaurants
  SET next_invoice_number = next_invoice_number + 1
  WHERE id = _restaurant_id
  RETURNING invoice_prefix, next_invoice_number - 1 INTO _prefix, _num;

  _year := to_char(now(), 'YYYY');
  RETURN _prefix || '-' || _year || '-' || lpad(_num::text, 6, '0');
END;
$$;
