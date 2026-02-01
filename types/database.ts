export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          pin_hash: string;
          display_name: string | null;
          api_key: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          pin_hash: string;
          display_name?: string | null;
          api_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          pin_hash?: string;
          display_name?: string | null;
          api_key?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "cash" | "bank" | "credit_card";
          balance: number;
          credit_limit: number | null;
          billing_cycle_day: number | null;
          payment_due_day: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: "cash" | "bank" | "credit_card";
          balance?: number;
          credit_limit?: number | null;
          billing_cycle_day?: number | null;
          payment_due_day?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["accounts"]["Insert"]>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "income" | "expense" | "transfer" | "cc_charge" | "cc_payment";
          amount: number;
          concept: string | null;
          account_id: string | null;
          to_account_id: string | null;
          credit_card_account_id: string | null;
          transaction_date: string;
          executed_at: string;
          created_at: string;
          updated_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "income" | "expense" | "transfer" | "cc_charge" | "cc_payment";
          amount: number;
          concept?: string | null;
          account_id?: string | null;
          to_account_id?: string | null;
          credit_card_account_id?: string | null;
          transaction_date?: string;
          executed_at?: string;
          created_at?: string;
          updated_at?: string;
          metadata?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["transactions"]["Insert"]>;
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          period: "weekly" | "monthly";
          start_date: string | null;
          end_date: string | null;
          is_fixed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          period: "weekly" | "monthly";
          start_date?: string | null;
          end_date?: string | null;
          is_fixed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["budgets"]["Insert"]>;
      };
      budget_month_paid: {
        Row: {
          id: string;
          user_id: string;
          budget_id: string;
          month: string;
          paid_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          budget_id: string;
          month: string;
          paid_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["budget_month_paid"]["Insert"]>;
      };
      budget_due_dates: {
        Row: {
          id: string;
          budget_id: string;
          day_of_month: number;
          percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          budget_id: string;
          day_of_month: number;
          percentage: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["budget_due_dates"]["Insert"]>;
      };
      planned_expenses: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          concept: string;
          amount: number;
          planned_date: string;
          is_executed: boolean;
          executed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          concept: string;
          amount: number;
          planned_date: string;
          is_executed?: boolean;
          executed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["planned_expenses"]["Insert"]>;
      };
      income_schedules: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          amount: number;
          day_of_month: number;
          percentage_of_total: number;
          target_account_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          amount: number;
          day_of_month: number;
          percentage_of_total?: number;
          target_account_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["income_schedules"]["Insert"]>;
      };
      income_registration_log: {
        Row: {
          id: string;
          user_id: string;
          schedule_id: string | null;
          expected_date: string;
          registered_at: string;
          transaction_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          schedule_id?: string | null;
          expected_date: string;
          registered_at?: string;
          transaction_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["income_registration_log"]["Insert"]>;
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Account = Database["public"]["Tables"]["accounts"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Budget = Database["public"]["Tables"]["budgets"]["Row"];
export type BudgetMonthPaid = Database["public"]["Tables"]["budget_month_paid"]["Row"];
export type BudgetDueDate = Database["public"]["Tables"]["budget_due_dates"]["Row"];
export type PlannedExpense = Database["public"]["Tables"]["planned_expenses"]["Row"];
export type IncomeSchedule = Database["public"]["Tables"]["income_schedules"]["Row"];
