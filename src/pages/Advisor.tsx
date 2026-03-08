import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { fetchTransactions, formatTZS, getFinancialSummary } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-advisor`;

const Advisor = () => {
  const { t } = useI18n();
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Habari! 👋 I'm your PesaSmart AI advisor. I analyze your real financial data to give personalized advice on budgeting, saving, investing, and taxes in Tanzania. Ask me anything!" },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const buildFinancialContext = () => {
    if (transactions.length === 0) return '';
    const summary = getFinancialSummary(transactions);
    const catBreakdown = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc; }, {} as Record<string, number>);

    return `Monthly income: ${formatTZS(summary.income)} TZS
Monthly expenses: ${formatTZS(summary.expenses)} TZS
Balance: ${formatTZS(summary.balance)} TZS
Savings rate: ${summary.savingsRate.toFixed(1)}%
Financial health score: ${summary.score}/100
Expense breakdown: ${Object.entries(catBreakdown).map(([k, v]) => `${k}: ${formatTZS(v)} TZS`).join(', ')}`;
  };

  const send = async () => {
    if (!input.trim() || isStreaming) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    let assistantContent = '';
    const assistantId = (Date.now() + 1).toString();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.id !== '1').map(m => ({ role: m.role, content: m.content })),
          financialContext: buildFinancialContext(),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'AI service error' }));
        toast.error(err.error || 'Failed to get response');
        setIsStreaming(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.id === assistantId) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { id: assistantId, role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to connect to AI advisor');
    }
    setIsStreaming(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] pt-2">
      <h1 className="text-xl font-bold font-display mb-3">{t('adv.title')}</h1>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'gradient-primary' : 'bg-muted'}`}>
                {msg.role === 'assistant' ? <Bot size={14} className="text-primary-foreground" /> : <User size={14} className="text-muted-foreground" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-card shadow-card text-card-foreground' : 'gradient-primary text-primary-foreground'}`}>
                {msg.content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-1' : ''}>
                    {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
                      part.startsWith('**') && part.endsWith('**')
                        ? <strong key={j}>{part.slice(2, -2)}</strong>
                        : part
                    )}
                  </p>
                ))}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center">
              <Bot size={14} className="text-primary-foreground" />
            </div>
            <div className="bg-card shadow-card rounded-2xl px-4 py-3 flex gap-1">
              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-pulse-soft" />
              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
              <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {['How much should I save?', 'Can I afford a new phone?', 'Investment tips for Tanzania', 'Estimate my PAYE tax'].map(q => (
          <button key={q} onClick={() => setInput(q)} className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-medium whitespace-nowrap">{q}</button>
        ))}
      </div>

      <div className="flex gap-2 pb-20 pt-2">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={t('adv.placeholder')} className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <button onClick={send} disabled={!input.trim() || isStreaming} className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center disabled:opacity-40 transition-opacity">
          <Send size={18} className="text-primary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default Advisor;
