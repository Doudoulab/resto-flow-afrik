
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Nouvelle conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_conv_resto_user ON public.ai_conversations(restaurant_id, user_id, updated_at DESC);

CREATE TABLE public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_messages_conv ON public.ai_messages(conversation_id, created_at);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations" ON public.ai_conversations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own conversations" ON public.ai_conversations FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own conversations" ON public.ai_conversations FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own conversations" ON public.ai_conversations FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users see messages of own conversations" ON public.ai_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY "Users insert messages of own conversations" ON public.ai_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

CREATE TRIGGER trg_ai_conv_updated
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  week_end date NOT NULL,
  summary text NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, week_start)
);
CREATE INDEX idx_weekly_reports_resto ON public.weekly_reports(restaurant_id, week_start DESC);

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant members see weekly reports" ON public.weekly_reports FOR SELECT
  USING (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Restaurant members insert weekly reports" ON public.weekly_reports FOR INSERT
  WITH CHECK (restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Managers can delete weekly reports" ON public.weekly_reports FOR DELETE
  USING (
    restaurant_id IN (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), restaurant_id, 'manager'::app_role)
  );
