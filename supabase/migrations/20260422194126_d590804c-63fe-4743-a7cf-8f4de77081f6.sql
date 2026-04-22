ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS hide_powered_by boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_sender_name text,
  ADD COLUMN IF NOT EXISTS custom_domain text;