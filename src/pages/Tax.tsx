import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { formatTZS } from '@/lib/api';
import { motion } from 'framer-motion';
import { Calculator, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Tanzania PAYE 2024/2025 brackets (monthly)
function calculatePAYE(monthly: number): { tax: number; effective: number; breakdown: { bracket: string; tax: number }[] } {
  const brackets = [
    { min: 0, max: 270000, rate: 0 },
    { min: 270001, max: 520000, rate: 0.08 },
    { min: 520001, max: 760000, rate: 0.20 },
    { min: 760001, max: 1000000, rate: 0.25 },
    { min: 1000001, max: Infinity, rate: 0.30 },
  ];
  let tax = 0;
  const breakdown: { bracket: string; tax: number }[] = [];
  let remaining = monthly;

  for (const b of brackets) {
    const range = b.max === Infinity ? remaining : Math.min(b.max - b.min + 1, remaining);
    if (remaining <= 0) break;
    const taxable = Math.min(range, remaining);
    const bracketTax = taxable * b.rate;
    tax += bracketTax;
    if (bracketTax > 0 || b.rate === 0) {
      breakdown.push({
        bracket: b.max === Infinity ? `Above ${formatTZS(b.min)}` : `${formatTZS(b.min)} - ${formatTZS(b.max)}`,
        tax: bracketTax,
      });
    }
    remaining -= taxable;
  }

  return { tax, effective: monthly > 0 ? (tax / monthly) * 100 : 0, breakdown };
}

// Simple business tax estimate
function calculateBusinessTax(annual: number, expenses: number): { taxable: number; tax: number; rate: number } {
  const taxable = Math.max(0, annual - expenses);
  // Simplified corporate rate 30%
  const tax = taxable * 0.30;
  return { taxable, tax, rate: 30 };
}

const Tax = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState<'salary' | 'business'>('salary');
  const [salary, setSalary] = useState('');
  const [bizIncome, setBizIncome] = useState('');
  const [bizExpenses, setBizExpenses] = useState('');

  const paye = salary ? calculatePAYE(parseFloat(salary)) : null;
  const biz = bizIncome ? calculateBusinessTax(parseFloat(bizIncome), parseFloat(bizExpenses || '0')) : null;

  return (
    <div className="space-y-5 pb-24 pt-2">
      <h1 className="text-xl font-bold font-display">Tax Estimator</h1>

      {/* Tab toggle */}
      <div className="flex rounded-xl bg-muted p-1">
        {([{ key: 'salary', label: 'Salary (PAYE)', icon: Calculator }, { key: 'business', label: 'Business', icon: Briefcase }] as const).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground'}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'salary' ? (
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
            <h3 className="text-sm font-semibold font-display">Monthly Salary</h3>
            <input type="number" placeholder="Gross salary (TZS)" value={salary} onChange={e => setSalary(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </motion.div>

          {paye && parseFloat(salary) > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {/* Summary */}
              <div className="rounded-xl bg-card p-4 shadow-card">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Monthly Tax</p>
                    <p className="text-lg font-bold font-display text-destructive">{formatTZS(Math.round(paye.tax))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Net Salary</p>
                    <p className="text-lg font-bold font-display text-success">{formatTZS(Math.round(parseFloat(salary) - paye.tax))}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Effective Rate</p>
                    <p className="text-lg font-bold font-display text-primary">{paye.effective.toFixed(1)}%</p>
                  </div>
                </div>
              </div>

              {/* Annual */}
              <div className="rounded-xl bg-card p-4 shadow-card">
                <h3 className="text-sm font-semibold font-display mb-2">Annual Summary</h3>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Annual Gross</span><span className="font-medium">{formatTZS(Math.round(parseFloat(salary) * 12))} TZS</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Annual Tax</span><span className="font-medium text-destructive">{formatTZS(Math.round(paye.tax * 12))} TZS</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Annual Net</span><span className="font-medium text-success">{formatTZS(Math.round((parseFloat(salary) - paye.tax) * 12))} TZS</span></div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="rounded-xl bg-card p-4 shadow-card">
                <h3 className="text-sm font-semibold font-display mb-2">PAYE Tax Brackets</h3>
                <div className="space-y-2">
                  {paye.breakdown.map((b, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{b.bracket}</span>
                      <span className="font-medium">{formatTZS(Math.round(b.tax))} TZS</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
            <h3 className="text-sm font-semibold font-display">Business Income Tax</h3>
            <input type="number" placeholder="Annual revenue (TZS)" value={bizIncome} onChange={e => setBizIncome(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <input type="number" placeholder="Annual expenses (TZS)" value={bizExpenses} onChange={e => setBizExpenses(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </motion.div>

          {biz && parseFloat(bizIncome) > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card">
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div>
                  <p className="text-[10px] text-muted-foreground">Taxable Income</p>
                  <p className="text-lg font-bold font-display">{formatTZS(Math.round(biz.taxable))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Tax ({biz.rate}%)</p>
                  <p className="text-lg font-bold font-display text-destructive">{formatTZS(Math.round(biz.tax))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">After Tax</p>
                  <p className="text-lg font-bold font-display text-success">{formatTZS(Math.round(biz.taxable - biz.tax))}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">* Standard corporate income tax rate of 30%. Consult TRA for deductions and allowances.</p>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};

export default Tax;
