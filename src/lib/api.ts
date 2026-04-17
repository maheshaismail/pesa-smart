import { supabase } from '@/integrations/supabase/client';

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string | null;
  source: string | null;
  transaction_date: string;
  created_at: string;
}

export type BudgetPeriod = 'daily' | 'weekly' | 'monthly';

export interface BudgetCategory {
  id: string;
  user_id: string;
  category: string;
  monthly_limit: number;
  icon: string | null;
  period: BudgetPeriod;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  icon: string | null;
  deadline: string | null;
}

export async function fetchTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('transaction_date', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []) as Transaction[];
}

export async function addTransaction(tx: {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  transaction_date?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      description: tx.description,
      transaction_date: tx.transaction_date || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransaction(id: string, updates: {
  amount?: number;
  type?: 'income' | 'expense';
  category?: string;
  description?: string;
}) {
  const { error } = await supabase.from('transactions').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
}

export async function bulkDeleteTransactions(ids: string[]) {
  const { error } = await supabase.from('transactions').delete().in('id', ids);
  if (error) throw error;
}

export async function fetchBudgetCategories() {
  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .order('category');
  if (error) throw error;
  return (data || []) as BudgetCategory[];
}

export async function upsertBudgetCategory(cat: { id?: string; category: string; monthly_limit: number; icon: string; period?: BudgetPeriod }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const period = cat.period || 'monthly';

  if (cat.id) {
    const { error } = await supabase
      .from('budget_categories')
      .update({ category: cat.category, monthly_limit: cat.monthly_limit, icon: cat.icon, period })
      .eq('id', cat.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('budget_categories')
    .upsert(
      { user_id: user.id, category: cat.category, monthly_limit: cat.monthly_limit, icon: cat.icon, period },
      { onConflict: 'user_id,category,period' }
    );
  if (error) throw error;
}

export async function deleteBudgetCategory(id: string) {
  const { error } = await supabase.from('budget_categories').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchSavingsGoals() {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .order('created_at');
  if (error) throw error;
  return (data || []) as SavingsGoal[];
}

export async function addSavingsGoal(goal: { name: string; target_amount: number; icon: string; deadline?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({ user_id: user.id, ...goal })
    .select()
    .single();
  if (error) throw error;
  return data as SavingsGoal;
}

export async function updateSavingsGoal(id: string, updates: { saved_amount?: number; name?: string }) {
  const { error } = await supabase.from('savings_goals').update(updates).eq('id', id);
  if (error) throw error;
}

export function formatTZS(amount: number): string {
  return new Intl.NumberFormat('en-TZ', { style: 'decimal', maximumFractionDigits: 0 }).format(amount);
}

export function getFinancialSummary(transactions: Transaction[]) {
  const now = new Date();
  const thisMonth = transactions.filter(tx => {
    const d = new Date(tx.transaction_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income * 100) : 0;

  // Simple health score
  let score = 50;
  if (savingsRate > 20) score += 20;
  else if (savingsRate > 10) score += 10;
  if (expenses < income * 0.7) score += 15;
  if (income > 0) score += 15;
  score = Math.min(100, Math.max(0, score));

  return { income, expenses, balance, savingsRate, score };
}
