-- 1. Add hourly_rate to profiles
ALTER TABLE public.profiles ADD COLUMN hourly_rate numeric NOT NULL DEFAULT 0;

-- 2. Trigger function: sync table status from order changes
CREATE OR REPLACE FUNCTION public.sync_table_status_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- INSERT: new order with a table -> mark occupied
  IF TG_OP = 'INSERT' THEN
    IF NEW.table_number IS NOT NULL AND NEW.table_number <> '' THEN
      UPDATE public.restaurant_tables
      SET status = 'occupied', updated_at = now()
      WHERE restaurant_id = NEW.restaurant_id
        AND label = NEW.table_number
        AND status <> 'occupied';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: status change
  IF TG_OP = 'UPDATE' THEN
    IF NEW.table_number IS NOT NULL AND NEW.table_number <> '' THEN
      -- paid -> needs cleaning
      IF NEW.status = 'paid' AND OLD.status <> 'paid' THEN
        UPDATE public.restaurant_tables
        SET status = 'needs_cleaning', updated_at = now()
        WHERE restaurant_id = NEW.restaurant_id
          AND label = NEW.table_number;
      -- cancelled -> available
      ELSIF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
        UPDATE public.restaurant_tables
        SET status = 'available', updated_at = now()
        WHERE restaurant_id = NEW.restaurant_id
          AND label = NEW.table_number;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Triggers
DROP TRIGGER IF EXISTS trg_orders_sync_table_insert ON public.orders;
CREATE TRIGGER trg_orders_sync_table_insert
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_table_status_from_order();

DROP TRIGGER IF EXISTS trg_orders_sync_table_update ON public.orders;
CREATE TRIGGER trg_orders_sync_table_update
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.sync_table_status_from_order();

-- 4. Add updated_at trigger on profiles if not present
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();