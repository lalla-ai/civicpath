import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Sparkles, Zap, X } from 'lucide-react';

const PLANS = {
  monthly: [
    { name:'Free', price:'$0', period:'forever', annualNote:'', desc:'Try MyLalla', highlight:false, stripe:null, href:'/mylalla', cta:'Start Free', features:['5 queries/day','Live Grants.gov search','Follow-up questions','Public grant database'] },
    { name:'Pro', price:'$29', period:'/month', annualNote:'', desc:'14-day free trial', highlight:true, stripe:'mylalla_pro', cta:'Start Free Trial', features:['Unlimited queries','Document upload & analysis','CivicPath profile sync','Conversation history','Export PDF / DOCX','Nemotron-3-Super priority','Email support'] },
    { name:'Team', price:'$99', period:'/month', annualNote:'', desc:'5 seats included', highlight:false, stripe:'mylalla_team', cta:'Start Free Trial', features:['Everything in Pro','5 team members','Shared workspace','Team grant tracker','Custom grant library','Priority support','Onboarding call'] },
    { name:'Enterprise', price:'Custom', period:'', annualNote:'', desc:'For large orgs', highlight:false, stripe:null, href:'mailto:hello@mylalla.ai', cta:'Contact Us', features:['Everything in Team','Unlimited seats','Custom model fine-tuning','Private GKE deployment','SSO / SAML','SLA guarantee','Dedicated success manager'] },
  ],
  annual: [
    { name:'Free', price:'$0', period:'forever', annualNote:'', desc:'Try MyLalla', highlight:false, stripe:null, href:'/mylalla', cta:'Start Free', features:['5 queries/day','Live Grants.gov search','Follow-up questions','Public grant database'] },
    { name:'Pro', price:'$290', period:'/year', annualNote:'Save $58 — 2 months free', desc:'14-day free trial', highlight:true, stripe:'mylalla_pro_annual', cta:'Start Free Trial', features:['Unlimited queries','Document upload & analysis','CivicPath profile sync','Conversation history','Export PDF / DOCX','Nemotron-3-Super priority','Email support'] },
    { name:'Team', price:'$990', period:'/year', annualNote:'Save $198 — 2 months free', desc:'5 seats included', highlight:false, stripe:'mylalla_team_annual', cta:'Start Free Trial', features:['Everything in Pro','5 team members','Shared workspace','Team grant tracker','Custom grant library','Priority support','Onboarding call'] },
    { name:'Enterprise', price:'Custom', period:'', annualNote:'', desc:'For large orgs', highlight:false, stripe:null, href:'mailto:hello@mylalla.ai', cta:'Contact Us', features:['Everything in Team','Unlimited seats','Custom model fine-tuning','Private GKE deployment','SSO / SAML','SLA guarantee','Dedicated success manager'] },
  ],
};

