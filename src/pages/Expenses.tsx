import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { fetchTransactions, addTransaction, updateTransaction, deleteTransaction, bulkDeleteTransactions, formatTZS, type Transaction } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowUpRight, ArrowDownRight, X, MessageSquare, Loader2, Pencil, Trash2, CheckSquare, Square, XCircle, Search, CalendarIcon, Filter, Sparkles, Brain } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { saveOfflineTransaction, isOnline } from '@/lib/offline-db';
import { supabase } from '@/integrations/supabase/client';
import SwipeToDelete from '@/components/SwipeToDelete';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
  const [smsText, setSmsText] = useState('');
  const [smsMode, setSmsMode] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['transactions'] });

  const addMutation = useMutation({
    mutationFn: addTransaction,
    onSuccess: () => { invalidate(); resetForm(); toast.success('Transaction added!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, ...updates }: { id: string; amount: number; type: 'income' | 'expense'; category: string; description: string }) =>
      updateTransaction(id, updates),
    onSuccess: () => { invalidate(); resetForm(); toast.success('Transaction updated!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => { invalidate(); setDeleteId(null); toast.success('Transaction deleted!'); },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteTransactions,
    onSuccess: () => {
      invalidate();
      setShowBulkDelete(false);
      setSelected(new Set());
      setSelectMode(false);
      toast.success(`${selected.size} transactions deleted!`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setNewTx({ amount: '', category: 'Food', description: '', type: 'expense' });
    setSmsText(''); setSmsMode(false); setShowAdd(false); setEditingTx(null);
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setNewTx({ amount: String(tx.amount), category: tx.category, description: tx.description || '', type: tx.type });
    setShowAdd(true);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(tx => tx.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleParseSms = async () => {
    if (!smsText.trim()) return;
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sms-parser', { body: { messages: [smsText.trim()] } });
      if (error) throw error;
      const parsed = data?.transactions?.[0];
      if (!parsed) { toast.error('Could not parse SMS. Try entering details manually.'); return; }
      setNewTx({ amount: String(parsed.amount || ''), category: parsed.category || 'Other', description: parsed.description || smsText.trim().slice(0, 50), type: parsed.type || 'expense' });
      setSmsMode(false);
      toast.success('SMS parsed! Review and save.');
    } catch (e: any) { toast.error(e.message || 'Failed to parse SMS'); }
    finally { setParsing(false); }
  };

  const filtered = useMemo(() => {
    let result = txs.filter(tx => filter === 'all' || tx.type === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(tx =>
        (tx.description || '').toLowerCase().includes(q) ||
        tx.category.toLowerCase().includes(q) ||
        String(tx.amount).includes(q)
      );
    }
    if (dateFrom) {
      const fromStr = format(dateFrom, 'yyyy-MM-dd');
      result = result.filter(tx => tx.transaction_date >= fromStr);
    }
    if (dateTo) {
      const toStr = format(dateTo, 'yyyy-MM-dd');
      result = result.filter(tx => tx.transaction_date <= toStr);
    }
    return result;
  }, [txs, filter, searchQuery, dateFrom, dateTo]);

  const expenses = txs.filter(tx => tx.type === 'expense');
  const catData = categories.map(cat => ({
    name: cat, value: expenses.filter(tx => tx.category === cat).reduce((s, tx) => s + Number(tx.amount), 0),
  })).filter(c => c.value > 0);

  const hasActiveFilters = !!searchQuery || !!dateFrom || !!dateTo;
  const clearFilters = () => { setSearchQuery(''); setDateFrom(undefined); setDateTo(undefined); };

  const handleSubmit = async () => {
    if (!newTx.amount || !newTx.description) return;
    if (editingTx) {
      editMutation.mutate({ id: editingTx.id, amount: parseInt(newTx.amount), type: newTx.type, category: newTx.category, description: newTx.description });
      return;
    }
    if (!isOnline()) {
      await saveOfflineTransaction({ amount: parseInt(newTx.amount), type: newTx.type, category: newTx.category, description: newTx.description, transaction_date: new Date().toISOString().split('T')[0] });
      resetForm();
      toast.success('Saved offline! Will sync when back online.', { icon: '📴' });
      return;
    }
    addMutation.mutate({ amount: parseInt(newTx.amount), type: newTx.type, category: newTx.category, description: newTx.description });
  };

  const isSaving = addMutation.isPending || editMutation.isPending;

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">{t('nav.expenses')}</h1>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && !selectMode && (
            <Button onClick={() => setSelectMode(true)} size="sm" variant="outline" className="gap-1.5 rounded-xl text-xs">
              <CheckSquare size={14} /> Select
            </Button>
          )}
          <Button onClick={() => { setEditingTx(null); setNewTx({ amount: '', category: 'Food', description: '', type: 'expense' }); setShowAdd(true); }} size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
            <Plus size={16} /> {t('exp.add')}
          </Button>
        </div>
      </div>

      {/* Bulk select toolbar */}
      <AnimatePresence>
        {selectMode && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex items-center justify-between rounded-xl bg-muted p-3">
              <div className="flex items-center gap-3">
                <button onClick={exitSelectMode} className="text-muted-foreground hover:text-foreground">
                  <XCircle size={18} />
                </button>
                <span className="text-sm font-medium">{selected.size} selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={toggleSelectAll} size="sm" variant="ghost" className="text-xs h-8">
                  {selected.size === filtered.length ? 'Deselect all' : 'Select all'}
                </Button>
                <Button
                  onClick={() => setShowBulkDelete(true)}
                  size="sm"
                  variant="destructive"
                  disabled={selected.size === 0}
                  className="text-xs h-8 gap-1"
                >
                  <Trash2 size={12} /> Delete ({selected.size})
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {catData.length > 0 && !selectMode && (
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

      <div className="flex items-center gap-2">
        <div className="flex gap-2 flex-1">
          {(['all', 'income', 'expense'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {f === 'all' ? 'All' : f === 'income' ? t('dash.income') : t('dash.expenses')}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg transition-colors relative ${showFilters || hasActiveFilters ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}
        >
          <Filter size={14} />
          {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />}
        </button>
      </div>

      {/* Search & Date Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="space-y-2.5 rounded-xl bg-card p-3 shadow-card">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Date range */}
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left text-xs rounded-lg h-10", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon size={12} className="mr-1.5" />
                      {dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'From date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("flex-1 justify-start text-left text-xs rounded-lg h-10", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon size={12} className="mr-1.5" />
                      {dateTo ? format(dateTo, 'MMM dd, yyyy') : 'To date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>

              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-xs text-primary font-medium flex items-center gap-1">
                  <X size={12} /> Clear filters
                </button>
              )}

              <p className="text-xs text-muted-foreground">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''} found</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => (
            <SwipeToDelete key={tx.id} onDelete={() => setDeleteId(tx.id)}>
              <motion.div
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={selectMode ? () => toggleSelect(tx.id) : undefined}
                className={`flex items-center justify-between rounded-xl bg-card p-3 shadow-card transition-colors ${selectMode ? 'cursor-pointer' : ''} ${selected.has(tx.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectMode && (
                    <div className="shrink-0">
                      {selected.has(tx.id) ? (
                        <CheckSquare size={18} className="text-primary" />
                      ) : (
                        <Square size={18} className="text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={16} className="text-success" /> : <ArrowDownRight size={16} className="text-destructive" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description || tx.category}</p>
                    <p className="text-xs text-muted-foreground">{tx.category} · {tx.transaction_date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className={`text-sm font-semibold font-display ${tx.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatTZS(Number(tx.amount))}
                  </p>
                  {!selectMode && (
                    <>
                      <button onClick={() => handleEditClick(tx)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteId(tx.id)} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </SwipeToDelete>
          ))}
        </div>
      )}

      {/* Single delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={showBulkDelete} onOpenChange={(open) => !open && setShowBulkDelete(false)}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} Transactions</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {selected.size} selected transactions. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkDeleteMutation.mutate([...selected])} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selected.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add / Edit sheet */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-foreground/30 glass flex items-end justify-center" onClick={() => resetForm()}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">{editingTx ? 'Edit Transaction' : t('exp.add')}</h2>
                <button onClick={resetForm} className="text-muted-foreground"><X size={20} /></button>
              </div>

              {!editingTx && (
                <>
                  <button onClick={() => setSmsMode(!smsMode)} className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium mb-3 transition-colors ${smsMode ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                    <MessageSquare size={14} />
                    {smsMode ? 'Parsing from SMS — paste below' : 'Paste SMS to auto-fill (optional)'}
                  </button>
                  <AnimatePresence>
                    {smsMode && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                        <textarea placeholder="Paste M-Pesa, Airtel Money, or Tigo Pesa SMS here..." value={smsText} onChange={e => setSmsText(e.target.value)} rows={3} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                        <Button onClick={handleParseSms} disabled={parsing || !smsText.trim()} size="sm" className="w-full mt-2 rounded-xl gap-1.5" variant="secondary">
                          {parsing ? <><Loader2 size={14} className="animate-spin" /> Parsing...</> : 'Parse SMS'}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}

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
                <Button onClick={handleSubmit} disabled={isSaving} className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3">
                  {isSaving ? 'Saving...' : editingTx ? 'Update' : t('gen.save')}
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
