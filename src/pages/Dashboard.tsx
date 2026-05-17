import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { fetchTransactions, addTransaction, fetchBudgetCategories, formatTZS, getFinancialSummary, type Transaction } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Heart, Lightbulb, ArrowUpRight, ArrowDownRight, Plus, X, Target } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { useSmartNotifications } from '@/components/SmartNotifications';
import { runAllAlertChecks, requestNotificationPermission } from '@/lib/notifications';
import { syncPendingTransactions } from '@/lib/sync';
import { getPendingCount, saveOfflineTransaction, isOnline } from '@/lib/offline-db';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const categories = ['Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Education', 'Business', 'Salary', 'Freelance', 'Other'];
const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

const Dashboard = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { generateInsights } = useSmartNotifications();
  const queryClient = useQueryClient();
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: fetchTransactions,
  });
  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgetCategories,
  });
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTx, setQuickTx] = useState({ amount: '', category: 'Food', description: '', type: 'expense' as 'income' | 'expense' });

  const addMutation = useMutation({
    mutationFn: addTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowQuickAdd(false);
      setQuickTx({ amount: '', category: 'Food', description: '', type: 'expense' });
      toast.success('Transaction added!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleQuickSubmit = async () => {
    if (!quickTx.amount) return;
    if (!isOnline()) {
      await saveOfflineTransaction({
        amount: parseInt(quickTx.amount),
        type: quickTx.type,
        category: quickTx.category,
        description: quickTx.description || quickTx.category,
        transaction_date: new Date().toISOString().split('T')[0],
      });
      setShowQuickAdd(false);
      setQuickTx({ amount: '', category: 'Food', description: '', type: 'expense' });
      toast.success('Saved offline! Will sync when back online.', { icon: '📴' });
      return;
    }
    addMutation.mutate({
      amount: parseInt(quickTx.amount),
      type: quickTx.type,
      category: quickTx.category,
      description: quickTx.description || quickTx.category,
    });
  };

  useEffect(() => {
    if (transactions.length > 0) {
      generateInsights();
      runAllAlertChecks();
    }
    syncPendingTransactions().then(count => {
      if (count > 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
    });
    requestNotificationPermission();
  }, [transactions.length > 0]);

  const summary = getFinancialSummary(transactions);
  const name = user?.user_metadata?.full_name || 'there';

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

  const healthLabel = summary.score >= 80 ? t('dash.health.great') : summary.score >= 60 ? t('dash.health.good') : summary.score >= 40 ? t('dash.health.fair') : t('dash.health.low');

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
    : [t('dash.noTx')];

  return (
    <div className="space-y-5 pb-24 pt-2">
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0} className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm">{t('dash.greeting')}, {name} 👋</p>
          <h1 className="text-2xl font-bold font-display">{t('dash.balance')}</h1>
          <p className="text-3xl font-bold font-display text-primary mt-1">
            {formatTZS(summary.balance)} <span className="text-sm font-normal text-muted-foreground">TZS</span>
          </p>
        </div>
        <Button onClick={() => setShowQuickAdd(true)} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl mt-1">
          <Plus size={16} /> {t('dash.quickAdd')}
        </Button>
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
          <h3 className="text-sm font-semibold font-display mb-3">{t('dash.incomeVsExp')}</h3>
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
          <p className="text-sm text-muted-foreground text-center py-8">{t('dash.noTx')}</p>
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

      {/* Quick Add Modal */}
      <AnimatePresence>
        {showQuickAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-foreground/30 glass flex items-end justify-center" onClick={() => setShowQuickAdd(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">{t('dash.quickAdd')}</h2>
                <button onClick={() => setShowQuickAdd(false)} className="text-muted-foreground"><X size={20} /></button>
              </div>

              <div className="space-y-3">
                {/* Type toggle */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setQuickTx(p => ({ ...p, type: 'expense' }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${quickTx.type === 'expense' ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {t('dash.type.expense')}
                  </button>
                  <button
                    onClick={() => setQuickTx(p => ({ ...p, type: 'income' }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${quickTx.type === 'income' ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}
                  >
                    {t('dash.type.income')}
                  </button>
                </div>

                {/* Quick amounts */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">{t('dash.quick.amount')}</label>
                  <div className="flex gap-2 flex-wrap">
                    {quickAmounts.map(amt => (
                      <button
                        key={amt}
                        onClick={() => setQuickTx(p => ({ ...p, amount: String(amt) }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          quickTx.amount === String(amt) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {formatTZS(amt)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount */}
                <input
                  type="number"
                  placeholder={t('dash.quick.custom')}
                  value={quickTx.amount}
                  onChange={e => setQuickTx(p => ({ ...p, amount: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />

                {/* Category chips */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">{t('exp.category')}</label>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setQuickTx(p => ({ ...p, category: cat }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          quickTx.category === cat ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <input
                  type="text"
                  placeholder={t('dash.quick.descOpt')}
                  value={quickTx.description}
                  onChange={e => setQuickTx(p => ({ ...p, description: e.target.value }))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />

                <Button
                  onClick={handleQuickSubmit}
                  disabled={addMutation.isPending || !quickTx.amount}
                  className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3"
                >
                  {addMutation.isPending ? t('dash.quick.saving') : `${t('dash.quick.add')} ${quickTx.type === 'income' ? t('dash.type.income') : t('dash.type.expense')} — ${quickTx.amount ? formatTZS(parseInt(quickTx.amount)) + ' TZS' : ''}`}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
