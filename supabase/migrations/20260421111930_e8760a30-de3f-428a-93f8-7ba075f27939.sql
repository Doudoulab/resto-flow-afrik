ALTER TABLE public.restaurants
ADD COLUMN IF NOT EXISTS enabled_modules text[] NOT NULL DEFAULT ARRAY[
  'kitchen','printers','incoming',
  'reports','accounting','customers',
  'suppliers','receipts','inventory','timeclock'
]::text[];