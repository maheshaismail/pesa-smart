import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Check, ChevronDown, ChevronUp, Trash2, History, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { formatTZS, type BudgetPeriod } from '@/lib/api';
import { toast } from 'sonner';

type Plan = {
  id: string;
  name: string;
  period: BudgetPeriod;
  income: number;
  total_allocated: number;
  created_at: string;
};
type PlanItem = {
  id: string;
  plan_id: string;
  label: string;
  amount: number;
  percent: number;
  icon: string | null;
  is_done: boolean;
  sort_order: number;
};

// Tanzania-context allocation template (sums to 100)
const TEMPLATE: { label: string; percent: number; icon: string }[] = [
  { label: 'Food & Groceries', percent: 25, icon: '🍲' },
  { label: 'Rent / Housing', percent: 25, icon: '🏠' },
  { label: 'Transport (Daladala/Bajaji/Fuel)', percent: 10, icon: '🚌' },
  { label: 'Utilities (LUKU, Water, Data)', percent: 8, icon: '💡' },
  { label: 'Personal & Health', percent: 7, icon: '💊' },
  { label: 'Family / Support', percent: 5, icon: '👨‍👩‍👧' },
  { label: 'Entertainment', percent: 5, icon: '🎬' },
  { label: 'Savings', percent: 10, icon: '🏦' },
  { label: 'Emergency Buffer', percent: 5, icon: '🛡️' },
];

async function fetchPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('budget_plans')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as Plan[];
}

async function fetchPlanItems(planId: string): Promise<PlanItem[]> {
  const { data, error } = await supabase
    .from('budget_plan_items')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order');
  if (error) throw error;
  return (data || []) as PlanItem[];
}

interface Props {
  income: number;
  period: BudgetPeriod;
}

const BudgetPlanGenerator = ({ income, period }: Props) => {
  const queryClient = useQueryClient();
  const [showGen, setShowGen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [customIncome, setCustomIncome] = useState('');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const { data: plans = [] } = useQuery({ queryKey: ['budget_plans'], queryFn: fetchPlans });

  const generateMutation = useMutation({
    mutationFn: async (inc: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const periodLabel = period.charAt(0).toUpperCase() + period.slice(1);
      const name = `${periodLabel} Plan — ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
      const items = TEMPLATE.map((t, i) => ({
        label: t.label,
        percent: t.percent,
        icon: t.icon,
        amount: Math.round((inc * t.percent) / 100),
        sort_order: i,
      }));
      const total = items.reduce((s, it) => s + it.amount, 0);

      const { data: plan, error: pErr } = await supabase
        .from('budget_plans')
        .insert({ user_id: user.id, name, period, income: inc, total_allocated: total })
        .select()
        .single();
      if (pErr) throw pErr;

      const { error: iErr } = await supabase
        .from('budget_plan_items')
        .insert(items.map(it => ({ ...it, plan_id: plan.id, user_id: user.id })));
      if (iErr) throw iErr;
      return plan as Plan;
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['budget_plans'] });
      setShowGen(false);
      setCustomIncome('');
      setExpandedPlan(plan.id);
      setShowHistory(true);
      toast.success('Budget plan generated!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budget_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_plans'] });
      toast.success('Plan deleted');
    },
  });

  const handleGenerate = () => {
    const inc = customIncome ? parseInt(customIncome) : income;
    if (!inc || inc <= 0) {
      toast.error('Enter a valid income amount');
      return;
    }
    generateMutation.mutate(inc);
  };

  return (
    <div className="rounded-xl bg-card p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold font-display flex items-center gap-1.5">
          <Wand2 size={14} className="text-primary" /> Budget Plan Generator
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-[10px] font-medium px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/70 flex items-center gap-1"
          >
            <History size={11} /> {plans.length}
          </button>
          <button
            onClick={() => { setCustomIncome(income > 0 ? String(income) : ''); setShowGen(true); }}
            className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-primary text-primary-foreground flex items-center gap-1"
          >
            <Sparkles size={11} /> Generate
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Auto-creates a {period} allocation plan (Tanzania context) from your income. Tick items as you get/handle them.
      </p>

      {/* History list */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
            {plans.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No plans yet — tap Generate.</p>
            ) : (
              plans.map(p => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  expanded={expandedPlan === p.id}
                  onToggle={() => setExpandedPlan(expandedPlan === p.id ? null : p.id)}
                  onDelete={() => deleteMutation.mutate(p.id)}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate modal */}
      <AnimatePresence>
        {showGen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-foreground/30 glass flex items-end justify-center" onClick={() => setShowGen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">Generate {period} plan</h2>
                <button onClick={() => setShowGen(false)} className="text-muted-foreground"><X size={20} /></button>
              </div>
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground block">Income to allocate (TZS)</label>
                <input
                  type="number"
                  placeholder="Income amount"
                  value={customIncome}
                  onChange={e => setCustomIncome(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                />
                <div className="rounded-lg bg-muted p-3 space-y-1 max-h-60 overflow-y-auto">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Preview allocation</p>
                  {TEMPLATE.map(t => {
                    const inc = customIncome ? parseInt(customIncome) : income;
                    const amt = Math.round((inc * t.percent) / 100);
                    return (
                      <div key={t.label} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span>{t.icon}</span> {t.label}
                        </span>
                        <span className="font-medium tabular-nums">{formatTZS(amt)} <span className="text-muted-foreground">({t.percent}%)</span></span>
                      </div>
                    );
                  })}
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !(customIncome || income)}
                  className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3"
                >
                  {generateMutation.isPending ? 'Generating...' : 'Generate plan'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PlanCard = ({ plan, expanded, onToggle, onDelete }: { plan: Plan; expanded: boolean; onToggle: () => void; onDelete: () => void }) => {
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ['budget_plan_items', plan.id],
    queryFn: () => fetchPlanItems(plan.id),
    enabled: expanded,
  });

  const toggleItem = useMutation({
    mutationFn: async (item: PlanItem) => {
      const { error } = await supabase
        .from('budget_plan_items')
        .update({ is_done: !item.is_done })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budget_plan_items', plan.id] }),
  });

  const doneCount = items.filter(i => i.is_done).length;
  const pct = items.length > 0 ? (doneCount / items.length) * 100 : 0;

  return (
    <div className="rounded-lg border border-border bg-background">
      <button onClick={onToggle} className="w-full p-3 flex items-center justify-between text-left">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">{plan.name}</p>
          <p className="text-[10px] text-muted-foreground">
            Income {formatTZS(Number(plan.income))} · Allocated {formatTZS(Number(plan.total_allocated))} TZS
          </p>
          {expanded && items.length > 0 && (
            <div className="h-1 mt-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 size={12} />
          </button>
          {expanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
        </div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden border-t border-border">
            <div className="p-2 space-y-1">
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem.mutate(item)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs hover:bg-muted transition-colors ${item.is_done ? 'opacity-60' : ''}`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${item.is_done ? 'bg-success border-success' : 'border-muted-foreground/40'}`}>
                    {item.is_done && <Check size={10} className="text-success-foreground" />}
                  </div>
                  <span className="text-base leading-none">{item.icon}</span>
                  <span className={`flex-1 text-left truncate ${item.is_done ? 'line-through' : ''}`}>{item.label}</span>
                  <span className="font-semibold tabular-nums">{formatTZS(Number(item.amount))}</span>
                  <span className="text-muted-foreground text-[10px] w-8 text-right">{Number(item.percent)}%</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BudgetPlanGenerator;
