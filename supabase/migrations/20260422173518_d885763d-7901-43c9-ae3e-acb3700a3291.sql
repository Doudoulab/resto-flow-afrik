
-- 1. Supprimer les triggers dupliqués sur orders
DROP TRIGGER IF EXISTS trg_award_loyalty ON public.orders;
DROP TRIGGER IF EXISTS trg_decrement_stock_paid ON public.orders;

-- 2. Rattrapage : exécuter manuellement les triggers pour les commandes déjà payées
-- Pour déclencher les triggers AFTER UPDATE, on fait un UPDATE no-op
UPDATE public.orders 
SET updated_at = updated_at 
WHERE payment_status = 'paid' 
  AND id NOT IN (
    SELECT DISTINCT source_id FROM public.accounting_entries WHERE source_type = 'order' AND source_id IS NOT NULL
  );

-- 3. Verrou applicatif côté DB : fonction atomique d'encaissement
CREATE OR REPLACE FUNCTION public.mark_order_paid(
  _order_id uuid,
  _payment_method text,
  _amount_paid numeric
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order public.orders;
BEGIN
  -- Verrou pessimiste FOR UPDATE pour empêcher le double-encaissement
  SELECT * INTO _order
  FROM public.orders
  WHERE id = _order_id
    AND restaurant_id = current_user_restaurant_id()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Commande introuvable ou accès refusé';
  END IF;

  IF _order.payment_status = 'paid' THEN
    RAISE EXCEPTION 'Cette commande est déjà encaissée';
  END IF;

  UPDATE public.orders
  SET payment_status = 'paid',
      payment_method = _payment_method,
      amount_paid = _amount_paid,
      status = CASE WHEN status IN ('pending','preparing','ready') THEN 'served'::order_status ELSE status END,
      updated_at = now()
  WHERE id = _order_id
  RETURNING * INTO _order;

  RETURN _order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_paid(uuid, text, numeric) TO authenticated;
