import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { formatTZS } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, ArrowUpRight, ArrowDownRight, Check, Loader2, MessageSquareText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string | null;
  source: string | null;
  transaction_date: string;
  sender_receiver: string | null;
  selected?: boolean;
}

const sampleSMS = `Umepokea TZS 200,000 kutoka kwa JOHN DOE 0754123456 kupitia M-Pesa tarehe 15/03/2026. Salio lako ni TZS 350,000.

Umetuma TZS 50,000 kwa TANESCO LUKU 12345678 kupitia M-Pesa tarehe 16/03/2026. Salio lako ni TZS 300,000.

You have received TZS 150,000 from JANE SMITH 0685123456 via Airtel Money on 17/03/2026. Your balance is TZS 450,000.

Umepokea TZS 100,000 kutoka kwa ALI HASSAN 0625123456 kupitia HaloPesa. Salio lako ni TZS 200,000. Nambari ya muamala: HP123456789.

Umepokea TZS 75,000 kutoka kwa FATMA OMAR 0715123456 kupitia Tigo Pesa tarehe 18/03/2026.`;

const SmsParser = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [smsText, setSmsText] = useState('');
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleParse = async () => {
    if (!smsText.trim()) {
      toast.error('Please paste SMS messages first');
      return;
    }
    if (smsText.length > 10000) {
      toast.error('Text too long. Please paste fewer messages.');
      return;
    }

    setParsing(true);
    setError('');
    setParsed([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sms-parser`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ smsMessages: smsText }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || 'Failed to parse SMS');
      }

      const data = await resp.json();
      if (data.transactions && data.transactions.length > 0) {
        setParsed(data.transactions.map((t: ParsedTransaction) => ({ ...t, selected: true })));
        toast.success(`Found ${data.transactions.length} transaction(s)!`);
      } else {
        setError('No transactions found. Make sure you paste actual mobile money SMS from M-Pesa, Airtel Money, Tigo Pesa, HaloPesa, or other TZ networks.');
      }
    } catch (e: any) {
      setError(e.message);
      toast.error(e.message);
    } finally {
      setParsing(false);
    }
  };

  const toggleSelect = (index: number) => {
    setParsed(prev => prev.map((t, i) => i === index ? { ...t, selected: !t.selected } : t));
  };

  const handleSaveSelected = async () => {
    const selected = parsed.filter(t => t.selected);
    if (selected.length === 0) {
      toast.error('Select at least one transaction to save');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const inserts = selected.map(t => ({
        user_id: user.id,
        amount: t.amount,
        type: t.type,
        category: t.category,
        description: t.description,
        source: t.source,
        transaction_date: t.transaction_date,
      }));

      const { error } = await supabase.from('transactions').insert(inserts);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success(`${selected.length} transaction(s) saved!`);
      setParsed([]);
      setSmsText('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = parsed.filter(t => t.selected).length;

  return (
    <div className="space-y-5 pb-24 pt-2">
      <div className="flex items-center gap-2">
        <Smartphone size={20} className="text-primary" />
        <h1 className="text-xl font-bold font-display">SMS Parser</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
        <div className="flex items-start gap-2.5">
          <MessageSquareText size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold font-display">Paste SMS Messages</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Copy your M-Pesa, Airtel Money, or Tigo Pesa SMS messages and paste them below. Our AI will extract transaction details automatically.
            </p>
          </div>
        </div>

        <textarea
          value={smsText}
          onChange={e => setSmsText(e.target.value)}
          placeholder="Paste your mobile money SMS messages here...&#10;&#10;You can paste multiple messages at once."
          className="w-full h-36 rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          maxLength={10000}
        />

        <div className="flex items-center gap-2">
          <Button
            onClick={handleParse}
            disabled={parsing || !smsText.trim()}
            className="flex-1 gradient-primary border-0 text-primary-foreground rounded-xl py-3 text-sm font-semibold"
          >
            {parsing ? (
              <><Loader2 size={16} className="animate-spin mr-1.5" /> Parsing...</>
            ) : (
              'Parse SMS Messages'
            )}
          </Button>
          <button
            onClick={() => setSmsText(sampleSMS)}
            className="text-[10px] text-primary underline px-2 py-1"
          >
            Try sample
          </button>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-xs">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Parsed results */}
      {parsed.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold font-display">Parsed Transactions ({parsed.length})</h3>
            <span className="text-[10px] text-muted-foreground">{selectedCount} selected</span>
          </div>

          <div className="space-y-2">
            {parsed.map((tx, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => toggleSelect(i)}
                className={`flex items-center gap-3 rounded-xl bg-card p-3 shadow-card cursor-pointer transition-all ${
                  tx.selected ? 'ring-2 ring-primary/40' : 'opacity-60'
                }`}
              >
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  tx.selected ? 'bg-primary border-primary' : 'border-input'
                }`}>
                  {tx.selected && <Check size={12} className="text-primary-foreground" />}
                </div>

                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  tx.type === 'income' ? 'bg-success/10' : 'bg-destructive/10'
                }`}>
                  {tx.type === 'income'
                    ? <ArrowUpRight size={16} className="text-success" />
                    : <ArrowDownRight size={16} className="text-destructive" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description || tx.category}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {tx.source} · {tx.category} · {tx.transaction_date}
                    {tx.sender_receiver && ` · ${tx.sender_receiver}`}
                  </p>
                </div>

                <p className={`text-sm font-semibold font-display flex-shrink-0 ${
                  tx.type === 'income' ? 'text-success' : 'text-destructive'
                }`}>
                  {tx.type === 'income' ? '+' : '-'}{formatTZS(tx.amount)}
                </p>
              </motion.div>
            ))}
          </div>

          <Button
            onClick={handleSaveSelected}
            disabled={saving || selectedCount === 0}
            className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3 text-sm font-semibold"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin mr-1.5" /> Saving...</>
            ) : (
              `Save ${selectedCount} Transaction${selectedCount !== 1 ? 's' : ''}`
            )}
          </Button>
        </motion.div>
      )}

      {/* Supported services info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-accent/30 p-4 space-y-2">
        <h3 className="text-xs font-semibold font-display">Supported Services</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'M-Pesa', emoji: '📱', desc: 'Vodacom' },
            { name: 'Airtel Money', emoji: '📲', desc: 'Airtel' },
            { name: 'Tigo Pesa', emoji: '💰', desc: 'Legacy' },
          ].map(s => (
            <div key={s.name} className="text-center p-2 rounded-lg bg-card/50">
              <span className="text-lg">{s.emoji}</span>
              <p className="text-[10px] font-medium mt-0.5">{s.name}</p>
              <p className="text-[9px] text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Copy SMS messages from your phone's messaging app and paste them above. You can paste multiple messages at once. The AI will automatically detect the service and extract transaction details.
        </p>
      </motion.div>
    </div>
  );
};

export default SmsParser;
