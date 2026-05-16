import { useI18n } from '@/lib/i18n';
import { fetchBudgetCategories, fetchTransactions, formatTZS, upsertBudgetCategory, deleteBudgetCategory, fetchSavingsGoals, BudgetPeriod } from '@/lib/api';
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

const periodLabels: Record<BudgetPeriod, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

const Budget = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgetCategories });
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const [showAdd, setShowAdd] = useState(false);
  const [newBud, setNewBud] = useState<{ category: string; limit: string; icon: string; period: BudgetPeriod }>({ category: '', limit: '', icon: '📦', period: 'monthly' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BudgetPeriod>('monthly');

  const mutation = useMutation({
    mutationFn: upsertBudgetCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowAdd(false);
      setNewBud({ category: '', limit: '', icon: '📦', period: activeTab });
      setEditingId(null);
      toast.success(editingId ? 'Budget updated!' : 'Budget saved!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBudgetCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setDeleteId(null);
      toast.success('Budget category deleted!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (cat: typeof budgets[0]) => {
    setEditingId(cat.id);
    setNewBud({ category: cat.category, limit: String(cat.monthly_limit), icon: cat.icon || '📦', period: cat.period || 'monthly' });
    setShowAdd(true);
  };

  // Calculate period start/end
  const getPeriodRange = (period: BudgetPeriod) => {
    const now = new Date();
    if (period === 'daily') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { start, end: now };
    }
    if (period === 'weekly') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const start = new Date(now.getFullYear(), now.getMonth(), diff);
      return { start, end: now };
    }
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  };

  const activeRange = getPeriodRange(activeTab);

  // Income & expenses for the active period (income is uncategorized — counts ALL income)
  const periodTxs = transactions.filter(tx => {
    const d = new Date(tx.transaction_date);
    return d >= activeRange.start && d <= activeRange.end;
  });
  const periodIncome = periodTxs.filter(tx => tx.type === 'income').reduce((s, tx) => s + Number(tx.amount), 0);
  const periodExpenses = periodTxs.filter(tx => tx.type === 'expense').reduce((s, tx) => s + Number(tx.amount), 0);
  const remainingIncome = periodIncome - periodExpenses;

  const filteredBudgets = budgets.filter(b => (b.period || 'monthly') === activeTab);

  const budgetWithSpent = filteredBudgets.map(b => {
    const spent = periodTxs
      .filter(tx => tx.type === 'expense' && tx.category === b.category)
      .reduce((s, tx) => s + Number(tx.amount), 0);
    return { ...b, spent };
  });

  const totalLimit = budgetWithSpent.reduce((s, c) => s + Number(c.monthly_limit), 0);
  const totalSpent = budgetWithSpent.reduce((s, c) => s + c.spent, 0);

  // Cascade math: income → budget → savings (leftover) / debt (overspend)
  const allocatedFromIncome = totalLimit;
  const incomeAfterBudget = periodIncome - allocatedFromIncome;
  const perCategoryLeftover = budgetWithSpent.map(b => ({
    category: b.category,
    leftover: Number(b.monthly_limit) - b.spent, // positive = saving, negative = overspend
  }));
  const autoSavings = perCategoryLeftover.reduce((s, c) => s + Math.max(0, c.leftover), 0);
  const autoDebt = perCategoryLeftover.reduce((s, c) => s + Math.max(0, -c.leftover), 0);

  // Period key for idempotent settlement records
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
      toast.info('Nothing to settle — no leftover or overspend');
      return;
    }
    setSettling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Auto savings: upsert by name
      if (autoSavings > 0) {
        const { data: existing } = await supabase
          .from('savings_goals').select('id').eq('user_id', user.id).eq('name', savingsLabel).maybeSingle();
        if (existing) {
          await supabase.from('savings_goals').update({ saved_amount: autoSavings, target_amount: autoSavings }).eq('id', existing.id);
        } else {
          await supabase.from('savings_goals').insert({
            user_id: user.id, name: savingsLabel, target_amount: autoSavings, saved_amount: autoSavings, icon: '🏦',
          });
        }
      }

      // Auto debt: upsert by name
      if (autoDebt > 0) {
        const { data: existing } = await supabase
          .from('debts').select('id').eq('user_id', user.id).eq('name', debtLabel).maybeSingle();
        if (existing) {
          await supabase.from('debts').update({ remaining_amount: autoDebt, total_amount: autoDebt }).eq('id', existing.id);
        } else {
          await supabase.from('debts').insert({
            user_id: user.id, name: debtLabel, lender: 'Self (budget overflow)', total_amount: autoDebt, remaining_amount: autoDebt, type: 'personal', icon: '⚠️',
          });
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

  const icons = ['📦', '🍽️', '🚌', '🏠', '💡', '🎬', '📖', '💊'];
  const periods: BudgetPeriod[] = ['daily', 'weekly', 'monthly'];

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">{t('bud.monthly')}</h1>
        <Button onClick={() => { setEditingId(null); setNewBud({ category: '', limit: '', icon: '📦', period: activeTab }); setShowAdd(true); }} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
          <Plus size={16} /> Add
        </Button>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted">
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setActiveTab(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === p ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground'}`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Income vs Budget summary — always visible */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl gradient-primary p-4 shadow-elevated">
        <div className="flex items-center gap-2 text-primary-foreground mb-3">
          <Wallet size={16} />
          <span className="text-sm font-medium">{periodLabels[activeTab]} Income</span>
        </div>
        <div className="text-3xl font-bold font-display text-primary-foreground mb-3">
          {formatTZS(periodIncome)} <span className="text-sm font-normal opacity-70">TZS</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-lg bg-primary-foreground/10 p-2.5">
            <div className="flex items-center gap-1 text-primary-foreground/80 text-[10px] mb-0.5">
              <TrendingDown size={10} /> Spent
            </div>
            <p className="text-sm font-semibold font-display text-primary-foreground">{formatTZS(periodExpenses)}</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 p-2.5">
            <div className="flex items-center gap-1 text-primary-foreground/80 text-[10px] mb-0.5">
              <TrendingUp size={10} /> Remaining
            </div>
            <p className={`text-sm font-semibold font-display ${remainingIncome < 0 ? 'text-destructive-foreground' : 'text-primary-foreground'}`}>
              {formatTZS(remainingIncome)}
            </p>
          </div>
        </div>
        <div className="h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${periodIncome > 0 ? Math.min((periodExpenses / periodIncome) * 100, 100) : 0}%` }}
            transition={{ duration: 1 }}
            className={`h-full rounded-full ${periodExpenses > periodIncome ? 'bg-destructive' : 'bg-primary-foreground'}`}
          />
        </div>
        <p className="text-[10px] text-primary-foreground/70 mt-2">
          {periodIncome === 0
            ? 'Add income transactions to track your remaining balance'
            : periodExpenses > periodIncome
              ? '⚠️ Spending exceeds income for this period'
              : `${periodIncome > 0 ? Math.round((periodExpenses / periodIncome) * 100) : 0}% of income spent`}
        </p>
      </motion.div>

      {/* Cascade: income → budget → savings/debts */}
      {filteredBudgets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-display flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" /> Money Flow
            </h3>
            <button
              onClick={settlePeriod}
              disabled={settling || (autoSavings === 0 && autoDebt === 0)}
              className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
            >
              {settling ? 'Settling...' : 'Settle period'}
            </button>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Wallet size={11} /> Income</span>
              <span className="font-medium">{formatTZS(periodIncome)}</span>
            </div>
            <div className="flex items-center justify-between pl-4 border-l-2 border-primary/30">
              <span className="text-muted-foreground">− Allocated to budgets</span>
              <span className="font-medium text-destructive">−{formatTZS(allocatedFromIncome)}</span>
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
            Budget is reserved from your income. Each expense reduces its category budget. At period end, tap <b>Settle</b> to push unspent budget into Savings and overspend into Debts.
          </p>
        </motion.div>
      )}

      {/* Category budgets section */}
      {filteredBudgets.length === 0 ? (
        <div className="text-center py-8 rounded-xl bg-card shadow-card">
          <p className="text-sm text-muted-foreground mb-1">No {periodLabels[activeTab].toLowerCase()} category budgets yet</p>
          <p className="text-xs text-muted-foreground/70">Tap "Add" above to set spending limits per category</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">Category Budgets</h2>
            <span className="text-xs text-muted-foreground">{formatTZS(totalSpent)} / {formatTZS(totalLimit)}</span>
          </div>
          <div className="space-y-3">
            {budgetWithSpent.map((cat, i) => {
              const pct = cat.monthly_limit > 0 ? Math.min((cat.spent / Number(cat.monthly_limit)) * 100, 100) : 0;
              const isOver = cat.spent > Number(cat.monthly_limit) * 0.9;
              return (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <div>
                        <span className="text-sm font-medium block">{cat.category}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">{cat.period}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className={`text-sm font-semibold font-display ${isOver ? 'text-destructive' : ''}`}>{formatTZS(cat.spent)}</span>
                        <span className="text-xs text-muted-foreground"> / {formatTZS(Number(cat.monthly_limit))}</span>
                      </div>
                      <button onClick={() => handleEdit(cat)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(cat.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.06 }} className={`h-full rounded-full ${isOver ? 'bg-destructive' : 'bg-primary'}`} />
                  </div>
                  {isOver && <p className="text-[10px] text-destructive mt-1.5 font-medium">⚠️ Almost at limit</p>}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-foreground/30 glass flex items-end justify-center" onClick={() => { setShowAdd(false); setEditingId(null); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">{editingId ? 'Edit Budget Category' : 'Add Budget Category'}</h2>
                <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {icons.map(ic => (
                    <button key={ic} onClick={() => setNewBud(p => ({ ...p, icon: ic }))} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${newBud.icon === ic ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'}`}>{ic}</button>
                  ))}
                </div>
                <input type="text" placeholder="Category name" value={newBud.category} onChange={e => setNewBud(p => ({ ...p, category: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" placeholder="Limit (TZS)" value={newBud.limit} onChange={e => setNewBud(p => ({ ...p, limit: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <div className="flex gap-2">
                  {periods.map(p => (
                    <button
                      key={p}
                      onClick={() => setNewBud(prev => ({ ...prev, period: p }))}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${newBud.period === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                    >
                      {periodLabels[p]}
                    </button>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    if (newBud.category && newBud.limit) {
                      mutation.mutate({
                        id: editingId || undefined,
                        category: newBud.category,
                        monthly_limit: parseInt(newBud.limit),
                        icon: newBud.icon,
                        period: newBud.period,
                      });
                    }
                  }}
                  disabled={mutation.isPending}
                  className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3"
                >
                  {mutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Save'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget Category</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this budget category. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Budget;
