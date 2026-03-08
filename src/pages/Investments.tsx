import { useState } from 'react';
import { formatTZS } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Shield, Zap, BarChart3, Calculator, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Investment {
  name: string;
  type: string;
  returnMin: number;
  returnMax: number;
  risk: 'Low' | 'Medium' | 'High';
  minAmount: number;
  description: string;
  icon: string;
}

const investments: Investment[] = [
  { name: 'Government Bonds (GTBS)', type: 'Fixed Income', returnMin: 8, returnMax: 12, risk: 'Low', minAmount: 100000, description: 'Treasury bonds & bills issued by Bank of Tanzania. Safe with guaranteed returns.', icon: '🏛️' },
  { name: 'NMB Fixed Deposit', type: 'Fixed Deposit', returnMin: 6, returnMax: 9, risk: 'Low', minAmount: 500000, description: 'Fixed deposit accounts with NMB Bank. Guaranteed returns with flexible tenures.', icon: '🏦' },
  { name: 'CRDB Fixed Deposit', type: 'Fixed Deposit', returnMin: 5, returnMax: 8, risk: 'Low', minAmount: 1000000, description: 'Term deposit accounts with CRDB Bank. Competitive rates for longer tenures.', icon: '🏦' },
  { name: 'UTT AMIS Unit Trust', type: 'Unit Trust', returnMin: 10, returnMax: 18, risk: 'Medium', minAmount: 50000, description: 'UTT AMIS managed funds. Diversified portfolio with professional management.', icon: '📊' },
  { name: 'DSE Stocks', type: 'Equities', returnMin: 5, returnMax: 25, risk: 'High', minAmount: 100000, description: 'Dar es Salaam Stock Exchange listed companies. Higher potential returns with market risk.', icon: '📈' },
  { name: 'Real Estate Fund', type: 'Real Estate', returnMin: 12, returnMax: 20, risk: 'Medium', minAmount: 5000000, description: 'Property investment funds for rental income and capital appreciation.', icon: '🏠' },
];

const riskColors = { Low: 'text-success bg-success/10', Medium: 'text-warning bg-warning/10', High: 'text-destructive bg-destructive/10' };

const Investments = () => {
  const [riskFilter, setRiskFilter] = useState<'all' | 'Low' | 'Medium' | 'High'>('all');
  const [simAmount, setSimAmount] = useState('');
  const [simYears, setSimYears] = useState('5');
  const [selectedInv, setSelectedInv] = useState<Investment | null>(null);

  const filtered = riskFilter === 'all' ? investments : investments.filter(i => i.risk === riskFilter);

  const handleSelectInvestment = (inv: Investment) => {
    if (!simAmount || !simYears) return;
    setSelectedInv(inv);
  };

  const simResult = selectedInv && simAmount && simYears ? (() => {
    const p = parseFloat(simAmount);
    const y = parseInt(simYears);
    const rMin = selectedInv.returnMin / 100;
    const rMax = selectedInv.returnMax / 100;
    const futureMin = p * Math.pow(1 + rMin, y);
    const futureMax = p * Math.pow(1 + rMax, y);
    const gainMin = futureMin - p;
    const gainMax = futureMax - p;
    return { futureMin, futureMax, gainMin, gainMax, rateRange: `${selectedInv.returnMin}-${selectedInv.returnMax}%` };
  })() : null;

  const hasSimInputs = simAmount && simYears && parseFloat(simAmount) > 0 && parseInt(simYears) > 0;

  return (
    <div className="space-y-5 pb-24 pt-2">
      <h1 className="text-xl font-bold font-display">Investments</h1>

      {/* Simulator Input */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
        <h3 className="text-sm font-semibold font-display flex items-center gap-1.5"><Calculator size={14} className="text-primary" /> Return Simulator</h3>
        <p className="text-[11px] text-muted-foreground">Enter amount & years, then tap an investment below to calculate returns.</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Amount (TZS)</label>
            <input type="number" placeholder="e.g. 1,000,000" value={simAmount} onChange={e => { setSimAmount(e.target.value); setSelectedInv(null); }} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Years</label>
            <input type="number" placeholder="e.g. 5" value={simYears} onChange={e => { setSimYears(e.target.value); setSelectedInv(null); }} className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        {/* Result */}
        <AnimatePresence>
          {simResult && selectedInv && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedInv.icon}</span>
                    <div>
                      <p className="text-xs font-semibold">{selectedInv.name}</p>
                      <p className="text-[10px] text-muted-foreground">Rate: {simResult.rateRange} p.a. · {simYears} years</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedInv(null)} className="p-1 rounded-full hover:bg-muted"><X size={14} className="text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-lg bg-background p-2 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Conservative ({selectedInv.returnMin}%)</p>
                    <p className="text-sm font-bold font-display text-primary">{formatTZS(Math.round(simResult.futureMin))}</p>
                    <p className="text-[10px] text-success font-medium">+{formatTZS(Math.round(simResult.gainMin))}</p>
                  </div>
                  <div className="rounded-lg bg-background p-2 text-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Optimistic ({selectedInv.returnMax}%)</p>
                    <p className="text-sm font-bold font-display text-primary">{formatTZS(Math.round(simResult.futureMax))}</p>
                    <p className="text-[10px] text-success font-medium">+{formatTZS(Math.round(simResult.gainMax))}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasSimInputs && !selectedInv && (
          <p className="text-[11px] text-primary font-medium animate-pulse">👇 Tap an investment below to see your returns</p>
        )}
      </motion.div>

      {/* Risk filter */}
      <div className="flex gap-2">
        {(['all', 'Low', 'Medium', 'High'] as const).map(r => (
          <button key={r} onClick={() => setRiskFilter(r)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${riskFilter === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {r === 'all' ? 'All' : r + ' Risk'}
          </button>
        ))}
      </div>

      {/* Investment options */}
      <div className="space-y-3">
        {filtered.map((inv, i) => {
          const isSelected = selectedInv?.name === inv.name;
          const isClickable = !!hasSimInputs;
          return (
            <motion.div
              key={inv.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => handleSelectInvestment(inv)}
              className={`rounded-xl bg-card p-4 shadow-card transition-all ${isClickable ? 'cursor-pointer active:scale-[0.98]' : ''} ${isSelected ? 'ring-2 ring-primary' : ''} ${isClickable && !isSelected ? 'hover:ring-1 hover:ring-primary/40' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{inv.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold truncate">{inv.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${riskColors[inv.risk]}`}>{inv.risk}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">{inv.description}</p>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><TrendingUp size={10} className="text-success" /> {inv.returnMin}-{inv.returnMax}% p.a.</span>
                    <span>Min: {formatTZS(inv.minAmount)} TZS</span>
                    <span>{inv.type}</span>
                  </div>
                  {isClickable && !isSelected && (
                    <p className="text-[10px] text-primary mt-1.5 font-medium">Tap to calculate →</p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Investments;
