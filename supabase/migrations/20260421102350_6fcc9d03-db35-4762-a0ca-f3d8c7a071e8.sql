
-- ============ MFA ============
CREATE TABLE public.user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  backup_codes TEXT[],
  enabled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_mfa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own mfa" ON public.user_mfa
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_mfa_updated BEFORE UPDATE ON public.user_mfa
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ BACKUPS ============
CREATE TABLE public.backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT,
  file_size BIGINT,
  tables_included TEXT[],
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.backup_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read backups" ON public.backup_jobs FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "members create backups" ON public.backup_jobs FOR INSERT
  WITH CHECK (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "owner delete backups" ON public.backup_jobs FOR DELETE
  USING (public.is_restaurant_owner(restaurant_id));

INSERT INTO storage.buckets (id, name, public) VALUES ('backups', 'backups', false)
  ON CONFLICT DO NOTHING;
CREATE POLICY "members read own backups" ON storage.objects FOR SELECT
  USING (bucket_id = 'backups' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text);
CREATE POLICY "members write own backups" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'backups' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text);

-- ============ FISCAL HASH CHAIN ============
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS hash_current TEXT,
  ADD COLUMN IF NOT EXISTS hash_previous TEXT,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_url TEXT,
  ADD COLUMN IF NOT EXISTS device_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_resto_issued ON public.invoices(restaurant_id, issued_at DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('invoice-archive', 'invoice-archive', false)
  ON CONFLICT DO NOTHING;
CREATE POLICY "members read invoice archive" ON storage.objects FOR SELECT
  USING (bucket_id = 'invoice-archive' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text);
CREATE POLICY "members write invoice archive" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'invoice-archive' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text);

-- Fonction de hash chaîné (SHA-256 du contenu + hash précédent)
CREATE OR REPLACE FUNCTION public.compute_invoice_hash()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _prev TEXT;
  _payload TEXT;
BEGIN
  IF NEW.hash_current IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT hash_current INTO _prev
  FROM public.invoices
  WHERE restaurant_id = NEW.restaurant_id AND id <> NEW.id
  ORDER BY issued_at DESC, created_at DESC
  LIMIT 1;
  _prev := COALESCE(_prev, 'GENESIS');
  _payload := NEW.invoice_number || '|' || NEW.total::text || '|' || NEW.issued_at::text || '|' || COALESCE(NEW.items_snapshot::text, '') || '|' || _prev;
  NEW.hash_previous := _prev;
  NEW.hash_current := encode(digest(_payload, 'sha256'), 'hex');
  NEW.signed_at := COALESCE(NEW.signed_at, now());
  RETURN NEW;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS trg_invoices_hash ON public.invoices;
CREATE TRIGGER trg_invoices_hash BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.compute_invoice_hash();

-- ============ PRINTERS ============
CREATE TABLE public.printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  printer_type TEXT NOT NULL DEFAULT 'kitchen',
  connection_mode TEXT NOT NULL DEFAULT 'agent',
  address TEXT,
  station_id UUID REFERENCES public.kitchen_stations(id) ON DELETE SET NULL,
  paper_width INTEGER NOT NULL DEFAULT 48,
  open_drawer BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read printers" ON public.printers FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "manager manage printers" ON public.printers FOR ALL
  USING (public.has_role(auth.uid(), restaurant_id, 'manager'))
  WITH CHECK (public.has_role(auth.uid(), restaurant_id, 'manager'));
CREATE TRIGGER trg_printers_updated BEFORE UPDATE ON public.printers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER PREFERENCES (i18n) ============
CREATE TABLE public.user_preferences (
  user_id UUID PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'fr',
  theme TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own prefs" ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_user_prefs_updated BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PMS HOTEL ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS room_number TEXT,
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS pms_export_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS pms_exported_at TIMESTAMPTZ;

-- ============ PERFORMANCE INDEXES ============
CREATE INDEX IF NOT EXISTS idx_orders_resto_created ON public.orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_resto_status ON public.orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_accounting_resto_date ON public.accounting_entries(restaurant_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resto_created ON public.audit_log(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_resto_created ON public.payments(restaurant_id, created_at DESC);
