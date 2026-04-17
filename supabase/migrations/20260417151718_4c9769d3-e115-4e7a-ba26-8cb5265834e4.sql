
-- Add period column to budget_categories
ALTER TABLE public.budget_categories
ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'monthly'
CHECK (period IN ('daily', 'weekly', 'monthly'));

-- Drop the existing unique constraint on (user_id, category) if any, then recreate including period
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budget_categories_user_id_category_key'
  ) THEN
    ALTER TABLE public.budget_categories DROP CONSTRAINT budget_categories_user_id_category_key;
  END IF;
END $$;

ALTER TABLE public.budget_categories
ADD CONSTRAINT budget_categories_user_id_category_period_key
UNIQUE (user_id, category, period);

-- Add update/delete policies for chat_messages
CREATE POLICY "Users can update own messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);
