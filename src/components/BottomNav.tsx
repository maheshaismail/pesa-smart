import { useLocation, Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
import { LayoutDashboard, Receipt, PiggyBank, Target, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { path: '/', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { path: '/expenses', icon: Receipt, labelKey: 'nav.expenses' },
  { path: '/budget', icon: PiggyBank, labelKey: 'nav.budget' },
  { path: '/savings', icon: Target, labelKey: 'nav.savings' },
  { path: '/advisor', icon: MessageCircle, labelKey: 'nav.advisor' },
];

const BottomNav = () => {
  const location = useLocation();
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 glass safe-bottom">
      <div className="mx-auto flex max-w-md items-center justify-around py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center gap-0.5 px-3 py-1.5"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-1.5 h-0.5 w-8 rounded-full gradient-primary"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                className={isActive ? 'text-primary' : 'text-muted-foreground'}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
