-- ============================================
-- LEDGER PWA — Setup completo para Supabase
-- Copiar y pegar en Supabase > SQL Editor > New query > Run
-- RLS deshabilitado; aislamiento por user_id en la app
-- ============================================

-- PROFILES (auth custom — sin Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  display_name TEXT,
  api_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_api_key ON profiles(api_key) WHERE api_key IS NOT NULL;

-- ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'credit_card')),
  balance DECIMAL(18, 2) NOT NULL DEFAULT 0,
  credit_limit DECIMAL(18, 2),
  billing_cycle_day INT CHECK (billing_cycle_day >= 1 AND billing_cycle_day <= 28),
  payment_due_day INT CHECK (payment_due_day >= 1 AND payment_due_day <= 31),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- INCOME SCHEDULES
CREATE TABLE IF NOT EXISTS income_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  day_of_month INT NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 31),
  percentage_of_total INT DEFAULT 100 CHECK (percentage_of_total >= 1 AND percentage_of_total <= 100),
  target_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_income_schedules_user_id ON income_schedules(user_id);

-- TRANSACTIONS (Libro Diario)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer', 'cc_charge', 'cc_payment')),
  amount DECIMAL(18, 2) NOT NULL,
  concept TEXT,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  credit_card_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  executed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);

-- BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly')),
  start_date DATE,
  end_date DATE,
  is_fixed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);

-- BUDGET MONTH PAID (gasto fijo cubierto este mes)
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

-- PLANNED EXPENSES
CREATE TABLE IF NOT EXISTS planned_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  planned_date DATE NOT NULL,
  is_executed BOOLEAN DEFAULT false,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_planned_expenses_user_id ON planned_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_planned_expenses_planned_date ON planned_expenses(planned_date);
CREATE INDEX IF NOT EXISTS idx_planned_expenses_not_executed ON planned_expenses(user_id, is_executed) WHERE is_executed = false;

-- WEEKLY ROLLOVERS
CREATE TABLE IF NOT EXISTS weekly_rollovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  surplus DECIMAL(18, 2) NOT NULL DEFAULT 0,
  carried_over BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_weekly_rollovers_user_id ON weekly_rollovers(user_id);

-- MONTHLY DECISIONS
CREATE TABLE IF NOT EXISTS monthly_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  surplus DECIMAL(18, 2) NOT NULL,
  decision TEXT CHECK (decision IN ('save', 'splurge', 'reset')),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, month_start)
);
CREATE INDEX IF NOT EXISTS idx_monthly_decisions_user_id ON monthly_decisions(user_id);

-- PUSH SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- INCOME REGISTRATION LOG
CREATE TABLE IF NOT EXISTS income_registration_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES income_schedules(id) ON DELETE SET NULL,
  expected_date DATE NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_income_registration_user_date ON income_registration_log(user_id, expected_date);

-- RLS DESHABILITADO
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE budget_month_paid DISABLE ROW LEVEL SECURITY;
ALTER TABLE planned_expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_rollovers DISABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_decisions DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE income_registration_log DISABLE ROW LEVEL SECURITY;

-- FUNCIÓN Y TRIGGERS updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
DROP TRIGGER IF EXISTS accounts_updated_at ON accounts;
CREATE TRIGGER accounts_updated_at BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
DROP TRIGGER IF EXISTS income_schedules_updated_at ON income_schedules;
CREATE TRIGGER income_schedules_updated_at BEFORE UPDATE ON income_schedules FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
DROP TRIGGER IF EXISTS transactions_updated_at ON transactions;
CREATE TRIGGER transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
DROP TRIGGER IF EXISTS budgets_updated_at ON budgets;
CREATE TRIGGER budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
DROP TRIGGER IF EXISTS planned_expenses_updated_at ON planned_expenses;
CREATE TRIGGER planned_expenses_updated_at BEFORE UPDATE ON planned_expenses FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
