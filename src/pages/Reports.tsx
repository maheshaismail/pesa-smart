import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { fetchTransactions, formatTZS, type Transaction } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Brain, AlertTriangle, Lightbulb, Loader2, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

const catColors: Record<string, string> = {
  Food: 'hsl(25,85%,55%)', Transport: 'hsl(210,70%,50%)', Rent: 'hsl(280,60%,55%)',
  Utilities: 'hsl(45,80%,50%)', Entertainment: 'hsl(340,70%,55%)', Education: 'hsl(162,63%,40%)',
  Business: 'hsl(190,60%,45%)', Salary: 'hsl(120,50%,40%)', Freelance: 'hsl(200,60%,50%)',
  Other: 'hsl(0,0%,60%)', Transfer: 'hsl(30,70%,50%)',
};

interface Predictions {
  forecast: Record<string, number> | null;
  trend: string;
  predicted_total: number;
  insights: string[];
  anomalies: { month: string; amount: number; expected: number; deviation: string }[];
  monthlyData: Record<string, { income: number; expenses: number; categories: Record<string, number> }>;
}

const Reports = () => {
  const { t } = useI18n();
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const [predictions, setPredictions] = useState<Predictions | null>(null);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [timeRange, setTimeRange] = useState<'3' | '6' | '12'>('6');

  // Filter transactions by time range
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - parseInt(timeRange));
  const filtered = transactions.filter(tx => new Date(tx.transaction_date) >= cutoff);

  // Monthly aggregation
  const monthlyMap = new Map<string, { month: string; income: number; expenses: number; net: number }>();
  filtered.forEach(tx => {
    const d = new Date(tx.transaction_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en', { month: 'short', year: '2-digit' });
    const entry = monthlyMap.get(key) || { month: label, income: 0, expenses: 0, net: 0 };
    if (tx.type === 'income') entry.income += Number(tx.amount);
    else entry.expenses += Number(tx.amount);
    entry.net = entry.income - entry.expenses;
    monthlyMap.set(key, entry);
  });
  const monthlyChart = Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);

  // Category breakdown
  const expenses = filtered.filter(tx => tx.type === 'expense');
  const catMap: Record<string, number> = {};
  expenses.forEach(tx => { catMap[tx.category] = (catMap[tx.category] || 0) + Number(tx.amount); });
  const categoryData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  const totalExpenses = expenses.reduce((s, tx) => s + Number(tx.amount), 0);

  // Weekly trend (last 8 weeks)
  const weeklyMap: Record<string, number> = {};
  const eightWeeksAgo = new Date();
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
  expenses.filter(tx => new Date(tx.transaction_date) >= eightWeeksAgo).forEach(tx => {
    const d = new Date(tx.transaction_date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' });
    weeklyMap[key] = (weeklyMap[key] || 0) + Number(tx.amount);
  });
  const weeklyData = Object.entries(weeklyMap).map(([week, amount]) => ({ week, amount }));

  // Day of week spending pattern
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daySpending = dayNames.map(day => ({ day, amount: 0, count: 0 }));
  expenses.forEach(tx => {
    const dayIdx = new Date(tx.transaction_date).getDay();
    daySpending[dayIdx].amount += Number(tx.amount);
    daySpending[dayIdx].count++;
  });
  const dayAvgData = daySpending.map(d => ({ ...d, avg: d.count > 0 ? Math.round(d.amount / d.count) : 0 }));

  const fetchPredictions = async () => {
    setLoadingPredictions(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({}),
      });
      if (resp.ok) {
        const data = await resp.json();
        setPredictions(data);
      }
    } catch (e) {
      console.error('Failed to fetch predictions:', e);
    } finally {
      setLoadingPredictions(false);
    }
  };

  useEffect(() => {
    if (transactions.length >= 5) fetchPredictions();
  }, [transactions.length >= 5]);

  const trendIcon = predictions?.trend === 'increasing' ? <TrendingUp size={14} className="text-destructive" />
    : predictions?.trend === 'decreasing' ? <TrendingDown size={14} className="text-success" />
    : <Minus size={14} className="text-muted-foreground" />;

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display flex items-center gap-2">
          <BarChart3 size={20} className="text-primary" /> {t('rep.title')}
        </h1>
        <div className="flex gap-1">
          {(['3', '6', '12'] as const).map(r => (
            <button key={r} onClick={() => setTimeRange(r)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${timeRange === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {r}mo
            </button>
          ))}
        </div>
      </div>

      {/* Monthly Income vs Expenses */}
      {monthlyChart.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold font-display mb-3">{t('rep.monthly')}</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChart} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 11 }} formatter={(val: number) => formatTZS(val) + ' TZS'} />
                <Bar dataKey="income" fill="hsl(145,63%,42%)" radius={[4, 4, 0, 0]} name="Income" />
                <Bar dataKey="expenses" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Net savings trend */}
      {monthlyChart.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold font-display mb-3">{t('rep.netSavings')}</h3>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChart}>
                <defs>
                  <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(162,63%,30%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(162,63%,30%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(val: number) => formatTZS(val) + ' TZS'} />
                <Area type="monotone" dataKey="net" stroke="hsl(162,63%,30%)" fill="url(#netGrad)" strokeWidth={2} name="Net" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold font-display mb-3">{t('rep.byCategory')}</h3>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                    {categoryData.map((entry, i) => <Cell key={i} fill={catColors[entry.name] || '#888'} />)}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatTZS(val) + ' TZS'} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {categoryData.slice(0, 6).map(c => (
                <div key={c.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: catColors[c.name] || '#888' }} />
                  <span className="text-[10px] text-muted-foreground flex-1 truncate">{c.name}</span>
                  <span className="text-[10px] font-medium">{formatTZS(c.value)}</span>
                  <span className="text-[9px] text-muted-foreground">({totalExpenses > 0 ? ((c.value / totalExpenses) * 100).toFixed(0) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Weekly Spending */}
      {weeklyData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold font-display mb-3">{t('rep.weekly')}</h3>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData}>
                <XAxis dataKey="week" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(val: number) => formatTZS(val) + ' TZS'} />
                <Line type="monotone" dataKey="amount" stroke="hsl(38,85%,55%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(38,85%,55%)' }} name="Spent" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Day of Week Pattern */}
      {dayAvgData.some(d => d.avg > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold font-display mb-3 flex items-center gap-1.5"><Calendar size={14} className="text-primary" /> {t('rep.byDay')}</h3>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayAvgData}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 11 }} formatter={(val: number) => formatTZS(val) + ' TZS'} />
                <Bar dataKey="avg" fill="hsl(162,63%,30%)" radius={[4, 4, 0, 0]} name="Avg" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* AI Predictions Section */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl gradient-primary p-4 shadow-elevated">
        <h3 className="text-sm font-bold font-display text-primary-foreground flex items-center gap-1.5 mb-3">
          <Brain size={16} /> {t('rep.aiPredict')}
        </h3>

        {loadingPredictions ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-primary-foreground/70" />
            <span className="text-xs text-primary-foreground/70 ml-2">{t('rep.analyzing')}</span>
          </div>
        ) : predictions ? (
          <div className="space-y-3">
            {/* Trend & predicted total */}
            <div className="flex items-center gap-3 bg-primary-foreground/10 rounded-lg p-3">
              <div className="flex items-center gap-1.5 bg-primary-foreground/20 rounded-md px-2 py-1">
                {trendIcon}
                <span className="text-[10px] text-primary-foreground font-medium capitalize">{predictions.trend === 'increasing' ? t('rep.trend.increasing') : predictions.trend === 'decreasing' ? t('rep.trend.decreasing') : t('rep.trend.stable')}</span>
              </div>
              <div>
                <p className="text-[10px] text-primary-foreground/70">{t('rep.predictedNext')}</p>
                <p className="text-sm font-bold font-display text-primary-foreground">{formatTZS(predictions.predicted_total)} TZS</p>
              </div>
            </div>

            {/* Forecast by category */}
            {predictions.forecast && (
              <div className="space-y-1">
                <p className="text-[10px] text-primary-foreground/70 font-medium">{t('rep.catForecast')}</p>
                {Object.entries(predictions.forecast).slice(0, 5).map(([cat, amount]) => (
                  <div key={cat} className="flex justify-between text-[10px] text-primary-foreground/90">
                    <span>{cat}</span>
                    <span className="font-medium">{formatTZS(Math.round(amount as number))} TZS</span>
                  </div>
                ))}
              </div>
            )}

            {/* Anomalies */}
            {predictions.anomalies?.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] text-primary-foreground/70 font-medium flex items-center gap-1"><AlertTriangle size={10} /> {t('rep.anomalies')}</p>
                {predictions.anomalies.map((a, i) => (
                  <p key={i} className="text-[10px] text-primary-foreground/80">
                    {a.month}: {formatTZS(a.amount)} TZS ({a.deviation === 'high' ? '⬆️ above' : '⬇️ below'} avg of {formatTZS(a.expected)})
                  </p>
                ))}
              </div>
            )}

            {/* Insights */}
            {predictions.insights?.length > 0 && (
              <div className="space-y-1.5">
                {predictions.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-primary-foreground/90 leading-relaxed">
                    <Lightbulb size={10} className="mt-0.5 flex-shrink-0 text-primary-foreground/60" />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            )}

            <button onClick={fetchPredictions} disabled={loadingPredictions} className="text-[10px] text-primary-foreground/60 underline">
              {t('rep.refresh')}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-primary-foreground/70 mb-2">{t('rep.unlockHint')}</p>
            <Button onClick={fetchPredictions} disabled={loadingPredictions} size="sm" variant="secondary" className="text-xs rounded-lg">
              {loadingPredictions ? t('rep.loading') : t('rep.generate')}
            </Button>
          </div>
        )}
      </motion.div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">{t('rep.noData')}</p>
      )}
    </div>
  );
};

export default Reports;
