-- Table de logs d'erreurs frontend
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID,
  user_id UUID,
  level TEXT NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  stack TEXT,
  url TEXT,
  user_agent TEXT,
  context JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur authentifié peut insérer ses propres logs
CREATE POLICY "Authenticated users can insert error logs"
  ON public.error_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seul le owner du restaurant peut lire les logs (ou ses propres logs sans resto)
CREATE POLICY "Owner views restaurant error logs"
  ON public.error_logs FOR SELECT
  USING (
    (restaurant_id IS NOT NULL AND public.is_restaurant_owner(restaurant_id))
    OR (restaurant_id IS NULL AND user_id = auth.uid())
  );

CREATE INDEX idx_error_logs_restaurant_created ON public.error_logs (restaurant_id, created_at DESC);
CREATE INDEX idx_error_logs_user_created ON public.error_logs (user_id, created_at DESC);