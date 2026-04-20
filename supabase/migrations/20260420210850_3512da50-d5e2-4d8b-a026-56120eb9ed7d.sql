ALTER TABLE public.payment_configs
  ADD COLUMN IF NOT EXISTS wave_merchant_id text,
  ADD COLUMN IF NOT EXISTS wave_country_code text NOT NULL DEFAULT 'sn';