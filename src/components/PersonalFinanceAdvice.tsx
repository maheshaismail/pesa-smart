import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, AlertTriangle, PiggyBank } from 'lucide-react';
import { fetchTransactions, getFinancialSummary, formatTZS } from '@/lib/api';

interface Props {
  variant: 'savings' | 'investments';
}

const PersonalFinanceAdvice = ({ variant }: Props) => {
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const { income, expenses, balance, savingsRate } = getFinancialSummary(transactions);

  const hasData = income > 0 || expenses > 0;

  if (!hasData) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-2.5">
          <Sparkles size={16} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold mb-1">Personal advice unlocks with your data</p>
            <p className="text-[11px] text-muted-foreground">
              Add your income and expenses on the Dashboard so we can tailor {variant === 'savings' ? 'savings targets' : 'investment ideas'} to your real cash flow.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const surplus = balance; // income - expenses (this month)
  const recommendedSavings = Math.max(0, Math.round(income * 0.2));
  const emergencyTarget = Math.round(expenses * 3);

  if (variant === 'savings') {
    const tips: string[] = [];
    if (surplus <= 0) {
      tips.push(`You spent ${formatTZS(Math.abs(surplus))} TZS more than you earned. Trim one expense category by 10% before adding a new goal.`);
    } else {
      tips.push(`Save ${formatTZS(recommendedSavings)} TZS this month (20% of income) — set it as an automatic deposit on payday.`);
    }
    if (expenses > 0) {
      tips.push(`Build an emergency fund of ~${formatTZS(emergencyTarget)} TZS (3 months of expenses) before chasing other goals.`);
    }
    tips.push(`Use M-Pesa / Airtel Money lock-savings or NMB Wajibika to keep savings out of reach.`);

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <PiggyBank size={16} className="text-primary" />
          <h3 className="text-sm font-semibold font-display">Personalized for you</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Income</p>
            <p className="text-xs font-bold text-success">{formatTZS(income)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Expenses</p>
            <p className="text-xs font-bold text-destructive">{formatTZS(expenses)}</p>
          </div>
          <div className="rounded-lg bg-muted/40 p-2">
            <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Surplus</p>
            <p className={`text-xs font-bold ${surplus >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatTZS(surplus)}</p>
          </div>
        </div>
        <ul className="space-y-1.5">
          {tips.map((tip, i) => (
            <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
              <span className="text-primary">•</span><span>{tip}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    );
  }

  // investments
  let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
  let pick: { name: string; why: string; allocation: string };
  const investable = surplus > 0 ? surplus : 0;

  if (surplus <= 0) {
    pick = {
      name: 'Pause investing — stabilize cash flow first',
      why: 'Your expenses exceed your income this month. Investing now risks early withdrawal at a loss.',
      allocation: 'Cut spending or boost income until you have a positive surplus.',
    };
  } else if (savingsRate < 10 || investable < 50000) {
    riskLevel = 'Low';
    pick = {
      name: 'NMB / CRDB Fixed Deposit or Government Bonds (GTBS)',
      why: 'Small surplus and tight margins — capital safety matters more than high returns.',
      allocation: `Start with ${formatTZS(Math.round(investable * 0.5))} TZS into a 6-12 month fixed deposit (6-9% p.a.).`,
    };
  } else if (savingsRate < 25) {
    riskLevel = 'Medium';
    pick = {
      name: 'UTT AMIS Unit Trust + Government Bonds',
      why: 'Healthy surplus with room for moderate risk. Diversify between bonds and a managed fund.',
      allocation: `Split monthly: ~${formatTZS(Math.round(investable * 0.6))} TZS into UTT AMIS (10-18%) and ${formatTZS(Math.round(investable * 0.4))} TZS into GTBS bonds.`,
    };
  } else {
    riskLevel = 'High';
    pick = {
      name: 'DSE Stocks + Unit Trusts + Bonds mix',
      why: 'Strong savings rate — you can absorb market swings for higher long-term returns.',
      allocation: `Try: 40% DSE stocks (${formatTZS(Math.round(investable * 0.4))}), 40% UTT AMIS (${formatTZS(Math.round(investable * 0.4))}), 20% bonds (${formatTZS(Math.round(investable * 0.2))}).`,
    };
  }

  const riskColor = riskLevel === 'Low' ? 'text-success bg-success/10' : riskLevel === 'Medium' ? 'text-warning bg-warning/10' : 'text-destructive bg-destructive/10';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <h3 className="text-sm font-semibold font-display">Where to invest — for you</h3>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${riskColor}`}>{riskLevel} risk fit</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Income</p>
          <p className="text-xs font-bold text-success">{formatTZS(income)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Expenses</p>
          <p className="text-xs font-bold text-destructive">{formatTZS(expenses)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <p className="text-[9px] uppercase text-muted-foreground tracking-wider">Investable</p>
          <p className={`text-xs font-bold ${investable > 0 ? 'text-primary' : 'text-destructive'}`}>{formatTZS(investable)}</p>
        </div>
      </div>
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1.5">
        <p className="text-xs font-semibold text-primary">{pick.name}</p>
        <p className="text-[11px] text-muted-foreground">{pick.why}</p>
        <p className="text-[11px]"><span className="font-semibold">Plan:</span> {pick.allocation}</p>
      </div>
      {surplus > 0 && expenses > 0 && investable < Math.round(expenses * 3) && (
        <div className="flex items-start gap-1.5 text-[10px] text-warning">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>Keep ~{formatTZS(Math.round(expenses * 3))} TZS in an emergency fund (savings) before locking large amounts in investments.</span>
        </div>
      )}
    </motion.div>
  );
};

export default PersonalFinanceAdvice;
