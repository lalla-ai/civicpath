import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useAuth } from './AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, loading: authLoading, loginWithGoogle, loginWithLinkedIn, loginWithEmail, signupWithEmail } = useAuth();

  // Unique page title
  useEffect(() => {
    document.title = 'Sign In | CivicPath';
    return () => { document.title = 'CivicPath — AI Grant Finder'; };
  }, []);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<'seeker' | 'funder'>(searchParams.get('role') === 'funder' ? 'funder' : 'seeker');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('civicpath_auth_redirect_pending') === 'true') {
      setGoogleLoading(true);
      setInfo('Finishing Google sign-in…');
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (sessionStorage.getItem('civicpath_auth_redirect_pending') !== 'true') return;
    if (user) return;

    sessionStorage.removeItem('civicpath_auth_redirect_pending');
    setGoogleLoading(false);
    setInfo('');
    setError('Google sign-in did not complete. Please try again.');
  }, [authLoading, user]);

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Enter your email above first.'); return; }
    setResetLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
      setTimeout(() => setResetSent(false), 8000);
    } catch (err: any) {
      setError('Could not send reset email. Check the address and try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // When Firebase auth state updates: redirect + send welcome email
  useEffect(() => {
    if (user) {
      sessionStorage.removeItem('civicpath_auth_redirect_pending');
      const urlRole = searchParams.get('role') as 'seeker' | 'funder' | null;
      const savedRole = localStorage.getItem('civicpath_role') as 'seeker' | 'funder' | null;
      // Priority: URL param > saved localStorage role > user.role from Firebase > 'seeker' default
      // NOTE: do NOT use `role` component state — it defaults to 'seeker' and overrides saved funder role
      const targetRole = urlRole || savedRole || user.role || 'seeker';
      if (targetRole !== user.role) {
        localStorage.setItem('civicpath_role', targetRole);
      }
      // Send welcome email for Google signups (only if first time — check creationTime)
      if (googleLoading && user.email) {
        sendWelcomeEmail(user.name || '', user.email, targetRole);
      }
      navigate(targetRole === 'funder' ? '/funder' : '/seeker', { replace: true });
    }
  }, [user, navigate, searchParams, role]);

  const handleGoogle = async () => {
    setError('');
    setInfo('');
    setGoogleLoading(true);
    try {
      const method = await loginWithGoogle(role);
      if (method === 'redirect') {
        setInfo('Redirecting to Google…');
      }
    } catch (err: any) {
      console.error('[Google Login] Error:', err);
      const code = err?.code || '';
      if (code.includes('popup-blocked')) {
        setError('Google sign-in popup was blocked. Please allow popups and try again.');
      } else if (code.includes('popup-closed-by-user')) {
        setError('Google sign-in popup was closed before completing sign-in.');
      } else if (code.includes('unauthorized-domain')) {
        setError('Google sign-in is not authorized for this domain yet.');
      } else if (code.includes('operation-not-allowed')) {
        setError('Google sign-in is not enabled in Firebase Auth yet.');
      } else {
        setError('Google sign-in failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLinkedIn = async () => {
    setError('');
    setInfo('');
    try {
      setInfo('Redirecting to LinkedIn…');
      await loginWithLinkedIn(role);
    } catch (err: any) {
      console.error('[LinkedIn Login] Error:', err);
      setError('LinkedIn sign-in failed. Please try again.');
      setInfo('');
    }
  };

  const sendWelcomeEmail = (userName: string, userEmail: string, userRole: string) => {
    // Fire-and-forget — never blocks signup
    fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'welcome', name: userName, email: userEmail, role: userRole }),
    }).catch(() => {}); // silently ignore errors
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your full name.');
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await signupWithEmail(name.trim(), email.trim(), password, role);
        sendWelcomeEmail(name.trim(), email.trim(), role);
      } else {
        await loginWithEmail(email.trim(), password, role);
      }
    } catch (err: any) {
      const msg = (err?.message || '').replace('Firebase: ', '').replace(/ \(auth\/.*\)\.?/, '').trim();
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (msg.includes('invalid-email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please wait a few minutes before trying again.');
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#F9F7F2] flex flex-col items-center justify-center px-4 py-6" style={{fontFamily:'Inter,sans-serif'}}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-stone-100 p-8 text-center relative">
          <div className="absolute top-4 right-4"><LanguageSwitcher /></div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 bg-[#76B900] rounded-full" />
            <span className="font-bold text-stone-900 text-xl">{t('app.title')}</span>
          </div>
          <p className="text-stone-500 text-sm">{t('app.tagline')}</p>
        </div>

        {/* Role selector */}
        <div className="px-8 pt-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">{t('login.iAm')}</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setRole('seeker')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                role === 'seeker' ? 'border-[#76B900] bg-[#76B900]/5' : 'border-stone-200 hover:border-stone-300'
              }`}>
              <div className="text-2xl mb-1">🏢</div>
              <div className="text-sm font-bold text-stone-900">{t('login.seeker')}</div>
              <div className="text-xs text-stone-500">{t('login.seekerSub')}</div>
            </button>
            <button onClick={() => setRole('funder')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                role === 'funder' ? 'border-[#76B900] bg-[#76B900]/5' : 'border-stone-200 hover:border-stone-300'
              }`}>
              <div className="text-2xl mb-1">🏗️</div>
              <div className="text-sm font-bold text-stone-900">{t('login.funder')}</div>
              <div className="text-xs text-stone-500">{t('login.funderSub')}</div>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100">
          <button onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${mode === 'login' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
            {t('login.signIn')}
          </button>
          <button onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${mode === 'signup' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
            {t('login.createAccount')}
          </button>
        </div>

        <div className="p-8 space-y-4">
          {/* Social Buttons */}
          <div className="grid grid-cols-1 gap-3">
            {/* Google Button */}
            <button onClick={handleGoogle} disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-white border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-60">
              {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {t('login.google')}
            </button>

            {/* LinkedIn Button */}
            <button onClick={handleLinkedIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-[#0077B5] hover:bg-[#006097] text-white font-bold rounded-xl transition-all shadow-sm active:scale-[0.98]">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              {t('login.linkedin')}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400 font-medium">{t('login.or')}</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmail} className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 flex items-center"><User className="w-3.5 h-3.5 mr-1.5 text-stone-400" />{t('login.fullName')}</label>
                <input type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required
                  autoComplete="name"
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-base md:text-sm text-stone-900 placeholder:text-stone-400" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5 text-stone-400" />{t('login.email')}</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                autoComplete="email"
                inputMode="email"
                className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-base md:text-sm text-stone-900 placeholder:text-stone-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-600 flex items-center"><Lock className="w-3.5 h-3.5 mr-1.5 text-stone-400" />{t('login.password')}</label>
                {mode === 'login' && (
                  <button type="button" onClick={handleForgotPassword} disabled={resetLoading}
                    className="text-xs text-[#76B900] hover:underline font-medium disabled:opacity-50">
                    {resetLoading ? '...' : t('login.forgotPw')}
                  </button>
                )}
              </div>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-base md:text-sm text-stone-900 placeholder:text-stone-400" />
              {resetSent && (
                <div className="flex items-center gap-2 text-xs text-[#76B900] font-medium mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Password reset email sent — check your inbox.
                </div>
              )}
            </div>
            {info && !error && (
              <div className="flex items-center space-x-2 p-3 bg-[#76B900]/10 border border-[#76B900]/20 rounded-xl text-sm text-[#4f7200]">
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" /><span>{info}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#76B900] hover:bg-[#689900] text-white font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? t('login.submit') : t('login.submitCreate')}
            </button>
          </form>

          <div className="pt-1 text-center space-y-2">
            <p className="text-xs text-stone-400">
              <a href="/terms" className="underline hover:text-stone-600">Terms</a> &amp; <a href="/privacy" className="underline hover:text-stone-600">Privacy</a> — {t('login.terms')}
            </p>
            <p className="text-xs text-stone-400">
              {t('login.noAccount')} <a href="/demo" className="text-[#76B900] font-bold hover:underline">{t('login.tryDemo')}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
