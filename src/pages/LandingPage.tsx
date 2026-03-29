import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Hexagon, ArrowUpRight, Sparkles, ShieldCheck, Zap, Leaf } from 'lucide-react';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-8 h-8 text-[#76B900]">
    <Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'CivicPath — Your Mission, Amplified by Sovereign AI';
    
    // Inject fonts for the new editorial look
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
          prompt: `You are MyLalla, a prestigious grant advisor for CivicPath. A visitor asked: "${q}"\n\nGive a warm, helpful 2-3 sentence answer. Be specific, data-driven, and end with a call to action.`,
          useSearch: true,
        }),
      });
      const data = await res.json();
      setHeroAnswer(data.text || 'Your mission deserves the best funding. Sign up to match in 60 seconds.');
    } catch {
      setHeroAnswer("I'd love to help! Sign up for free to get your personalized grant match list — we'll find the best funding for your organization in under 60 seconds.");
    } finally {
      setHeroLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1C1917] selection:bg-[#76B900]/20" style={{fontFamily:'"Inter", sans-serif'}}>
      
      {/* ── BACKGROUND AURA ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#76B900]/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-amber-100/30 blur-[100px] rounded-full" />
      </div>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-[#FDFCFB]/80 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <Logo />
            <span className="text-stone-900 font-extrabold text-xl tracking-tight">CivicPath</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-stone-500 uppercase tracking-wider">
            <LanguageSwitcher />
            <a href="#how" className="hover:text-stone-900 transition-colors">Methodology</a>
            <Link to="/login?role=seeker" className="hover:text-stone-900 transition-colors">The Hunter</Link>
            <Link to="/pricing" className="hover:text-stone-900 transition-colors">Pricing</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-stone-500 hover:text-stone-900 transition-colors">Login</Link>
            <Link to="/login?role=seeker" className="bg-[#1C1917] text-[#76B900] font-bold px-5 py-2.5 rounded-full hover:bg-stone-800 transition-all text-sm shadow-lg shadow-stone-200">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <main className="relative z-10">
        <section className="pt-24 pb-20 px-6 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-stone-100 text-stone-600 rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] mb-8 border border-stone-200">
            <Sparkles className="w-3 h-3 text-[#76B900]" /> Google Cloud ADK Hackathon Finalist
          </div>
          
          <h1 className="text-6xl sm:text-7xl md:text-8xl font-normal leading-[0.95] tracking-tight text-stone-900 mb-8" style={{fontFamily:'"Instrument Serif", serif'}}>
            Your Mission,<br />
            <span className="italic">Amplified by</span> <span className="text-[#76B900]">Sovereign AI.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-stone-500 leading-relaxed mb-12 font-medium">
            CivicPath replaces manual grant management with an 8-agent AI Operating System. From discovery through cryptographic closeout—we handle the complexity so you can focus on the impact.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/login?role=seeker" className="group bg-[#76B900] text-[#1C1917] font-black px-10 py-4 rounded-full hover:bg-[#86d200] transition-all shadow-xl shadow-[#76B900]/20 text-lg flex items-center gap-2">
              Find My Grants <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </Link>
            <Link to="/mylalla" className="text-stone-900 font-bold px-8 py-4 rounded-full border-2 border-stone-100 hover:bg-stone-50 transition-all text-lg bg-white">
              Meet MyLalla AI
            </Link>
          </div>

          {/* AI SEARCH BAR — GLASSMORPHISM */}
          <div className="mt-16 max-w-3xl mx-auto relative group">
            <div className="absolute inset-0 bg-[#76B900]/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
            <div className="relative bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-2 shadow-2xl overflow-hidden shadow-stone-200/50">
              <form onSubmit={handleHeroAsk} className="flex gap-2">
                <input
                  type="text"
                  value={heroQuery}
                  onChange={e => setHeroQuery(e.target.value)}
                  placeholder="Ask our Research Agent: What federal grants support AI innovation in Miami?"
                  className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-stone-800 placeholder:text-stone-400 font-medium text-lg"
                />
                <button type="submit" disabled={heroLoading} className="bg-[#1C1917] text-white px-8 rounded-2xl font-bold hover:bg-stone-800 transition-all flex items-center gap-2">
                  {heroLoading ? 'Thinking...' : 'Consult'}
                </button>
              </form>
              {heroAnswer && (
                <div className="p-6 text-left border-t border-stone-100 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-[#76B900] rounded-full animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Response from MyLalla (GKE Boundary)</span>
                  </div>
                  <p className="text-stone-700 leading-relaxed text-lg font-serif italic">"{heroAnswer}"</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── THE SOUL SECTION (TECHNO-NATURALISM) ── */}
        <section id="how" className="py-24 bg-stone-50 border-y border-stone-100 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-normal leading-[1.1] mb-6 text-stone-900" style={{fontFamily:'"Instrument Serif", serif'}}>
                The Trust Layer for the<br /><span className="text-[#76B900]">Grant Economy.</span>
              </h2>
              <p className="text-stone-500 text-lg mb-10 leading-relaxed">
                As AI proposals flood funder inboxes, trust is the new currency. CivicPath uses **0G Labs Blockchain** and **Google KMS** to provide cryptographic proof of your organization’s identity and data integrity.
              </p>
              <div className="space-y-6">
                {[
                  { title: 'Sovereign Closeout', desc: 'Agent 8 executes a 500ms purge of session data, satisfying GDPR Art.17 instantly.', icon: <Leaf className="w-5 h-5" /> },
                  { title: '0G Merkle Anchoring', desc: 'Every application is anchored to the 0G DA layer, creating an immutable audit trail.', icon: <ShieldCheck className="w-5 h-5" /> },
                  { title: 'TEE Boundary', desc: 'Your data never leaves the Confidential GKE boundary during AI inference.', icon: <Zap className="w-5 h-5" /> }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#76B900]/10 flex items-center justify-center text-[#76B900] shrink-0">{item.icon}</div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm mb-1">{item.title}</h4>
                      <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/5] bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden p-8 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#76B900] w-[65%]" />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-stone-400">
                    <span>Integrity Score</span>
                    <span>94.2% Verified</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 py-12">
                   <div className="w-20 h-20 bg-stone-900 rounded-2xl flex items-center justify-center text-[#76B900] shadow-xl animate-bounce">
                     <ShieldCheck className="w-10 h-10" />
                   </div>
                   <h3 className="text-2xl font-serif italic text-stone-900">"Your profile is now<br />0G-Anchored."</h3>
                </div>
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                  <p className="text-[10px] font-mono text-stone-400 break-all leading-tight">
                    Merkle Root: 0x5f3a7c9d2e4f6a8b1c3d5e7f9a0b2c4d6e8f0a1b2c3d4e5f6a7b8c9d0e1f2a3b
                  </p>
                </div>
              </div>
              {/* Floating Leaf Decoration */}
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#76B900]/5 blur-3xl rounded-full" />
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-20 bg-white border-t border-stone-100">
          <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-xs">
               <div className="flex items-center gap-2 mb-6">
                <Logo />
                <span className="text-stone-900 font-extrabold text-xl">CivicPath</span>
              </div>
              <p className="text-stone-400 text-sm leading-relaxed">
                The world’s first 8-agent AI operating system for the complete grant lifecycle. Built in Florida, available globally.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
               <div>
                 <h5 className="font-black text-[11px] uppercase tracking-[0.2em] text-stone-900 mb-6">Architecture</h5>
                 <ul className="space-y-4 text-sm font-medium text-stone-400">
                   <li><Link to="/login" className="hover:text-stone-900 transition-colors">The Hunter</Link></li>
                   <li><Link to="/login" className="hover:text-stone-900 transition-colors">The Drafter</Link></li>
                   <li><Link to="/login" className="hover:text-stone-900 transition-colors">Sovereign Purge</Link></li>
                 </ul>
               </div>
               <div>
                 <h5 className="font-black text-[11px] uppercase tracking-[0.2em] text-stone-900 mb-6">Company</h5>
                 <ul className="space-y-4 text-sm font-medium text-stone-400">
                   <li><Link to="/pricing" className="hover:text-stone-900 transition-colors">Ethics Protocol</Link></li>
                   <li><a href="https://helloagentic.ai" className="hover:text-stone-900 transition-colors">HelloAgentic</a></li>
                   <li><a href="mailto:hello@civicpath.ai" className="hover:text-stone-900 transition-colors">Press Kit</a></li>
                 </ul>
               </div>
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-6 mt-20 pt-8 border-t border-stone-100 flex flex-col md:flex-row justify-between text-[11px] font-black uppercase tracking-widest text-stone-400">
            <p>© 2026 CivicPath — Built for the Google ADK Hackathon</p>
            <div className="flex gap-6 mt-4 md:mt-0">
               <Link to="/privacy" className="hover:text-stone-900 transition-colors">Privacy</Link>
               <Link to="/terms" className="hover:text-stone-900 transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
