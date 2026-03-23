import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hexagon, ArrowUpRight, AlertCircle, Loader2, Mail, Lock, User } from 'lucide-react';
import { useAuth } from './AuthContext';

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-8 h-8 text-[#2E7D32]">
    <Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

export default function LoginPage() {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch {
      setError('Google sign-in failed. Make sure popups are allowed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name.');
        await signupWithEmail(name.trim(), email.trim(), password);
      } else {
        await loginWithEmail(email.trim(), password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message?.replace('Firebase: ', '').replace(/ \(auth\/.*\)/, '') || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#2E7D32]/5 border-b border-stone-100 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="scale-150 transform mb-2"><Logo /></div>
          </div>
          <h1 className="text-4xl font-[800] text-stone-900 mb-1 tracking-tight">CivicPath</h1>
          <p className="text-stone-500 font-medium">Your community. Funded.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100">
          <button onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${mode === 'login' ? 'border-[#2E7D32] text-[#2E7D32]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
            Sign In
          </button>
          <button onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${mode === 'signup' ? 'border-[#2E7D32] text-[#2E7D32]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>
            Create Account
          </button>
        </div>

        <div className="p-8 space-y-4">
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
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-sm text-stone-900 placeholder:text-stone-400" />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5 text-stone-400" />Email</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-sm text-stone-900 placeholder:text-stone-400" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-600 flex items-center"><Lock className="w-3.5 h-3.5 mr-1.5 text-stone-400" />Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                className="w-full px-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-sm text-stone-900 placeholder:text-stone-400" />
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] flex items-center justify-center disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-stone-400">
            By signing in, you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
