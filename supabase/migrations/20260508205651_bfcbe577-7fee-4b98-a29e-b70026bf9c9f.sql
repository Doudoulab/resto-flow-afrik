-- Enable scheduling extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Writable check: writable when owner has active sub, OR never had any subscription row (free tier)
create or replace function public.is_restaurant_writable(_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with r as (
    select owner_id from public.restaurants where id = _restaurant_id
  ),
  any_sub as (
    select 1 from public.subscriptions s, r where s.user_id = r.owner_id limit 1
  ),
  active_sub as (
    select 1 from public.subscriptions s, r
    where s.user_id = r.owner_id
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now())
    limit 1
  )
  select
    case
      when not exists (select 1 from r) then true
      when not exists (select 1 from any_sub) then true
      when exists (select 1 from active_sub) then true
      else false
    end;
$$;

create or replace function public.enforce_subscription_writable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
begin
  if tg_op = 'DELETE' then
    rid := (to_jsonb(old) ->> 'restaurant_id')::uuid;
  else
    rid := (to_jsonb(new) ->> 'restaurant_id')::uuid;
  end if;

  if rid is null then
    return coalesce(new, old);
  end if;

  if not public.is_restaurant_writable(rid) then
    raise exception 'Abonnement expiré : modifications désactivées (mode lecture seule). Réactivez votre plan pour continuer.'
      using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'orders','order_items','order_payments',
    'menu_items','menu_categories','menu_item_variants','menu_item_modifiers','menu_item_modifier_groups',
    'stock_items','stock_movements','stock_receipts','stock_receipt_items','stock_counts','stock_count_items',
    'expenses','invoices','customers','reservations','restaurant_tables','suppliers',
    'kitchen_stations','printers','shifts','shift_templates','time_entries',
    'payroll_entries','payroll_periods','payroll_adjustments',
    'employee_details','employee_documents','employee_invitations','employee_leaves',
    'wines','wine_movements','tasting_menus','tasting_menu_courses','menu_wine_pairings'
  ];
begin
  foreach t in array tables loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t)
       and exists (select 1 from information_schema.columns where table_schema='public' and table_name=t and column_name='restaurant_id') then
      execute format('drop trigger if exists trg_enforce_sub_writable on public.%I;', t);
      execute format('create trigger trg_enforce_sub_writable before insert or update or delete on public.%I for each row execute function public.enforce_subscription_writable();', t);
    end if;
  end loop;
end$$;