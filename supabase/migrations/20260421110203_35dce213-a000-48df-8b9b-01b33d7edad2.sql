-- PMS sync log table for bidirectional reconciliation
CREATE TABLE IF NOT EXISTS public.pms_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  pms_provider text NOT NULL DEFAULT 'manual',
  external_ref text,
  room_number text,
  sync_status text NOT NULL DEFAULT 'pending',
  sync_direction text NOT NULL DEFAULT 'outbound',
  error_message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_pms_sync_log_restaurant ON public.pms_sync_log(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pms_sync_log_order ON public.pms_sync_log(order_id);
CREATE INDEX IF NOT EXISTS idx_pms_sync_log_status ON public.pms_sync_log(sync_status);

ALTER TABLE public.pms_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view pms sync log"
  ON public.pms_sync_log FOR SELECT
  USING (restaurant_id = current_user_restaurant_id());

CREATE POLICY "Members insert pms sync log"
  ON public.pms_sync_log FOR INSERT
  WITH CHECK (restaurant_id = current_user_restaurant_id());

CREATE POLICY "Members update pms sync log"
  ON public.pms_sync_log FOR UPDATE
  USING (restaurant_id = current_user_restaurant_id());

CREATE POLICY "Members delete pms sync log"
  ON public.pms_sync_log FOR DELETE
  USING (restaurant_id = current_user_restaurant_id());

-- Add reconciliation columns to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS pms_room_charge_id text,
  ADD COLUMN IF NOT EXISTS pms_confirmed_at timestamptz;

-- Enable realtime for staff notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;