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
            <a href="#sources" className="hover:text-stone-900 transition-colors">Grant Sources</a>
            <Link to="/pricing" className="hover:text-stone-900 transition-colors">Pricing</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">Log in</Link>
            <Link to="/login?role=funder" className="text-sm border border-stone-300 text-stone-700 px-3 py-1.5 rounded-lg hover:border-[#76B900] hover:text-[#76B900] transition-colors hidden sm:block">Post a Grant</Link>
            <Link to="/login?role=seeker" className="bg-[#76B900] text-[#111111] font-semibold px-4 py-2 rounded-lg hover:bg-[#8FD400] transition-colors text-sm">Find Grants →</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="py-32 text-center px-6">
        <div className="inline-flex items-center gap-2 bg-[#76B90020] text-[#76B900] rounded-full px-4 py-1 text-xs font-medium">
          🏆 Google Cloud ADK Hackathon 2026
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
          <Link to="/login?role=funder" className="border-2 border-stone-700 text-stone-800 font-semibold px-5 py-2.5 rounded-lg hover:border-[#76B900] hover:text-[#76B900] transition-colors bg-white">I'm a Grant Funder</Link>
          <Link to="/demo" className="border border-stone-300 text-stone-600 px-5 py-2.5 rounded-lg hover:border-stone-500 hover:text-stone-800 transition-colors flex items-center gap-2 bg-white">▶ Try Live Demo</Link>
        </div>
        <p className="mt-4 text-xs text-stone-400">Free to start · No credit card · Sovereign data</p>

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
        <p className="text-xs text-stone-400 uppercase tracking-widest mb-8">Built with &amp; trusted by</p>
        <div className="flex justify-center items-center gap-10 flex-wrap max-w-5xl mx-auto px-6">
          {/* Google Cloud */}
          <a href="https://cloud.google.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group">
            <img src="https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg" alt="Google" className="h-6 w-auto grayscale group-hover:grayscale-0 transition-all" />
            <span className="text-xs text-stone-400 font-medium">Google Cloud ADK</span>
          </a>
          {/* Gemini */}
          <a href="https://deepmind.google/technologies/gemini/" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group">
            <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" alt="Gemini" className="h-8 w-auto grayscale group-hover:grayscale-0 transition-all" onError={e=>{(e.target as HTMLImageElement).src='https://logo.clearbit.com/gemini.google.com'}} />
            <span className="text-xs text-stone-400 font-medium">Gemini 2.0 Flash</span>
          </a>
          {/* Grants.gov */}
          <a href="https://www.grants.gov" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group">
            <img src="https://logo.clearbit.com/grants.gov" alt="Grants.gov" className="h-8 w-auto grayscale group-hover:grayscale-0 transition-all" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
            <span className="text-xs text-stone-400 font-medium">Grants.gov</span>
          </a>
          {/* HelloAgentic */}
          <a href="https://helloagentic.ai" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group">
            <img src="https://logo.clearbit.com/helloagentic.ai" alt="HelloAgentic" className="h-8 w-8 rounded-lg object-contain grayscale group-hover:grayscale-0 transition-all" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
            <span className="text-xs text-stone-400 font-medium">HelloAgentic</span>
          </a>
          {/* DeepStation */}
          <a href="https://deepstation.ai" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group">
            <img src="https://logo.clearbit.com/deepstation.ai" alt="DeepStation" className="h-8 w-8 rounded-lg object-contain grayscale group-hover:grayscale-0 transition-all" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
            <span className="text-xs text-stone-400 font-medium">DeepStation</span>
          </a>
          {/* MDC */}
          <a href="https://www.mdc.edu" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group">
            <img src="https://logo.clearbit.com/mdc.edu" alt="Miami Dade College" className="h-8 w-8 rounded-lg object-contain grayscale group-hover:grayscale-0 transition-all" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
            <span className="text-xs text-stone-400 font-medium">Miami Dade College</span>
          </a>
          {/* Firebase */}
          <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group">
            <img src="https://logo.clearbit.com/firebase.google.com" alt="Firebase" className="h-8 w-auto grayscale group-hover:grayscale-0 transition-all" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
            <span className="text-xs text-stone-400 font-medium">Firebase</span>
          </a>
          {/* Vercel */}
          <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-60 hover:opacity-100 transition-opacity group">
            <img src="https://logo.clearbit.com/vercel.com" alt="Vercel" className="h-8 w-auto grayscale group-hover:grayscale-0 transition-all" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
            <span className="text-xs text-stone-400 font-medium">Vercel</span>
          </a>
        </div>
      </section>

      {/* LIVE GRANT DATA BADGE */}
      <section className="py-10 px-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-6 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-[#76B900] rounded-full animate-pulse"></span>
            <span className="text-sm font-semibold text-stone-700">Powered by <a href="https://www.grants.gov" target="_blank" rel="noopener noreferrer" className="text-[#76B900] hover:underline font-bold">Grants.gov</a> — official U.S. federal grants database, updated daily</span>
          </div>
          <div className="flex items-center gap-6 text-center shrink-0">
            <div><div className="text-xl font-black text-stone-900">1,000s</div><div className="text-xs text-stone-500">Live Federal Grants</div></div>
            <div><div className="text-xl font-black text-[#76B900]">Gemini AI</div><div className="text-xs text-stone-500">Matching Engine</div></div>
            <div><div className="text-xl font-black text-stone-900">$0</div><div className="text-xs text-stone-500">To Start</div></div>
          </div>
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

      {/* GRANT SOURCES */}
      <section id="sources" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs text-[#76B900] uppercase tracking-widest font-medium mb-3">DATA SOURCES</p>
            <h2 className="text-3xl font-bold text-stone-900">Connected to every major grant database</h2>
            <p className="text-stone-500 mt-3">We pipe from federal, state, and private sources so you never miss an opportunity.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { emoji: '🏛️', name: 'Grants.gov', desc: 'Official U.S. federal grants database. 1,000s of active opportunities across all agencies.', tag: 'Live API', url: 'https://www.grants.gov' },
              { emoji: '🚀', name: 'SBA SBIR / STTR', desc: 'Small Business Innovation Research. AI, deep tech, and R&D grants for startups.', tag: 'Live API', url: 'https://www.sbir.gov' },
              { emoji: '🔬', name: 'NSF Grants', desc: 'National Science Foundation funding for research, AI, and STEM organizations.', tag: 'Phase 2', url: 'https://www.nsf.gov/funding' },
              { emoji: '🧬', name: 'NIH Grants', desc: 'National Institutes of Health funding for health tech, biotech, and community health orgs.', tag: 'Phase 2', url: 'https://grants.nih.gov' },
              { emoji: '🧠', name: 'NVIDIA Inception', desc: 'AI startup program offering cloud credits, co-marketing, and VC access.', tag: 'Program', url: 'https://www.nvidia.com/inception' },
              { emoji: '☁️', name: 'Google for Startups', desc: 'Google Cloud credits up to $200K + mentorship for eligible AI startups.', tag: 'Program', url: 'https://cloud.google.com/startup' },
              { emoji: '🏷️', name: 'Florida MGRP', desc: 'Florida Matching Grant Research Program for state-based tech companies.', tag: 'State', url: 'https://www.floridajobs.org' },
              { emoji: '🏦', name: 'SBA FAST Program', desc: 'Federal and State Technology Partnership grants for small businesses.', tag: 'Federal', url: 'https://www.sbir.gov/about/about-fast' },
              { emoji: '🏡', name: 'Miami-Dade Grants', desc: 'County-level funding: Mom & Pop, MDEAT, Cultural Affairs, and more.', tag: 'County', url: 'https://www.miamidade.gov' },
              { emoji: '🌎', name: 'USASpending.gov', desc: 'Full federal spending data — find agencies actively funding your sector.', tag: 'Coming Soon', url: 'https://www.usaspending.gov' },
            ].map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="bg-white border border-stone-200 rounded-xl p-5 hover:border-[#76B900] transition-colors shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{s.emoji}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    s.tag === 'Live API' ? 'bg-[#76B900]/10 text-[#76B900]' :
                    s.tag === 'Phase 2' ? 'bg-amber-50 text-amber-600' :
                    s.tag === 'Coming Soon' ? 'bg-stone-100 text-stone-400' :
                    'bg-blue-50 text-blue-600'
                  }`}>{s.tag}</span>
                </div>
                <div className="font-bold text-stone-900 text-sm">{s.name}</div>
                <div className="text-xs text-stone-500 leading-relaxed">{s.desc}</div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bg-stone-100 border-y border-stone-200 py-24 px-6">
        <div className="text-center mb-16">
          <p className="text-xs text-[#76B900] uppercase tracking-widest font-medium mb-4">HOW IT WORKS</p>
          <h2 className="text-4xl font-bold text-stone-900">Fully agentic. You just approve.</h2>
          <p className="text-stone-500 mt-3 max-w-xl mx-auto">Your 6-agent AI team runs 24/7. You just review and approve.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm">
            <div className="text-6xl font-black text-stone-100">01</div>
            <div className="w-12 h-12 bg-[#76B900]/10 rounded-full flex items-center justify-center text-2xl mt-4">🏢</div>
            <div className="text-xl font-bold text-stone-900 mt-4">Tell us your mission</div>
            <div className="text-stone-500 text-sm leading-relaxed mt-2">30 seconds. Your org name, location, focus area, and background. That’s all the agents need to get to work.</div>
          </div>
          {/* Step 2 */}
          <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-stone-800 shadow-sm">
            <div className="text-6xl font-black text-stone-800">02</div>
            <div className="w-12 h-12 bg-[#76B900]/20 rounded-full flex items-center justify-center text-2xl mt-4">🤖</div>
            <div className="text-xl font-bold text-white mt-4">Agents do everything</div>
            <div className="text-stone-400 text-sm leading-relaxed mt-2">Your 6-agent team runs automatically:</div>
            <div className="mt-3 space-y-1.5">
              {['🔍 Hunter scans Grants.gov + SBA SBIR live','🎯 Matchmaker scores every grant 0–100','✍️ Drafter writes your full proposal via Gemini','✅ Controller checks compliance','📤 Submitter queues for your approval','👁️ Watcher monitors 24/7 for new matches'].map((a,i) => (
                <div key={i} className="text-xs text-stone-300 flex items-start gap-2">
                  <span className="text-[#76B900] mt-0.5">‣</span>{a}
                </div>
              ))}
            </div>
          </div>
          {/* Step 3 */}
          <div className="rounded-2xl p-8 border-2 border-[#76B900] shadow-sm" style={{background:'#76B900'}}>
            <div className="text-6xl font-black text-[#5a9000]">03</div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl mt-4">✅</div>
            <div className="text-xl font-bold text-white mt-4">You approve. They submit.</div>
            <div className="text-white/80 text-sm leading-relaxed mt-2">Review your AI-drafted proposal. One click to approve. Agents send it, book your calendar, and keep watching for new opportunities.</div>
            <div className="mt-4 px-3 py-2 bg-white/20 rounded-lg text-xs text-white font-semibold">🛡️ Sovereign differentiator — AI works, you control</div>
          </div>
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

      {/* ALLMYAI ECOSYSTEM */}
      <section className="py-20 px-6 bg-[#1A1A1A]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs text-[#76B900] uppercase tracking-widest font-medium mb-3">THE ECOSYSTEM</p>
            <h2 className="text-4xl font-bold text-white">Part of AllMyAI</h2>
            <p className="text-stone-400 mt-3 max-w-xl mx-auto">CivicPath is one product in a suite of AI tools built for professionals who move fast and think deep.</p>
            <a href="https://allmyai.ai" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-4 text-sm text-[#76B900] hover:underline font-semibold">Visit AllMyAI.ai →</a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* CivicPath */}
            <div className="bg-[#232323] border-2 border-[#76B900] rounded-2xl p-7 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-2.5 bg-[#76B900] rounded-full"></span>
                <span className="text-xs font-bold text-[#76B900] uppercase tracking-widest">Current Product</span>
              </div>
              <div className="text-2xl font-black text-white mb-2">CivicPath</div>
              <div className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-3">The 6-Agent Grant Engine</div>
              <p className="text-stone-400 text-sm leading-relaxed flex-1">6 AI agents find, score, draft, and submit grants automatically. You just approve. The sovereign grant pipeline built for communities and organizations.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Hunter','Matchmaker','Drafter','Controller','Submitter','Watcher'].map(a => (
                  <span key={a} className="text-[10px] font-bold bg-[#76B900]/10 text-[#76B900] px-2 py-0.5 rounded-full">{a}</span>
                ))}
              </div>
            </div>
            {/* Ask MyLalla */}
            <div className="bg-[#232323] border border-[#333333] rounded-2xl p-7 flex flex-col hover:border-[#76B900] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-2.5 bg-purple-400 rounded-full"></span>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-widest">In App Now</span>
              </div>
              <div className="text-2xl font-black text-white mb-2">Ask MyLalla</div>
              <div className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-3">Your Deep AI Grant Advisor</div>
              <p className="text-stone-400 text-sm leading-relaxed flex-1">Like talking to a senior grant advisor who knows you. Research grants in depth, explain strategy, plan your approach. Full conversation — not just commands.</p>
              <div className="mt-5 p-3 bg-[#1A1A1A] rounded-xl border border-[#333333]">
                <div className="text-[10px] text-stone-500 mb-2">Example conversation:</div>
                <div className="text-xs text-stone-300">“Which NSF grants are best for an AI startup in Miami with 3 employees?”</div>
                <div className="text-xs text-purple-400 mt-2">“Based on your profile, I’d focus on NSF SBIR Phase I — here’s why...”</div>
              </div>
            </div>
            {/* Omninor */}
            <div className="bg-[#232323] border border-[#333333] rounded-2xl p-7 flex flex-col hover:border-[#76B900] transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-2.5 h-2.5 bg-blue-400 rounded-full"></span>
                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Coming Soon</span>
              </div>
              <div className="text-2xl font-black text-white mb-2">Omninor</div>
              <div className="text-xs text-stone-400 font-semibold uppercase tracking-wider mb-3">The AI Command Bar</div>
              <p className="text-stone-400 text-sm leading-relaxed flex-1">Superhuman for grant operations. Hit ⌘K anywhere. Type what you need. Done in 2 seconds. Omninor guides every action — like having an AI co-pilot watching your every move.</p>
              <div className="mt-5 p-3 bg-[#1A1A1A] rounded-xl border border-[#333333]">
                <div className="text-[10px] text-stone-500 mb-2">⌘K command bar:</div>
                <div className="flex items-center gap-2 bg-[#2A2A2A] px-3 py-2 rounded-lg">
                  <span className="text-stone-400 text-xs">⌘K</span>
                  <span className="text-xs text-white">draft proposal for SBIR Phase I</span>
                  <span className="ml-auto text-[10px] text-blue-400">Enter →</span>
                </div>
              </div>
            </div>
          </div>
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
        <p className="mt-6 text-stone-500 text-xl max-w-xl mx-auto">Connect to thousands of real federal and state grants. Let AI find the ones that fit you.</p>
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
