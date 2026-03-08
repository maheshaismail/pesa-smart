import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { formatTZS } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Check, Bell, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BillReminder {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number;
  category: string;
  icon: string | null;
  is_paid: boolean;
  paid_date: string | null;
}

const billIcons = ['💡', '💧', '📶', '🏠', '📱', '📺', '🏥', '📄'];
const billCategories = ['Electricity', 'Water', 'Internet', 'Rent', 'Phone', 'TV', 'Insurance', 'Other'];

async function fetchBills() {
  const { data, error } = await supabase.from('bill_reminders').select('*').order('due_day');
  if (error) throw error;
  return (data || []) as BillReminder[];
}

const Bills = () => {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data: bills = [] } = useQuery({ queryKey: ['bills'], queryFn: fetchBills });
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', amount: '', due_day: '1', category: 'Electricity', icon: '💡' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setForm({ name: '', amount: '', due_day: '1', category: 'Electricity', icon: '💡' });
    setEditingId(null);
    setShowAdd(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from('bill_reminders').update({
          name: form.name,
          amount: parseFloat(form.amount),
          due_day: parseInt(form.due_day),
          category: form.category,
          icon: form.icon,
        }).eq('id', editingId);
        if (error) throw error;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { error } = await supabase.from('bill_reminders').insert({
          user_id: user.id,
          name: form.name,
          amount: parseFloat(form.amount),
          due_day: parseInt(form.due_day),
          category: form.category,
          icon: form.icon,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      resetForm();
      toast.success(editingId ? 'Bill updated!' : 'Bill reminder added!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bill_reminders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      setDeleteId(null);
      toast.success('Bill deleted!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePaid = useMutation({
    mutationFn: async (bill: BillReminder) => {
      const markingPaid = !bill.is_paid;
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase.from('bill_reminders').update({
        is_paid: markingPaid,
        paid_date: markingPaid ? today : null,
      }).eq('id', bill.id);
      if (error) throw error;

      if (markingPaid) {
        // Record as expense transaction
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const { error: txError } = await supabase.from('transactions').insert({
          user_id: user.id,
          amount: bill.amount,
          type: 'expense' as const,
          category: bill.category,
          description: `Bill payment: ${bill.name}`,
          source: 'bill_payment',
          transaction_date: today,
        });
        if (txError) throw txError;
      } else {
        // Remove the auto-recorded expense when unmarking
        const { data: { user } } = await supabase.auth.getUser();
        if (user && bill.paid_date) {
          await supabase.from('transactions').delete()
            .eq('user_id', user.id)
            .eq('source', 'bill_payment')
            .eq('description', `Bill payment: ${bill.name}`)
            .eq('transaction_date', bill.paid_date);
        }
      }
    },
    onSuccess: (_data, bill) => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      const paid = !bill.is_paid;
      toast.success(paid ? `${bill.name} marked paid & recorded as expense` : `${bill.name} unmarked — expense removed`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (bill: BillReminder) => {
    setEditingId(bill.id);
    setForm({ name: bill.name, amount: String(bill.amount), due_day: String(bill.due_day), category: bill.category, icon: bill.icon || '📄' });
    setShowAdd(true);
  };

  const today = new Date().getDate();
  const totalMonthly = bills.reduce((s, b) => s + Number(b.amount), 0);
  const paidCount = bills.filter(b => b.is_paid).length;
  const upcoming = bills.filter(b => !b.is_paid && b.due_day >= today).sort((a, b) => a.due_day - b.due_day);
  const overdue = bills.filter(b => !b.is_paid && b.due_day < today);

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">Bill Reminders</h1>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
          <Plus size={16} /> Add Bill
        </Button>
      </div>

      {/* Summary */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-muted-foreground">Monthly Bills</p>
            <p className="text-lg font-bold font-display">{formatTZS(totalMonthly)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Paid</p>
            <p className="text-lg font-bold font-display text-success">{paidCount}/{bills.length}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Overdue</p>
            <p className="text-lg font-bold font-display text-destructive">{overdue.length}</p>
          </div>
        </div>
      </motion.div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1"><Bell size={12} /> Overdue</h3>
          <div className="space-y-2">
            {overdue.map(bill => (
              <BillCard key={bill.id} bill={bill} onToggle={() => togglePaid.mutate(bill)} onEdit={() => handleEdit(bill)} onDelete={() => setDeleteId(bill.id)} isOverdue />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">Upcoming</h3>
          <div className="space-y-2">
            {upcoming.map(bill => (
              <BillCard key={bill.id} bill={bill} onToggle={() => togglePaid.mutate(bill)} onEdit={() => handleEdit(bill)} onDelete={() => setDeleteId(bill.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Paid */}
      {paidCount > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-success mb-2">Paid This Month</h3>
          <div className="space-y-2">
            {bills.filter(b => b.is_paid).map(bill => (
              <BillCard key={bill.id} bill={bill} onToggle={() => togglePaid.mutate(bill)} onEdit={() => handleEdit(bill)} onDelete={() => setDeleteId(bill.id)} />
            ))}
          </div>
        </div>
      )}

      {bills.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No bill reminders yet. Add your recurring bills to stay on track!</p>}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-foreground/30 glass flex items-end justify-center" onClick={resetForm}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">{editingId ? 'Edit Bill' : 'Add Bill Reminder'}</h2>
                <button onClick={resetForm} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {billIcons.map(ic => (
                    <button key={ic} onClick={() => setForm(p => ({ ...p, icon: ic }))} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${form.icon === ic ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'}`}>{ic}</button>
                  ))}
                </div>
                <input type="text" placeholder="Bill name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" placeholder="Amount (TZS)" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {billCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Due day of month</label>
                  <input type="number" min="1" max="31" value={form.due_day} onChange={e => setForm(p => ({ ...p, due_day: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <Button onClick={() => { if (form.name && form.amount) saveMutation.mutate(); }} disabled={saveMutation.isPending} className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3">
                  {saveMutation.isPending ? 'Saving...' : editingId ? 'Update Bill' : 'Add Bill'}
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
            <AlertDialogTitle>Delete Bill Reminder</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this bill reminder. Are you sure?</AlertDialogDescription>
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

function BillCard({ bill, onToggle, onEdit, onDelete, isOverdue }: { bill: BillReminder; onToggle: () => void; onEdit: () => void; onDelete: () => void; isOverdue?: boolean }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center justify-between rounded-xl bg-card p-3 shadow-card ${isOverdue ? 'ring-1 ring-destructive/30' : ''}`}>
      <div className="flex items-center gap-3">
        <button onClick={onToggle} className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${bill.is_paid ? 'bg-success border-success' : 'border-input'}`}>
          {bill.is_paid && <Check size={14} className="text-success-foreground" />}
        </button>
        <span className="text-lg">{bill.icon}</span>
        <div>
          <p className={`text-sm font-medium ${bill.is_paid ? 'line-through text-muted-foreground' : ''}`}>{bill.name}</p>
          <p className="text-[10px] text-muted-foreground">{bill.category} · Due day {bill.due_day}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-semibold font-display">{formatTZS(Number(bill.amount))}</p>
        <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

export default Bills;
