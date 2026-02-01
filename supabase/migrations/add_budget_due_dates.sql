-- Fechas y porcentajes por pago de cada gasto fijo (quincena 1-15, 16-fin)
CREATE TABLE IF NOT EXISTS budget_due_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  percentage NUMERIC(5, 2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(budget_id, day_of_month)
);
CREATE INDEX IF NOT EXISTS idx_budget_due_dates_budget_id ON budget_due_dates(budget_id);

-- Valores por defecto: un solo pago el día 1 con 100% para gastos fijos existentes
INSERT INTO budget_due_dates (budget_id, day_of_month, percentage)
  SELECT id, 1, 100 FROM budgets WHERE period = 'monthly' AND is_fixed = true
  ON CONFLICT (budget_id, day_of_month) DO NOTHING;
