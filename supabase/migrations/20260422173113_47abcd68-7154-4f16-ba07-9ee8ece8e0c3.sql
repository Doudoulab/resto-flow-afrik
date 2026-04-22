
-- 1) Triggers comptabilité + fidélité sur orders
DROP TRIGGER IF EXISTS trg_post_sale_accounting ON public.orders;
CREATE TRIGGER trg_post_sale_accounting
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.post_sale_accounting_entries();

DROP TRIGGER IF EXISTS trg_award_loyalty ON public.orders;
CREATE TRIGGER trg_award_loyalty
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_loyalty_on_paid();

DROP TRIGGER IF EXISTS trg_record_customer_visit ON public.orders;
CREATE TRIGGER trg_record_customer_visit
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.record_customer_visit();

DROP TRIGGER IF EXISTS trg_sync_table_status_ins ON public.orders;
CREATE TRIGGER trg_sync_table_status_ins
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_table_status_from_order();

DROP TRIGGER IF EXISTS trg_sync_table_status_upd ON public.orders;
CREATE TRIGGER trg_sync_table_status_upd
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_table_status_from_order();

-- 2) Table stock_movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in','out','adjust','auto_sale')),
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC,
  reason TEXT,
  reference TEXT,
  source_type TEXT,
  source_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_restaurant ON public.stock_movements(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON public.stock_movements(stock_item_id, created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stock_movements_select" ON public.stock_movements;
CREATE POLICY "stock_movements_select" ON public.stock_movements
  FOR SELECT USING (restaurant_id = public.current_user_restaurant_id());

DROP POLICY IF EXISTS "stock_movements_insert" ON public.stock_movements;
CREATE POLICY "stock_movements_insert" ON public.stock_movements
  FOR INSERT WITH CHECK (restaurant_id = public.current_user_restaurant_id());

DROP POLICY IF EXISTS "stock_movements_delete" ON public.stock_movements;
CREATE POLICY "stock_movements_delete" ON public.stock_movements
  FOR DELETE USING (restaurant_id = public.current_user_restaurant_id());

-- 3) Fonction + trigger : log des mouvements auto à l'encaissement
CREATE OR REPLACE FUNCTION public.log_stock_movement_on_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _mode text;
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    SELECT stock_decrement_mode INTO _mode FROM public.restaurants WHERE id = NEW.restaurant_id;
    IF COALESCE(_mode, 'paid') = 'paid' THEN
      INSERT INTO public.stock_movements
        (restaurant_id, stock_item_id, movement_type, quantity, reason, reference, source_type, source_id)
      SELECT
        NEW.restaurant_id,
        r.stock_item_id,
        'auto_sale',
        -(r.quantity * oi.quantity),
        'Déduction auto vente',
        COALESCE(NEW.invoice_number, 'CMD-' || NEW.order_number),
        'order',
        NEW.id
      FROM public.order_items oi
      JOIN public.menu_item_recipes r ON r.menu_item_id = oi.menu_item_id
      WHERE oi.order_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock_paid ON public.orders;
CREATE TRIGGER trg_decrement_stock_paid
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_paid_order();

DROP TRIGGER IF EXISTS trg_log_stock_movement_paid ON public.orders;
CREATE TRIGGER trg_log_stock_movement_paid
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.log_stock_movement_on_paid();

-- 4) Triggers existants pour invoices, expenses, payroll, customers
DROP TRIGGER IF EXISTS trg_invoice_entries ON public.invoices;
CREATE TRIGGER trg_invoice_entries
  AFTER INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_entries();

DROP TRIGGER IF EXISTS trg_invoice_hash ON public.invoices;
CREATE TRIGGER trg_invoice_hash
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_invoice_hash();

DROP TRIGGER IF EXISTS trg_expense_entries ON public.expenses;
CREATE TRIGGER trg_expense_entries
  AFTER INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_expense_entries();

DROP TRIGGER IF EXISTS trg_payroll_validate ON public.payroll_periods;
CREATE TRIGGER trg_payroll_validate
  BEFORE UPDATE OF status ON public.payroll_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_payroll_entries();

DROP TRIGGER IF EXISTS trg_customer_balance ON public.customer_credit_transactions;
CREATE TRIGGER trg_customer_balance
  AFTER INSERT OR DELETE ON public.customer_credit_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_balance();

-- 5) Trigger fired_at sur order_items pour déduction stock mode "fired"
DROP TRIGGER IF EXISTS trg_decrement_stock_fired ON public.order_items;
CREATE TRIGGER trg_decrement_stock_fired
  AFTER UPDATE OF fired_at ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_fired();

-- 6) Triggers updated_at standards
DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 7) Anti double-encaissement : index unique sur invoice_id (NULL autorisés multiples)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_invoice_id_unique
  ON public.orders(invoice_id)
  WHERE invoice_id IS NOT NULL;

-- 8) handle_new_user trigger sur auth.users (au cas où)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_consume_invite ON auth.users;
CREATE TRIGGER on_auth_user_consume_invite
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.consume_platform_invite();

-- 9) Trigger seed comptabilité + slug à la création d'un restaurant
DROP TRIGGER IF EXISTS trg_restaurant_created ON public.restaurants;
CREATE TRIGGER trg_restaurant_created
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.on_restaurant_created();

DROP TRIGGER IF EXISTS trg_restaurant_slug ON public.restaurants;
CREATE TRIGGER trg_restaurant_slug
  BEFORE INSERT OR UPDATE ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_restaurant_slug();

DROP TRIGGER IF EXISTS trg_restaurant_quota ON public.restaurants;
CREATE TRIGGER trg_restaurant_quota
  BEFORE INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_restaurant_quota();

DROP TRIGGER IF EXISTS trg_restaurant_trial ON public.restaurants;
CREATE TRIGGER trg_restaurant_trial
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_trial_on_restaurant_created();

-- 10) Quotas plan starter
DROP TRIGGER IF EXISTS trg_starter_menu_quota ON public.menu_items;
CREATE TRIGGER trg_starter_menu_quota
  BEFORE INSERT ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_starter_menu_quota();

DROP TRIGGER IF EXISTS trg_starter_staff_quota ON public.employee_invitations;
CREATE TRIGGER trg_starter_staff_quota
  BEFORE INSERT ON public.employee_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_starter_staff_quota();
