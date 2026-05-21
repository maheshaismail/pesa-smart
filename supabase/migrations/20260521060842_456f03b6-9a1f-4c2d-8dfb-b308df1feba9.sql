CREATE TABLE public.budget_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  income NUMERIC NOT NULL DEFAULT 0,
  total_allocated NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.budget_plan_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.budget_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  percent NUMERIC NOT NULL DEFAULT 0,
  icon TEXT DEFAULT '📌',
  is_done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.budget_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plans" ON public.budget_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plans" ON public.budget_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON public.budget_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON public.budget_plans FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own plan items" ON public.budget_plan_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own plan items" ON public.budget_plan_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plan items" ON public.budget_plan_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plan items" ON public.budget_plan_items FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_budget_plans_updated_at BEFORE UPDATE ON public.budget_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_budget_plan_items_updated_at BEFORE UPDATE ON public.budget_plan_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_budget_plans_user ON public.budget_plans(user_id, created_at DESC);
CREATE INDEX idx_budget_plan_items_plan ON public.budget_plan_items(plan_id, sort_order);