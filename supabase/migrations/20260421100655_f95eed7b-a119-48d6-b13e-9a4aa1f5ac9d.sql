-- =========================================================
-- GROUPE 4 : Comptabilité SYSCOHADA & Paie avancée
-- =========================================================

-- 1) Paramètres de paie par restaurant
CREATE TABLE public.payroll_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  country_code text NOT NULL DEFAULT 'sn',
  cnss_employee_pct numeric NOT NULL DEFAULT 5.6,
  cnss_employer_pct numeric NOT NULL DEFAULT 8.4,
  ipres_employee_pct numeric NOT NULL DEFAULT 5.6,
  ipres_employer_pct numeric NOT NULL DEFAULT 8.4,
  irpp_pct numeric NOT NULL DEFAULT 10,
  other_employee_pct numeric NOT NULL DEFAULT 0,
  other_employer_pct numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages payroll settings" ON public.payroll_settings
  FOR ALL USING (is_restaurant_owner(restaurant_id)) WITH CHECK (is_restaurant_owner(restaurant_id));
CREATE POLICY "Members view payroll settings" ON public.payroll_settings
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE TRIGGER trg_payroll_settings_updated BEFORE UPDATE ON public.payroll_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Périodes de paie
CREATE TABLE public.payroll_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  total_gross numeric NOT NULL DEFAULT 0,
  total_net numeric NOT NULL DEFAULT 0,
  total_employer_charges numeric NOT NULL DEFAULT 0,
  validated_at timestamptz,
  validated_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, period_month)
);
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage payroll periods" ON public.payroll_periods
  FOR ALL USING (restaurant_id = current_user_restaurant_id())
  WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE TRIGGER trg_payroll_periods_updated BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Fiches de paie (entries par employé)
CREATE TABLE public.payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  period_id uuid NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  employee_name text NOT NULL,
  hours_worked numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  base_salary numeric NOT NULL DEFAULT 0,
  bonus numeric NOT NULL DEFAULT 0,
  gross_salary numeric NOT NULL DEFAULT 0,
  cnss_employee numeric NOT NULL DEFAULT 0,
  ipres_employee numeric NOT NULL DEFAULT 0,
  irpp numeric NOT NULL DEFAULT 0,
  other_deductions numeric NOT NULL DEFAULT 0,
  total_deductions numeric NOT NULL DEFAULT 0,
  net_salary numeric NOT NULL DEFAULT 0,
  cnss_employer numeric NOT NULL DEFAULT 0,
  ipres_employer numeric NOT NULL DEFAULT 0,
  other_employer numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage payroll entries" ON public.payroll_entries
  FOR ALL USING (restaurant_id = current_user_restaurant_id())
  WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE TRIGGER trg_payroll_entries_updated BEFORE UPDATE ON public.payroll_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Plan comptable SYSCOHADA
CREATE TABLE public.accounting_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  class int NOT NULL,
  type text NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, code)
);
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view accounts" ON public.accounting_accounts
  FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Owner manages accounts" ON public.accounting_accounts
  FOR ALL USING (is_restaurant_owner(restaurant_id))
  WITH CHECK (is_restaurant_owner(restaurant_id));

-- 5) Écritures comptables (journal)
CREATE TABLE public.accounting_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  journal text NOT NULL DEFAULT 'OD',
  reference text,
  label text NOT NULL,
  account_code text NOT NULL,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  source_type text,
  source_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage accounting entries" ON public.accounting_entries
  FOR ALL USING (restaurant_id = current_user_restaurant_id())
  WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE INDEX idx_accounting_entries_resto_date ON public.accounting_entries(restaurant_id, entry_date);
CREATE INDEX idx_accounting_entries_account ON public.accounting_entries(restaurant_id, account_code);

-- 6) Déclarations TVA
CREATE TABLE public.tax_declarations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  vat_collected numeric NOT NULL DEFAULT 0,
  vat_deductible numeric NOT NULL DEFAULT 0,
  vat_to_pay numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  declared_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, period_month)
);
ALTER TABLE public.tax_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage tax declarations" ON public.tax_declarations
  FOR ALL USING (restaurant_id = current_user_restaurant_id())
  WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE TRIGGER trg_tax_declarations_updated BEFORE UPDATE ON public.tax_declarations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7) Fonction de seed du plan SYSCOHADA pour un nouveau resto
