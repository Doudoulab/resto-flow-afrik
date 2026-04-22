
CREATE OR REPLACE FUNCTION public.consolidated_kpis(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owned uuid[];
  _per_site jsonb;
  _totals jsonb;
  _top jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT array_agg(id) INTO _owned
  FROM public.restaurants
  WHERE owner_id = _uid;

  IF _owned IS NULL OR array_length(_owned, 1) = 0 THEN
    RETURN jsonb_build_object('sites', '[]'::jsonb, 'totals', jsonb_build_object('revenue',0,'orders',0,'items',0), 'top_items', '[]'::jsonb);
  END IF;

  -- Per-site breakdown
  SELECT jsonb_agg(row_to_json(s)) INTO _per_site
  FROM (
    SELECT
      r.id AS restaurant_id,
      r.name AS restaurant_name,
      COALESCE(SUM(o.total), 0)::numeric AS revenue,
      COUNT(o.id)::int AS orders,
      COALESCE(SUM(o.subtotal), 0)::numeric AS subtotal,
      COALESCE(SUM(o.tax_amount), 0)::numeric AS tax,
      COALESCE(SUM(o.discount_amount), 0)::numeric AS discount
    FROM public.restaurants r
    LEFT JOIN public.orders o
      ON o.restaurant_id = r.id
      AND o.status = 'paid'
      AND o.created_at >= _from
      AND o.created_at < _to
    WHERE r.id = ANY(_owned)
    GROUP BY r.id, r.name
    ORDER BY revenue DESC
  ) s;

  -- Totals
  SELECT jsonb_build_object(
    'revenue', COALESCE(SUM(o.total), 0),
    'orders', COUNT(o.id),
    'items', COALESCE(SUM(oi_count.qty), 0),
    'tax', COALESCE(SUM(o.tax_amount), 0),
    'discount', COALESCE(SUM(o.discount_amount), 0)
  ) INTO _totals
  FROM public.orders o
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(quantity),0) AS qty FROM public.order_items WHERE order_id = o.id
  ) oi_count ON TRUE
  WHERE o.restaurant_id = ANY(_owned)
    AND o.status = 'paid'
    AND o.created_at >= _from
    AND o.created_at < _to;

  -- Top items across all sites
  SELECT jsonb_agg(row_to_json(t)) INTO _top
  FROM (
    SELECT
      oi.name_snapshot AS name,
      SUM(oi.quantity)::int AS qty,
      SUM(oi.quantity * oi.unit_price)::numeric AS revenue
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE o.restaurant_id = ANY(_owned)
      AND o.status = 'paid'
      AND o.created_at >= _from
      AND o.created_at < _to
    GROUP BY oi.name_snapshot
    ORDER BY revenue DESC
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'sites', COALESCE(_per_site, '[]'::jsonb),
    'totals', COALESCE(_totals, jsonb_build_object('revenue',0,'orders',0,'items',0)),
    'top_items', COALESCE(_top, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.consolidated_kpis(timestamptz, timestamptz) TO authenticated;
