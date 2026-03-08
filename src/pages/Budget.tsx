import { useI18n } from '@/lib/i18n';
import { formatTZS, budgetCategories } from '@/lib/mock-data';
import { motion } from 'framer-motion';

const Budget = () => {
  const { t } = useI18n();
  const totalLimit = budgetCategories.reduce((s, c) => s + c.limit, 0);
  const totalSpent = budgetCategories.reduce((s, c) => s + c.spent, 0);

  return (
    <div className="space-y-5 pb-24 pt-2">
      <h1 className="text-xl font-bold font-display">{t('bud.monthly')}</h1>

      {/* Overview */}
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
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((totalSpent / totalLimit) * 100, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full rounded-full bg-primary-foreground"
          />
        </div>
        <p className="text-xs text-primary-foreground/70 mt-2">
          {formatTZS(totalLimit - totalSpent)} TZS {t('bud.remaining').toLowerCase()}
        </p>
      </motion.div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        {budgetCategories.map((cat, i) => {
          const pct = Math.min((cat.spent / cat.limit) * 100, 100);
          const isOver = cat.spent > cat.limit * 0.9;
          return (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl bg-card p-4 shadow-card"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm font-medium">{cat.category}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold font-display ${isOver ? 'text-destructive' : ''}`}>
                    {formatTZS(cat.spent)}
                  </span>
                  <span className="text-xs text-muted-foreground"> / {formatTZS(cat.limit)}</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.06 }}
                  className={`h-full rounded-full ${isOver ? 'bg-destructive' : 'bg-primary'}`}
                />
              </div>
              {isOver && (
                <p className="text-[10px] text-destructive mt-1.5 font-medium">⚠️ Almost at limit</p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Budget;
