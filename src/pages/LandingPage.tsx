import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Hexagon, ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-8 h-8 text-[#76B900]">
    <Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'CivicPath — AI Grant Finder | 8 Agents, Full Lifecycle, Free to Start';
    
    // Inject Anthropic-style Serif font for the headlines
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const [heroQuery, setHeroQuery] = useState('');
  const [heroAnswer, setHeroAnswer] = useState('');
  const [heroLoading, setHeroLoading] = useState(false);

  const handleHeroAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim();
    if (!q || heroLoading) return;
    setHeroLoading(true);
    setHeroAnswer('');
    try {
      const res = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are MyLalla, a grant advisor for CivicPath. A visitor asked: "${q}"\n\nGive a warm, helpful 2-3 sentence answer about grants that might be relevant. Be specific and encouraging. End with a call to action to sign up on CivicPath.`,
          useSearch: true,
        }),
      });
      const data = await res.json();
      setHeroAnswer(data.text || 'Sign up to get your personalized grant matches in under 60 seconds!');
    } catch {
      setHeroAnswer("I'd love to help! Sign up for free to get your personalized grant match list — we'll find the best funding for your organization in under 60 seconds.");
    } finally {
      setHeroLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#1A1A1A]" style={{fontFamily:'Inter, sans-serif'}}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#F9F7F2]/80 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-stone-900 font-bold text-lg">{t('app.title')}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-stone-500 font-medium uppercase tracking-wider">
            <a href="#how" className="hover:text-stone-900 transition-colors">How It Works</a>
            <Link to="/login?role=seeker" className="hover:text-stone-900 transition-colors">Find Grants</Link>
            <Link to="/login?role=funder" className="hover:text-stone-900 transition-colors">Give Grants</Link>
            <Link to="/pricing" className="hover:text-stone-900 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors font-semibold">Log in</Link>
            <Link to="/login?role=seeker" className="bg-[#1C1917] text-[#76B900] font-bold px-4 py-2 rounded-lg hover:bg-stone-800 transition-all text-sm shadow-sm">Get Started →</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-24 pb-20 text-center px-5 sm:px-6">
        <div className="inline-flex items-center gap-2 bg-[#76B90015] text-[#5a9000] rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide border border-[#76B900]/20">
          🏆 Google Cloud ADK Hackathon 2026 · Finalist
        </div>
        <h1 className="mt-8 text-5xl sm:text-6xl md:text-7xl font-normal leading-[0.95] tracking-tight text-stone-900 max-w-4xl mx-auto" style={{fontFamily:'"Instrument Serif", serif'}}>
          Find The Grant<br />
          <span className="italic text-[#76B900]">That Gets You.</span>
        </h1>
        <p className="mt-6 text-base sm:text-lg text-stone-500 max-w-xl mx-auto leading-relaxed font-medium">
          8 AI agents find, score, draft, comply, submit, and manage compliance grants for your org — automatically. First match in 60 seconds.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link to="/login?role=seeker" className="bg-[#76B900] text-[#111111] font-black px-10 py-4 rounded-xl hover:bg-[#689900] transition-all shadow-lg shadow-[#76B900]/20 text-lg">Find My Grants →</Link>
          <Link to="/login?role=funder" className="border-2 border-stone-200 text-stone-700 font-bold px-8 py-4 rounded-xl hover:border-stone-400 hover:text-stone-900 transition-all bg-white text-lg">Give Grants</Link>
          <Link to="/mylalla" className="bg-stone-900 text-white font-bold px-8 py-4 rounded-xl hover:bg-stone-800 transition-all flex items-center gap-2 text-lg">
            <span className="text-sm">✨</span> Ask MyLalla
          </Link>
        </div>
        {/* MyLalla Hero Chat Bar */}
        <div className="mt-12 max-w-2xl mx-auto">
          <form onSubmit={handleHeroAsk} className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#76B900] text-sm">✨</span>
              <input
                type="text"
                value={heroQuery}
                onChange={e => setHeroQuery(e.target.value)}
                placeholder="Ask MyLalla: What grants does my nonprofit qualify for?"
                className="w-full pl-9 pr-4 py-4 rounded-2xl bg-white border-2 border-stone-200 focus:border-[#76B900] focus:ring-4 focus:ring-[#76B900]/10 outline-none text-stone-900 text-sm shadow-xl shadow-stone-200/50 transition-all"
              />
            </div>
            <button type="submit" disabled={heroLoading} className="bg-stone-900 text-[#76B900] px-8 rounded-2xl font-black hover:bg-stone-800 transition-all flex items-center gap-2 disabled:opacity-50">
              {heroLoading ? '...' : 'Ask AI'}
            </button>
          </form>
          {heroAnswer && (
            <div className="mt-4 p-6 bg-white border border-stone-200 rounded-2xl text-left animate-in slide-in-from-top-2 shadow-sm">
              <p className="text-stone-700 leading-relaxed font-serif italic text-lg">"{heroAnswer}"</p>
            </div>
          )}
        </div>

        <p className="mt-8 text-xs text-stone-400 font-bold tracking-[0.2em] uppercase">Built Sovereign · Available Globally</p>
      </section>

      {/* 8 AGENTS */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 bg-white border-t border-stone-100">
        <div className="text-center mb-16">
          <p className="text-[11px] text-[#76B900] uppercase tracking-[0.2em] font-black mb-4">THE ENGINE</p>
          <h2 className="text-4xl sm:text-5xl font-normal text-stone-900 tracking-tight" style={{fontFamily:'"Instrument Serif", serif'}}>Eight AI agents. Full lifecycle.</h2>
          <p className="text-stone-400 max-w-xl mx-auto mt-4 text-base font-medium">From live grant discovery to sovereign closeout — the only platform that covers the complete grant lifecycle, automatically.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {[
            {n:'01',t:'The Hunter',d:'Scans Grants.gov and 50+ databases live for your exact profile.',tag:''},
            {n:'02',t:'The Matchmaker',d:'Scores every grant 0–100 using Gemini AI — not keywords.',tag:''},
            {n:'03',t:'The Drafter',d:'Writes your full proposal in under 60 seconds.',tag:''},
            {n:'04',t:'The Controller',d:'Verifies eligibility before you spend time applying.',tag:''},
            {n:'05',t:'The Submitter',d:'Queues and sends applications on your schedule.',tag:''},
            {n:'06',t:'The Watcher',d:'Monitors 24/7 for new grants that match your mission.',tag:''},
            {n:'07',t:'The Scanner',d:'Extracts every reporting deadline from your Award Letter.',tag:'New'},
            {n:'08',t:'The Closer',d:'Generates Audit Packs and executes Sovereign Purge.',tag:'New'},
          ].map((a,i) => (
            <div key={i} className={`border rounded-2xl p-6 hover:border-[#76B900] hover:bg-stone-50 transition-all cursor-default group relative ${
              i >= 6 ? 'bg-[#111] border-[#76B900]/20 hover:border-[#76B900]/60' : 'bg-[#FAFAF8] border-stone-200'
            }`}>
              {a.tag && (
                <span className="absolute top-4 right-4 text-[9px] font-black bg-[#76B900] text-[#111] px-2 py-0.5 rounded uppercase tracking-widest">{a.tag}</span>
              )}
              <div className={`text-[11px] font-black mb-4 tracking-widest transition-colors ${
                i >= 6 ? 'text-[#76B900]/40 group-hover:text-[#76B900]' : 'text-stone-300 group-hover:text-[#76B900]'
              }`}>{a.n}</div>
              <div className={`font-bold text-base mb-2 ${i >= 6 ? 'text-white' : 'text-stone-900'}`}>{a.t}</div>
              <div className={`text-sm leading-relaxed ${i >= 6 ? 'text-stone-500' : 'text-stone-500'}`}>{a.d}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em] mt-12">Agents 1–6: Pipeline &nbsp;&middot;&nbsp; Agents 7–8: Post-award</p>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-[#F9F7F2] border-t border-stone-100 py-20 sm:py-24 px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-[11px] text-[#76B900] uppercase tracking-[0.2em] font-black">METHODOLOGY</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm">
            <span className="text-[11px] font-black tracking-[0.3em] text-stone-200">01</span>
            <h3 className="text-xl font-bold text-stone-900 mt-4">Tell us your mission</h3>
            <p className="text-stone-400 text-sm leading-relaxed mt-3">30 seconds. Your org name, location, focus area, and background. That's all the agents need to start hunting.</p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#111111] rounded-2xl p-8 border border-[#222] shadow-xl">
            <span className="text-[11px] font-black tracking-[0.3em] text-[#333]">02</span>
            <h3 className="text-xl font-bold text-white mt-4">Agents do everything</h3>
            <p className="text-stone-500 text-sm mt-3 leading-relaxed">Your 8-agent team runs automatically: Scans, scores, drafts, and audits every opportunity in real-time.</p>
            <div className="mt-5 space-y-2">
              {['Hunter scans live','Matchmaker scores','Drafter writes','Closer anchors data'].map((a,i) => (
                <div key={i} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-[#76B900]">
                  <span className="w-1 h-1 rounded-full bg-[#76B900] shrink-0" />{a}
                </div>
              ))}
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200 border-l-4 border-l-[#76B900] shadow-sm">
            <span className="text-[11px] font-black tracking-[0.3em] text-stone-200">03</span>
            <h3 className="text-xl font-bold text-stone-900 mt-4">You approve. They submit.</h3>
            <p className="text-stone-400 text-sm leading-relaxed mt-3">Review your AI-drafted proposal. One click to approve. Agents send it and keep watching for the next win.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#76B900]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#76B900] animate-pulse"></span>
              Human in the Loop
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 sm:py-32 text-center px-5 sm:px-6 bg-[#111111] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{backgroundImage:'radial-gradient(circle at 2px 2px, #76B900 1px, transparent 0)', backgroundSize:'32px 32px'}} />
        <div className="relative z-10">
          <h2 className="text-4xl sm:text-6xl font-normal text-white max-w-2xl mx-auto leading-[0.95] tracking-tight" style={{fontFamily:'"Instrument Serif", serif'}}>Your community deserves<br /><span className="italic text-[#76B900]">to be funded.</span></h2>
          <p className="mt-8 text-stone-400 max-w-md mx-auto font-medium">8 AI agents. Full lifecycle. Discovery → Submission → Compliance → Sovereign Closeout.</p>
          <Link to="/login?role=seeker" className="mt-12 inline-block bg-[#76B900] text-[#111111] font-black px-12 py-5 rounded-xl hover:bg-[#86d200] transition-all text-lg shadow-2xl shadow-[#76B900]/20">
            Find My Grants →
          </Link>
          <p className="mt-6 text-[10px] font-bold text-stone-600 uppercase tracking-[0.3em]">Free to start · No credit card · Sovereign data</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-6">
                <Logo />
                <span className="font-extrabold text-stone-900 text-xl tracking-tighter">CivicPath</span>
              </div>
              <p className="text-sm text-stone-400 leading-relaxed">The world’s first 8-agent AI operating system for the complete grant lifecycle. Built in Florida, available globally.</p>
            </div>
            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
              <div>
                <p className="font-black text-[10px] text-stone-900 mb-6 uppercase tracking-widest">Product</p>
                <div className="space-y-4 font-medium text-stone-400">
                  <a href="/" className="block hover:text-stone-900 transition-colors">Home</a>
                  <a href="/pricing" className="block hover:text-stone-900 transition-colors">Pricing</a>
                  <a href="/demo" className="block hover:text-stone-900 transition-colors">Live Demo</a>
                </div>
              </div>
              <div>
                <p className="font-black text-[10px] text-stone-900 mb-6 uppercase tracking-widest">Company</p>
                <div className="space-y-4 font-medium text-stone-400">
                  <a href="mailto:hello@civicpath.ai" className="block hover:text-stone-900 transition-colors">Contact</a>
                  <a href="https://helloagentic.ai" target="_blank" rel="noopener noreferrer" className="block hover:text-stone-900 transition-colors">HelloAgentic</a>
                  <a href="https://github.com/lalla-ai/civicpath" target="_blank" rel="noopener noreferrer" className="block hover:text-stone-900 transition-colors">GitHub</a>
                </div>
              </div>
              <div>
                <p className="font-black text-[10px] text-stone-900 mb-6 uppercase tracking-widest">Legal</p>
                <div className="space-y-4 font-medium text-stone-400">
                  <a href="/privacy" className="block hover:text-stone-900 transition-colors">Privacy</a>
                  <a href="/terms" className="block hover:text-stone-900 transition-colors">Terms</a>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-stone-100 flex flex-col sm:flex-row justify-between gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-stone-300">
            <span>© 2026 CivicPath (HelloAgentic) · ADK Hackathon · Florida</span>
            <span>8 AI agents · Gemini 2.0 Flash · Firebase · 0G Labs</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
