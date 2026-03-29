import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Hexagon, ArrowUpRight, Menu, X } from 'lucide-react';
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
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);
  const [heroQuery, setHeroQuery] = useState('');
  const [heroAnswer, setHeroAnswer] = useState('');
  const [heroLoading, setHeroLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <span className="text-stone-900 font-bold text-lg">{t('app.title')}</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[15px] text-stone-500">
            <a href="#how" className="hover:text-stone-900 transition-colors">{t('nav.howItWorks')}</a>
            <Link to="/login?role=seeker" className="hover:text-stone-900 transition-colors">{t('nav.findGrants')}</Link>
            <Link to="/login?role=funder" className="hover:text-stone-900 transition-colors">{t('nav.giveGrants')}</Link>
            <Link to="/pricing" className="hover:text-stone-900 transition-colors">{t('nav.pricing')}</Link>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/login" className="hidden sm:block text-[15px] text-stone-500 hover:text-stone-900 transition-colors">{t('nav.logIn')}</Link>
            <Link to="/login?role=seeker" className="hidden sm:block bg-[#76B900] text-[#111111] font-semibold px-4 py-2 rounded-lg hover:bg-[#689900] transition-colors text-[15px]">{t('nav.findGrantsCta')}</Link>
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors"
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-stone-700" /> : <Menu className="w-5 h-5 text-stone-700" />}
            </button>
          </div>
        </div>
        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-stone-200 bg-[#F9F7F2] px-6 py-4 flex flex-col gap-4">
            <a href="#how" onClick={() => setMobileMenuOpen(false)} className="text-[15px] text-stone-600 hover:text-stone-900 font-medium">{t('nav.howItWorks')}</a>
            <Link to="/login?role=seeker" onClick={() => setMobileMenuOpen(false)} className="text-[15px] text-stone-600 hover:text-stone-900 font-medium">{t('nav.findGrants')}</Link>
            <Link to="/login?role=funder" onClick={() => setMobileMenuOpen(false)} className="text-[15px] text-stone-600 hover:text-stone-900 font-medium">{t('nav.giveGrants')}</Link>
            <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="text-[15px] text-stone-600 hover:text-stone-900 font-medium">{t('nav.pricing')}</Link>
            <div className="flex gap-3 pt-2 border-t border-stone-200">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2.5 border border-stone-300 rounded-lg text-sm font-semibold text-stone-700">{t('nav.logIn')}</Link>
              <Link to="/login?role=seeker" onClick={() => setMobileMenuOpen(false)} className="flex-1 text-center py-2.5 bg-[#76B900] text-[#111] rounded-lg text-sm font-semibold">{t('nav.findGrantsCta')}</Link>
            </div>
          </div>
        )}
      </nav>
      {/* HERO */}
      <section className="pt-16 sm:pt-24 pb-14 sm:pb-20 text-center px-5 sm:px-6">
        <h1 className="mt-2 text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight text-stone-900 leading-[1.0] max-w-4xl mx-auto" style={{fontFamily:'"Instrument Serif", serif'}}>
          {t('hero.h1')}<br />
          <span className="text-[#76B900]">{t('hero.h2')}</span>
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed">
          {t('hero.sub')}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/login?role=seeker" className="bg-[#76B900] text-[#111111] font-semibold px-7 py-3.5 rounded-lg hover:bg-[#689900] transition-colors shadow-sm text-lg">{t('hero.ctaFind')}</Link>
          <Link to="/login?role=funder" className="border border-stone-300 text-stone-700 font-semibold px-7 py-3.5 rounded-lg hover:border-stone-500 hover:text-stone-900 transition-colors bg-white text-lg">{t('hero.ctaGive')}</Link>
          <Link to="/mylalla" className="bg-stone-900 text-white font-semibold px-7 py-3.5 rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2 text-lg">
            <span className="text-sm">✨</span> {t('hero.ctaAsk')}
          </Link>
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
                placeholder={t('hero.chatPlaceholder')}
                className="w-full pl-9 pr-4 py-4 rounded-xl bg-white border-2 border-stone-200 focus:border-[#76B900] focus:ring-2 focus:ring-[#76B900]/10 outline-none text-stone-900 text-base shadow-sm transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={!heroQuery.trim() || heroLoading}
              className="px-6 py-4 bg-[#76B900] text-[#111111] font-bold rounded-xl hover:bg-[#689900] transition-colors disabled:opacity-40 text-base shadow-sm whitespace-nowrap"
            >
              {heroLoading ? '...' : t('hero.chatBtn')}
            </button>
          </form>
          {heroAnswer && (
            <div className="mt-4 p-5 bg-[#76B900]/5 border border-[#76B900]/20 rounded-xl text-left text-base text-stone-700 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-[#76B900] text-base shrink-0 mt-0.5">✨</span>
                <div>
                  <span className="font-bold text-[#5a9000]">MyLalla: </span>
                  {heroAnswer}
                  <div className="mt-3">
                    <button onClick={() => navigate('/login?role=seeker')} className="text-sm font-bold text-[#76B900] hover:text-[#5a9000] underline">{t('hero.chatCta')}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-5 text-sm text-stone-400 tracking-wide">{t('hero.trust')}</p>
      </section>

      {/* 8 AGENTS */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#FCFAF6] border-t border-[#E1D8CC]">
        <div className="text-center mb-10 sm:mb-12">
          <p className="text-xs text-[#76B900] uppercase tracking-[0.15em] font-bold mb-3">THE ENGINE</p>
          <h2 className="text-5xl sm:text-6xl font-normal text-stone-900 tracking-tight leading-[1.02]" style={{fontFamily:'"Instrument Serif", serif'}}>Eight AI agents. Full lifecycle.</h2>
          <p className="text-stone-400 max-w-3xl mx-auto mt-4 text-lg sm:text-xl font-medium">From live grant discovery to sovereign closeout — the only platform that covers the complete grant lifecycle, automatically.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-6xl mx-auto">
          {[
            {n:'01',t:'Hunter',d:'Scans Grants.gov and 50+ databases live for your exact profile.',tag:''},
            {n:'02',t:'Matchmaker',d:'Scores every grant 0–100 using Gemini AI — not keywords.',tag:''},
            {n:'03',t:'Drafter',d:'Writes your full proposal in under 60 seconds.',tag:''},
            {n:'04',t:'Controller',d:'Verifies eligibility before you spend time applying.',tag:''},
            {n:'05',t:'Submitter',d:'Queues and sends applications on your schedule.',tag:''},
            {n:'06',t:'Watcher',d:'Monitors 24/7 for new grants that match your mission.',tag:''},
            {n:'07',t:'Compliance Scanner',d:'Extracts every reporting deadline from your Award Letter. Drafts compliance reports with Hard Block detection.',tag:'New'},
            {n:'08',t:'The Closer',d:'Generates a cryptographic Audit Pack (ZIP + Merkle root + 0G anchor) and executes the 500ms Sovereign Purge.',tag:'New'},
          ].map((a,i) => (
            <div key={i} className={`border rounded-2xl p-6 hover:border-[#76B900] transition-all cursor-default group relative ${
              i >= 6 ? 'bg-[#E9E0D1] border-[#D1C5B2] hover:bg-[#E3D8C6]' : 'bg-[#F6F1E8] border-[#E1D8CC] hover:bg-[#F1EADF]'
            }`}>
              {a.tag && (
                <span className="absolute top-3 right-3 text-[9px] font-black bg-[#76B900] text-[#111] px-1.5 py-0.5 rounded uppercase tracking-wide">{a.tag}</span>
              )}
              <div className={`text-xs font-black mb-3 tracking-widest transition-colors ${
                i >= 6 ? 'text-[#8A7C69] group-hover:text-[#76B900]' : 'text-stone-300 group-hover:text-[#76B900]'
              }`}>{a.n}</div>
              <div className="font-bold text-[1.15rem] mb-2 text-stone-900">{a.t}</div>
              <div className="text-base leading-relaxed text-stone-500">{a.d}</div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-stone-400 mt-6">Agents 1–6: Grant discovery &amp; submission pipeline &nbsp;&middot;&nbsp; Agents 7–8: Post-award compliance &amp; sovereign closeout</p>
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
            <h3 className="text-xl font-bold text-stone-900 mt-4">Tell us your mission</h3>
            <p className="text-stone-400 text-base leading-relaxed mt-2">30 seconds. Your org name, location, focus area, and background. That's all the agents need.</p>
          </div>

          {/* Step 2 */}
          <div className="bg-[#111111] rounded-2xl p-8 border border-[#222]">
            <span className="text-[11px] font-black tracking-widest text-[#222]">02</span>
            <div className="mt-5 w-11 h-11 bg-[#76B900]/15 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-[#76B900]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
            <h3 className="text-xl font-bold text-white mt-4">Agents do everything</h3>
            <p className="text-stone-500 text-base mt-2">Your 8-agent team runs automatically:</p>
            <div className="mt-3 space-y-1.5">
              {['Hunter scans Grants.gov + SBA live','Matchmaker scores every grant 0–100','Drafter writes your proposal via Gemini','Controller checks all compliance','Submitter queues for your approval','Watcher monitors 24/7 for new grants','Compliance Scanner manages post-award reporting','The Closer executes sovereign closeout + Audit Pack'].map((a,i) => (
                <div key={i} className={`text-sm flex items-center gap-2 ${i >= 6 ? 'text-[#76B900]/70' : 'text-stone-500'}`}>
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
            <h3 className="text-xl font-bold text-stone-900 mt-4">You approve. They submit.</h3>
            <p className="text-stone-400 text-base leading-relaxed mt-2">Review your AI-drafted proposal. One click to approve. Agents send it, book your calendar, and keep watching.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#76B900]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#76B900]"></span>
              AI works. You control.
            </div>
          </div>
        </div>
      </section>

      {/* SOVEREIGN */}
      <section id="sovereign" className="px-6 py-20 bg-white border-t border-stone-100">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs text-[#76B900] uppercase tracking-[0.15em] font-bold mb-5">TRUST & SECURITY</p>
          <h2 className="text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight" style={{fontFamily:'"Instrument Serif", serif'}}>Built Sovereign. Built for Government.</h2>
          <p className="mt-4 text-stone-400 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">Your data never leaves our infrastructure. Privacy is not a policy — it's baked into the architecture.</p>
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
                <p className="text-sm font-bold text-stone-800">{item.label}</p>
                <p className="text-sm text-stone-400 mt-0.5">{item.detail}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-center mt-8 flex-wrap">
            {[
              '🏆 Google Cloud ADK Hackathon 2026 Finalist',
              '🔐 FedRAMP-Aligned Architecture',
              '🔒 E2E Encrypted · GDPR Art.17',
              '📄 Patent Pending · THINKVERSE-001',
            ].map((b,i) => (
              <span key={i} className="bg-[#76B90015] text-[#5a9000] rounded-full px-3 py-1.5 text-sm font-medium">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 sm:py-28 text-center px-5 sm:px-6 bg-[#111111]">
        <h2 className="text-4xl sm:text-5xl font-normal text-white max-w-2xl mx-auto leading-tight tracking-tight" style={{fontFamily:'"Instrument Serif", serif'}}>Your community deserves<br />to be funded.</h2>
          <p className="mt-4 text-stone-400 max-w-lg mx-auto text-lg">8 AI agents. Full lifecycle. Discovery → Submission → Compliance → Sovereign Closeout.</p>
        <Link to="/login?role=seeker" className="mt-8 inline-block bg-[#76B900] text-[#111111] font-bold px-9 py-4 rounded-lg hover:bg-[#689900] transition-colors text-lg">
          Find My Grants →
        </Link>
        <p className="mt-4 text-sm text-stone-600">Free · No credit card · Sovereign data</p>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-10">
            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Logo />
                <span className="font-bold text-stone-900 text-base">CivicPath</span>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">Your community. Funded. 8 AI agents. Full grant lifecycle. Built in Florida.</p>
              <div className="flex gap-3 mt-3">
                <a href="https://github.com/lalla-ai/civicpath" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-stone-700 transition-colors" title="GitHub">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="mailto:hello@civicpath.ai" className="text-stone-400 hover:text-stone-700 transition-colors text-xs font-medium">hello@civicpath.ai</a>
              </div>
            </div>
            {/* Links */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="font-bold text-stone-700 mb-2 text-xs uppercase tracking-wider">Product</p>
                <div className="space-y-1.5">
                  <a href="/" className="block text-stone-400 hover:text-stone-900 transition-colors">Home</a>
                  <a href="/pricing" className="block text-stone-400 hover:text-stone-900 transition-colors">Pricing</a>
                  <a href="/demo" className="block text-stone-400 hover:text-stone-900 transition-colors">Live Demo</a>
                  <a href="/login?role=seeker" className="block text-stone-400 hover:text-stone-900 transition-colors">Find My Grant</a>
                  <a href="/login?role=funder" className="block text-stone-400 hover:text-stone-900 transition-colors">Give Grants</a>
                </div>
              </div>
              <div>
                <p className="font-bold text-stone-700 mb-2 text-xs uppercase tracking-wider">Company</p>
                <div className="space-y-1.5">
                  <a href="mailto:hello@civicpath.ai" className="block text-stone-400 hover:text-stone-900 transition-colors">Contact</a>
                  <a href="https://helloagentic.ai" target="_blank" rel="noopener noreferrer" className="block text-stone-400 hover:text-stone-900 transition-colors">HelloAgentic</a>
                  <a href="https://github.com/lalla-ai/civicpath" target="_blank" rel="noopener noreferrer" className="block text-stone-400 hover:text-stone-900 transition-colors">GitHub</a>
                </div>
              </div>
              <div>
                <p className="font-bold text-stone-700 mb-2 text-xs uppercase tracking-wider">Legal</p>
                <div className="space-y-1.5">
                  <a href="/privacy" className="block text-stone-400 hover:text-stone-900 transition-colors">Privacy</a>
                  <a href="/terms" className="block text-stone-400 hover:text-stone-900 transition-colors">Terms</a>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row justify-between gap-2 text-xs text-stone-400">
            <span>© 2026 CivicPath (HelloAgentic) · Google Cloud ADK Hackathon 2026 Finalist · Built in Florida</span>
            <span>8 AI agents · Gemini 2.0 Flash · Firebase · 0G Labs</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