CREATE OR REPLACE FUNCTION public.seed_syscohada_accounts(_restaurant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.accounting_accounts (restaurant_id, code, label, class, type, is_system) VALUES
    (_restaurant_id, '101000', 'Capital social', 1, 'capital', true),
    (_restaurant_id, '120000', 'Résultat de l''exercice', 1, 'capital', true),
    (_restaurant_id, '401000', 'Fournisseurs', 4, 'tiers', true),
    (_restaurant_id, '411000', 'Clients', 4, 'tiers', true),
    (_restaurant_id, '421000', 'Personnel - rémunérations dues', 4, 'tiers', true),
    (_restaurant_id, '431000', 'Sécurité sociale (CNSS)', 4, 'tiers', true),
    (_restaurant_id, '432000', 'Caisse de retraite (IPRES)', 4, 'tiers', true),
    (_restaurant_id, '4431', 'TVA collectée', 4, 'tva', true),
    (_restaurant_id, '4452', 'TVA déductible', 4, 'tva', true),
    (_restaurant_id, '4471', 'IRPP retenu à la source', 4, 'tiers', true),
    (_restaurant_id, '521000', 'Banque', 5, 'tresorerie', true),
    (_restaurant_id, '571000', 'Caisse', 5, 'tresorerie', true),
    (_restaurant_id, '601000', 'Achats de marchandises', 6, 'charge', true),
    (_restaurant_id, '604000', 'Achats stockés - matières premières', 6, 'charge', true),
    (_restaurant_id, '605000', 'Autres achats (eau, électricité, gaz)', 6, 'charge', true),
    (_restaurant_id, '622000', 'Locations', 6, 'charge', true),
    (_restaurant_id, '625000', 'Primes d''assurance', 6, 'charge', true),
    (_restaurant_id, '626000', 'Frais postaux et télécommunications', 6, 'charge', true),
    (_restaurant_id, '627000', 'Services bancaires', 6, 'charge', true),
    (_restaurant_id, '641000', 'Rémunérations du personnel', 6, 'charge', true),
    (_restaurant_id, '645000', 'Charges sociales (part patronale)', 6, 'charge', true),
    (_restaurant_id, '707000', 'Ventes de marchandises', 7, 'produit', true),
    (_restaurant_id, '706000', 'Prestations de services (restauration)', 7, 'produit', true),
    (_restaurant_id, '758000', 'Produits divers (pourboires, services)', 7, 'produit', true)
  ON CONFLICT (restaurant_id, code) DO NOTHING;
END;
$$;

-- Seed pour les restos existants
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.restaurants LOOP
    PERFORM public.seed_syscohada_accounts(r.id);
    INSERT INTO public.payroll_settings (restaurant_id) VALUES (r.id) ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Trigger : seed à la création d'un nouveau resto
CREATE OR REPLACE FUNCTION public.on_restaurant_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_syscohada_accounts(NEW.id);
  INSERT INTO public.payroll_settings (restaurant_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_restaurant_created_accounting ON public.restaurants;
CREATE TRIGGER trg_restaurant_created_accounting
  AFTER INSERT ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.on_restaurant_created();

-- 8) Génération auto d'écritures depuis les factures
CREATE OR REPLACE FUNCTION public.generate_invoice_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ht numeric := COALESCE(NEW.subtotal, 0) - COALESCE(NEW.discount_amount, 0);
  _tva numeric := COALESCE(NEW.tax_amount, 0);
  _service numeric := COALESCE(NEW.service_amount, 0);
  _tip numeric := COALESCE(NEW.tip_amount, 0);
  _total numeric := COALESCE(NEW.total, 0);
BEGIN
  -- Évite doublons
  DELETE FROM public.accounting_entries WHERE source_type = 'invoice' AND source_id = NEW.id;

  -- Débit Caisse / Crédit Ventes + TVA
  INSERT INTO public.accounting_entries (restaurant_id, entry_date, journal, reference, label, account_code, debit, credit, source_type, source_id)
  VALUES
    (NEW.restaurant_id, NEW.issued_at::date, 'VTE', NEW.invoice_number, 'Encaissement '||NEW.invoice_number, '571000', _total, 0, 'invoice', NEW.id),
    (NEW.restaurant_id, NEW.issued_at::date, 'VTE', NEW.invoice_number, 'Vente HT '||NEW.invoice_number, '706000', 0, _ht, 'invoice', NEW.id);

  IF _tva > 0 THEN
    INSERT INTO public.accounting_entries (restaurant_id, entry_date, journal, reference, label, account_code, debit, credit, source_type, source_id)
    VALUES (NEW.restaurant_id, NEW.issued_at::date, 'VTE', NEW.invoice_number, 'TVA collectée '||NEW.invoice_number, '4431', 0, _tva, 'invoice', NEW.id);
  END IF;

  IF _service > 0 OR _tip > 0 THEN
    INSERT INTO public.accounting_entries (restaurant_id, entry_date, journal, reference, label, account_code, debit, credit, source_type, source_id)
    VALUES (NEW.restaurant_id, NEW.issued_at::date, 'VTE', NEW.invoice_number, 'Service/Pourboire '||NEW.invoice_number, '758000', 0, _service + _tip, 'invoice', NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_invoice_accounting ON public.invoices;
CREATE TRIGGER trg_invoice_accounting
  AFTER INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_invoice_entries();

-- 9) Génération auto d'écritures depuis les dépenses
CREATE OR REPLACE FUNCTION public.generate_expense_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _account text;
BEGIN
  DELETE FROM public.accounting_entries WHERE source_type = 'expense' AND source_id = NEW.id;
  _account := CASE
    WHEN NEW.category ILIKE '%loyer%' OR NEW.category ILIKE '%location%' THEN '622000'
    WHEN NEW.category ILIKE '%électricité%' OR NEW.category ILIKE '%eau%' OR NEW.category ILIKE '%gaz%' THEN '605000'
    WHEN NEW.category ILIKE '%assurance%' THEN '625000'
    WHEN NEW.category ILIKE '%télécom%' OR NEW.category ILIKE '%internet%' OR NEW.category ILIKE '%téléphone%' THEN '626000'
    WHEN NEW.category ILIKE '%banque%' OR NEW.category ILIKE '%bancaire%' THEN '627000'
    WHEN NEW.category ILIKE '%matière%' OR NEW.category ILIKE '%achat%' OR NEW.category ILIKE '%fournisseur%' THEN '604000'
    ELSE '601000'
  END;

  INSERT INTO public.accounting_entries (restaurant_id, entry_date, journal, reference, label, account_code, debit, credit, source_type, source_id)
  VALUES
    (NEW.restaurant_id, NEW.expense_date, 'ACH', NEW.id::text, COALESCE(NEW.description, NEW.category), _account, NEW.amount, 0, 'expense', NEW.id),
    (NEW.restaurant_id, NEW.expense_date, 'ACH', NEW.id::text, 'Sortie caisse - '||COALESCE(NEW.description, NEW.category), '571000', 0, NEW.amount, 'expense', NEW.id);

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_expense_accounting ON public.expenses;
CREATE TRIGGER trg_expense_accounting
  AFTER INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.generate_expense_entries();

-- 10) Génération auto d'écritures à la validation d'une période de paie
CREATE OR REPLACE FUNCTION public.generate_payroll_entries()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _gross numeric; _net numeric; _cnss_emp numeric; _ipres_emp numeric; _irpp numeric;
  _cnss_er numeric; _ipres_er numeric;
