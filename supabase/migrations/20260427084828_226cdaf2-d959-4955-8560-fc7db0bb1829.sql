ALTER TABLE public.public_orders
ADD COLUMN IF NOT EXISTS converted_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_public_orders_converted_order
ON public.public_orders(converted_order_id);