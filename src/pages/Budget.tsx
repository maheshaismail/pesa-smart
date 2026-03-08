import { useI18n } from '@/lib/i18n';
import { fetchBudgetCategories, fetchTransactions, formatTZS, upsertBudgetCategory } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';

const defaultBudgets = [
  { category: 'Food', icon: '🍽️', limit: 300000 },
  { category: 'Transport', icon: '🚌', limit: 150000 },
  { category: 'Rent', icon: '🏠', limit: 400000 },
  { category: 'Utilities', icon: '💡', limit: 100000 },
  { category: 'Entertainment', icon: '🎬', limit: 100000 },
  { category: 'Education', icon: '📖', limit: 250000 },
];

const Budget = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: budgets = [] } = useQuery({ queryKey: ['budgets'], queryFn: fetchBudgetCategories });
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const [showAdd, setShowAdd] = useState(false);
  const [newBud, setNewBud] = useState({ category: '', limit: '', icon: '📦' });

  const mutation = useMutation({
    mutationFn: upsertBudgetCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowAdd(false);
      setNewBud({ category: '', limit: '', icon: '📦' });
      toast.success('Budget saved!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Seed defaults if empty
  const setupDefaults = async () => {
    for (const b of defaultBudgets) {
      await upsertBudgetCategory({ category: b.category, monthly_limit: b.limit, icon: b.icon });
    }
    queryClient.invalidateQueries({ queryKey: ['budgets'] });
    toast.success('Default budgets created!');
  };

  const now = new Date();
  const thisMonthExpenses = transactions.filter(tx => {
    const d = new Date(tx.transaction_date);
    return tx.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const budgetWithSpent = budgets.map(b => ({
    ...b,
    spent: thisMonthExpenses.filter(tx => tx.category === b.category).reduce((s, tx) => s + Number(tx.amount), 0),
  }));

  const totalLimit = budgetWithSpent.reduce((s, c) => s + Number(c.monthly_limit), 0);
  const totalSpent = budgetWithSpent.reduce((s, c) => s + c.spent, 0);

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">{t('bud.monthly')}</h1>
        <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
          <Plus size={16} /> Add
        </Button>
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">No budget categories set up yet</p>
          <Button onClick={setupDefaults} className="gradient-primary border-0 text-primary-foreground rounded-xl">
            Set Up Default Budgets
          </Button>
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl gradient-primary p-4 shadow-elevated">
            <div className="flex justify-between text-primary-foreground mb-2">
              <span className="text-sm">{t('bud.spent')}</span>
              <span className="text-sm">{t('bud.limit')}</span>
            </div>
            <div className="flex justify-between text-primary-foreground mb-3">
              <span className="text-2xl font-bold font-display">{formatTZS(totalSpent)}</span>
              <span className="text-lg font-semibold font-display opacity-70">{formatTZS(totalLimit)}</span>
            </div>
            <div className="h-2 rounded-full bg-primary-foreground/20 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${totalLimit > 0 ? Math.min((totalSpent / totalLimit) * 100, 100) : 0}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-primary-foreground" />
            </div>
            <p className="text-xs text-primary-foreground/70 mt-2">{formatTZS(Math.max(0, totalLimit - totalSpent))} TZS {t('bud.remaining').toLowerCase()}</p>
          </motion.div>

          <div className="space-y-3">
            {budgetWithSpent.map((cat, i) => {
              const pct = cat.monthly_limit > 0 ? Math.min((cat.spent / Number(cat.monthly_limit)) * 100, 100) : 0;
              const isOver = cat.spent > Number(cat.monthly_limit) * 0.9;
              return (
                <motion.div key={cat.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="text-sm font-medium">{cat.category}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold font-display ${isOver ? 'text-destructive' : ''}`}>{formatTZS(cat.spent)}</span>
                      <span className="text-xs text-muted-foreground"> / {formatTZS(Number(cat.monthly_limit))}</span>
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

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/30 glass flex items-end justify-center" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">Add Budget Category</h2>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Category name" value={newBud.category} onChange={e => setNewBud(p => ({ ...p, category: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" placeholder="Monthly limit (TZS)" value={newBud.limit} onChange={e => setNewBud(p => ({ ...p, limit: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <Button onClick={() => { if (newBud.category && newBud.limit) mutation.mutate({ category: newBud.category, monthly_limit: parseInt(newBud.limit), icon: newBud.icon }); }} disabled={mutation.isPending} className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3">
                  {mutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Budget;
