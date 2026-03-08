import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, CheckCircle, Lightbulb, TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface SmartNotification {
  id: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const typeConfig: Record<string, { icon: typeof Bell; className: string }> = {
  warning: { icon: AlertTriangle, className: 'text-warning bg-warning/10' },
  success: { icon: CheckCircle, className: 'text-success bg-success/10' },
  insight: { icon: TrendingUp, className: 'text-primary bg-primary/10' },
  tip: { icon: Lightbulb, className: 'text-secondary bg-secondary/10' },
};

export function useSmartNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('smart_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setNotifications(data as SmartNotification[]);
  };

  const generateInsights = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/spending-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({}),
        }
      );

      if (resp.ok) {
        await fetchNotifications();
      }
    } catch (e) {
      console.error('Failed to generate insights:', e);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('smart_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  return { notifications, unreadCount, loading, generateInsights, markAllRead, fetchNotifications };
}

export function NotificationBell({
  unreadCount,
  onClick,
}: {
  unreadCount: number;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="relative p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
      <Bell size={16} />
      {unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.span>
      )}
    </button>
  );
}

export function NotificationPanel({
  notifications,
  loading,
  onClose,
  onRefresh,
}: {
  notifications: SmartNotification[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-foreground/30 glass"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        className="mx-4 mt-16 max-w-md mx-auto rounded-2xl bg-card p-4 shadow-elevated max-h-[70vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold font-display">Smart Notifications</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="text-[10px] px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Refresh'}
            </button>
            <button onClick={onClose} className="text-muted-foreground">
              <X size={18} />
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell size={24} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-xs text-muted-foreground">No notifications yet.</p>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="mt-2 text-xs px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze My Spending'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n, i) => {
              const config = typeConfig[n.type] || typeConfig.insight;
              const Icon = config.icon;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl ${!n.is_read ? 'bg-accent/30' : 'bg-muted/30'}`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${config.className}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">{n.message}</p>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
