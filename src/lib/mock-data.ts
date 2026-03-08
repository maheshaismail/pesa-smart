export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  source?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  icon: string;
  deadline?: string;
}

export interface BudgetCategory {
  category: string;
  limit: number;
  spent: number;
  icon: string;
}

export const transactions: Transaction[] = [
  { id: '1', amount: 2500000, type: 'income', category: 'Salary', description: 'Monthly salary', date: '2026-03-01', source: 'Employer' },
  { id: '2', amount: 45000, type: 'expense', category: 'Food', description: 'Groceries from Shoppers', date: '2026-03-02' },
  { id: '3', amount: 15000, type: 'expense', category: 'Transport', description: 'Daladala fare', date: '2026-03-02' },
  { id: '4', amount: 350000, type: 'expense', category: 'Rent', description: 'Monthly rent', date: '2026-03-01' },
  { id: '5', amount: 25000, type: 'expense', category: 'Utilities', description: 'LUKU electricity', date: '2026-03-03' },
  { id: '6', amount: 80000, type: 'expense', category: 'Entertainment', description: 'Weekend outing', date: '2026-03-04' },
  { id: '7', amount: 150000, type: 'income', category: 'Freelance', description: 'Design project', date: '2026-03-05', source: 'Client' },
  { id: '8', amount: 35000, type: 'expense', category: 'Food', description: 'Restaurant', date: '2026-03-05' },
  { id: '9', amount: 200000, type: 'expense', category: 'Education', description: 'Online course', date: '2026-03-06' },
  { id: '10', amount: 12000, type: 'expense', category: 'Transport', description: 'Bolt ride', date: '2026-03-07' },
];

export const savingsGoals: SavingsGoal[] = [
  { id: '1', name: 'Emergency Fund', target: 3000000, saved: 1800000, icon: '🛡️', deadline: '2026-12-31' },
  { id: '2', name: 'New Laptop', target: 2000000, saved: 750000, icon: '💻', deadline: '2026-08-01' },
  { id: '3', name: 'House Down Payment', target: 15000000, saved: 3200000, icon: '🏠', deadline: '2028-01-01' },
  { id: '4', name: 'School Fees', target: 1500000, saved: 1200000, icon: '📚', deadline: '2026-09-01' },
];

export const budgetCategories: BudgetCategory[] = [
  { category: 'Food', limit: 300000, spent: 210000, icon: '🍽️' },
  { category: 'Transport', limit: 150000, spent: 95000, icon: '🚌' },
  { category: 'Rent', limit: 400000, spent: 350000, icon: '🏠' },
  { category: 'Utilities', limit: 100000, spent: 65000, icon: '💡' },
  { category: 'Entertainment', limit: 100000, spent: 80000, icon: '🎬' },
  { category: 'Education', limit: 250000, spent: 200000, icon: '📖' },
];

export const monthlyData = [
  { month: 'Oct', income: 2400000, expenses: 1800000 },
  { month: 'Nov', income: 2500000, expenses: 1950000 },
  { month: 'Dec', income: 2800000, expenses: 2300000 },
  { month: 'Jan', income: 2500000, expenses: 1700000 },
  { month: 'Feb', income: 2650000, expenses: 1850000 },
  { month: 'Mar', income: 2650000, expenses: 962000 },
];

export function formatTZS(amount: number): string {
  return new Intl.NumberFormat('en-TZ', { style: 'decimal', maximumFractionDigits: 0 }).format(amount);
}

export function getHealthScore() {
  return {
    score: 74,
    savings: 'Good',
    debt: 'Low',
    spending: 'Moderate',
  };
}
