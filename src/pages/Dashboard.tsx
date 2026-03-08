import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { fetchTransactions, formatTZS, getFinancialSummary, type Transaction } from '@/lib/api';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Heart, Lightbulb, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useSmartNotifications } from '@/components/SmartNotifications';
import { runAllAlertChecks, requestNotificationPermission } from '@/lib/notifications';
import { syncPendingTransactions, } from '@/lib/sync';
import { getPendingCount } from '@/lib/offline-db';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const Dashboard = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { generateInsights } = useSmartNotifications();
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  });

  // Auto-generate insights, sync offline data, check alerts
  useEffect(() => {
    if (transactions.length > 0) {
      generateInsights();
      runAllAlertChecks();
    }
    // Sync any offline transactions
    syncPendingTransactions().then(count => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
    });
    // Request notification permission (non-blocking)
    requestNotificationPermission();
  }, [transactions.length > 0]);

  const summary = getFinancialSummary(transactions);
  const name = user?.user_metadata?.full_name || 'there';

  // Build monthly chart data from transactions
  const monthlyMap = new Map<string, { income: number; expenses: number }>();
  transactions.forEach(tx => {
    const d = new Date(tx.transaction_date);
    const key = d.toLocaleString('en', { month: 'short', year: '2-digit' });
    const entry = monthlyMap.get(key) || { income: 0, expenses: 0 };
    if (tx.type === 'income') entry.income += Number(tx.amount);
    else entry.expenses += Number(tx.amount);
    monthlyMap.set(key, entry);
  });
  const chartData = Array.from(monthlyMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .reverse()
    .slice(-6);

  const healthLabel = summary.score >= 80 ? 'Great' : summary.score >= 60 ? 'Good' : summary.score >= 40 ? 'Fair' : 'Low';

  const insights = transactions.length > 0
    ? [
        summary.savingsRate > 20
          ? `You're saving ${summary.savingsRate.toFixed(0)}% of your income — excellent! 🎉`
          : `Your savings rate is ${summary.savingsRate.toFixed(0)}%. Try to save at least 20% of income.`,
        `Total expenses this month: ${formatTZS(summary.expenses)} TZS`,
        summary.score >= 70
          ? 'Your financial health is strong. Consider investing surplus funds.'
          : 'Focus on reducing non-essential spending to improve your score.',
      ]
    : ['Add your first transaction to see AI insights about your finances!'];

  return (
    <div className="space-y-5 pb-24 pt-2">
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
        <p className="text-muted-foreground text-sm">{t('dash.greeting')}, {name} 👋</p>
        <h1 className="text-2xl font-bold font-display">{t('dash.balance')}</h1>
        <p className="text-3xl font-bold font-display text-primary mt-1">
          {formatTZS(summary.balance)} <span className="text-sm font-normal text-muted-foreground">TZS</span>
        </p>
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card p-3 shadow-card">
          <div className="flex items-center gap-1.5 text-success mb-1">
            <TrendingUp size={14} />
            <span className="text-xs font-medium">{t('dash.income')}</span>
          </div>
          <p className="text-sm font-bold font-display">{formatTZS(summary.income)}</p>
        </div>
        <div className="rounded-xl bg-card p-3 shadow-card">
          <div className="flex items-center gap-1.5 text-destructive mb-1">
            <TrendingDown size={14} />
            <span className="text-xs font-medium">{t('dash.expenses')}</span>
          </div>
          <p className="text-sm font-bold font-display">{formatTZS(summary.expenses)}</p>
        </div>
        <div className="rounded-xl bg-card p-3 shadow-card">
          <div className="flex items-center gap-1.5 text-secondary mb-1">
            <Wallet size={14} />
            <span className="text-xs font-medium">{t('dash.savings')}</span>
          </div>
          <p className="text-sm font-bold font-display">{formatTZS(Math.max(0, summary.balance))}</p>
        </div>
      </motion.div>

      {chartData.length > 1 && (
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="rounded-xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold font-display mb-3">Income vs Expenses</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(162,63%,30%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(162,63%,30%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0,72%,51%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(0,72%,51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} formatter={(val: number) => formatTZS(val) + ' TZS'} />
                <Area type="monotone" dataKey="income" stroke="hsl(162,63%,30%)" fill="url(#incGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="hsl(0,72%,51%)" fill="url(#expGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="rounded-xl gradient-primary p-4 shadow-elevated">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary-foreground/80 mb-1">
              <Heart size={16} />
              <span className="text-xs font-medium">{t('dash.health')}</span>
            </div>
            <p className="text-4xl font-bold font-display text-primary-foreground">{summary.score}</p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-primary-foreground/30 flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">{healthLabel}</span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-secondary" />
          <h3 className="text-sm font-semibold font-display">{t('dash.insights')}</h3>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="rounded-xl bg-accent/50 p-3 text-xs text-accent-foreground leading-relaxed">{insight}</div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
        <h3 className="text-sm font-semibold font-display mb-3">{t('dash.recent')}</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions yet. Add your first one!</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 6).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl bg-card p-3 shadow-card">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={16} className="text-success" /> : <ArrowDownRight size={16} className="text-destructive" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.description || tx.category}</p>
                    <p className="text-xs text-muted-foreground">{tx.category} · {tx.transaction_date}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold font-display ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatTZS(Number(tx.amount))}
                </p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;
