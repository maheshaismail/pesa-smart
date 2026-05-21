import { useI18n } from '@/lib/i18n';
import { fetchBudgetCategories, fetchTransactions, formatTZS, upsertBudgetCategory, deleteBudgetCategory, BudgetPeriod } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Pencil, Trash2, Wallet, TrendingDown, TrendingUp, PiggyBank, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import BudgetPlanGenerator from '@/components/BudgetPlanGenerator';

const periodLabels: Record<BudgetPeriod, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
const GENERAL_KEY = 'General';

const Budget = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgetCategories });
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const [showAdd, setShowAdd] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BudgetPeriod>('monthly');

  // Only general budgets — one per period
  const generalBudgets = budgets.filter(b => b.category === GENERAL_KEY);
  const currentBudget = generalBudgets.find(b => (b.period || 'monthly') === activeTab);

  const mutation = useMutation({
    mutationFn: upsertBudgetCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowAdd(false);
      setLimitInput('');
      toast.success(currentBudget ? 'Budget updated!' : 'Budget saved!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudgetCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setDeleteId(null);
      toast.success('Budget removed!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Period start/end
  const getPeriodRange = (period: BudgetPeriod) => {
    const now = new Date();
    if (period === 'daily') return { start: new Date(now.getFullYear(), now.getMonth(), now.getDate()), end: now };
    if (period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      return { start: new Date(now.getFullYear(), now.getMonth(), diff), end: now };
    }
    return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  };

  const activeRange = getPeriodRange(activeTab);
  const periodTxs = transactions.filter(tx => {
    const d = new Date(tx.transaction_date);
    return d >= activeRange.start && d <= activeRange.end;
  });
  const periodIncome = periodTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
  const periodExpenses = periodTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);

  const budgetLimit = currentBudget ? Number(currentBudget.monthly_limit) : 0;
  const remainingBudget = budgetLimit - periodExpenses; // positive = leftover, negative = overspend
  const incomeAfterBudget = periodIncome - budgetLimit;
  const autoSavings = Math.max(0, remainingBudget);
  const autoDebt = Math.max(0, -remainingBudget);

  const periodKey = activeTab === 'daily'
    ? activeRange.start.toISOString().split('T')[0]
    : activeTab === 'weekly'
      ? `W${activeRange.start.toISOString().split('T')[0]}`
      : `${activeRange.start.getFullYear()}-${String(activeRange.start.getMonth() + 1).padStart(2, '0')}`;
  const savingsLabel = `Auto Savings · ${activeTab} ${periodKey}`;
  const debtLabel = `Budget Overflow · ${activeTab} ${periodKey}`;

  const [settling, setSettling] = useState(false);
  const settlePeriod = async () => {
    if (autoSavings === 0 && autoDebt === 0) {
      toast.info('Nothing to settle');
      return;
    }
    setSettling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (autoSavings > 0) {
        const { data: existing } = await supabase.from('savings_goals').select('id').eq('user_id', user.id).eq('name', savingsLabel).maybeSingle();
        if (existing) {
          await supabase.from('savings_goals').update({ saved_amount: autoSavings, target_amount: autoSavings }).eq('id', existing.id);
        } else {
          await supabase.from('savings_goals').insert({ user_id: user.id, name: savingsLabel, target_amount: autoSavings, saved_amount: autoSavings, icon: '🏦' });
        }
      }
      if (autoDebt > 0) {
        const { data: existing } = await supabase.from('debts').select('id').eq('user_id', user.id).eq('name', debtLabel).maybeSingle();
        if (existing) {
          await supabase.from('debts').update({ remaining_amount: autoDebt, total_amount: autoDebt }).eq('id', existing.id);
        } else {
          await supabase.from('debts').insert({ user_id: user.id, name: debtLabel, lender: 'Self (budget overflow)', total_amount: autoDebt, remaining_amount: autoDebt, type: 'personal', icon: '⚠️' });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['savings'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success(`Settled: ${formatTZS(autoSavings)} → savings, ${formatTZS(autoDebt)} → debt`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to settle');
    } finally {
      setSettling(false);
    }
  };

  const periods: BudgetPeriod[] = ['daily', 'weekly', 'monthly'];
  const openEditor = () => {
    setLimitInput(currentBudget ? String(currentBudget.monthly_limit) : '');
    setShowAdd(true);
  };

  const pct = budgetLimit > 0 ? Math.min((periodExpenses / budgetLimit) * 100, 100) : 0;
  const isOver = budgetLimit > 0 && periodExpenses > budgetLimit * 0.9;

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">{t('bud.monthly')}</h1>
        <Button onClick={openEditor} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
          <Plus size={16} /> {currentBudget ? 'Edit' : 'Set'}
        </Button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted">
        {periods.map(p => (
          <button key={p} onClick={() => setActiveTab(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === p ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground'}`}>
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Income summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl gradient-primary p-4 shadow-elevated">
        <div className="flex items-center gap-2 text-primary-foreground mb-3">
          <Wallet size={16} />
          <span className="text-sm font-medium">{periodLabels[activeTab]} Income</span>
        </div>
        <div className="text-3xl font-bold font-display text-primary-foreground mb-3">
          {formatTZS(periodIncome)} <span className="text-sm font-normal opacity-70">TZS</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-primary-foreground/10 p-2.5">
            <div className="flex items-center gap-1 text-primary-foreground/80 text-[10px] mb-0.5">
              <TrendingDown size={10} /> Spent
            </div>
            <p className="text-sm font-semibold font-display text-primary-foreground">{formatTZS(periodExpenses)}</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 p-2.5">
            <div className="flex items-center gap-1 text-primary-foreground/80 text-[10px] mb-0.5">
              <TrendingUp size={10} /> Income left
            </div>
            <p className={`text-sm font-semibold font-display ${periodIncome - periodExpenses < 0 ? 'text-destructive-foreground' : 'text-primary-foreground'}`}>
              {formatTZS(periodIncome - periodExpenses)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* General budget card */}
      {currentBudget ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold font-display">General {periodLabels[activeTab]} Budget</h3>
              <p className="text-[10px] text-muted-foreground">Single overall spending cap for this period</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={openEditor} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                <Pencil size={14} />
              </button>
              <button onClick={() => setDeleteId(currentBudget.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="flex items-baseline justify-between mb-2">
            <span className={`text-2xl font-bold font-display ${isOver ? 'text-destructive' : ''}`}>{formatTZS(periodExpenses)}</span>
            <span className="text-xs text-muted-foreground">of {formatTZS(budgetLimit)} TZS</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${isOver ? 'bg-destructive' : 'bg-primary'}`} />
          </div>
          {isOver && <p className="text-[10px] text-destructive mt-1.5 font-medium">⚠️ Near or over budget limit</p>}
        </motion.div>
      ) : (
        <div className="text-center py-8 rounded-xl bg-card shadow-card">
          <p className="text-sm text-muted-foreground mb-1">No {periodLabels[activeTab].toLowerCase()} budget set</p>
          <p className="text-xs text-muted-foreground/70">Tap "Set" above to define your overall spending limit</p>
        </div>
      )}

      {/* Money flow cascade */}
      {currentBudget && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-display flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" /> Money Flow
            </h3>
            <button onClick={settlePeriod} disabled={settling || (autoSavings === 0 && autoDebt === 0)}
              className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-primary text-primary-foreground disabled:opacity-40">
              {settling ? 'Settling...' : 'Settle period'}
            </button>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Wallet size={11} /> Income</span>
              <span className="font-medium">{formatTZS(periodIncome)}</span>
            </div>
            <div className="flex items-center justify-between pl-4 border-l-2 border-primary/30">
              <span className="text-muted-foreground">− Allocated to budget</span>
              <span className="font-medium text-destructive">−{formatTZS(budgetLimit)}</span>
            </div>
            <div className="flex items-center justify-between pl-4 border-l-2 border-primary/30">
              <span className="text-muted-foreground">= Unallocated income</span>
              <span className={`font-medium ${incomeAfterBudget < 0 ? 'text-destructive' : ''}`}>{formatTZS(incomeAfterBudget)}</span>
            </div>
            <div className="border-t border-border pt-1.5 mt-1.5" />
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><PiggyBank size={11} className="text-success" /> Auto savings (unspent budget)</span>
              <span className="font-semibold text-success">+{formatTZS(autoSavings)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><AlertTriangle size={11} className="text-destructive" /> Auto debt (overspend)</span>
              <span className="font-semibold text-destructive">{formatTZS(autoDebt)}</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Budget is reserved from your income. Every expense reduces it. At period end, tap <b>Settle</b> to push unspent budget into Savings and overspend into Debts.
          </p>
        </motion.div>
      )}

      {/* Set/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-foreground/30 glass flex items-end justify-center" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">{currentBudget ? 'Edit' : 'Set'} {periodLabels[activeTab]} Budget</h2>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Set a single overall spending limit for {periodLabels[activeTab].toLowerCase()}. Every expense you record will count against this budget.</p>
                <input type="number" placeholder="Budget limit (TZS)" value={limitInput} onChange={e => setLimitInput(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" autoFocus />
                <Button
                  onClick={() => {
                    if (!limitInput) return;
                    mutation.mutate({
                      id: currentBudget?.id,
                      category: GENERAL_KEY,
                      monthly_limit: parseInt(limitInput),
                      icon: '💰',
                      period: activeTab,
                    });
                  }}
                  disabled={mutation.isPending || !limitInput}
                  className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3"
                >
                  {mutation.isPending ? 'Saving...' : currentBudget ? 'Update' : 'Save'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Budget</AlertDialogTitle>
            <AlertDialogDescription>This will remove your {periodLabels[activeTab].toLowerCase()} budget. You can set a new one anytime.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Budget;
