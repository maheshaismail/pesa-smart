import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Globe, LogOut, WifiOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { NotificationBell, NotificationPanel, useSmartNotifications } from '@/components/SmartNotifications';
import InstallPrompt from '@/components/InstallPrompt';

const AppLayout = () => {
  const { lang, setLang } = useI18n();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, loading, generateInsights, markAllRead, deleteNotification, clearAll } = useSmartNotifications();
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleOpenNotifications = () => {
    setShowNotifications(true);
    markAllRead();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-background/95 glass">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm font-display">P</span>
          </div>
          <span className="font-bold font-display text-lg">PesaSmart</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell unreadCount={unreadCount} onClick={handleOpenNotifications} />
          <button
            onClick={() => setLang(lang === 'en' ? 'sw' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-muted-foreground"
          >
            <Globe size={14} />
            {lang === 'en' ? 'SW' : 'EN'}
          </button>
          <button onClick={handleSignOut} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {offline && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="bg-warning/10 border-b border-warning/20 px-4 py-2 flex items-center gap-2 text-xs text-warning">
          <WifiOff size={12} /> You're offline. Transactions will sync when you're back online.
        </motion.div>
      )}

      <AnimatePresence>
        {showNotifications && (
          <NotificationPanel
            notifications={notifications}
            loading={loading}
            onClose={() => setShowNotifications(false)}
            onRefresh={generateInsights}
            onDelete={deleteNotification}
            onClearAll={clearAll}
          />
        )}
      </AnimatePresence>

      <main className="px-4 pb-20">
        <Outlet />
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
};

export default AppLayout;
