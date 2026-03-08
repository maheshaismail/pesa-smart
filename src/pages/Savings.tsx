import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { fetchSavingsGoals, addSavingsGoal, updateSavingsGoal, formatTZS } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Savings = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: goals = [] } = useQuery({ queryKey: ['savings_goals'], queryFn: fetchSavingsGoals });
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', icon: '🎯', deadline: '', saved: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const addMutation = useMutation({
    mutationFn: addSavingsGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings_goals'] });
      resetForm();
      toast.success('Goal created!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; saved_amount?: number; target_amount?: number; icon?: string; deadline?: string | null }) => {
      const { error } = await supabase.from('savings_goals').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings_goals'] });
      resetForm();
      toast.success('Goal updated!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings_goals'] });
      setDeleteId(null);
      toast.success('Goal deleted!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setNewGoal({ name: '', target: '', icon: '🎯', deadline: '', saved: '' });
    setEditingId(null);
    setShowAdd(false);
  };

  const handleEdit = (goal: typeof goals[0]) => {
    setEditingId(goal.id);
    setNewGoal({
      name: goal.name,
      target: String(goal.target_amount),
      icon: goal.icon || '🎯',
      deadline: goal.deadline || '',
      saved: String(goal.saved_amount),
    });
    setShowAdd(true);
  };

  const handleSubmit = () => {
    if (!newGoal.name || !newGoal.target) return;
    if (editingId) {
      editMutation.mutate({
        id: editingId,
        name: newGoal.name,
        target_amount: parseInt(newGoal.target),
        saved_amount: parseInt(newGoal.saved || '0'),
        icon: newGoal.icon,
        deadline: newGoal.deadline || null,
      });
    } else {
      addMutation.mutate({ name: newGoal.name, target_amount: parseInt(newGoal.target), icon: newGoal.icon, deadline: newGoal.deadline || undefined });
    }
  };

  const totalSaved = goals.reduce((s, g) => s + Number(g.saved_amount), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount), 0);
  const icons = ['🎯', '🛡️', '💻', '🏠', '📚', '🚗', '✈️', '💰'];
  const isSaving = addMutation.isPending || editMutation.isPending;

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">{t('sav.goals')}</h1>
        <Button onClick={() => { resetForm(); setShowAdd(true); }} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
          <Plus size={16} /> {t('sav.add')}
        </Button>
      </div>

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No savings goals yet. Create one to start saving!</p>
      ) : (
        <>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Saved</p>
            <p className="text-2xl font-bold font-display text-primary">{formatTZS(totalSaved)} <span className="text-sm font-normal text-muted-foreground">TZS</span></p>
            {totalTarget > 0 && (
              <>
                <p className="text-xs text-muted-foreground mt-1">of {formatTZS(totalTarget)} TZS total goals</p>
                <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(totalSaved / totalTarget) * 100}%` }} transition={{ duration: 1 }} className="h-full rounded-full gradient-primary" />
                </div>
              </>
            )}
          </motion.div>

          <div className="space-y-3">
            {goals.map((goal, i) => {
              const pct = Number(goal.target_amount) > 0 ? (Number(goal.saved_amount) / Number(goal.target_amount)) * 100 : 0;
              const remaining = Number(goal.target_amount) - Number(goal.saved_amount);
              return (
                <motion.div key={goal.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="rounded-xl bg-card p-4 shadow-card">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{goal.icon}</span>
                      <div>
                        <p className="text-sm font-semibold">{goal.name}</p>
                        {goal.deadline && <p className="text-[10px] text-muted-foreground">Deadline: {goal.deadline}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold font-display text-primary">{pct.toFixed(0)}%</span>
                      <button onClick={() => handleEdit(goal)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(goal.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: i * 0.08 }} className="h-full rounded-full gradient-primary" />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTZS(Number(goal.saved_amount))} saved</span>
                    <span>{formatTZS(Math.max(0, remaining))} remaining</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-foreground/30 glass flex items-end justify-center" onClick={resetForm}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">{editingId ? 'Edit Goal' : t('sav.add')}</h2>
                <button onClick={resetForm} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {icons.map(ic => (
                    <button key={ic} onClick={() => setNewGoal(p => ({ ...p, icon: ic }))} className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center ${newGoal.icon === ic ? 'bg-primary/10 ring-2 ring-primary' : 'bg-muted'}`}>{ic}</button>
                  ))}
                </div>
                <input type="text" placeholder="Goal name" value={newGoal.name} onChange={e => setNewGoal(p => ({ ...p, name: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <input type="number" placeholder="Target amount (TZS)" value={newGoal.target} onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                {editingId && (
                  <input type="number" placeholder="Amount saved (TZS)" value={newGoal.saved} onChange={e => setNewGoal(p => ({ ...p, saved: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                )}
                <input type="date" value={newGoal.deadline} onChange={e => setNewGoal(p => ({ ...p, deadline: e.target.value }))} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                <Button onClick={handleSubmit} disabled={isSaving} className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3">
                  {isSaving ? 'Saving...' : editingId ? 'Update Goal' : t('gen.save')}
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
            <AlertDialogTitle>Delete Savings Goal</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this savings goal. Are you sure?</AlertDialogDescription>
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

export default Savings;
