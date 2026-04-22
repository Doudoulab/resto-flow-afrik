
-- ============================================================
-- 1) LOYALTY POINTS — table + trigger d'attribution automatique
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  points integer NOT NULL,                 -- positif = ajout, négatif = consommation
  reason text NOT NULL DEFAULT 'order',    -- 'order' | 'manual' | 'redeem' | 'expire'
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_tx_customer ON public.loyalty_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_restaurant ON public.loyalty_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_order ON public.loyalty_transactions(order_id);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view loyalty tx" ON public.loyalty_transactions;
CREATE POLICY "Members view loyalty tx" ON public.loyalty_transactions
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());

DROP POLICY IF EXISTS "Members insert loyalty tx" ON public.loyalty_transactions;
CREATE POLICY "Members insert loyalty tx" ON public.loyalty_transactions
  FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());

DROP POLICY IF EXISTS "Owner deletes loyalty tx" ON public.loyalty_transactions;
CREATE POLICY "Owner deletes loyalty tx" ON public.loyalty_transactions
  FOR DELETE USING (is_restaurant_owner(restaurant_id));

-- Colonne points actuels sur customers (cumul rapide)
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

-- Setting par restaurant : ratio (ex: 10 points pour 100 FCFA)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS loyalty_points_per_100 integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT true;

-- Trigger : à l'encaissement (payment_status -> 'paid' avec customer_id), créer la transaction et incrémenter
CREATE OR REPLACE FUNCTION public.award_loyalty_on_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _ratio integer;
  _enabled boolean;
  _points integer;
  _existing integer;
BEGIN
  -- Déclencher seulement à la transition vers 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') AND NEW.customer_id IS NOT NULL THEN
    SELECT loyalty_points_per_100, loyalty_enabled INTO _ratio, _enabled
      FROM public.restaurants WHERE id = NEW.restaurant_id;
    IF NOT COALESCE(_enabled, true) THEN RETURN NEW; END IF;
    IF COALESCE(_ratio, 0) <= 0 THEN RETURN NEW; END IF;

    -- Empêcher les doublons si re-déclenchement
    SELECT COUNT(*) INTO _existing FROM public.loyalty_transactions
      WHERE order_id = NEW.id AND reason = 'order';
    IF _existing > 0 THEN RETURN NEW; END IF;

    _points := FLOOR(NEW.total / 100.0) * _ratio;
    IF _points <= 0 THEN RETURN NEW; END IF;

    INSERT INTO public.loyalty_transactions (restaurant_id, customer_id, order_id, points, reason, notes)
      VALUES (NEW.restaurant_id, NEW.customer_id, NEW.id, _points, 'order',
              'Auto: commande #' || NEW.order_number);

    UPDATE public.customers
      SET loyalty_points = loyalty_points + _points,
          lifetime_value = lifetime_value + NEW.total,
          total_visits = total_visits + 1,
          last_visit_at = now(),
          updated_at = now()
      WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_award_loyalty_on_paid ON public.orders;
CREATE TRIGGER trg_award_loyalty_on_paid
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_on_paid();

-- ============================================================
-- 2) ECRITURES COMPTABLES AUTOMATIQUES (SYSCOHADA) à l'encaissement
-- ============================================================
-- Comptes utilisés (créés on-demand si manquants) :
-- 521 Banque / 571 Caisse / 411 Clients / 701 Ventes de marchandises / 4431 TVA collectée
CREATE OR REPLACE FUNCTION public.ensure_accounting_account(
  _restaurant_id uuid, _code text, _label text, _class integer, _type text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.accounting_accounts (restaurant_id, code, label, class, type, is_system)
    VALUES (_restaurant_id, _code, _label, _class, _type, true)
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN unique_violation THEN
  NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_sale_accounting_entries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _existing integer;
  _ht numeric;
  _tva numeric;
  _ttc numeric;
  _cash_account text;
  _label text;
  _ref text;
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    -- Empêche les doublons
    SELECT COUNT(*) INTO _existing FROM public.accounting_entries
      WHERE source_type = 'order' AND source_id = NEW.id;
    IF _existing > 0 THEN RETURN NEW; END IF;

    _ttc := COALESCE(NEW.total, 0);
    IF _ttc <= 0 THEN RETURN NEW; END IF;

    _tva := COALESCE(NEW.tax_amount, 0);
    _ht  := _ttc - _tva;

    -- Compte de contrepartie selon le mode de paiement
    _cash_account := CASE
      WHEN NEW.payment_method ILIKE 'cash%' OR NEW.payment_method ILIKE 'espe%' THEN '571'
      WHEN NEW.payment_method ILIKE 'card%' OR NEW.payment_method ILIKE 'cb%'
        OR NEW.payment_method ILIKE 'mobile%' OR NEW.payment_method ILIKE 'wave%'
        OR NEW.payment_method ILIKE 'orange%' OR NEW.payment_method ILIKE 'mtn%' THEN '521'
      ELSE '411' -- crédit client
    END;

    -- S'assure que les comptes existent
    PERFORM public.ensure_accounting_account(NEW.restaurant_id, '521', 'Banque', 5, 'asset');
    PERFORM public.ensure_accounting_account(NEW.restaurant_id, '571', 'Caisse', 5, 'asset');
    PERFORM public.ensure_accounting_account(NEW.restaurant_id, '411', 'Clients', 4, 'asset');
    PERFORM public.ensure_accounting_account(NEW.restaurant_id, '701', 'Ventes de marchandises', 7, 'revenue');
    PERFORM public.ensure_accounting_account(NEW.restaurant_id, '4431', 'TVA collectée', 4, 'liability');

    _ref   := COALESCE(NEW.invoice_number, 'CMD-' || NEW.order_number);
    _label := 'Vente commande #' || NEW.order_number;

    -- Débit : trésorerie ou client (TTC)
    INSERT INTO public.accounting_entries
      (restaurant_id, journal, entry_date, account_code, label, reference, debit, credit, source_type, source_id)
    VALUES
      (NEW.restaurant_id, 'VT', CURRENT_DATE, _cash_account, _label, _ref, _ttc, 0, 'order', NEW.id);

    -- Crédit : ventes (HT)
    IF _ht > 0 THEN
      INSERT INTO public.accounting_entries
        (restaurant_id, journal, entry_date, account_code, label, reference, debit, credit, source_type, source_id)
      VALUES
        (NEW.restaurant_id, 'VT', CURRENT_DATE, '701', _label, _ref, 0, _ht, 'order', NEW.id);
    END IF;

    -- Crédit : TVA collectée
    IF _tva > 0 THEN
      INSERT INTO public.accounting_entries
        (restaurant_id, journal, entry_date, account_code, label, reference, debit, credit, source_type, source_id)
      VALUES
        (NEW.restaurant_id, 'VT', CURRENT_DATE, '4431', _label, _ref, 0, _tva, 'order', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_sale_accounting ON public.orders;
CREATE TRIGGER trg_post_sale_accounting
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.post_sale_accounting_entries();
