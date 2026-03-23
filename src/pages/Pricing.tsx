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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState('');
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const successPlan = searchParams.get('plan');

  // Show role-appropriate plans: seekers see Free + Pro, funders see Funder only
  const viewRole = searchParams.get('role') || localStorage.getItem('civicpath_role') || 'seeker';
  const visiblePlans = plans.filter(p => viewRole === 'funder' ? p.role === 'funder' : p.role === 'seeker');

  // Save plan to localStorage on successful return from Stripe
  useEffect(() => {
    if (success && successPlan) {
      localStorage.setItem('civicpath_plan', successPlan);
    }
  }, [success, successPlan]);

  const handleCheckout = async (plan: string, _role: string) => {
    if (!plan) return;
    setLoading(plan);
    setErrors(prev => ({...prev, [plan]: ''}));
    setTopError('');
    try {
      const savedUser = localStorage.getItem('civicpath_profile');
      const profile = savedUser ? JSON.parse(savedUser) : {};
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email: profile.email || '' }),
      });
      const contentType = res.headers.get('content-type') || '';
      // If response is HTML instead of JSON, the API route isn't reached
      if (!contentType.includes('application/json')) {
        setErrors(prev => ({...prev, [plan]: 'Stripe not connected. See setup instructions below.'}));
        setTopError('setup');
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error?.includes('STRIPE_SECRET_KEY') || data.error?.includes('not configured')) {
        setErrors(prev => ({...prev, [plan]: 'Stripe key not set. See setup instructions below.'}));
        setTopError('setup');
      } else if (data.error?.includes('STRIPE_PRICE')) {
        setErrors(prev => ({...prev, [plan]: 'Stripe price ID not set. See setup instructions below.'}));
        setTopError('setup');
      } else {
        setErrors(prev => ({...prev, [plan]: data.error || 'Checkout failed. Please try again.'}));
      }
    } catch {
      setErrors(prev => ({...prev, [plan]: 'Could not reach checkout. Please try again.'}));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-stone-900 hover:text-[#76B900] transition-colors">
            <svg width="28" height="27" viewBox="0 0 48 46" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill="#76B900" d="M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"/>
            </svg>
            ← CivicPath
          </Link>
          <Link to="/login?role=seeker" className="text-sm font-semibold bg-[#76B900] text-[#111] px-4 py-2 rounded-lg hover:bg-[#689900] transition-colors">Get Started Free</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">

        {/* Success banner */}
        {success && (
          <div className="mb-10 p-5 bg-[#76B900]/10 border border-[#76B900]/30 rounded-2xl flex items-center gap-4">
            <CheckCircle2 className="w-6 h-6 text-[#76B900] shrink-0" />
            <div>
              <p className="font-bold text-[#689900]">Welcome to CivicPath {successPlan === 'funder' ? 'Funder' : 'Pro'}! 🎉</p>
              <p className="text-sm text-stone-600">Your 14-day free trial has started. No charge until the trial ends.</p>
            </div>
            <Link to={successPlan === 'funder' ? '/funder' : '/seeker'} className="ml-auto bg-[#76B900] text-[#111111] font-bold px-4 py-2 rounded-xl text-sm hover:bg-[#689900] transition-colors whitespace-nowrap">
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

        {/* Stripe setup instructions */}
        {topError === 'setup' && (
          <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-2xl">
            <h3 className="font-bold text-amber-900 mb-3 text-base">⚠️ Stripe Setup Required</h3>
            <p className="text-amber-800 text-sm mb-4">Add these 3 environment variables in your <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-bold">Vercel dashboard</a> → Project → Settings → Environment Variables:</p>
            <div className="space-y-2 font-mono text-xs">
              <div className="bg-white border border-amber-200 rounded-lg p-3">
                <span className="font-bold text-amber-900">STRIPE_SECRET_KEY</span>
                <span className="text-amber-700 ml-2">→ From <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">stripe.com/dashboard → Developers → API Keys</a></span>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-3">
                <span className="font-bold text-amber-900">STRIPE_PRICE_PRO</span>
                <span className="text-amber-700 ml-2">→ Create product "CivicPath Pro" $49/mo in <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="underline">Stripe Products</a> → copy Price ID (starts with <code>price_</code>)</span>
              </div>
              <div className="bg-white border border-amber-200 rounded-lg p-3">
                <span className="font-bold text-amber-900">STRIPE_PRICE_FUNDER</span>
                <span className="text-amber-700 ml-2">→ Create product "CivicPath Funder" $199/mo → copy Price ID</span>
              </div>
            </div>
            <p className="text-amber-700 text-xs mt-3">🔄 After adding all 3 vars, click <strong>Redeploy</strong> in Vercel. Then come back and try again.</p>
          </div>
        )}

        <div className="text-center mb-16">
          <h1 className="text-5xl font-[900] text-stone-900 mb-4 tracking-tight">Simple, transparent pricing</h1>
          <p className="text-xl text-stone-500">Start free. Upgrade anytime. Cancel anytime.</p>
          <div className="mt-4 inline-flex items-center gap-2 bg-[#76B90015] text-[#76B900] rounded-full px-4 py-1.5 text-sm font-semibold">
            ✨ All paid plans include a 14-day free trial
          </div>
        </div>

        {viewRole === 'funder' && (
          <div className="text-center mb-8 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
            <p className="text-blue-800 font-bold">Funder Pricing</p>
            <p className="text-blue-600 text-sm mt-1">Post grants, match applicants, and manage your portfolio. <a href="/login?role=seeker" className="text-[#76B900] font-bold hover:underline">Looking to apply for grants instead? →</a></p>
          </div>
        )}
        {viewRole === 'seeker' && (
          <div className="text-center mb-8 p-4 bg-[#76B900]/5 border border-[#76B900]/20 rounded-2xl">
            <p className="text-stone-800 font-bold">Grant Seeker Pricing</p>
            <p className="text-stone-500 text-sm mt-1">Find, apply for, and win grants. <a href="/pricing?role=funder" className="text-[#76B900] font-bold hover:underline">Are you a grant funder? See funder plans →</a></p>
          </div>
        )}
        <div className={`grid grid-cols-1 gap-6 ${visiblePlans.length === 1 ? 'max-w-sm mx-auto md:grid-cols-1' : visiblePlans.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3'}`}>
          {visiblePlans.map((p, i) => (
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
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.highlight ? 'text-[#76B900]' : 'text-[#76B900]'}`} />
                    <span className={p.highlight ? 'text-stone-300' : 'text-stone-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              {p.stripe ? (
                <div>
                  <button
                    onClick={() => handleCheckout(p.stripe!, p.role)}
                    disabled={loading === p.stripe}
                    className={`w-full py-3 text-center font-bold rounded-xl transition-colors text-sm flex items-center justify-center gap-2 ${
                      p.highlight
                        ? 'bg-[#76B900] text-[#111] hover:bg-[#689900] disabled:opacity-60'
                        : 'border border-stone-200 text-stone-700 hover:border-[#76B900] hover:text-[#76B900] disabled:opacity-60'
                    }`}
                  >
                    {loading === p.stripe ? <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe...</> : p.cta}
                  </button>
                  {errors[p.stripe!] && (
                    <p className="mt-2 text-xs text-red-600 font-medium text-center">{errors[p.stripe!]}</p>
                  )}
                </div>
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
