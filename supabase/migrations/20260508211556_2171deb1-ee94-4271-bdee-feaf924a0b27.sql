-- Update restaurant_has_write_access to exempt demo accounts
CREATE OR REPLACE FUNCTION public.restaurant_has_write_access(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants r
    JOIN public.subscriptions s
      ON s.user_id = r.owner_id
     AND s.environment = 'live'
    WHERE r.id = _restaurant_id
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
  -- Demo accounts always have write access
  OR EXISTS (
    SELECT 1
    FROM public.restaurants r
    JOIN auth.users u ON u.id = r.owner_id
    WHERE r.id = _restaurant_id
      AND lower(u.email) IN (
        'demo@restoflow.africa',
        'serveur@restoflow.africa',
        'cuisine@restoflow.africa',
        'caisse@restoflow.africa'
      )
  );
$$;

-- Also update is_restaurant_writable to exempt demo accounts (defensive)
CREATE OR REPLACE FUNCTION public.is_restaurant_writable(_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  ),
  is_demo as (
    select 1 from auth.users u, r
    where u.id = r.owner_id
      and lower(u.email) in (
        'demo@restoflow.africa',
        'serveur@restoflow.africa',
        'cuisine@restoflow.africa',
        'caisse@restoflow.africa'
      )
  )
  select
    case
      when exists (select 1 from is_demo) then true
      when not exists (select 1 from r) then true
      when not exists (select 1 from any_sub) then true
      when exists (select 1 from active_sub) then true
      else false
    end;
$$;
