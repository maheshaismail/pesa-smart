import { supabase } from '@/integrations/supabase/client';
import { fetchTransactions, fetchBudgetCategories, fetchSavingsGoals } from './api';

// Request browser notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendNotification(title: string, body: string, icon = '/icons/icon-192.png') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon, badge: '/icons/icon-192.png', tag: title });
  } catch {
    // Silent fail on unsupported platforms
  }
}

// Check spending against budgets and send alerts
export async function checkBudgetAlerts() {
  try {
    const [transactions, budgets] = await Promise.all([fetchTransactions(), fetchBudgetCategories()]);
    const now = new Date();
    const thisMonth = transactions.filter(tx => {
      const d = new Date(tx.transaction_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && tx.type === 'expense';
    });

    for (const budget of budgets) {
      const spent = thisMonth
        .filter(tx => tx.category === budget.category)
        .reduce((s, tx) => s + Number(tx.amount), 0);
      const pct = (spent / Number(budget.monthly_limit)) * 100;

      if (pct >= 100) {
        sendNotification(
          '🚨 Budget Exceeded!',
          `You've exceeded your ${budget.category} budget by ${new Intl.NumberFormat('en-TZ').format(Math.round(spent - Number(budget.monthly_limit)))} TZS`
        );
      } else if (pct >= 80) {
        sendNotification(
          '⚠️ Budget Warning',
          `You've used ${Math.round(pct)}% of your ${budget.category} budget this month`
        );
      }
    }
  } catch {
    // Silent fail
  }
}

// Check savings goal progress
export async function checkSavingsAlerts() {
  try {
    const goals = await fetchSavingsGoals();
    for (const goal of goals) {
      const pct = (Number(goal.saved_amount) / Number(goal.target_amount)) * 100;
      if (pct >= 100) {
        sendNotification('🎉 Goal Achieved!', `You've reached your "${goal.name}" savings goal!`);
      } else if (pct >= 75) {
        sendNotification('💪 Almost There!', `You're ${Math.round(pct)}% towards your "${goal.name}" goal`);
      }

      // Deadline warning
      if (goal.deadline) {
        const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 7 && daysLeft > 0 && pct < 90) {
          sendNotification('⏰ Deadline Approaching', `"${goal.name}" deadline is in ${daysLeft} days and you're at ${Math.round(pct)}%`);
        }
      }
    }
  } catch {
    // Silent fail
  }
}

// Check bill due dates
export async function checkBillAlerts() {
  try {
    const { data: bills } = await supabase.from('bill_reminders').select('*').eq('is_paid', false);
    if (!bills) return;

    const today = new Date().getDate();
    for (const bill of bills) {
      const daysUntilDue = bill.due_day - today;
      if (daysUntilDue === 0) {
        sendNotification('📄 Bill Due Today!', `${bill.name}: ${new Intl.NumberFormat('en-TZ').format(Number(bill.amount))} TZS is due today`);
      } else if (daysUntilDue === 1) {
        sendNotification('📄 Bill Due Tomorrow', `${bill.name}: ${new Intl.NumberFormat('en-TZ').format(Number(bill.amount))} TZS is due tomorrow`);
      } else if (daysUntilDue < 0) {
        sendNotification('🚨 Overdue Bill!', `${bill.name} was due ${Math.abs(daysUntilDue)} days ago`);
      }
    }
  } catch {
    // Silent fail
  }
}

// Run all alert checks
export async function runAllAlertChecks() {
  const hasPermission = Notification.permission === 'granted';
  if (!hasPermission) return;
  await Promise.all([checkBudgetAlerts(), checkSavingsAlerts(), checkBillAlerts()]);
}
