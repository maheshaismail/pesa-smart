import { useI18n } from '@/lib/i18n';
import { formatTZS, savingsGoals } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Savings = () => {
  const { t } = useI18n();
  const totalSaved = savingsGoals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = savingsGoals.reduce((s, g) => s + g.target, 0);

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">{t('sav.goals')}</h1>
        <Button size="sm" className="gap-1.5 gradient-primary border-0 text-primary-foreground rounded-xl">
          <Plus size={16} /> {t('sav.add')}
        </Button>
      </div>

      {/* Total Saved */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card text-center">
        <p className="text-xs text-muted-foreground mb-1">Total Saved</p>
        <p className="text-2xl font-bold font-display text-primary">{formatTZS(totalSaved)} <span className="text-sm font-normal text-muted-foreground">TZS</span></p>
        <p className="text-xs text-muted-foreground mt-1">of {formatTZS(totalTarget)} TZS total goals</p>
        <div className="h-2 rounded-full bg-muted overflow-hidden mt-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(totalSaved / totalTarget) * 100}%` }}
            transition={{ duration: 1 }}
            className="h-full rounded-full gradient-primary"
          />
        </div>
      </motion.div>

      {/* Goals */}
      <div className="space-y-3">
        {savingsGoals.map((goal, i) => {
          const pct = (goal.saved / goal.target) * 100;
          const remaining = goal.target - goal.saved;
          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl bg-card p-4 shadow-card"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{goal.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{goal.name}</p>
                    {goal.deadline && (
                      <p className="text-[10px] text-muted-foreground">Deadline: {goal.deadline}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs font-bold font-display text-primary">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.08 }}
                  className="h-full rounded-full gradient-primary"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatTZS(goal.saved)} saved</span>
                <span>{formatTZS(remaining)} remaining</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Savings;
