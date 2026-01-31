-- Registrar cuándo un gasto fijo fue cubierto en un mes
CREATE TABLE IF NOT EXISTS budget_month_paid (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, budget_id, month)
);

CREATE INDEX IF NOT EXISTS idx_budget_month_paid_user_month ON budget_month_paid(user_id, month);
