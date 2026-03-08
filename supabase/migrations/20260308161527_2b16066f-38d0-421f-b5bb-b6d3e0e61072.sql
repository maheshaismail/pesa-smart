-- Debts table
CREATE TABLE public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  lender text,
  total_amount numeric NOT NULL,
  remaining_amount numeric NOT NULL,
  interest_rate numeric NOT NULL DEFAULT 0,
  monthly_payment numeric,
  due_date date,
  type text NOT NULL DEFAULT 'personal',
  icon text DEFAULT '💳',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debts" ON public.debts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own debts" ON public.debts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own debts" ON public.debts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own debts" ON public.debts FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bill reminders table
CREATE TABLE public.bill_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  due_day integer NOT NULL DEFAULT 1,
  category text NOT NULL DEFAULT 'Other',
  icon text DEFAULT '📄',
  is_paid boolean NOT NULL DEFAULT false,
  paid_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bills" ON public.bill_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bills" ON public.bill_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bills" ON public.bill_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bills" ON public.bill_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_bill_reminders_updated_at BEFORE UPDATE ON public.bill_reminders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();