BEGIN
  IF NEW.status = 'validated' AND (OLD.status IS DISTINCT FROM 'validated') THEN
    SELECT COALESCE(SUM(gross_salary),0), COALESCE(SUM(net_salary),0),
           COALESCE(SUM(cnss_employee),0), COALESCE(SUM(ipres_employee),0), COALESCE(SUM(irpp),0),
           COALESCE(SUM(cnss_employer),0), COALESCE(SUM(ipres_employer),0)
    INTO _gross, _net, _cnss_emp, _ipres_emp, _irpp, _cnss_er, _ipres_er
    FROM public.payroll_entries WHERE period_id = NEW.id;

    DELETE FROM public.accounting_entries WHERE source_type = 'payroll' AND source_id = NEW.id;

    -- Charges salariales (brut + charges patronales)
    INSERT INTO public.accounting_entries (restaurant_id, entry_date, journal, reference, label, account_code, debit, credit, source_type, source_id) VALUES
      (NEW.restaurant_id, NEW.period_month, 'PAI', 'PAI-'||to_char(NEW.period_month,'YYYY-MM'), 'Salaires bruts '||to_char(NEW.period_month,'MM/YYYY'), '641000', _gross, 0, 'payroll', NEW.id),
      (NEW.restaurant_id, NEW.period_month, 'PAI', 'PAI-'||to_char(NEW.period_month,'YYYY-MM'), 'Charges patronales', '645000', _cnss_er + _ipres_er, 0, 'payroll', NEW.id),
      (NEW.restaurant_id, NEW.period_month, 'PAI', 'PAI-'||to_char(NEW.period_month,'YYYY-MM'), 'Net à payer personnel', '421000', 0, _net, 'payroll', NEW.id),
      (NEW.restaurant_id, NEW.period_month, 'PAI', 'PAI-'||to_char(NEW.period_month,'YYYY-MM'), 'CNSS dû', '431000', 0, _cnss_emp + _cnss_er, 'payroll', NEW.id),
      (NEW.restaurant_id, NEW.period_month, 'PAI', 'PAI-'||to_char(NEW.period_month,'YYYY-MM'), 'IPRES dû', '432000', 0, _ipres_emp + _ipres_er, 'payroll', NEW.id),
      (NEW.restaurant_id, NEW.period_month, 'PAI', 'PAI-'||to_char(NEW.period_month,'YYYY-MM'), 'IRPP retenu', '4471', 0, _irpp, 'payroll', NEW.id);

    NEW.validated_at := now();
    NEW.total_gross := _gross;
    NEW.total_net := _net;
    NEW.total_employer_charges := _cnss_er + _ipres_er;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_payroll_validation ON public.payroll_periods;
CREATE TRIGGER trg_payroll_validation
  BEFORE UPDATE ON public.payroll_periods
  FOR EACH ROW EXECUTE FUNCTION public.generate_payroll_entries();