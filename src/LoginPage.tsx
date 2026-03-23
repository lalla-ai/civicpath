import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hexagon, ArrowUpRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-8 h-8 text-[#2E7D32]">
    <Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

export default function LoginPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err: any) {
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#2E7D32]/5 border-b border-stone-100 p-10 text-center">
          <div className="flex justify-center mb-5">
            <div className="scale-150 transform mb-2"><Logo /></div>
          </div>
          <h1 className="text-4xl font-[800] text-stone-900 mb-2 tracking-tight">CivicPath</h1>
          <p className="text-stone-500 font-medium text-lg">Your community. Funded.</p>
        </div>

        <div className="p-8 space-y-5">
          <p className="text-center text-sm text-stone-500">Sign in to access your AI grant pipeline</p>

          {error && (
            <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white border-2 border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700 font-bold rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <p className="text-center text-xs text-stone-400 pt-2">
            By signing in, you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  );
}
