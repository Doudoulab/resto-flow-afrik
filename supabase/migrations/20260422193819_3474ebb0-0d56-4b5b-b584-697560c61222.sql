-- API Keys (lecture seule, scoped au resto actif)
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  name text NOT NULL,
  key_prefix text NOT NULL,           -- ex: rfk_abc123 (8 chars visibles)
  key_hash text NOT NULL,             -- sha256 de la clé complète
  scopes text[] NOT NULL DEFAULT ARRAY['read:orders','read:menu','read:stats'],
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_restaurant ON public.api_keys(restaurant_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view api keys"
  ON public.api_keys FOR SELECT TO authenticated
  USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner can insert api keys"
  ON public.api_keys FOR INSERT TO authenticated
  WITH CHECK (public.is_restaurant_owner(restaurant_id) AND created_by = auth.uid());

CREATE POLICY "Owner can update api keys"
  ON public.api_keys FOR UPDATE TO authenticated
  USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner can delete api keys"
  ON public.api_keys FOR DELETE TO authenticated
  USING (public.is_restaurant_owner(restaurant_id));

-- Webhooks (notifications sortantes)
CREATE TABLE IF NOT EXISTS public.api_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  url text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['order.paid'],
  secret text NOT NULL,            -- HMAC signing secret
  is_active boolean NOT NULL DEFAULT true,
  last_triggered_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_webhooks_restaurant ON public.api_webhooks(restaurant_id);

ALTER TABLE public.api_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manage webhooks"
  ON public.api_webhooks FOR ALL TO authenticated
  USING (public.is_restaurant_owner(restaurant_id))
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE TRIGGER trg_api_webhooks_updated_at
  BEFORE UPDATE ON public.api_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPC: générer + retourner la clé en clair UNE SEULE FOIS
CREATE OR REPLACE FUNCTION public.create_api_key(_restaurant_id uuid, _name text, _expires_days integer DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _uid uuid := auth.uid();
  _raw text;
  _prefix text;
  _hash text;
  _id uuid;
  _exp timestamptz;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_authenticated'); END IF;
  IF NOT public.is_restaurant_owner(_restaurant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  -- Vérifier accès Business
  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _uid AND environment = 'live'
      AND status IN ('active','trialing') AND product_id = 'business_plan'
      AND (current_period_end IS NULL OR current_period_end > now())
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'business_plan_required');
  END IF;

  _raw := 'rfk_' || encode(extensions.gen_random_bytes(24), 'hex');
  _prefix := substring(_raw from 1 for 12);
  _hash := encode(extensions.digest(_raw, 'sha256'), 'hex');
  IF _expires_days IS NOT NULL THEN _exp := now() + (_expires_days || ' days')::interval; END IF;

  INSERT INTO public.api_keys (restaurant_id, created_by, name, key_prefix, key_hash, expires_at)
  VALUES (_restaurant_id, _uid, _name, _prefix, _hash, _exp)
  RETURNING id INTO _id;

  RETURN jsonb_build_object('success', true, 'id', _id, 'key', _raw, 'prefix', _prefix);
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_api_key(_key_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _resto uuid;
BEGIN
  SELECT restaurant_id INTO _resto FROM public.api_keys WHERE id = _key_id;
  IF _resto IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF NOT public.is_restaurant_owner(_resto) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  UPDATE public.api_keys SET revoked_at = now() WHERE id = _key_id;
  RETURN jsonb_build_object('success', true);
END;
$$;