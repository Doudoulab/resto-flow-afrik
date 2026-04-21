-- Tighten RLS: split FOR ALL into per-action policies
DROP POLICY IF EXISTS "Owner manages payroll settings" ON public.payroll_settings;
CREATE POLICY "Owner inserts payroll settings" ON public.payroll_settings FOR INSERT WITH CHECK (is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner updates payroll settings" ON public.payroll_settings FOR UPDATE USING (is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner deletes payroll settings" ON public.payroll_settings FOR DELETE USING (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "Members manage payroll periods" ON public.payroll_periods;
CREATE POLICY "Members view payroll periods" ON public.payroll_periods FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert payroll periods" ON public.payroll_periods FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update payroll periods" ON public.payroll_periods FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete payroll periods" ON public.payroll_periods FOR DELETE USING (restaurant_id = current_user_restaurant_id());

DROP POLICY IF EXISTS "Members manage payroll entries" ON public.payroll_entries;
CREATE POLICY "Members view payroll entries" ON public.payroll_entries FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert payroll entries" ON public.payroll_entries FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update payroll entries" ON public.payroll_entries FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete payroll entries" ON public.payroll_entries FOR DELETE USING (restaurant_id = current_user_restaurant_id());

DROP POLICY IF EXISTS "Owner manages accounts" ON public.accounting_accounts;
CREATE POLICY "Owner inserts accounts" ON public.accounting_accounts FOR INSERT WITH CHECK (is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner updates accounts" ON public.accounting_accounts FOR UPDATE USING (is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner deletes accounts" ON public.accounting_accounts FOR DELETE USING (is_restaurant_owner(restaurant_id));

DROP POLICY IF EXISTS "Members manage accounting entries" ON public.accounting_entries;
CREATE POLICY "Members view accounting entries" ON public.accounting_entries FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert accounting entries" ON public.accounting_entries FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update accounting entries" ON public.accounting_entries FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete accounting entries" ON public.accounting_entries FOR DELETE USING (restaurant_id = current_user_restaurant_id());

DROP POLICY IF EXISTS "Members manage tax declarations" ON public.tax_declarations;
CREATE POLICY "Members view tax declarations" ON public.tax_declarations FOR SELECT USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members insert tax declarations" ON public.tax_declarations FOR INSERT WITH CHECK (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members update tax declarations" ON public.tax_declarations FOR UPDATE USING (restaurant_id = current_user_restaurant_id());
CREATE POLICY "Members delete tax declarations" ON public.tax_declarations FOR DELETE USING (restaurant_id = current_user_restaurant_id());