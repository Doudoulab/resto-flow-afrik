-- Helper function for updated_at if not present
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Reservations table
CREATE TYPE public.reservation_status AS ENUM ('confirmed', 'cancelled', 'honored', 'no_show');

CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  party_size INTEGER NOT NULL DEFAULT 2,
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL,
  table_number TEXT,
  notes TEXT,
  status public.reservation_status NOT NULL DEFAULT 'confirmed',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_restaurant_date ON public.reservations(restaurant_id, reserved_at);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant members view reservations" ON public.reservations
  FOR SELECT USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members create reservations" ON public.reservations
  FOR INSERT WITH CHECK (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members update reservations" ON public.reservations
  FOR UPDATE USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members delete reservations" ON public.reservations
  FOR DELETE USING (restaurant_id = public.current_user_restaurant_id());

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'général',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_restaurant_date ON public.expenses(restaurant_id, expense_date);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant members view expenses" ON public.expenses
  FOR SELECT USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members create expenses" ON public.expenses
  FOR INSERT WITH CHECK (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members update expenses" ON public.expenses
  FOR UPDATE USING (restaurant_id = public.current_user_restaurant_id());
CREATE POLICY "Restaurant members delete expenses" ON public.expenses
  FOR DELETE USING (restaurant_id = public.current_user_restaurant_id());

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Employee invitations table
CREATE TABLE public.employee_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_token ON public.employee_invitations(token);
CREATE INDEX idx_invitations_restaurant ON public.employee_invitations(restaurant_id);

ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views invitations" ON public.employee_invitations
  FOR SELECT USING (public.is_restaurant_owner(restaurant_id));
CREATE POLICY "Owner creates invitations" ON public.employee_invitations
  FOR INSERT WITH CHECK (public.is_restaurant_owner(restaurant_id) AND invited_by = auth.uid());
CREATE POLICY "Owner deletes invitations" ON public.employee_invitations
  FOR DELETE USING (public.is_restaurant_owner(restaurant_id));

-- Function to accept an invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invitation public.employee_invitations;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO _invitation
  FROM public.employee_invitations
  WHERE token = _token
    AND accepted_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_or_expired');
  END IF;

  UPDATE public.profiles
  SET restaurant_id = _invitation.restaurant_id,
      is_owner = false
  WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, restaurant_id, role)
  VALUES (_user_id, _invitation.restaurant_id, _invitation.role)
  ON CONFLICT DO NOTHING;

  UPDATE public.employee_invitations
  SET accepted_at = now()
  WHERE id = _invitation.id;

  RETURN jsonb_build_object('success', true, 'restaurant_id', _invitation.restaurant_id);
END;
$$;

-- Public lookup for an invitation by token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'email', i.email,
    'role', i.role,
    'restaurant_name', r.name,
    'expired', (i.expires_at <= now()),
    'accepted', (i.accepted_at IS NOT NULL)
  )
  INTO _result
  FROM public.employee_invitations i
  JOIN public.restaurants r ON r.id = i.restaurant_id
  WHERE i.token = _token
  LIMIT 1;

  RETURN COALESCE(_result, jsonb_build_object('error', 'not_found'));
END;
$$;