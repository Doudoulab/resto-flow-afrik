
-- Helper : extrait un UUID depuis un nom de topic ("orders-<uuid>", "kds-<uuid>", etc.)
CREATE OR REPLACE FUNCTION public.realtime_topic_restaurant_id(_topic text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT NULLIF(
    (regexp_match(_topic, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})'))[1],
    ''
  )::uuid
$$;

-- Politique d'autorisation : un utilisateur connecté peut joindre un canal "privé"
-- uniquement si l'UUID inclus dans le topic correspond à SON restaurant.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurant scoped realtime read" ON realtime.messages;
CREATE POLICY "restaurant scoped realtime read"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.realtime_topic_restaurant_id(realtime.topic()) IS NULL
  OR public.realtime_topic_restaurant_id(realtime.topic()) = public.current_user_restaurant_id()
);

DROP POLICY IF EXISTS "restaurant scoped realtime write" ON realtime.messages;
CREATE POLICY "restaurant scoped realtime write"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.realtime_topic_restaurant_id(realtime.topic()) IS NULL
  OR public.realtime_topic_restaurant_id(realtime.topic()) = public.current_user_restaurant_id()
);
