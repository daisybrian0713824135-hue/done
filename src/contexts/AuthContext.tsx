import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/types';
import { toast } from 'sonner';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

function phoneToEmail(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  return `${clean}@metapay.phone`;
}

interface RegisterData {
  full_name: string;
  phone: string;
  password: string;
  username?: string;
  email?: string;
  referral_code?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (phone: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: RegisterData) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isActive: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) { setProfile(null); return; }
    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  useEffect(() => {
    supabase.auth.getSession()
      // @ts-ignore
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          getProfile(session.user.id).then(setProfile);
        }
      })
      // @ts-ignore
      .catch((error) => {
        toast.error(`Session error: ${error.message}`);
      })
      .finally(() => { setLoading(false); });

    // In this function, do NOT use any await calls. Use .then() instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (phone: string, password: string) => {
    try {
      const email = phoneToEmail(phone);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (data: RegisterData) => {
    try {
      const email = phoneToEmail(data.phone);
      const { error } = await supabase.auth.signUp({
        email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            username: data.username || null,
            email: data.email || null,
            phone: data.phone,
            referred_by_code: data.referral_code || null,
          },
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'moderator';
  const isActive = profile?.status === 'active' && profile?.account_approved === true;

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, refreshProfile, isAdmin, isActive }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
