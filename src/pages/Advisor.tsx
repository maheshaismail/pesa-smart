import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { fetchTransactions, formatTZS, getFinancialSummary } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Pencil, Trash2, Check, X, History } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  persisted?: boolean;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/financial-advisor`;
const WELCOME: Message = { id: 'welcome', role: 'assistant', content: "Habari! 👋 I'm your PesaSmart AI advisor. I analyze your real financial data to give personalized advice on budgeting, saving, investing, and taxes in Tanzania. Ask me anything!" };

const Advisor = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: transactions = [] } = useQuery({ queryKey: ['transactions'], queryFn: fetchTransactions });

  // Load persisted chat history
  const { data: history = [] } = useQuery({
    queryKey: ['chat_messages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hydrate messages from DB
  useEffect(() => {
    if (history.length > 0) {
      const hist = history.map((m: any) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        persisted: true,
      }));
      setMessages([WELCOME, ...hist]);
    }
  }, [history]);

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

  const persistMessage = async (role: 'user' | 'assistant', content: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ user_id: user.id, role, content })
      .select()
      .single();
    if (error) { console.error(error); return null; }
    return data;
  };

  const send = async () => {
    if (!input.trim() || isStreaming) return;
    const userContent = input;
    setInput('');
    setIsStreaming(true);

    // Persist user message
    const savedUser = await persistMessage('user', userContent);
    const userMsg: Message = { id: savedUser?.id || Date.now().toString(), role: 'user', content: userContent, persisted: !!savedUser };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

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
          messages: newMessages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content })),
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

      // Persist final assistant message
      if (assistantContent) {
        const savedAsst = await persistMessage('assistant', assistantContent);
        if (savedAsst) {
          setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, id: savedAsst.id, persisted: true } : m));
        }
        queryClient.invalidateQueries({ queryKey: ['chat_messages'] });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to connect to AI advisor');
    }
    setIsStreaming(false);
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditText(msg.content);
  };

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    const { error } = await supabase.from('chat_messages').update({ content: editText }).eq('id', editingId);
    if (error) { toast.error(error.message); return; }
    setMessages(prev => prev.map(m => m.id === editingId ? { ...m, content: editText } : m));
    setEditingId(null);
    setEditText('');
    toast.success('Message updated');
    queryClient.invalidateQueries({ queryKey: ['chat_messages'] });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('chat_messages').delete().eq('id', deleteId);
    if (error) { toast.error(error.message); return; }
    setMessages(prev => prev.filter(m => m.id !== deleteId));
    setDeleteId(null);
    toast.success('Message deleted');
    queryClient.invalidateQueries({ queryKey: ['chat_messages'] });
  };

  const clearHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('chat_messages').delete().eq('user_id', user.id);
    if (error) { toast.error(error.message); return; }
    setMessages([WELCOME]);
    setShowHistory(false);
    toast.success('Chat history cleared');
    queryClient.invalidateQueries({ queryKey: ['chat_messages'] });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] pt-2">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold font-display">{t('adv.title')}</h1>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card shadow-card text-xs font-medium"
        >
          <History size={14} /> History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2.5 group ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'assistant' ? 'gradient-primary' : 'bg-muted'}`}>
                {msg.role === 'assistant' ? <Bot size={14} className="text-primary-foreground" /> : <User size={14} className="text-muted-foreground" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-card shadow-card text-card-foreground' : 'gradient-primary text-primary-foreground'}`}>
                {editingId === msg.id ? (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      className="w-full bg-background text-foreground rounded-lg p-2 text-sm border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={3}
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-background text-foreground"><X size={14} /></button>
                      <button onClick={saveEdit} className="p-1.5 rounded-lg bg-primary text-primary-foreground"><Check size={14} /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.content.split('\n').map((line, i) => (
                      <p key={i} className={i > 0 ? 'mt-1' : ''}>
                        {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j}>{part.slice(2, -2)}</strong>
                            : part
                        )}
                      </p>
                    ))}
                    {msg.persisted && (
                      <div className={`flex gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <button onClick={() => startEdit(msg)} className={`p-1 rounded-md ${msg.role === 'user' ? 'hover:bg-primary-foreground/20' : 'hover:bg-muted'}`}>
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => setDeleteId(msg.id)} className={`p-1 rounded-md ${msg.role === 'user' ? 'hover:bg-primary-foreground/20' : 'hover:bg-destructive/10 hover:text-destructive'}`}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </>
                )}
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

      {/* History sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-foreground/30 glass flex items-end justify-center" onClick={() => setShowHistory(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md rounded-t-2xl bg-card p-5 safe-bottom max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display">Chat History</h2>
                <button onClick={() => setShowHistory(false)} className="text-muted-foreground"><X size={20} /></button>
              </div>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No saved messages yet</p>
              ) : (
                <>
                  <div className="space-y-2 mb-4">
                    {history.map((m: any) => (
                      <div key={m.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'assistant' ? 'gradient-primary' : 'bg-muted'}`}>
                          {m.role === 'assistant' ? <Bot size={12} className="text-primary-foreground" /> : <User size={12} className="text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-0.5">{new Date(m.created_at).toLocaleString()}</p>
                          <p className="text-sm line-clamp-2">{m.content}</p>
                        </div>
                        <button onClick={() => setDeleteId(m.id)} className="p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={clearHistory}
                    className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                  >
                    Clear All History
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this message from your chat history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Advisor;
