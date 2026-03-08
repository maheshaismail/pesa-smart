import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { LayoutDashboard, Receipt, PiggyBank, Target, MessageCircle, CreditCard, Calculator, TrendingUp, Bell, Settings, MoreHorizontal, X, Smartphone, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const mainNav = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/expenses', icon: Receipt, labelKey: 'nav.expenses' },
  { path: '/budget', icon: PiggyBank, labelKey: 'nav.budget' },
  { path: '/savings', icon: Target, labelKey: 'nav.savings' },
];

const moreNav = [
  { path: '/reports', icon: BarChart3, label: 'Reports' },
  { path: '/sms-parser', icon: Smartphone, label: 'SMS Parser' },
  { path: '/debts', icon: CreditCard, label: 'Debts' },
  { path: '/tax', icon: Calculator, label: 'Tax' },
  { path: '/investments', icon: TrendingUp, label: 'Invest' },
  { path: '/bills', icon: Bell, label: 'Bills' },
  { path: '/advisor', icon: MessageCircle, label: 'AI Advisor' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const BottomNav = () => {
  const location = useLocation();
  const { t } = useI18n();
  const [showMore, setShowMore] = useState(false);
  const isMoreActive = moreNav.some(n => location.pathname === n.path);

  return (
    <>
      <AnimatePresence>
        {showMore && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-foreground/30 glass" onClick={() => setShowMore(false)}>
            <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="absolute bottom-20 left-4 right-4 max-w-md mx-auto rounded-2xl bg-card p-4 shadow-elevated" onClick={e => e.stopPropagation()}>
              <div className="grid grid-cols-3 gap-3">
                {moreNav.map(item => {
                  const Icon = item.icon;
                  const active = location.pathname === item.path;
                  return (
                    <Link key={item.path} to={item.path} onClick={() => setShowMore(false)} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
                      <Icon size={20} />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 glass safe-bottom">
        <div className="mx-auto flex max-w-md items-center justify-around py-1.5">
          {mainNav.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className="relative flex flex-col items-center gap-0.5 px-3 py-1.5">
                {isActive && (
                  <motion.div layoutId="nav-indicator" className="absolute -top-1.5 h-0.5 w-8 rounded-full gradient-primary" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <Icon size={22} className={isActive ? 'text-primary' : 'text-muted-foreground'} />
                <span className={`text-[10px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{t(item.labelKey)}</span>
              </Link>
            );
          })}
          <button onClick={() => setShowMore(!showMore)} className="relative flex flex-col items-center gap-0.5 px-3 py-1.5">
            {isMoreActive && (
              <motion.div layoutId="nav-indicator" className="absolute -top-1.5 h-0.5 w-8 rounded-full gradient-primary" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
            )}
            <MoreHorizontal size={22} className={isMoreActive || showMore ? 'text-primary' : 'text-muted-foreground'} />
            <span className={`text-[10px] font-medium ${isMoreActive || showMore ? 'text-primary' : 'text-muted-foreground'}`}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
