import { Link } from 'react-router-dom';

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#1A1A1A]" style={{fontFamily:'Inter,sans-serif'}}>

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-[#F9F7F2] border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#76B900] rounded-full inline-block" />
            <span className="text-stone-900 font-bold text-lg">CivicPath</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-stone-500">
            <a href="#how" className="hover:text-stone-900 transition-colors">How It Works</a>
            <a href="#funders" className="hover:text-stone-900 transition-colors">For Funders</a>
            <a href="#sovereign" className="hover:text-stone-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">Log in</Link>
            <Link to="/login?role=seeker" className="bg-[#76B900] text-[#111111] font-semibold px-4 py-2 rounded-lg hover:bg-[#8FD400] transition-colors text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-32 text-center px-6">
        <div className="inline-flex items-center gap-2 bg-[#76B90020] text-[#76B900] rounded-full px-4 py-1 text-xs font-medium">
          🏆 Google Cloud ADK Hackathon 2025 — Top 5 of 54 Teams
        </div>
        <h1 className="mt-8 text-6xl font-bold tracking-tight text-stone-900 leading-[1.1] max-w-3xl mx-auto">
          Find The Grant<br />
          <span className="text-[#76B900]">That Gets You.</span>
        </h1>
        <p className="mt-6 text-xl text-stone-500 max-w-2xl mx-auto leading-relaxed">
          6 AI agents find, score, draft, and track every grant for your organization — automatically.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/login?role=seeker" className="bg-[#76B900] text-[#111111] font-semibold px-5 py-2.5 rounded-lg hover:bg-[#8FD400] transition-colors">Find My Grants →</Link>
          <Link to="/login?role=funder" className="border border-[#333333] text-[#EEEEEE] px-5 py-2.5 rounded-lg hover:border-[#76B900] hover:text-[#76B900] transition-colors">I'm a Grant Funder</Link>
        </div>
        <p className="mt-4 text-xs text-[#555555]">Free to start · No credit card · Sovereign data</p>

        {/* Product Mockup */}
        <div className="mt-20 max-w-3xl mx-auto bg-[#232323] border border-[#333333] rounded-xl p-6 text-left">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs text-[#888888]">Sunrise Tech Nonprofit · Orlando, FL</span>
            <span className="bg-[#76B90020] text-[#76B900] text-xs rounded-full px-2 py-0.5">Pipeline Complete ✓</span>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { name: 'State Innovation Match Fund', meta: '$150,000 · Due Oct 15', score: '92 / 100', top: true },
              { name: 'FL STEM Education Initiative', meta: '$75,000 · Due Nov 3', score: '88 / 100', top: true },
              { name: 'MGRP Research Fund', meta: '$50,000 · Due Nov 28', score: '84 / 100', top: false },
            ].map((g, i) => (
              <div key={i} className="bg-[#2A2A2A] rounded-lg p-4 border-l-2 border-[#76B900] flex justify-between items-center">
                <div>
                  <div className="text-[#EEEEEE] font-medium text-sm">{g.name}</div>
                  <div className="text-[#888888] text-xs mt-0.5">{g.meta}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${g.top ? 'bg-[#76B900] text-[#111111]' : 'bg-[#555555] text-[#EEEEEE]'}`}>{g.score}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#333333] flex gap-3">
            <button className="border border-[#333333] text-[#EEEEEE] px-3 py-1.5 rounded-lg hover:border-[#76B900] hover:text-[#76B900] transition-colors text-xs">View All Matches</button>
            <button className="bg-[#76B900] text-[#111111] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#8FD400] transition-colors text-xs">Draft Proposal</button>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="bg-stone-100 border-y border-stone-200 py-10 text-center">
        <p className="text-xs text-stone-400 uppercase tracking-widest">Trusted by organizations across Florida</p>
        <div className="flex justify-center gap-12 mt-6 flex-wrap text-stone-400 text-sm font-medium">
          <span>Miami-Dade County</span><span>Google Cloud</span><span>Grants.gov</span><span>FL High Tech Corridor</span><span>HelloAgentic</span>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
          {[{n:'1,247+',l:'Grants Indexed'},{n:'94%',l:'Match Accuracy'},{n:'38 hrs',l:'Saved Per Grant'},{n:'$2.4M',l:'Active Grant Value'}].map((s,i) => (
            <div key={i}>
              <div className="text-4xl font-bold text-[#76B900]">{s.n}</div>
              <div className="text-sm text-stone-500 mt-1">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 6 AGENTS */}
      <section className="py-24 px-6">
        <div className="text-center mb-16">
          <p className="text-xs text-[#76B900] uppercase tracking-widest font-medium mb-4">THE ENGINE</p>
          <h2 className="text-4xl font-bold text-stone-900">Six AI agents. One click.</h2>
          <p className="text-stone-500 max-w-xl mx-auto mt-4">From live grant discovery to proposal delivery — your AI team works 24/7 so you don't have to.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {[
            {e:'🔍',t:'Hunter',d:'Scans Grants.gov and 50+ state databases in real time for your exact profile.'},
            {e:'🎯',t:'Matchmaker',d:'Scores every grant 0–100 using Gemini semantic embeddings — not keywords.'},
            {e:'✍️',t:'Drafter',d:'Writes a complete proposal in under 60 seconds using Gemini 2.0 Flash.'},
            {e:'✅',t:'Controller',d:'Verifies your eligibility before you spend time applying.'},
            {e:'📤',t:'Submitter',d:'Queues and sends your applications on your schedule.'},
            {e:'👁️',t:'Watcher',d:'Monitors 24/7 for new grants that match your mission.'},
          ].map((a,i) => (
            <div key={i} className="bg-white border border-stone-200 rounded-xl p-6 hover:border-[#76B900] transition-colors cursor-default shadow-sm">
              <div className="w-10 h-10 bg-[#76B900]/10 rounded-full flex items-center justify-center text-lg mb-4">{a.e}</div>
              <div className="text-stone-900 font-semibold mb-2">{a.t}</div>
              <div className="text-stone-500 text-sm leading-relaxed">{a.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-stone-100 border-y border-stone-200 py-24 px-6">
        <div className="text-center mb-16">
          <p className="text-xs text-[#76B900] uppercase tracking-widest font-medium mb-4">HOW IT WORKS</p>
          <h2 className="text-4xl font-bold text-stone-900">Profile to proposal in 60 seconds</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            {n:'01',e:'🏢',t:'Create your profile',d:'Enter your org name, mission, and location. Under 30 seconds.'},
            {n:'02',e:'🤖',t:'AI finds your matches',d:'6 agents scan thousands of grants and score each one for compatibility.'},
            {n:'03',e:'📄',t:'Apply in one click',d:'Review proposals, verify eligibility, download PDF, track every deadline.'},
          ].map((s,i) => (
            <div key={i}>
              <div className="text-6xl font-bold text-stone-200">{s.n}</div>
              <div className="w-10 h-10 bg-[#76B900]/10 rounded-full flex items-center justify-center text-lg mt-4">{s.e}</div>
              <div className="text-xl font-semibold text-stone-900 mt-4">{s.t}</div>
              <div className="text-stone-500 text-sm leading-relaxed mt-2">{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold text-stone-900">Funding for every organization</h2>
        <div className="flex flex-wrap justify-center gap-3 mt-10 max-w-4xl mx-auto">
          {['🏛️ Nonprofits','🚀 AI Startups','🏫 Education','🏥 Healthcare','🏠 Housing','🎨 Arts & Culture','💼 Small Business','🌱 Environment','💰 Loans & Capital','🎪 Events','👩 Women-Owned','🎖️ Veteran-Owned','🔬 Research','🏙️ Government'].map((p,i) => (
            <span key={i} className="border border-stone-200 rounded-full px-4 py-2 text-sm text-stone-500 hover:border-[#76B900] hover:text-[#76B900] cursor-pointer transition-colors bg-white">{p}</span>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="funders" className="bg-stone-100 border-t border-stone-200 py-24 px-6">
        <h2 className="text-3xl font-bold text-stone-900 text-center mb-12">Organizations that found their match</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {q:'CivicPath found us a $150,000 grant we didn\'t know existed. The AI wrote our proposal in under a minute. We submitted and won.',n:'Maria Rodriguez · Sunrise STEM Nonprofit, Orlando FL'},
            {q:'As a small AI startup, grants felt impossible. CivicPath matched us to the NSF SBIR track and drafted our entire Phase I proposal.',n:'James Chen · NovaMind AI, Miami FL'},
            {q:'We used to spend 40 hours per grant. Now it takes 60 seconds. This is the future of nonprofit ops.',n:'Dr. Sarah Williams · Community Health Alliance, Tampa FL'},
          ].map((t,i) => (
            <div key={i} className="bg-white border border-stone-200 rounded-xl p-6 hover:border-[#76B900] transition-colors shadow-sm">
              <div className="text-[#76B900] text-sm mb-4">★★★★★</div>
              <p className="text-stone-700 text-sm leading-relaxed">"{t.q}"</p>
              <p className="mt-4 text-stone-400 text-xs">— {t.n}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SOVEREIGN */}
      <section id="sovereign" className="px-6 my-24">
        <div className="bg-white border border-[#76B900]/30 rounded-2xl max-w-5xl mx-auto p-16 text-center shadow-sm">
          <div className="text-4xl mb-6">🛡️</div>
          <h2 className="text-3xl font-bold text-stone-900">Built Sovereign. Built for Government.</h2>
          <p className="mt-4 text-stone-500 max-w-xl mx-auto">All your data stays on your hardware. Never shared with commercial clouds. Privacy is not a policy — it's in the architecture.</p>
          <div className="flex flex-wrap justify-center gap-8 mt-10 text-sm text-stone-500">
            <span>🏗️ Local Infrastructure</span><span>🔒 Data Never Leaves</span><span>📖 Open Source Core</span><span>✅ Government Compliant</span>
          </div>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            {['Google Cloud ADK Finalist 2025','Patent Pending','Miami-Dade Pilot Partner'].map((b,i) => (
              <span key={i} className="bg-[#76B90020] text-[#76B900] rounded-full px-3 py-1 text-xs">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 text-center px-6">
        <h2 className="text-5xl font-bold text-stone-900 max-w-2xl mx-auto leading-tight">Your community deserves<br />to be funded.</h2>
        <p className="mt-6 text-stone-500 text-xl max-w-xl mx-auto">Join 847 Florida organizations already using CivicPath to find, match, and win grants.</p>
        <Link to="/login?role=seeker" className="mt-10 inline-block bg-[#76B900] text-[#111111] font-semibold px-8 py-4 text-lg rounded-xl hover:bg-[#8FD400] transition-colors">
          Find My Grants Now →
        </Link>
        <p className="mt-4 text-xs text-[#555555]">Free to start · No credit card required · Sovereign data</p>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-12">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="font-bold text-stone-900"><span className="text-[#76B900]">●</span> CivicPath</div>
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
          <span>© 2026 HelloAgentic. Built in Florida. For Florida.</span>
          <span>Google ADK · Gemini 2.0 Flash · Cloud Run</span>
        </div>
      </footer>
    </div>
  );
}
