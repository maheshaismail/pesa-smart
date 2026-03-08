import { useI18n } from '@/lib/i18n';
import { fetchBudgetCategories, fetchTransactions, formatTZS, upsertBudgetCategory } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: upsertBudgetCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowAdd(false);
      setNewBud({ category: '', limit: '', icon: '📦' });
      setEditingId(null);
      toast.success(editingId ? 'Budget updated!' : 'Budget saved!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budget_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setDeleteId(null);
      toast.success('Budget category deleted!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (cat: typeof budgets[0]) => {
    setEditingId(cat.id);
    setNewBud({ category: cat.category, limit: String(cat.monthly_limit), icon: cat.icon || '📦' });
    setShowAdd(true);
  };

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

  const icons = ['📦', '🍽️', '🚌', '🏠', '💡', '🎬', '📖', '💊'];

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">{t('bud.monthly')}</h1>
        <Button onClick={() => { setEditingId(null); setNewBud({ category: '', limit: '', icon: '📦' }); setShowAdd(true); }} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
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
                <input type="text" placeholder="Category name" value={newBud.category} onChange={e => setNewBud(p => ({ ...p, category: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" disabled={!!editingId} />
                <input type="number" placeholder="Monthly limit (TZS)" value={newBud.limit} onChange={e => setNewBud(p => ({ ...p, limit: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <Button onClick={() => { if (newBud.category && newBud.limit) mutation.mutate({ category: newBud.category, monthly_limit: parseInt(newBud.limit), icon: newBud.icon }); }} disabled={mutation.isPending} className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3">
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
