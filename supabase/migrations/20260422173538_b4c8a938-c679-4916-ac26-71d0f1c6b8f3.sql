
-- Rattrapage forcé : repasser les commandes "paid" en "unpaid" puis "paid" pour déclencher les triggers
DO $$
DECLARE
  _order_ids uuid[];
BEGIN
  SELECT array_agg(id) INTO _order_ids
  FROM public.orders
  WHERE payment_status = 'paid'
    AND id NOT IN (
      SELECT DISTINCT source_id FROM public.accounting_entries 
      WHERE source_type = 'order' AND source_id IS NOT NULL
    );

  IF _order_ids IS NOT NULL AND array_length(_order_ids, 1) > 0 THEN
    UPDATE public.orders SET payment_status = 'unpaid' WHERE id = ANY(_order_ids);
    UPDATE public.orders SET payment_status = 'paid' WHERE id = ANY(_order_ids);
  END IF;
END $$;
