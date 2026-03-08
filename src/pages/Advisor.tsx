import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: "Habari! 👋 I'm your PesaSmart AI advisor. I can help you with budgeting, saving tips, investment advice, and tax estimation for Tanzania. Ask me anything about your finances!",
  },
];

const mockResponses: Record<string, string> = {
  save: "Based on your income of 2,650,000 TZS, I recommend saving at least **25-30%** (662,500 - 795,000 TZS). Here's a breakdown:\n\n- 🛡️ Emergency fund: 200,000 TZS\n- 🏠 House goal: 300,000 TZS\n- 💰 General savings: 162,500 TZS\n\nThis would help you reach your emergency fund goal in about **6 months**.",
  phone: "A good smartphone in Tanzania costs between **300,000 - 800,000 TZS**. Based on your current savings rate, you could afford a mid-range phone (500,000 TZS) in about **3 months** without affecting your other savings goals. I'd recommend waiting until after you hit your emergency fund target.",
  invest: "For your risk profile and income level, I'd suggest:\n\n1. **Government Bonds (GTBS)** - Safe, 8-12% return\n2. **Fixed Deposits** - NMB/CRDB offer 7-9% p.a.\n3. **Unit Trusts** - UTT AMIS funds, diversified\n\nStart with government bonds for stability, then diversify as your savings grow.",
  tax: "For a monthly salary of **2,500,000 TZS** in Tanzania:\n\n- Annual income: 30,000,000 TZS\n- PAYE Tax: ~5,580,000 TZS/year\n- Monthly tax: ~465,000 TZS\n- Effective rate: ~18.6%\n\nYou may reduce this through allowable deductions like pension contributions.",
  default: "Great question! Based on your financial data, I can see you're doing well with a financial health score of **74/100**. Here are my top recommendations:\n\n1. 📉 Reduce food spending by 12% (cook more at home)\n2. 💰 Increase emergency fund contributions\n3. 📊 Consider investing surplus in GTBS bonds\n\nWould you like me to dive deeper into any of these?",
};

const Advisor = () => {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const send = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const lower = input.toLowerCase();
    let response = mockResponses.default;
    if (lower.includes('save') || lower.includes('akiba')) response = mockResponses.save;
    else if (lower.includes('phone') || lower.includes('simu')) response = mockResponses.phone;
    else if (lower.includes('invest') || lower.includes('uwekezaji')) response = mockResponses.invest;
    else if (lower.includes('tax') || lower.includes('kodi')) response = mockResponses.tax;

    setTimeout(() => {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: response }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] pt-2">
      <h1 className="text-xl font-bold font-display mb-3">{t('adv.title')}</h1>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'assistant' ? 'gradient-primary' : 'bg-muted'
              }`}>
                {msg.role === 'assistant' ? <Bot size={14} className="text-primary-foreground" /> : <User size={14} className="text-muted-foreground" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'assistant'
                  ? 'bg-card shadow-card text-card-foreground'
                  : 'gradient-primary text-primary-foreground'
              }`}>
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
        {isTyping && (
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

      {/* Quick prompts */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 no-scrollbar">
        {['How much should I save?', 'Can I afford a new phone?', 'Investment tips', 'Estimate my tax'].map(q => (
          <button
            key={q}
            onClick={() => { setInput(q); }}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-medium whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 pb-20 pt-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t('adv.placeholder')}
          className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={send}
          disabled={!input.trim()}
          className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center disabled:opacity-40 transition-opacity"
        >
          <Send size={18} className="text-primary-foreground" />
        </button>
      </div>
    </div>
  );
};

export default Advisor;
