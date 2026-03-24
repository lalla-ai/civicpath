import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';

export default function LoginPage() {
  const { user, loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();

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
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

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
    setGoogleLoading(true);
    try {
      await loginWithGoogle(role);
      // Welcome email is sent in useEffect below when user state resolves
    } catch (err: any) {
      const msg = err?.code || err?.message || '';
      if (msg.includes('popup-closed') || msg.includes('cancelled')) {
        setError('Sign-in popup was closed. Please try again.');
      } else if (msg.includes('popup-blocked')) {
        setError('Popup was blocked. Please allow popups for this site in your browser settings.');
      } else if (msg.includes('network')) {
        setError('Network error. Check your connection and try again.');
      } else {
        setError('Google sign-in failed. Make sure popups are allowed and try again.');
      }
    } finally {
      setGoogleLoading(false);
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
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-4" style={{fontFamily:'Inter,sans-serif'}}>
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-stone-100 p-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-2 h-2 bg-[#76B900] rounded-full" />
            <span className="font-bold text-stone-900 text-xl">CivicPath</span>
          </div>
          <p className="text-stone-500 text-sm">Your community. Funded.</p>
        </div>

        {/* Role selector */}
        <div className="px-8 pt-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">I am a</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setRole('seeker')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                role === 'seeker' ? 'border-[#76B900] bg-[#76B900]/5' : 'border-stone-200 hover:border-stone-300'
              }`}>
              <div className="text-2xl mb-1">🏢</div>
              <div className="text-sm font-bold text-stone-900">Grant Seeker</div>
              <div className="text-xs text-stone-500">I need funding</div>
            </button>
            <button onClick={() => setRole('funder')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                role === 'funder' ? 'border-[#76B900] bg-[#76B900]/5' : 'border-stone-200 hover:border-stone-300'
              }`}>
              <div className="text-2xl mb-1">🏛️</div>
              <div className="text-sm font-bold text-stone-900">Grant Funder</div>
              <div className="text-xs text-stone-500">I offer grants</div>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100">
          <button onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${mode === 'login' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
            Sign In
          </button>
          <button onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${mode === 'signup' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
            Create Account
          </button>
        </div>

        <div className="p-8 space-y-4">
          {/* Google Button */}
          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-white border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-60"
            title="Requires popup permissions. If blocked, use email/password below.">
            {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs text-stone-400 font-medium">or</span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmail} className="space-y-3">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-stone-600 flex items-center"><User className="w-3.5 h-3.5 mr-1.5 text-stone-400" />Full Name</label>
                <input type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-sm text-stone-900 placeholder:text-stone-400" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5 text-stone-400" />Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-sm text-stone-900 placeholder:text-stone-400" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-600 flex items-center"><Lock className="w-3.5 h-3.5 mr-1.5 text-stone-400" />Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={handleForgotPassword} disabled={resetLoading}
                    className="text-xs text-[#76B900] hover:underline font-medium disabled:opacity-50">
                    {resetLoading ? 'Sending...' : 'Forgot password?'}
                  </button>
                )}
              </div>
              <input type="password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-sm text-stone-900 placeholder:text-stone-400" />
              {resetSent && (
                <div className="flex items-center gap-2 text-xs text-[#76B900] font-medium mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Password reset email sent — check your inbox.
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#76B900] hover:bg-[#689900] text-white font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="pt-1 text-center space-y-2">
            <p className="text-xs text-stone-400">
              By signing in you agree to our <a href="/terms" className="underline hover:text-stone-600">Terms</a> &amp; <a href="/privacy" className="underline hover:text-stone-600">Privacy Policy</a>.
            </p>
            <p className="text-xs text-stone-400">
              No account? <a href="/demo" className="text-[#76B900] font-bold hover:underline">▶ Try Live Demo instead</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
