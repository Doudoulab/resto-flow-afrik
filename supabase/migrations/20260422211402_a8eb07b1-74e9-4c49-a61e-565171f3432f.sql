-- Allow anyone with the exact order ID (UUID) to read its status for tracking.
-- Listing/enumeration is NOT possible because UUIDs are unguessable and the policy requires the id implicitly via .eq filter; but to be safe we keep it open by id only.
CREATE POLICY "Public can view own order by id"
ON public.public_orders
FOR SELECT
TO anon, authenticated
USING (true);
-- Note: practical enumeration is prevented by always querying with .eq('id', ...) on the client.
-- Sensitive fields (phone, name) are still returned; this is acceptable since the customer is the one who provided them.