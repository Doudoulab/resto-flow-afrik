-- Customers (ardoises) and credit transactions

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  notes text,
  credit_limit numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view customers" ON public.customers FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert customers" ON public.customers FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update customers" ON public.customers FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete customers" ON public.customers FOR DELETE USING (restaurant_id = current_user_restaurant_id());

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON public.customers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

-- Credit transactions: charges (ardoise) and payments (remboursements)
CREATE TYPE public.credit_tx_type AS ENUM ('charge', 'payment');

CREATE TABLE IF NOT EXISTS public.customer_credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  type public.credit_tx_type NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view credit tx" ON public.customer_credit_transactions FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert credit tx" ON public.customer_credit_transactions FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete credit tx" ON public.customer_credit_transactions FOR DELETE USING (restaurant_id = current_user_restaurant_id());

CREATE INDEX IF NOT EXISTS idx_credit_tx_customer ON public.customer_credit_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_tx_restaurant ON public.customer_credit_transactions(restaurant_id);

-- Trigger: keep customers.balance in sync
CREATE OR REPLACE FUNCTION public.update_customer_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  delta numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    delta := CASE WHEN NEW.type = 'charge' THEN NEW.amount ELSE -NEW.amount END;
    UPDATE public.customers SET balance = balance + delta, updated_at = now() WHERE id = NEW.customer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    delta := CASE WHEN OLD.type = 'charge' THEN -OLD.amount ELSE OLD.amount END;
    UPDATE public.customers SET balance = balance + delta, updated_at = now() WHERE id = OLD.customer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_credit_tx_balance
  AFTER INSERT OR DELETE ON public.customer_credit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_customer_balance();

-- Allow linking an order to a customer + credit payment status
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;