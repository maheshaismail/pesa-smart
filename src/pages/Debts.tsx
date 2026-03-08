import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { formatTZS } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Debt {
  id: string;
  user_id: string;
  name: string;
  lender: string | null;
  total_amount: number;
  remaining_amount: number;
  interest_rate: number;
  monthly_payment: number | null;
  due_date: string | null;
  type: string;
  icon: string | null;
}

const debtTypes = ['personal', 'bank', 'mobile', 'business'];
const debtIcons = ['💳', '🏦', '📱', '🤝', '🏠', '🚗'];

async function fetchDebts() {
  const { data, error } = await supabase.from('debts').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Debt[];
}

const Debts = () => {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: debts = [] } = useQuery({ queryKey: ['debts'], queryFn: fetchDebts });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', lender: '', total: '', remaining: '', rate: '0', payment: '', due: '', type: 'personal', icon: '💳' });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('debts').insert({
        user_id: user.id,
        name: form.name,
        lender: form.lender || null,
        total_amount: parseFloat(form.total),
        remaining_amount: parseFloat(form.remaining || form.total),
        interest_rate: parseFloat(form.rate || '0'),
        monthly_payment: form.payment ? parseFloat(form.payment) : null,
        due_date: form.due || null,
        type: form.type,
        icon: form.icon,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] });
      setShowAdd(false);
      setForm({ name: '', lender: '', total: '', remaining: '', rate: '0', payment: '', due: '', type: 'personal', icon: '💳' });
      toast.success('Debt added!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalDebt = debts.reduce((s, d) => s + Number(d.remaining_amount), 0);
  const totalOriginal = debts.reduce((s, d) => s + Number(d.total_amount), 0);
  const paidPct = totalOriginal > 0 ? ((totalOriginal - totalDebt) / totalOriginal) * 100 : 0;

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">{t('gen.debt')}</h1>
        <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
          <Plus size={16} /> Add Debt
        </Button>
      </div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card text-center">
        <p className="text-xs text-muted-foreground mb-1">Total Outstanding Debt</p>
        <p className="text-2xl font-bold font-display text-destructive">{formatTZS(totalDebt)} <span className="text-sm font-normal text-muted-foreground">TZS</span></p>
        {totalOriginal > 0 && (
          <>
            <p className="text-xs text-muted-foreground mt-1">{paidPct.toFixed(0)}% paid off of {formatTZS(totalOriginal)} TZS</p>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
              <motion.div initial={{ width: 0 }} animate={{ width: `${paidPct}%` }} transition={{ duration: 1 }} className="h-full rounded-full bg-success" />
            </div>
          </>
        )}
      </motion.div>

      {/* Debt list */}
      {debts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No debts tracked yet. Add one to start managing your loans!</p>
      ) : (
        <div className="space-y-3">
          {debts.map((debt, i) => {
            const pct = Number(debt.total_amount) > 0 ? ((Number(debt.total_amount) - Number(debt.remaining_amount)) / Number(debt.total_amount)) * 100 : 0;
            const monthsLeft = Number(debt.monthly_payment) > 0 ? Math.ceil(Number(debt.remaining_amount) / Number(debt.monthly_payment)) : null;
            return (
              <motion.div key={debt.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl bg-card p-4 shadow-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{debt.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{debt.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{debt.type} loan{debt.lender ? ` · ${debt.lender}` : ''}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold font-display text-success">{pct.toFixed(0)}% paid</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full bg-success" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTZS(Number(debt.remaining_amount))} remaining</span>
                  <span>{formatTZS(Number(debt.total_amount))} total</span>
                </div>
                <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                  {Number(debt.interest_rate) > 0 && <span className="flex items-center gap-1"><TrendingDown size={10} /> {debt.interest_rate}% interest</span>}
                  {debt.monthly_payment && <span>{formatTZS(Number(debt.monthly_payment))}/mo</span>}
                  {monthsLeft && <span className="flex items-center gap-1"><Calendar size={10} /> ~{monthsLeft} months left</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/30 glass flex items-end justify-center" onClick={() => setShowAdd(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">Add Debt</h2>
                <button onClick={() => setShowAdd(false)} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {debtIcons.map(ic => (
                    <button key={ic} onClick={() => setForm(p => ({ ...p, icon: ic }))} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${form.icon === ic ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'}`}>{ic}</button>
                  ))}
                </div>
                <input type="text" placeholder="Debt name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="text" placeholder="Lender (optional)" value={form.lender} onChange={e => setForm(p => ({ ...p, lender: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {debtTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)} Loan</option>)}
                </select>
                <input type="number" placeholder="Total amount (TZS)" value={form.total} onChange={e => setForm(p => ({ ...p, total: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" placeholder="Remaining amount (TZS)" value={form.remaining} onChange={e => setForm(p => ({ ...p, remaining: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" placeholder="Interest rate (%)" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" placeholder="Monthly payment (TZS)" value={form.payment} onChange={e => setForm(p => ({ ...p, payment: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="date" placeholder="Due date" value={form.due} onChange={e => setForm(p => ({ ...p, due: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <Button onClick={() => { if (form.name && form.total) addMutation.mutate(); }} disabled={addMutation.isPending} className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3">
                  {addMutation.isPending ? 'Saving...' : 'Add Debt'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Debts;
