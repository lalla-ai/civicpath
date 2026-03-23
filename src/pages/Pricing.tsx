import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, X } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for getting started',
    features: ['5 grant searches / month', '1 AI proposal draft', 'Basic match scoring', 'Email support'],
    cta: 'Get Started Free',
    stripe: null,
    role: 'seeker',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: 'per month',
    desc: '14-day free trial included',
    features: ['Unlimited grant searches', 'Unlimited AI proposals', 'Real-time Gemini matching', 'Google Calendar sync', 'PDF proposal downloads', 'Ask MyLalla advisor', 'Priority support'],
    cta: 'Start Free Trial',
    stripe: 'pro',
    role: 'seeker',
    highlight: true,
  },
  {
    name: 'Funder',
    price: '$199',
    period: 'per month',
    desc: '14-day free trial included',
    features: ['Post unlimited grants', 'AI applicant matching', 'Full applicant dashboard', 'Analytics & reporting', 'Approve / reject workflow', 'Ask MyLalla advisor', 'Dedicated support'],
    cta: 'Start Free Trial',
    stripe: 'funder',
    role: 'funder',
    highlight: false,
  },
];

export default function Pricing() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const successPlan = searchParams.get('plan');

  // Save plan to localStorage on successful return from Stripe
  useEffect(() => {
    if (success && successPlan) {
      localStorage.setItem('civicpath_plan', successPlan);
    }
  }, [success, successPlan]);

  const handleCheckout = async (plan: string, _role: string) => {
    if (!plan) return; // Free plan — just navigate to login
    setLoading(plan);
    setError('');
    try {
      const savedUser = localStorage.getItem('civicpath_profile');
      const profile = savedUser ? JSON.parse(savedUser) : {};
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email: profile.email || '' }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Failed to create checkout session. Make sure STRIPE_SECRET_KEY and price IDs are set in Vercel env vars.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-stone-900 hover:text-[#76B900] transition-colors">
            <img src="/favicon.svg" alt="CivicPath" className="w-7 h-7" />
            ← CivicPath
          </Link>
          <Link to="/login?role=seeker" className="text-sm font-semibold bg-[#76B900] text-[#111] px-4 py-2 rounded-lg hover:bg-[#689900] transition-colors">Get Started Free</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* Success banner */}
        {success && (
          <div className="mb-10 p-5 bg-[#2E7D32]/10 border border-[#2E7D32]/30 rounded-2xl flex items-center gap-4">
            <CheckCircle2 className="w-6 h-6 text-[#2E7D32] shrink-0" />
            <div>
              <p className="font-bold text-[#1B5E20]">Welcome to CivicPath {successPlan === 'funder' ? 'Funder' : 'Pro'}! 🎉</p>
              <p className="text-sm text-stone-600">Your 14-day free trial has started. No charge until the trial ends.</p>
            </div>
            <Link to={successPlan === 'funder' ? '/funder' : '/seeker'} className="ml-auto bg-[#2E7D32] text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-[#1B5E20] transition-colors whitespace-nowrap">
              Go to Dashboard →
            </Link>
          </div>
        )}

        {/* Canceled banner */}
        {canceled && (
          <div className="mb-10 p-4 bg-stone-100 border border-stone-200 rounded-2xl flex items-center gap-3">
            <X className="w-5 h-5 text-stone-400 shrink-0" />
            <p className="text-sm text-stone-600">Checkout canceled. Your free account is still active.</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
        )}

        <div className="text-center mb-16">
          <h1 className="text-5xl font-[900] text-stone-900 mb-4 tracking-tight">Simple, transparent pricing</h1>
          <p className="text-xl text-stone-500">Start free. Upgrade anytime. Cancel anytime.</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-[#76B90015] text-[#2E7D32] rounded-full px-4 py-1.5 text-sm font-semibold">
            ✨ All paid plans include a 14-day free trial
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <div key={i} className={`rounded-2xl p-8 flex flex-col ${
              p.highlight ? 'bg-[#1A1A1A] text-white border-2 border-[#76B900]' : 'bg-white border border-stone-200'
            }`}>
              {p.highlight && (
                <div className="text-[10px] font-black text-[#111] bg-[#76B900] px-3 py-1 rounded-full text-center mb-4 uppercase tracking-wider w-fit">Most Popular</div>
              )}
              <div className="mb-6">
                <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${p.highlight ? 'text-[#76B900]' : 'text-stone-400'}`}>{p.name}</div>
                <div className={`text-4xl font-[900] mb-1 ${p.highlight ? 'text-white' : 'text-stone-900'}`}>{p.price}</div>
                <div className={`text-sm ${p.highlight ? 'text-stone-400' : 'text-stone-500'}`}>{p.period}</div>
                <p className={`text-sm mt-2 font-medium ${p.highlight ? 'text-[#76B900]' : 'text-stone-500'}`}>{p.desc}</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.highlight ? 'text-[#76B900]' : 'text-[#2E7D32]'}`} />
                    <span className={p.highlight ? 'text-stone-300' : 'text-stone-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              {p.stripe ? (
                <button
                  onClick={() => handleCheckout(p.stripe!, p.role)}
                  disabled={loading === p.stripe}
                  className={`w-full py-3 text-center font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 ${
                    p.highlight
                      ? 'bg-[#76B900] text-[#111] hover:bg-[#689900] disabled:opacity-60'
                      : 'border border-stone-200 text-stone-700 hover:border-[#76B900] hover:text-[#76B900] disabled:opacity-60'
                  }`}
                >
                  {loading === p.stripe ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting...</> : p.cta}
                </button>
              ) : (
                <Link to={`/login?role=${p.role}`} className="w-full py-3 text-center font-bold rounded-xl transition-colors text-sm border border-stone-200 text-stone-700 hover:border-[#76B900] hover:text-[#76B900]">
                  {p.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        <p className="text-center text-stone-400 text-sm mt-10">
          All plans include sovereign data infrastructure. Your data never leaves the platform.{' '}
          <Link to="/privacy" className="text-[#76B900] hover:underline">Privacy Policy</Link>
        </p>
      </div>

      <footer className="border-t border-stone-200 py-8 text-center text-sm text-stone-400">
        <Link to="/" className="hover:text-stone-700 mr-4">Home</Link>
        <Link to="/privacy" className="hover:text-stone-700 mr-4">Privacy</Link>
        <Link to="/terms" className="hover:text-stone-700">Terms</Link>
      </footer>
    </div>
  );
}
