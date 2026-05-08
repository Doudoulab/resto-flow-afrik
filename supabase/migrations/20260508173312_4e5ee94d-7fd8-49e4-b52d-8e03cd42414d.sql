
-- 1) Retirer payments et subscriptions de la publication realtime
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='payments') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.payments';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='subscriptions') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions';
  END IF;
END $$;

-- 2) Politiques manquantes DELETE/UPDATE sur les buckets backups & invoice-archive
DROP POLICY IF EXISTS "members delete own backups" ON storage.objects;
CREATE POLICY "members delete own backups" ON storage.objects FOR DELETE
  USING (bucket_id = 'backups' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text);

DROP POLICY IF EXISTS "members update own backups" ON storage.objects;
CREATE POLICY "members update own backups" ON storage.objects FOR UPDATE
  USING (bucket_id = 'backups' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text)
  WITH CHECK (bucket_id = 'backups' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text);

DROP POLICY IF EXISTS "members delete own invoice archive" ON storage.objects;
CREATE POLICY "members delete own invoice archive" ON storage.objects FOR DELETE
  USING (bucket_id = 'invoice-archive' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text);

DROP POLICY IF EXISTS "members update own invoice archive" ON storage.objects;
CREATE POLICY "members update own invoice archive" ON storage.objects FOR UPDATE
  USING (bucket_id = 'invoice-archive' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text)
  WITH CHECK (bucket_id = 'invoice-archive' AND (storage.foldername(name))[1] = public.current_user_restaurant_id()::text);

-- 3) Révoquer EXECUTE pour anon/authenticated sur les helpers internes
-- (Ces fonctions sont appelées uniquement par triggers ou code service, jamais par RPC client)
REVOKE EXECUTE ON FUNCTION public.seed_syscohada_accounts(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_accounting_account(uuid, text, text, integer, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_invoice_hash() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_entries() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_expense_entries() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_payroll_entries() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.post_sale_accounting_entries() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_stock_movement_on_paid() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock_on_paid_order() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock_on_fired() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_stock_count() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_stock_receipt() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_restaurant_created() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_trial_on_restaurant_created() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_restaurant_quota() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_starter_menu_quota() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_restaurant_slug() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_table_status_from_order() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_customer_balance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_customer_visit() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_loyalty_on_paid() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_set_clock_pin(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_suspend_restaurant(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_unsuspend_restaurant(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_delete_restaurant(uuid) FROM anon, authenticated;
