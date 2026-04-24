-- 1) Tighten public_orders SELECT: anon can no longer enumerate.
-- We replace the permissive USING(true) policy so only restaurant members
-- can SELECT freely. Public tracking by exact UUID is handled by an edge
-- function or by passing the ID; anonymous reads without an explicit ID
-- filter were a privacy issue (phone, name, items exposed in bulk).
DROP POLICY IF EXISTS "Public can view own order by id" ON public.public_orders;

-- Keep restaurant members' read policy (already present from older migration).
-- For anonymous tracking, we expose a SECURITY DEFINER function instead.
CREATE OR REPLACE FUNCTION public.get_public_order_status(_order_id uuid)
RETURNS TABLE (
  id uuid,
  restaurant_id uuid,
  status text,
  total numeric,
  table_number text,
  customer_name text,
  items jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT po.id, po.restaurant_id, po.status, po.total, po.table_number,
         po.customer_name, po.items, po.created_at, po.updated_at
  FROM public.public_orders po
  WHERE po.id = _order_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_order_status(uuid) TO anon, authenticated;

-- 2) Drop legacy composite unique constraint on subscriptions if present,
--    so re-subscribing after cancel inserts a new row keyed by paddle_subscription_id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'subscriptions_user_id_environment_key'
      AND conrelid = 'public.subscriptions'::regclass
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_user_id_environment_key;
  END IF;
END $$;

-- Ensure paddle_subscription_id is unique (required for onConflict upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subscriptions'::regclass
      AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%(paddle_subscription_id)%'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'subscriptions'
      AND indexdef LIKE '%UNIQUE%paddle_subscription_id%'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_paddle_subscription_id_key UNIQUE (paddle_subscription_id);
  END IF;
END $$;