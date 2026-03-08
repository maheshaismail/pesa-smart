import { Outlet, useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Globe, LogOut } from 'lucide-react';

const AppLayout = () => {
  const { lang, setLang } = useI18n();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
        <div className="flex items-center gap-2">
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
      <main className="px-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
