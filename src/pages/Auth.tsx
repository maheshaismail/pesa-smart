import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (forgotMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        toast.error(error.message);
      } else {
        setResetSent(true);
        toast.success('Password reset email sent! Check your inbox.');
      }
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        navigate('/');
      }
    } else {
      if (!fullName.trim()) {
        toast.error('Please enter your name');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Check your email to confirm your account!');
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-3">
            <span className="text-primary-foreground font-bold text-2xl font-display">P</span>
          </div>
          <h1 className="text-2xl font-bold font-display">PesaSmart</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered financial planning</p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-xl bg-muted p-1 mb-6">
          {(['Login', 'Sign Up'] as const).map((tab, i) => (
            <button
              key={tab}
              onClick={() => setIsLogin(i === 0)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                (i === 0 ? isLogin : !isLogin) ? 'bg-card shadow-card text-foreground' : 'text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {!isLogin && !forgotMode && (
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
          {!forgotMode && (
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-xl border border-input bg-card px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}
          {isLogin && !forgotMode && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => { setForgotMode(true); setResetSent(false); }}
                className="text-xs text-primary font-medium hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}
          {forgotMode && resetSent ? (
            <div className="text-center py-2">
              <p className="text-sm text-muted-foreground mb-3">We sent a reset link to <span className="font-medium text-foreground">{email}</span></p>
              <button
                type="button"
                onClick={() => { setForgotMode(false); setResetSent(false); }}
                className="text-xs text-primary font-medium hover:underline"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary border-0 text-primary-foreground rounded-xl py-3 text-sm font-semibold"
            >
              {loading ? 'Please wait...' : forgotMode ? 'Send Reset Link' : isLogin ? 'Log In' : 'Create Account'}
            </Button>
          )}
          {forgotMode && !resetSent && (
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
            >
              Back to Login
            </button>
          )}
        </form>
      </motion.div>
    </div>
  );
};

export default Auth;
