import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAuthErrorMessage } from '../lib/authErrors';
import {
  clearAuthParamsFromUrl,
  hasAuthCallbackInUrl,
  isPasswordRecoveryUrl,
} from '../lib/authRecovery';
import { isSupabaseConfigured, supabase, syncAccessToken } from '../lib/supabase';

const AuthContext = createContext(null);
const RECOVERY_BOOTSTRAP_MS = 6000;

function isRecoveryAuthEvent(event) {
  return event === 'PASSWORD_RECOVERY'
    || (event === 'SIGNED_IN' && isPasswordRecoveryUrl())
    || (event === 'INITIAL_SESSION' && isPasswordRecoveryUrl());
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(isPasswordRecoveryUrl);
  const [authBootstrapDone, setAuthBootstrapDone] = useState(!hasAuthCallbackInUrl());

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setAuthBootstrapDone(true);
      return undefined;
    }

    let mounted = true;
    let recoveryActive = isPasswordRecoveryUrl() || hasAuthCallbackInUrl();

    if (recoveryActive) {
      setPasswordRecoveryPending(true);
    }

    const finishBootstrap = () => {
      if (!mounted) return;
      setAuthBootstrapDone(true);
      setLoading(false);
    };

    const bootstrapTimer = window.setTimeout(async () => {
      if (!mounted) return;

      const { data: { session: latestSession } } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!latestSession) {
        setPasswordRecoveryPending(false);
      }

      finishBootstrap();
    }, RECOVERY_BOOTSTRAP_MS);

    const applySession = (event, nextSession) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY') {
        recoveryActive = true;
        setPasswordRecoveryPending(true);
      } else if (isRecoveryAuthEvent(event) && nextSession) {
        recoveryActive = true;
        setPasswordRecoveryPending(true);
      }

      setSession(nextSession);
      syncAccessToken(nextSession);

      if (nextSession && recoveryActive && (
        event === 'PASSWORD_RECOVERY'
        || event === 'SIGNED_IN'
        || event === 'INITIAL_SESSION'
      )) {
        clearAuthParamsFromUrl();
        window.clearTimeout(bootstrapTimer);
        finishBootstrap();
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        if (!recoveryActive || nextSession || event === 'SIGNED_OUT') {
          window.clearTimeout(bootstrapTimer);
          finishBootstrap();
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(event, nextSession);
    });

    async function exchangeCodeIfPresent() {
      const code = new URLSearchParams(window.location.search).get('code');
      if (!code) return;

      recoveryActive = true;
      setPasswordRecoveryPending(true);

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error && mounted) {
        console.error('[Auth] exchangeCodeForSession:', error.message);
        window.clearTimeout(bootstrapTimer);
        finishBootstrap();
      }
    }

    exchangeCodeIfPresent();

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mounted) return;

      if (currentSession && isPasswordRecoveryUrl()) {
        recoveryActive = true;
        setPasswordRecoveryPending(true);
        setSession(currentSession);
        syncAccessToken(currentSession);
        clearAuthParamsFromUrl();
      }

      if (!recoveryActive) {
        setSession(currentSession);
        syncAccessToken(currentSession);
        window.clearTimeout(bootstrapTimer);
        finishBootstrap();
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(bootstrapTimer);
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    loading,
    authBootstrapDone,
    isConfigured: isSupabaseConfigured,
    passwordRecoveryPending,

    async signIn(email, password) {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw new Error(getAuthErrorMessage(error, 'Login gagal. Periksa email dan password.'));
      }

      syncAccessToken(data.session);
      setSession(data.session);
      return data;
    },

    async signUp(email, password) {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/chat`,
        },
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error, 'Pendaftaran gagal. Coba email lain.'));
      }

      if (data.user && data.user.identities?.length === 0) {
        throw new Error('Email sudah terdaftar. Silakan masuk.');
      }

      if (data.session) {
        syncAccessToken(data.session);
        setSession(data.session);
      }

      return data;
    },

    async signInWithOApps() {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
      }

      const provider = import.meta.env.VITE_OAPPS_OAUTH_PROVIDER || 'google';
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/chat`,
        },
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error, 'Gagal masuk dengan akun O\'Apps.'));
      }
    },

    async requestMagicLink(email) {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/chat`,
          shouldCreateUser: false,
        },
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error, 'Gagal mengirim magic link. Coba lagi.'));
      }
    },

    async requestPasswordResetLink(email) {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error, 'Gagal mengirim link ubah password. Coba lagi.'));
      }
    },

    async completePasswordReset(password) {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
      }

      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw new Error(getAuthErrorMessage(error, 'Gagal mengubah password. Coba lagi.'));
      }

      const userId = data.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('id', userId)
          .maybeSingle();

        if (profile?.display_name) {
          await supabase
            .from('user_profiles')
            .update({ display_name: profile.display_name })
            .eq('id', userId);
        }
      }

      setPasswordRecoveryPending(false);
      syncAccessToken(null);
      await supabase.auth.signOut({ scope: 'global' });
      setSession(null);

      return data;
    },

    async resendVerificationEmail(email) {
      if (!supabase) {
        throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.');
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/chat`,
        },
      });

      if (error) {
        throw new Error(getAuthErrorMessage(error, 'Gagal mengirim ulang email verifikasi.'));
      }
    },

    async signOut() {
      syncAccessToken(null);
      setPasswordRecoveryPending(false);
      if (supabase) {
        await supabase.auth.signOut();
      }
      setSession(null);
    },
  }), [session, loading, authBootstrapDone, passwordRecoveryPending]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus dipakai di dalam AuthProvider');
  }
  return context;
}
