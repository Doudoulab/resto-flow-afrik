DROP POLICY "Authenticated users can insert error logs" ON public.error_logs;

CREATE POLICY "Users insert own error logs"
  ON public.error_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      restaurant_id IS NULL
      OR restaurant_id = public.current_user_restaurant_id()
    )
  );