import { useState } from 'react';
import { formatTZS } from '@/lib/api';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Investment {
  name: string;
  type: string;
  returnRange: string;
  risk: 'Low' | 'Medium' | 'High';
  minAmount: number;
  description: string;
  icon: string;
}

const investments: Investment[] = [
  { name: 'Government Bonds (GTBS)', type: 'Fixed Income', returnRange: '8-12%', risk: 'Low', minAmount: 100000, description: 'Treasury bonds & bills issued by Bank of Tanzania. Safe with guaranteed returns.', icon: '🏛️' },
  { name: 'NMB Fixed Deposit', type: 'Fixed Deposit', returnRange: '6-9%', risk: 'Low', minAmount: 500000, description: 'Fixed deposit accounts with NMB Bank. Guaranteed returns with flexible tenures.', icon: '🏦' },
  { name: 'CRDB Fixed Deposit', type: 'Fixed Deposit', returnRange: '5-8%', risk: 'Low', minAmount: 1000000, description: 'Term deposit accounts with CRDB Bank. Competitive rates for longer tenures.', icon: '🏦' },
  { name: 'UTT AMIS Unit Trust', type: 'Unit Trust', returnRange: '10-18%', risk: 'Medium', minAmount: 50000, description: 'UTT AMIS managed funds. Diversified portfolio with professional management.', icon: '📊' },
  { name: 'DSE Stocks', type: 'Equities', returnRange: '5-25%', risk: 'High', minAmount: 100000, description: 'Dar es Salaam Stock Exchange listed companies. Higher potential returns with market risk.', icon: '📈' },
  { name: 'Real Estate Fund', type: 'Real Estate', returnRange: '12-20%', risk: 'Medium', minAmount: 5000000, description: 'Property investment funds for rental income and capital appreciation.', icon: '🏠' },
];

const riskColors = { Low: 'text-success bg-success/10', Medium: 'text-warning bg-warning/10', High: 'text-destructive bg-destructive/10' };

const Investments = () => {
  const [riskFilter, setRiskFilter] = useState<'all' | 'Low' | 'Medium' | 'High'>('all');
  const [simAmount, setSimAmount] = useState('');
  const [simYears, setSimYears] = useState('5');
  const [simRate, setSimRate] = useState('10');

  const filtered = riskFilter === 'all' ? investments : investments.filter(i => i.risk === riskFilter);

  const simResult = simAmount && simRate && simYears ? (() => {
    const p = parseFloat(simAmount);
    const r = parseFloat(simRate) / 100;
    const y = parseInt(simYears);
    const future = p * Math.pow(1 + r, y);
    const gain = future - p;
    return { future, gain, monthly: p / (y * 12) };
  })() : null;

  return (
    <div className="space-y-5 pb-24 pt-2">
      <h1 className="text-xl font-bold font-display">Investments</h1>

      {/* Simulator */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
        <h3 className="text-sm font-semibold font-display flex items-center gap-1.5"><BarChart3 size={14} className="text-primary" /> Return Simulator</h3>
        <div className="grid grid-cols-3 gap-2">
          <input type="number" placeholder="Amount (TZS)" value={simAmount} onChange={e => setSimAmount(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" placeholder="Years" value={simYears} onChange={e => setSimYears(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
          <input type="number" placeholder="Rate %" value={simRate} onChange={e => setSimRate(e.target.value)} className="rounded-xl border border-input bg-background px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {simResult && (
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div>
              <p className="text-[10px] text-muted-foreground">Future Value</p>
              <p className="text-sm font-bold font-display text-primary">{formatTZS(Math.round(simResult.future))}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total Gain</p>
              <p className="text-sm font-bold font-display text-success">+{formatTZS(Math.round(simResult.gain))}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Monthly Equiv.</p>
              <p className="text-sm font-bold font-display">{formatTZS(Math.round(simResult.monthly))}</p>
            </div>
          </div>
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
        {filtered.map((inv, i) => (
          <motion.div key={inv.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="rounded-xl bg-card p-4 shadow-card">
            <div className="flex items-start gap-3">
              <span className="text-2xl">{inv.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold truncate">{inv.name}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${riskColors[inv.risk]}`}>{inv.risk}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mb-2">{inv.description}</p>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><TrendingUp size={10} className="text-success" /> {inv.returnRange} p.a.</span>
                  <span>Min: {formatTZS(inv.minAmount)} TZS</span>
                  <span>{inv.type}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Investments;
