import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { User, Globe, LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { t, lang, setLang } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
        if (data) {
          setFullName(data.full_name || '');
          setPhone(data.phone || '');
        }
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: fullName, phone, language: lang }).eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Profile updated!');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="space-y-5 pb-24 pt-2">
      <h1 className="text-xl font-bold font-display">{t('gen.settings')}</h1>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
        <h3 className="text-sm font-semibold font-display flex items-center gap-1.5"><User size={14} className="text-primary" /> Profile</h3>
        <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <input type="tel" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <div className="text-xs text-muted-foreground">Email: {user?.email}</div>
        <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3 text-sm">
          {saving ? 'Saving...' : 'Update Profile'}
        </Button>
      </motion.div>

      {/* Language */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
        <h3 className="text-sm font-semibold font-display flex items-center gap-1.5"><Globe size={14} className="text-primary" /> {t('gen.language')}</h3>
        <div className="flex rounded-xl bg-muted p-1">
          {([{ key: 'en', label: 'English' }, { key: 'sw', label: 'Kiswahili' }] as const).map(({ key, label }) => (
            <button key={key} onClick={() => setLang(key)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${lang === key ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl bg-card p-4 shadow-card space-y-3">
        <h3 className="text-sm font-semibold font-display flex items-center gap-1.5"><Shield size={14} className="text-primary" /> Security</h3>
        <p className="text-xs text-muted-foreground">Your financial data is encrypted and securely stored.</p>
      </motion.div>

      {/* Sign out */}
      <Button onClick={handleSignOut} variant="outline" className="w-full rounded-xl py-3 text-sm text-destructive border-destructive/30 hover:bg-destructive/5">
        <LogOut size={16} className="mr-2" /> Sign Out
      </Button>
    </div>
  );
};

export default Settings;
