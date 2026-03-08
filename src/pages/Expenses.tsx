import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { fetchTransactions, addTransaction, formatTZS, type Transaction } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const categoryColors: Record<string, string> = {
  Food: 'hsl(25,85%,55%)', Transport: 'hsl(210,70%,50%)', Rent: 'hsl(280,60%,55%)',
  Utilities: 'hsl(45,80%,50%)', Entertainment: 'hsl(340,70%,55%)', Education: 'hsl(162,63%,40%)',
  Business: 'hsl(190,60%,45%)', Salary: 'hsl(120,50%,40%)', Freelance: 'hsl(200,60%,50%)',
  Other: 'hsl(0,0%,60%)',
};

const categories = ['Food', 'Transport', 'Rent', 'Utilities', 'Entertainment', 'Education', 'Business', 'Other'];

const Expenses = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: txs = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [newTx, setNewTx] = useState({ amount: '', category: 'Food', description: '', type: 'expense' as 'income' | 'expense' });

  const mutation = useMutation({
    mutationFn: addTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setNewTx({ amount: '', category: 'Food', description: '', type: 'expense' });
      setShowAdd(false);
      toast.success('Transaction added!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = txs.filter(tx => filter === 'all' || tx.type === filter);
  const expenses = txs.filter(tx => tx.type === 'expense');
  const catData = categories.map(cat => ({
    name: cat,
    value: expenses.filter(tx => tx.category === cat).reduce((s, tx) => s + Number(tx.amount), 0),
  })).filter(c => c.value > 0);

  const handleAdd = () => {
    if (!newTx.amount || !newTx.description) return;
    mutation.mutate({
      amount: parseInt(newTx.amount),
      type: newTx.type,
      category: newTx.category,
      description: newTx.description,
    });
  };

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">{t('nav.expenses')}</h1>
        <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
          <Plus size={16} /> {t('exp.add')}
        </Button>
      </div>

      {catData.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-card p-4 shadow-card">
          <h3 className="text-sm font-semibold font-display mb-2">Spending Breakdown</h3>
          <div className="h-44 flex items-center">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" strokeWidth={2} stroke="hsl(var(--card))">
                  {catData.map((entry, i) => <Cell key={i} fill={categoryColors[entry.name] || '#888'} />)}
                </Pie>
                <Tooltip formatter={(val: number) => formatTZS(val) + ' TZS'} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {catData.map((c) => (
                <div key={c.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: categoryColors[c.name] }} />
                  <span className="text-muted-foreground flex-1">{c.name}</span>
                  <span className="font-medium">{formatTZS(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex gap-2">
        {(['all', 'income', 'expense'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {f === 'all' ? 'All' : f === 'income' ? t('dash.income') : t('dash.expenses')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => (
            <motion.div key={tx.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between rounded-xl bg-card p-3 shadow-card">
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
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/30 glass flex items-end justify-center" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">{t('exp.add')}</h2>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <div className="flex gap-2 mb-4">
                {(['expense', 'income'] as const).map(tp => (
                  <button key={tp} onClick={() => setNewTx(p => ({ ...p, type: tp }))} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${newTx.type === tp ? (tp === 'expense' ? 'bg-destructive text-destructive-foreground' : 'bg-success text-success-foreground') : 'bg-muted text-muted-foreground'}`}>
                    {tp === 'expense' ? t('dash.expenses') : t('dash.income')}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                <input type="number" placeholder={t('exp.amount') + ' (TZS)'} value={newTx.amount} onChange={e => setNewTx(p => ({ ...p, amount: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <select value={newTx.category} onChange={e => setNewTx(p => ({ ...p, category: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {(newTx.type === 'income' ? ['Salary', 'Freelance', 'Business', 'Other'] : categories).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <input type="text" placeholder={t('exp.description')} value={newTx.description} onChange={e => setNewTx(p => ({ ...p, description: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <Button onClick={handleAdd} disabled={mutation.isPending} className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3">
                  {mutation.isPending ? 'Saving...' : t('gen.save')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Expenses;
