import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { User, Session } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  businessName?: string;
  industryId?: string;
  isDemo?: boolean;
}

interface SignUpMetadata {
  fullName: string;
  businessName: string;
  industryId: string;
}

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata: SignUpMetadata) => Promise<{ error: string | null; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  loginAsDemo: (companyName: string, industryId?: string) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync Supabase Auth session on startup
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          if (mounted) {
            setSession(data.session);
            setSupabaseUser(data.session.user);
            const meta = data.session.user.user_metadata || {};
            
            // Clear Supabase auth tokens from the URL after consuming them.
            // Without this, refreshing the page causes Supabase to re-parse
            // the stale access_token/code from the URL, triggering a 403 because
            // the URL token has already expired (issues -9543s warning).
            const url = new URL(window.location.href);
            const hasAuthParams = url.hash.includes('access_token') ||
              url.searchParams.has('code') ||
              url.searchParams.has('type');
            if (hasAuthParams) {
              url.hash = '';
              url.searchParams.delete('code');
              url.searchParams.delete('type');
              url.searchParams.delete('error');
              url.searchParams.delete('error_description');
              window.history.replaceState({}, document.title, url.pathname + (url.search !== '?' ? url.search : ''));
            }

            // Query user's real business_profile from Supabase table
            let businessName = meta.business_name || '';
            let industryId = meta.industry_id || 'manufacturing';
            try {
              const { data: prof } = await supabase
                .from('business_profile')
                .select('business_name, industry_id')
                .eq('user_id', data.session.user.id)
                .maybeSingle();
              if (prof?.business_name) {
                businessName = prof.business_name;
              }
              if (prof?.industry_id) {
                industryId = prof.industry_id;
              }
            } catch (err) {
              console.warn('Could not query business_profile:', err);
            }

            setUser({
              id: data.session.user.id,
              email: data.session.user.email || '',
              fullName: meta.full_name || meta.name || data.session.user.email?.split('@')[0],
              businessName: businessName || 'My Enterprise',
              industryId: industryId,
              isDemo: false,
            });
            setIsAuthenticated(true);
          }
        } else {
          // Check if local demo session was active
          const isDemoActive = localStorage.getItem('flowshield_demo_auth');
          if (isDemoActive) {
            try {
              const demoData = JSON.parse(isDemoActive);
              if (mounted) {
                setUser(demoData);
                setIsAuthenticated(true);
              }
            } catch {
              localStorage.removeItem('flowshield_demo_auth');
            }
          }
        }
      } catch (err) {
        console.warn('Auth initialization check:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // Listen for auth state transitions (Sign in, Sign out, Token Refresh)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (newSession?.user) {
        setSession(newSession);
        setSupabaseUser(newSession.user);
        const meta = newSession.user.user_metadata || {};

        let businessName = meta.business_name || '';
        let industryId = meta.industry_id || 'manufacturing';
        try {
          const { data: prof } = await supabase
            .from('business_profile')
            .select('business_name, industry_id')
            .eq('user_id', newSession.user.id)
            .maybeSingle();
          if (prof?.business_name) businessName = prof.business_name;
          if (prof?.industry_id) industryId = prof.industry_id;
        } catch {}

        setUser({
          id: newSession.user.id,
          email: newSession.user.email || '',
          fullName: meta.full_name || meta.name || newSession.user.email?.split('@')[0],
          businessName: businessName || 'My Enterprise',
          industryId: industryId,
          isDemo: false,
        });
        setIsAuthenticated(true);
        localStorage.removeItem('flowshield_demo_auth');
        localStorage.setItem('flowshield_authenticated', 'true');
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('flowshield_demo_auth');
        localStorage.removeItem('flowshield_authenticated');
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUser((prev) => (prev ? { ...prev, ...profile } : null));
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setSupabaseUser(data.session.user);
        const meta = data.session.user.user_metadata || {};

        let businessName = meta.business_name || '';
        let industryId = meta.industry_id || 'manufacturing';
        try {
          const { data: prof } = await supabase
            .from('business_profile')
            .select('business_name, industry_id')
            .eq('user_id', data.session.user.id)
            .maybeSingle();
          if (prof?.business_name) businessName = prof.business_name;
          if (prof?.industry_id) industryId = prof.industry_id;
        } catch {}

        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
          fullName: meta.full_name || meta.name || data.session.user.email?.split('@')[0],
          businessName: businessName || 'My Enterprise',
          industryId: industryId,
          isDemo: false,
        });
        setIsAuthenticated(true);
        localStorage.removeItem('flowshield_demo_auth');
        localStorage.setItem('flowshield_authenticated', 'true');
      }

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'An unexpected authentication error occurred.' };
    }
  };

  const signUp = async (email: string, password: string, metadata: SignUpMetadata) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: metadata.fullName,
            business_name: metadata.businessName,
            industry_id: metadata.industryId,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      // If Supabase has email confirmation enabled, user is created but session is null
      if (data.user && !data.session) {
        return { error: null, needsEmailConfirmation: true };
      }

      if (data.session) {
        setSession(data.session);
        setSupabaseUser(data.session.user);
        setUser({
          id: data.session.user.id,
          email: data.session.user.email || '',
          fullName: metadata.fullName,
          businessName: metadata.businessName || '',
          industryId: metadata.industryId || 'manufacturing',
          isDemo: false,
        });
        setIsAuthenticated(true);
        // Clear any old demo or previous user's cached ledger
        localStorage.removeItem('flowshield_demo_auth');
        localStorage.removeItem('flowshield_persistent_ledger');
        localStorage.removeItem('flowshield_onboarded');
        localStorage.setItem('flowshield_authenticated', 'true');
        // Explicitly flag that this new user needs onboarding
        localStorage.setItem(`flowshield_needs_onboarding_${data.session.user.id}`, 'true');
        localStorage.removeItem(`flowshield_data_connected_${data.session.user.id}`);
        localStorage.removeItem(`flowshield_persistent_ledger_${data.session.user.id}`);

        // Upsert into public.business_profile table with user_id
        try {
          await supabase.from('business_profile').upsert({
            id: data.session.user.id,
            user_id: data.session.user.id,
            business_name: metadata.businessName || 'My Enterprise',
            industry_id: metadata.industryId || 'manufacturing',
            currency: 'INR',
            country: 'India',
            cash_floor: 500000,
            is_demo: false,
            updated_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('Could not auto-sync profile to business_profile table:', dbErr);
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to complete registration.' };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    }
    setSession(null);
    setSupabaseUser(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('flowshield_demo_auth');
    localStorage.removeItem('flowshield_authenticated');
    localStorage.removeItem('flowshield_persistent_ledger');
    localStorage.removeItem('flowshield_onboarded');
  };

  const loginAsDemo = async (companyName: string, industryId?: string) => {
    const demoProfile: UserProfile = {
      id: 'demo-cfo-01',
      email: 'cfo@shaktielectronics.in',
      fullName: 'Chief Financial Officer',
      businessName: companyName,
      industryId: industryId || 'manufacturing',
      isDemo: true,
    };
    localStorage.setItem('flowshield_demo_auth', JSON.stringify(demoProfile));
    localStorage.setItem('flowshield_authenticated', 'true');
    setUser(demoProfile);
    setIsAuthenticated(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isAuthenticated,
        isLoading,
        signIn,
        signUp,
        signOut,
        loginAsDemo,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