export default function MyLallaPricing() {
  const [billing, setBilling] = useState<'monthly'|'annual'>('monthly');
  const [loading, setLoading] = useState<string|null>(null);
  const [searchParams] = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');

  useEffect(() => {
    document.title = 'Pricing | MyLalla — AI Grant Advisor';
    return () => { document.title = 'MyLalla — AI Grant Advisor'; };
  }, []);

  const handleCheckout = async (planKey: string) => {
    setLoading(planKey);
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planKey, email: '' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || 'Checkout error');
    } catch { alert('Network error — please try again.'); }
    finally { setLoading(null); }
  };

  const plans = PLANS[billing];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white" style={{fontFamily:'Inter,sans-serif'}}>
      <nav className="border-b border-white/8 sticky top-0 z-10 bg-[#0A0A0B]/95 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/mylalla" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-[#76B900] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-base tracking-tight">MyLalla</span>
          </Link>
          <Link to="/mylalla" className="text-xs font-bold text-white/40 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg transition-colors">← Back</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {success && (
          <div className="mb-8 p-4 bg-[#76B900]/10 border border-[#76B900]/30 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#76B900]" />
            <p className="text-sm font-bold text-[#76B900]">Welcome to MyLalla Pro! Your 14-day trial has started.</p>
            <Link to="/mylalla" className="ml-auto bg-[#76B900] text-[#111] text-xs font-bold px-3 py-1.5 rounded-lg">Start →</Link>
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
            <X className="w-4 h-4 text-white/40" />
            <p className="text-sm text-white/50">Checkout canceled. Free account still active.</p>
          </div>
        )}

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold px-3 py-1.5 rounded-full mb-5">
            <Zap className="w-3 h-3" /> Powered by Nemotron-3-Super-120B
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            AI that pays for itself<br/>
            <span className="bg-gradient-to-r from-purple-400 to-[#76B900] bg-clip-text text-transparent">in the first grant.</span>
          </h1>
          <p className="text-white/40 max-w-md mx-auto text-sm">Average grant: $150,000. MyLalla Pro: $29/month.</p>
          <div className="mt-6 inline-flex items-center bg-white/5 border border-white/10 rounded-full p-1">
            {(['monthly','annual'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
                  billing === b ? 'bg-white text-[#0A0A0B] shadow' : 'text-white/40 hover:text-white/70'
                }`}>
                {b === 'monthly' ? 'Monthly' : 'Annual'}
                {b === 'annual' && <span className="text-[9px] font-black bg-[#76B900] text-[#111] px-1.5 py-0.5 rounded-full">SAVE 2 MO</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p, i) => (
            <div key={i} className={`rounded-2xl p-6 flex flex-col border ${
              p.highlight ? 'bg-gradient-to-b from-purple-500/15 to-[#76B900]/5 border-purple-500/40' : 'bg-white/4 border-white/8'
            }`}>
              {p.highlight && <div className="text-[9px] font-black text-[#111] bg-[#76B900] px-2 py-0.5 rounded-full w-fit mb-3 uppercase tracking-wide">Most Popular</div>}
              <div className="mb-5">
                <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${p.highlight ? 'text-purple-300' : 'text-white/30'}`}>{p.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black">{p.price}</span>
                  {p.period && <span className="text-sm text-white/40">{p.period}</span>}
                </div>
                {p.annualNote && <p className="text-[10px] text-[#76B900] font-bold mt-0.5">{p.annualNote}</p>}
                <p className={`text-xs mt-1.5 ${p.highlight ? 'text-purple-300' : 'text-white/30'}`}>{p.desc}</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-white/60">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#76B900] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {p.stripe ? (
                <button onClick={() => handleCheckout(p.stripe!)} disabled={loading === p.stripe}
                  className={`w-full py-2.5 font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${
                    p.highlight ? 'bg-[#76B900] text-[#111] hover:bg-[#689900]' : 'border border-white/15 text-white/70 hover:bg-white/8'
                  }`}>
                  {loading === p.stripe ? <Loader2 className="w-4 h-4 animate-spin" /> : p.cta}
                </button>
              ) : (p as any).href ? (
                <a href={(p as any).href} className="w-full py-2.5 font-bold rounded-xl text-sm text-center border border-white/15 text-white/70 hover:bg-white/8 transition-colors block">{p.cta}</a>
              ) : (
                <Link to="/mylalla" className="w-full py-2.5 font-bold rounded-xl text-sm text-center border border-white/15 text-white/70 hover:bg-white/8 transition-colors block">{p.cta}</Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/20 text-xs mb-4">14-day free trial · No credit card required · Cancel anytime</p>
          <div className="flex flex-wrap justify-center gap-4 text-[10px] text-white/20">
            {['Nemotron-3-Super-120B','Live Grants.gov','0G Labs Blockchain','GDPR Art.17 Purge','NVIDIA Inception'].map(b => (
              <span key={b} className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[#76B900]"/>{b}</span>
            ))}
          </div>
        </div>

        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-center mb-6 text-white/80">Common questions</h2>
          <div className="space-y-3">
            {[
              {q:'What is MyLalla?', a:'MyLalla is an AI grant strategy advisor powered by NVIDIA Nemotron-3-Super-120B. It researches grants in real time, analyzes documents, and gives specific, actionable advice.'},
              {q:'How is it different from ChatGPT?', a:'MyLalla is purpose-built for grants — it searches Grants.gov live, knows every federal program, analyzes your Award Letters, and integrates with CivicPath.'},
              {q:'Can I upload grant RFPs?', a:'Yes. Pro users can upload any PDF, DOCX, or TXT file. MyLalla reads the full document and answers your questions about eligibility and strategy.'},
              {q:'What happens after the trial?', a:"You're charged at the end of 14 days. Cancel anytime before that — no questions asked."},
            ].map((faq, i) => (
              <details key={i} className="bg-white/4 border border-white/8 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-semibold text-white/70 cursor-pointer list-none flex items-center justify-between hover:text-white">
                  {faq.q}
                  <span className="text-[#76B900] text-lg group-open:rotate-45 transition-transform inline-block">+</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-white/40 leading-relaxed border-t border-white/5 pt-3">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-white/8 py-6 text-center text-[10px] text-white/20">
        © 2026 MyLalla (HelloAgentic) · <a href="/privacy" className="hover:text-white/40">Privacy</a> · <a href="mailto:hello@mylalla.ai" className="hover:text-white/40">hello@mylalla.ai</a>
      </footer>
    </div>
  );
}
