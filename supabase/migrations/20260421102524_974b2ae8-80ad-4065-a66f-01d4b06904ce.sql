
DROP POLICY IF EXISTS "users manage own mfa" ON public.user_mfa;
CREATE POLICY "mfa_select_own" ON public.user_mfa FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mfa_insert_own" ON public.user_mfa FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mfa_update_own" ON public.user_mfa FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mfa_delete_own" ON public.user_mfa FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users manage own prefs" ON public.user_preferences;
CREATE POLICY "prefs_select_own" ON public.user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "prefs_insert_own" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_update_own" ON public.user_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "prefs_delete_own" ON public.user_preferences FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "manager manage printers" ON public.printers;
CREATE POLICY "printers_insert_mgr" ON public.printers FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), restaurant_id, 'manager'));
CREATE POLICY "printers_update_mgr" ON public.printers FOR UPDATE
  USING (public.has_role(auth.uid(), restaurant_id, 'manager'))
  WITH CHECK (public.has_role(auth.uid(), restaurant_id, 'manager'));
CREATE POLICY "printers_delete_mgr" ON public.printers FOR DELETE
  USING (public.has_role(auth.uid(), restaurant_id, 'manager'));
