import { useI18n } from '@/lib/i18n';
import { formatTZS, transactions, monthlyData, getHealthScore } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, Heart, Lightbulb, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const Dashboard = () => {
  const { t } = useI18n();
  const health = getHealthScore();
  const totalIncome = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const totalExpenses = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const balance = totalIncome - totalExpenses;

  const insights = [
    "You've saved 28% of your income this month — great job! 🎉",
    "Food spending is 12% higher than last month. Consider meal prepping.",
    "At this rate, you'll reach your Emergency Fund goal in 7 months.",
  ];

  return (
    <div className="space-y-5 pb-24 pt-2">
      {/* Header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
        <p className="text-muted-foreground text-sm">{t('dash.greeting')} 👋</p>
        <h1 className="text-2xl font-bold font-display">{t('dash.balance')}</h1>
        <p className="text-3xl font-bold font-display text-primary mt-1">
          {formatTZS(balance)} <span className="text-sm font-normal text-muted-foreground">TZS</span>
        </p>
      </motion.div>

      {/* Quick Stats */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1} className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card p-3 shadow-card">
          <div className="flex items-center gap-1.5 text-success mb-1">
            <TrendingUp size={14} />
            <span className="text-xs font-medium">{t('dash.income')}</span>
          </div>
          <p className="text-sm font-bold font-display">{formatTZS(totalIncome)}</p>
        </div>
        <div className="rounded-xl bg-card p-3 shadow-card">
          <div className="flex items-center gap-1.5 text-destructive mb-1">
            <TrendingDown size={14} />
            <span className="text-xs font-medium">{t('dash.expenses')}</span>
          </div>
          <p className="text-sm font-bold font-display">{formatTZS(totalExpenses)}</p>
        </div>
        <div className="rounded-xl bg-card p-3 shadow-card">
          <div className="flex items-center gap-1.5 text-secondary mb-1">
            <Wallet size={14} />
            <span className="text-xs font-medium">{t('dash.savings')}</span>
          </div>
          <p className="text-sm font-bold font-display">{formatTZS(balance)}</p>
        </div>
      </motion.div>

      {/* Chart */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={2} className="rounded-xl bg-card p-4 shadow-card">
        <h3 className="text-sm font-semibold font-display mb-3">Income vs Expenses</h3>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData}>
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
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(val: number) => formatTZS(val) + ' TZS'}
              />
              <Area type="monotone" dataKey="income" stroke="hsl(162,63%,30%)" fill="url(#incGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="hsl(0,72%,51%)" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Health Score */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="rounded-xl gradient-primary p-4 shadow-elevated">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary-foreground/80 mb-1">
              <Heart size={16} />
              <span className="text-xs font-medium">{t('dash.health')}</span>
            </div>
            <p className="text-4xl font-bold font-display text-primary-foreground">{health.score}</p>
            <p className="text-xs text-primary-foreground/70 mt-1">
              Savings: {health.savings} · Debt: {health.debt} · Spending: {health.spending}
            </p>
          </div>
          <div className="w-16 h-16 rounded-full border-4 border-primary-foreground/30 flex items-center justify-center">
            <span className="text-lg font-bold text-primary-foreground">Good</span>
          </div>
        </div>
      </motion.div>

      {/* AI Insights */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-secondary" />
          <h3 className="text-sm font-semibold font-display">{t('dash.insights')}</h3>
        </div>
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="rounded-xl bg-accent/50 p-3 text-xs text-accent-foreground leading-relaxed">
              {insight}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
        <h3 className="text-sm font-semibold font-display mb-3">{t('dash.recent')}</h3>
        <div className="space-y-2">
          {transactions.slice(0, 6).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between rounded-xl bg-card p-3 shadow-card">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                  {tx.type === 'income' ? <ArrowUpRight size={16} className="text-success" /> : <ArrowDownRight size={16} className="text-destructive" />}
                </div>
                <div>
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.category} · {tx.date}</p>
                </div>
              </div>
              <p className={`text-sm font-semibold font-display ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                {tx.type === 'income' ? '+' : '-'}{formatTZS(tx.amount)}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
