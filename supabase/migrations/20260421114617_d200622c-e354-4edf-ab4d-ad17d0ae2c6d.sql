
-- =============== EMPLOYEE DETAILS ===============
CREATE TABLE public.employee_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contract_type text NOT NULL DEFAULT 'cdi',
  hired_at date,
  contract_end_date date,
  job_title text,
  base_salary numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  annual_leave_days integer NOT NULL DEFAULT 0,
  bank_account text,
  emergency_contact_name text,
  emergency_contact_phone text,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, user_id)
);

ALTER TABLE public.employee_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view employee details"
  ON public.employee_details FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());

CREATE POLICY "Owner inserts employee details"
  ON public.employee_details FOR INSERT
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner updates employee details"
  ON public.employee_details FOR UPDATE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner deletes employee details"
  ON public.employee_details FOR DELETE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE TRIGGER trg_employee_details_updated
  BEFORE UPDATE ON public.employee_details
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_employee_details_restaurant ON public.employee_details(restaurant_id);
CREATE INDEX idx_employee_details_user ON public.employee_details(user_id);

-- =============== EMPLOYEE DOCUMENTS ===============
CREATE TABLE public.employee_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  doc_type text NOT NULL DEFAULT 'other',
  name text NOT NULL,
  file_url text NOT NULL,
  expires_at date,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner views employee documents"
  ON public.employee_documents FOR SELECT
  USING (public.is_restaurant_owner(restaurant_id) OR user_id = auth.uid());

CREATE POLICY "Owner inserts employee documents"
  ON public.employee_documents FOR INSERT
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner deletes employee documents"
  ON public.employee_documents FOR DELETE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE INDEX idx_employee_documents_restaurant ON public.employee_documents(restaurant_id);
CREATE INDEX idx_employee_documents_user ON public.employee_documents(user_id);

-- =============== SHIFT TEMPLATES ===============
CREATE TABLE public.shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  role text,
  color text NOT NULL DEFAULT '#3b82f6',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view shift templates"
  ON public.shift_templates FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());

CREATE POLICY "Owner manages shift templates ins"
  ON public.shift_templates FOR INSERT
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner manages shift templates upd"
  ON public.shift_templates FOR UPDATE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner manages shift templates del"
  ON public.shift_templates FOR DELETE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE TRIGGER trg_shift_templates_updated
  BEFORE UPDATE ON public.shift_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== STAFFING REQUIREMENTS ===============
CREATE TABLE public.staffing_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  shift_template_id uuid REFERENCES public.shift_templates(id) ON DELETE CASCADE,
  role text,
  required_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staffing_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view staffing requirements"
  ON public.staffing_requirements FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());

CREATE POLICY "Owner manages staffing req ins"
  ON public.staffing_requirements FOR INSERT
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner manages staffing req upd"
  ON public.staffing_requirements FOR UPDATE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner manages staffing req del"
  ON public.staffing_requirements FOR DELETE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE TRIGGER trg_staffing_req_updated
  BEFORE UPDATE ON public.staffing_requirements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== SHIFTS ===============
CREATE TABLE public.shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  shift_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  role text,
  template_id uuid REFERENCES public.shift_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view shifts"
  ON public.shifts FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());

CREATE POLICY "Owner manages shifts ins"
  ON public.shifts FOR INSERT
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner manages shifts upd"
  ON public.shifts FOR UPDATE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner manages shifts del"
  ON public.shifts FOR DELETE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE TRIGGER trg_shifts_updated
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_shifts_restaurant_date ON public.shifts(restaurant_id, shift_date);
CREATE INDEX idx_shifts_user_date ON public.shifts(user_id, shift_date);

-- =============== PAYROLL ADJUSTMENTS ===============
CREATE TABLE public.payroll_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  period_month date NOT NULL,
  adjustment_type text NOT NULL DEFAULT 'bonus',
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payroll_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view payroll adjustments"
  ON public.payroll_adjustments FOR SELECT
  USING (restaurant_id = public.current_user_restaurant_id());

CREATE POLICY "Owner manages adjustments ins"
  ON public.payroll_adjustments FOR INSERT
  WITH CHECK (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner manages adjustments upd"
  ON public.payroll_adjustments FOR UPDATE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE POLICY "Owner manages adjustments del"
  ON public.payroll_adjustments FOR DELETE
  USING (public.is_restaurant_owner(restaurant_id));

CREATE TRIGGER trg_payroll_adj_updated
  BEFORE UPDATE ON public.payroll_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_payroll_adj_restaurant_period ON public.payroll_adjustments(restaurant_id, period_month);

-- =============== STORAGE: employee-documents bucket ===============
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Owner views employee docs files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'employee-documents'
    AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = r.id::text
    )
  );

CREATE POLICY "Owner uploads employee docs files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = r.id::text
    )
  );

CREATE POLICY "Owner deletes employee docs files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'employee-documents'
    AND EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.owner_id = auth.uid()
        AND (storage.foldername(name))[1] = r.id::text
    )
  );
