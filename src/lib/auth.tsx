import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSiteUrl } from '@/lib/site-url';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signUp: async () => ({ error: null }),
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    // If signup didn't produce an authenticated session, try signing in immediately.
    // Supabase can rate-limit immediate sign-in attempts after signUp with a
    // message like "For security purposes, you can only request this after 53 seconds.".
    // Retry intelligently: parse the wait time from the error message and retry.
    if (!error && !data.session) {
      const maxRetries = 3;
      let attempt = 0;
      let lastError: any = null;

      while (attempt < maxRetries) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (!signInError) {
          lastError = null;
          break;
        }

        lastError = signInError;
        const msg: string = (signInError?.message || '').toString();
        const m = msg.match(/after\s+(\d+)\s*seconds?/i);
        if (m && m[1]) {
          const waitMs = parseInt(m[1], 10) * 1000 + 1000;
          // wait then retry
          await new Promise((r) => setTimeout(r, waitMs));
          attempt += 1;
          continue;
        }

        // If error isn't the rate-limit message, stop retrying
        break;
      }

      return { error: lastError ?? null };
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
