import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'Perfect for getting started',
    features: ['5 grant searches per month', '1 AI proposal draft', 'Basic match scoring', 'Email support'],
    cta: 'Get Started Free',
    href: '/login?role=seeker',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: 'per month',
    desc: 'For serious grant seekers',
    features: ['Unlimited grant searches', 'Unlimited AI proposals', 'Real-time match scoring', 'Google Calendar sync', 'PDF downloads', 'Priority support'],
    cta: 'Start Pro',
    href: '/login?role=seeker',
    highlight: true,
  },
  {
    name: 'Funder',
    price: '$199',
    period: 'per month',
    desc: 'For foundations & agencies',
    features: ['Post unlimited grants', 'AI applicant matching', 'Full applicant dashboard', 'Analytics & reporting', 'Approve / reject workflow', 'Dedicated support'],
    cta: 'Start as Funder',
    href: '/login?role=funder',
    highlight: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans">
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-stone-900 hover:text-[#76B900] transition-colors">
            ← CivicPath
          </Link>
          <Link to="/login?role=seeker" className="text-sm font-semibold bg-[#76B900] text-[#111] px-4 py-2 rounded-lg hover:bg-[#8FD400] transition-colors">Get Started</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-[900] text-stone-900 mb-4 tracking-tight">Simple, transparent pricing</h1>
          <p className="text-xl text-stone-500">Start free. Upgrade when you're ready.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p, i) => (
            <div key={i} className={`rounded-2xl p-8 flex flex-col ${p.highlight ? 'bg-[#1A1A1A] text-white border-2 border-[#76B900]' : 'bg-white border border-stone-200'}`}>
              <div className="mb-6">
                <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${p.highlight ? 'text-[#76B900]' : 'text-stone-400'}`}>{p.name}</div>
                <div className={`text-4xl font-[900] mb-1 ${p.highlight ? 'text-white' : 'text-stone-900'}`}>{p.price}</div>
                <div className={`text-sm ${p.highlight ? 'text-stone-400' : 'text-stone-500'}`}>{p.period}</div>
                <p className={`text-sm mt-3 ${p.highlight ? 'text-stone-400' : 'text-stone-500'}`}>{p.desc}</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${p.highlight ? 'text-[#76B900]' : 'text-[#2E7D32]'}`} />
                    <span className={p.highlight ? 'text-stone-300' : 'text-stone-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={p.href} className={`w-full py-3 text-center font-bold rounded-xl transition-colors text-sm ${
                p.highlight ? 'bg-[#76B900] text-[#111] hover:bg-[#8FD400]' : 'border border-stone-200 text-stone-700 hover:border-[#76B900] hover:text-[#76B900]'
              }`}>
                {p.cta}
              </Link>
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
