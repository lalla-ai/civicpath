import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Hexagon, ArrowUpRight } from 'lucide-react';

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-8 h-8 text-[#76B900]">
    <Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

export default function LandingPage() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-[#F9F7F2] text-[#1A1A1A]" style={{fontFamily:'Inter,sans-serif'}}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#F9F7F2] border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="text-stone-900 font-bold text-lg">CivicPath</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-stone-500">
            <a href="#how" className="hover:text-stone-900 transition-colors">How It Works</a>
            <Link to="/login?role=seeker" className="hover:text-stone-900 transition-colors">Find Grants</Link>
            <Link to="/login?role=funder" className="hover:text-stone-900 transition-colors">Give Grants</Link>
            <Link to="/pricing" className="hover:text-stone-900 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">Log in</Link>
            <Link to="/login?role=seeker" className="bg-[#76B900] text-[#111111] font-semibold px-4 py-2 rounded-lg hover:bg-[#689900] transition-colors text-sm">Find Grants →</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-16 sm:pt-24 pb-14 sm:pb-20 text-center px-5 sm:px-6">
        <div className="inline-flex items-center gap-2 bg-[#76B90015] text-[#5a9000] rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide">
          🏆 Google Cloud ADK Hackathon 2026 · Finalist
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-stone-900 leading-[1.08] max-w-3xl mx-auto">
          Find The Grant<br />
          <span className="text-[#76B900]">That Gets You.</span>
        </h1>
        <p className="mt-4 text-base sm:text-lg text-stone-500 max-w-xl mx-auto leading-relaxed">
          7 AI agents find, score, draft, comply, and submit grants for your org — automatically. First match in 60 seconds.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login?role=seeker" className="bg-[#76B900] text-[#111111] font-semibold px-6 py-3 rounded-lg hover:bg-[#689900] transition-colors shadow-sm">Find My Grants →</Link>
          <Link to="/login?role=funder" className="border border-stone-300 text-stone-700 font-semibold px-6 py-3 rounded-lg hover:border-stone-500 hover:text-stone-900 transition-colors bg-white">Give Grants</Link>
        </div>
        {/* MyLalla Hero Chat Bar */}
        <div className="mt-10 max-w-2xl mx-auto">
          <form onSubmit={handleHeroAsk} className="flex gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#76B900] text-sm">✨</span>
              <input
                type="text"
                value={heroQuery}
                onChange={e => setHeroQuery(e.target.value)}
                placeholder="Ask MyLalla: What grants does my nonprofit qualify for?"
                className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-white border-2 border-stone-200 focus:border-[#76B900] focus:ring-2 focus:ring-[#76B900]/10 outline-none text-stone-900 text-sm shadow-sm transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!heroQuery.trim() || heroLoading}
              className="px-5 py-3.5 bg-[#76B900] text-[#111111] font-bold rounded-xl hover:bg-[#689900] transition-colors disabled:opacity-40 text-sm shadow-sm whitespace-nowrap"
            >
              {heroLoading ? '...' : 'Ask →'}
            </button>
          </form>
          {heroAnswer && (
            <div className="mt-4 p-4 bg-[#76B900]/5 border border-[#76B900]/20 rounded-xl text-left text-sm text-stone-700 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-[#76B900] text-base shrink-0 mt-0.5">✨</span>
                <div>
                  <span className="font-bold text-[#5a9000]">MyLalla: </span>
                  {heroAnswer}
                  <div className="mt-3">
                    <button onClick={() => navigate('/login?role=seeker')} className="text-xs font-bold text-[#76B900] hover:text-[#5a9000] underline">Get your full personalized match →</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-xs text-stone-400 tracking-wide">Free · No credit card · Sovereign data</p>
      </section>

      {/* 6 AGENTS */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white border-t border-stone-100">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-[11px] text-[#76B900] uppercase tracking-[0.15em] font-bold mb-3">THE ENGINE</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Seven AI agents. One click.</h2>
          <p className="text-stone-400 max-w-md mx-auto mt-3 text-sm">From live grant discovery to proposal delivery — your AI team runs 24/7.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-4xl mx-auto">
          {[
            {n:'01',t:'Hunter',d:'Scans Grants.gov and 50+ databases live for your exact profile.'},
            {n:'02',t:'Matchmaker',d:'Scores every grant 0–100 using Gemini AI — not keywords.'},
            {n:'03',t:'Drafter',d:'Writes your full proposal in under 60 seconds.'},
            {n:'04',t:'Controller',d:'Verifies eligibility before you spend time applying.'},
            {n:'05',t:'Submitter',d:'Queues and sends applications on your schedule.'},
            {n:'06',t:'Watcher',d:'Monitors 24/7 for new grants that match your mission.'},
          ].map((a,i) => (
            <div key={i} className="bg-[#FAFAF8] border border-stone-200 rounded-xl p-5 hover:border-[#76B900] hover:bg-white transition-all cursor-default group">
              <div className="text-[11px] font-black text-stone-300 mb-3 tracking-widest group-hover:text-[#76B900] transition-colors">{a.n}</div>
              <div className="text-stone-900 font-semibold text-sm mb-1.5">{a.t}</div>
              <div className="text-stone-400 text-xs leading-relaxed">{a.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-[#F9F7F2] border-t border-stone-100 py-16 sm:py-20 px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] text-[#76B900] uppercase tracking-[0.15em] font-bold">HOW IT WORKS</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">

          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200">
            <span className="text-[11px] font-black tracking-widest text-stone-200">01</span>
            <div className="mt-5 w-11 h-11 bg-[#76B900]/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            </div>
            <h3 className="text-lg font-bold text-stone-900 mt-4">Tell us your mission</h3>
            <p className="text-stone-400 text-sm leading-relaxed mt-2">30 seconds. Your org name, location, focus area, and background. That's all the agents need.</p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#111111] rounded-2xl p-8 border border-[#222]">
            <span className="text-[11px] font-black tracking-widest text-[#222]">02</span>
            <div className="mt-5 w-11 h-11 bg-[#76B900]/15 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <h3 className="text-lg font-bold text-white mt-4">Agents do everything</h3>
            <p className="text-stone-500 text-sm mt-2">Your 7-agent team runs automatically:</p>
            <div className="mt-3 space-y-1.5">
              {['Hunter scans Grants.gov + SBA live','Matchmaker scores every grant 0–100','Drafter writes your proposal via Gemini','Controller checks all compliance','Submitter queues for your approval','Watcher monitors 24/7 for new grants'].map((a,i) => (
                <div key={i} className="text-xs text-stone-500 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-[#76B900] shrink-0" />{a}
                </div>
              ))}
            </div>
          </div>

          {/* Step 3 — no more solid green */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200 border-l-4 border-l-[#76B900]">
            <span className="text-[11px] font-black tracking-widest text-stone-200">03</span>
            <div className="mt-5 w-11 h-11 bg-[#76B900]/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            </div>
            <h3 className="text-lg font-bold text-stone-900 mt-4">You approve. They submit.</h3>
            <p className="text-stone-400 text-sm leading-relaxed mt-2">Review your AI-drafted proposal. One click to approve. Agents send it, book your calendar, and keep watching.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#76B900]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#76B900]"></span>
              AI works. You control.
            </div>
          </div>
        </div>
      </section>

      {/* SOVEREIGN */}
      <section id="sovereign" className="px-6 py-20 bg-white border-t border-stone-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[11px] text-[#76B900] uppercase tracking-[0.15em] font-bold mb-5">TRUST & SECURITY</p>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">Built Sovereign. Built for Government.</h2>
          <p className="mt-4 text-stone-400 max-w-lg mx-auto text-sm leading-relaxed">Your data never leaves our infrastructure. Privacy is not a policy — it's baked into the architecture.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
            {[
              {label:'Local Infrastructure', detail:'Data never touches external clouds'},
              {label:'E2E Encrypted', detail:'Profile, proposals, credentials'},
              {label:'Open Source Core', detail:'Audit the code yourself'},
              {label:'Government Ready', detail:'FedRAMP-aligned architecture'},
            ].map((item, i) => (
              <div key={i} className="bg-[#FAFAF8] border border-stone-200 rounded-xl p-4 text-left">
                <div className="w-7 h-7 bg-[#76B900]/10 rounded-lg flex items-center justify-center mb-3">
                  <span className="w-2 h-2 rounded-full bg-[#76B900]"></span>
                </div>
                <p className="text-xs font-bold text-stone-800">{item.label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-center mt-8 flex-wrap">
            {['Google Cloud ADK Finalist 2026','Patent Pending','Miami-Dade Pilot Partner'].map((b,i) => (
              <span key={i} className="bg-[#76B90015] text-[#5a9000] rounded-full px-3 py-1 text-xs font-medium">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 sm:py-28 text-center px-5 sm:px-6 bg-[#111111]">
        <h2 className="text-3xl sm:text-4xl font-bold text-white max-w-xl mx-auto leading-tight tracking-tight">Your community deserves<br />to be funded.</h2>
        <p className="mt-4 text-stone-400 text-base max-w-md mx-auto">Connect to 33+ grant databases. Let AI find, draft, and submit the ones that fit you.</p>
        <Link to="/login?role=seeker" className="mt-8 inline-block bg-[#76B900] text-[#111111] font-bold px-8 py-3.5 rounded-lg hover:bg-[#689900] transition-colors text-sm">
          Find My Grants →
        </Link>
        <p className="mt-4 text-xs text-stone-600">Free · No credit card · Sovereign data</p>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-12">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-bold text-stone-900 text-base">CivicPath</span>
            </div>
            <div className="text-xs text-stone-400 mt-1">Your community. Funded.</div>
          </div>
          <div className="flex gap-6 text-sm text-stone-400">
            <a href="/pricing" className="hover:text-stone-900 transition-colors">Pricing</a>
            <a href="/privacy" className="hover:text-stone-900 transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-stone-900 transition-colors">Terms</a>
            <a href="mailto:hello@civicpath.ai" className="hover:text-stone-900 transition-colors">Contact</a>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-6 mt-8 pt-6 border-t border-stone-100 flex justify-between flex-wrap gap-2 text-xs text-stone-400">
          <span>\u00a9 2026 CivicPath · Google Cloud ADK Hackathon 2026 Finalist</span>
          <span><a href="mailto:hello@civicpath.ai" className="hover:text-stone-600 transition-colors">hello@civicpath.ai</a></span>
        </div>
      </footer>
    </div>
  );
}
