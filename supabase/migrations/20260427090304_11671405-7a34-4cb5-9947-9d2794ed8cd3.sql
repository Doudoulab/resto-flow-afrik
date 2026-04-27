CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.compute_invoice_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _prev TEXT;
  _payload TEXT;
BEGIN
  IF NEW.hash_current IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT hash_current INTO _prev
  FROM public.invoices
  WHERE restaurant_id = NEW.restaurant_id AND id <> NEW.id
  ORDER BY issued_at DESC, created_at DESC
  LIMIT 1;

  _prev := COALESCE(_prev, 'GENESIS');
  _payload := NEW.invoice_number || '|' || NEW.total::text || '|' || NEW.issued_at::text || '|' || COALESCE(NEW.items_snapshot::text, '') || '|' || _prev;
  NEW.hash_previous := _prev;
  NEW.hash_current := encode(extensions.digest(_payload, 'sha256'), 'hex');
  NEW.signed_at := COALESCE(NEW.signed_at, now());
  RETURN NEW;
END;
$function$;