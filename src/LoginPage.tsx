import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hexagon, ArrowUpRight, Mail, Lock, User, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-8 h-8 text-[#2E7D32]">
    <Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

export default function LoginPage() {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please enter your name.');
        await signup(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message);
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
            <div className="scale-150 transform mb-2">
              <Logo />
            </div>
          </div>
          <h1 className="text-3xl font-[800] text-stone-900 mb-1 tracking-tight">CivicPath</h1>
          <p className="text-stone-500 font-medium">Your community. Funded.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${mode === 'login' ? 'border-[#2E7D32] text-[#2E7D32]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${mode === 'signup' ? 'border-[#2E7D32] text-[#2E7D32]' : 'border-transparent text-stone-400 hover:text-stone-600'}`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-stone-700 flex items-center">
                <User className="w-4 h-4 mr-2 text-stone-400" /> Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] transition-all outline-none text-stone-900 placeholder:text-stone-400"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-stone-700 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-stone-400" /> Email Address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] transition-all outline-none text-stone-900 placeholder:text-stone-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-stone-700 flex items-center">
              <Lock className="w-4 h-4 mr-2 text-stone-400" /> Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] transition-all outline-none text-stone-900 placeholder:text-stone-400"
            />
          </div>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : mode === 'login' ? 'Sign In' : 'Create Account & Continue'}
          </button>

          <p className="text-center text-xs text-stone-400 pt-2">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-[#2E7D32] font-bold hover:underline"
            >
              {mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
