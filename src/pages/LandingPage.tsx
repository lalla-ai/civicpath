import { useNavigate } from 'react-router-dom';
import { Hexagon, ArrowUpRight, Shield, Heart, Users, DollarSign, Star, ArrowRight, Search, BrainCircuit, FileEdit, CheckCircle2, Send } from 'lucide-react';

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-9 h-9 text-[#2E7D32]">
    <Hexagon className="w-9 h-9 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

const GREEN = '#76B900'; // Nvidia green

const stats = [
  { value: '1,247', label: 'Grants Matched' },
  { value: '847', label: 'Organizations Funded' },
  { value: '$2.4M', label: 'Active Grant Value' },
  { value: '43', label: 'Active Funders' },
];

const steps = [
  { n: '01', title: 'Create Your Profile', desc: 'Tell us your mission, focus areas, and goals. Takes 2 minutes.' },
  { n: '02', title: 'AI Finds Your Matches', desc: 'Gemini AI scores every grant 0-100 based on mission alignment.' },
  { n: '03', title: 'Apply With One Click', desc: 'Our 6 AI agents draft, verify, and submit your proposal automatically.' },
  { n: '04', title: 'Get Funded', desc: 'Track your applications and receive award notifications in real time.' },
];

const testimonials = [
  {
    name: 'Maria Gonzalez',
    org: 'Roots & Wings Foundation',
    location: 'Miami, FL',
    score: 94,
    text: 'CivicPath matched us to the Digital Equity Fund in under 3 minutes. We applied the same day and received $85,000 in funding. This platform is unlike anything we have used before.',
  },
  {
    name: 'James Okafor',
    org: 'Tech for All Initiative',
    location: 'Orlando, FL',
    text: 'The AI drafted our entire NSF SBIR proposal overnight. The Controller agent caught two compliance issues we would have missed. We won $200,000.',
    score: 91,
  },
  {
    name: 'Sofia Rivera',
    org: 'Miami Arts Collective',
    location: 'Miami Dade, FL',
    text: 'We had never won a grant before. CivicPath matched us to the Cultural Affairs Grant and walked us through every step. Funded in 6 weeks.',
    score: 88,
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  void GREEN; // used inline

  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans text-[#1A1A1A]">

      {/* NAV */}
      <nav className="border-b border-stone-200 sticky top-0 z-20 bg-[#F9F7F2]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative inline-flex items-center justify-center w-8 h-8" style={{color: '#76B900'}}>
              <Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} />
              <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
            </div>
            <span className="text-base font-bold tracking-tight">CivicPath</span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm text-stone-500 font-medium">
            <a href="#how" className="hover:text-[#1A1A1A] transition-colors">How it works</a>
            <a href="#funders" className="hover:text-[#1A1A1A] transition-colors">For Funders</a>
            <a href="#testimonials" className="hover:text-[#1A1A1A] transition-colors">Stories</a>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/login?role=seeker')} className="text-sm font-medium text-stone-600 hover:text-[#1A1A1A] transition-colors px-3 py-1.5">Log in</button>
            <button onClick={() => navigate('/login?role=seeker')} className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors" style={{background: '#76B900'}}>Get CivicPath free</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 border border-stone-200 bg-white rounded-full px-3 py-1 mb-10 text-xs font-medium text-stone-500 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full" style={{background:'#76B900'}}></span>
          The AI grant marketplace — powered by Gemini
        </div>
        <h1 className="text-6xl md:text-8xl font-[900] text-[#1A1A1A] mb-6 leading-[1.0] tracking-tighter">
          Find The Grant<br />
          <span style={{color:'#76B900'}}>That Gets You.</span>
        </h1>
        <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Like eHarmony, but for grants. AI matches your mission to the right funder —
          two-sided, sovereign, fully automated.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={() => navigate('/login?role=seeker')}
            className="flex items-center gap-2 px-7 py-3.5 text-white font-bold rounded-xl transition-all shadow-md text-sm"
            style={{background:'#76B900'}}>
            <Heart className="w-4 h-4 fill-current" /> I'm Looking For Grants <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/login?role=funder')}
            className="flex items-center gap-2 px-7 py-3.5 bg-white border border-stone-200 text-[#1A1A1A] font-bold rounded-xl hover:bg-stone-50 transition-all shadow-sm text-sm">
            <DollarSign className="w-4 h-4" /> I'm a Grant Funder
          </button>
        </div>
        <p className="text-xs text-stone-400 mt-4">Free to get started · No credit card required</p>
      </section>

      {/* STATS */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 text-center border border-stone-200 shadow-sm">
              <div className="text-3xl font-[900] text-[#1A1A1A] mb-1">{s.value}</div>
              <div className="text-xs text-stone-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BENTO GRID — FEATURES */}
      <section id="how" className="max-w-5xl mx-auto px-6 pb-16">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:'#76B900'}}>How it works</p>
          <h2 className="text-4xl font-[900] text-[#1A1A1A] leading-tight">From profile to funded in days, not months.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Large card */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-sm row-span-2 flex flex-col justify-between min-h-[280px]">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">AI Matching · New</p>
              <h3 className="text-2xl font-[900] text-[#1A1A1A] mb-3 leading-tight">Your compatibility score, explained.</h3>
              <p className="text-sm text-stone-500 leading-relaxed">Gemini AI scores every grant 0–100 based on mission alignment, location, and eligibility. Like eHarmony compatibility — but for funding.</p>
            </div>
            <div className="mt-6 space-y-2">
              {[
                { score: 97, grant: 'Digital Equity Fund', heart: '❤️', amount: '$100K' },
                { score: 91, grant: 'MDEAT Black Business', heart: '🧡', amount: '$25K' },
                { score: 84, grant: 'Safe in the 305', heart: '💚', amount: '$50K' },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl text-sm">
                  <span className="flex items-center gap-2">{m.heart} <span className="font-semibold text-[#1A1A1A]">{m.grant}</span></span>
                  <span className="font-bold" style={{color:'#76B900'}}>{m.score}%</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/login?role=seeker')} className="mt-6 w-8 h-8 rounded-full flex items-center justify-center text-white" style={{background:'#76B900'}}>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Top right */}
          <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-stone-800 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">6 AI Agents</p>
              <h3 className="text-xl font-[900] text-white mb-2 leading-tight">Your automated grant department, 24/7.</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              {[
                { icon: <Search className="w-4 h-4" />, label: 'Hunter' },
                { icon: <BrainCircuit className="w-4 h-4" />, label: 'Matcher' },
                { icon: <FileEdit className="w-4 h-4" />, label: 'Drafter' },
                { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Verifier' },
                { icon: <Send className="w-4 h-4" />, label: 'Submitter' },
                { icon: <Shield className="w-4 h-4" />, label: 'Watcher' },
              ].map((a, i) => (
                <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/10">
                  <span style={{color:'#76B900'}}>{a.icon}</span>
                  <span className="text-[10px] text-stone-400 font-medium">{a.label}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate('/login?role=seeker')} className="mt-5 w-8 h-8 rounded-full flex items-center justify-center text-[#1A1A1A] bg-white">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom right */}
          <div className="rounded-2xl p-8 border border-stone-200 shadow-sm flex flex-col justify-between" style={{background:'#76B900'}}>
            <div>
              <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-3">One Click Apply</p>
              <h3 className="text-xl font-[900] text-white leading-tight">AI drafts, verifies, and submits your proposal automatically.</h3>
            </div>
            <button onClick={() => navigate('/login?role=seeker')} className="mt-5 w-8 h-8 rounded-full bg-white flex items-center justify-center" style={{color:'#76B900'}}>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* FOR FUNDERS */}
      <section id="funders" className="max-w-5xl mx-auto px-6 pb-16">
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-10">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2">
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{color:'#76B900'}}>For Grant Funders</p>
              <h2 className="text-4xl font-[900] text-[#1A1A1A] leading-tight mb-4">Post once. Get matched to the right applicants.</h2>
              <p className="text-stone-500 text-sm leading-relaxed mb-6">CivicPath's AI surfaces the highest-compatibility organizations for every grant you post. No more sifting through unqualified applications.</p>
              <button onClick={() => navigate('/login?role=funder')}
                className="flex items-center gap-2 px-5 py-2.5 text-white text-sm font-bold rounded-xl transition-all"
                style={{background:'#76B900'}}>
                Post a grant <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <div className="md:w-1/2 grid grid-cols-2 gap-3">
              {[
                { icon: <Users className="w-5 h-5" />, title: '847 Seekers', desc: 'Verified orgs ready to apply' },
                { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Pre-screened', desc: 'AI checks eligibility first' },
                { icon: <Heart className="w-5 h-5" />, title: 'Match scoring', desc: '0-100 per applicant' },
                { icon: <Shield className="w-5 h-5" />, title: 'Sovereign', desc: 'Data never leaves platform' },
              ].map((f, i) => (
                <div key={i} className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="mb-2" style={{color:'#76B900'}}>{f.icon}</div>
                  <div className="text-sm font-bold text-[#1A1A1A] mb-0.5">{f.title}</div>
                  <div className="text-xs text-stone-500">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="max-w-5xl mx-auto px-6 pb-16">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{color:'#76B900'}}>Stories</p>
          <h2 className="text-4xl font-[900] text-[#1A1A1A] leading-tight">Organizations getting funded.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center gap-0.5 mb-4">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5" style={{fill:'#76B900', color:'#76B900'}} />)}
              </div>
              <p className="text-stone-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center justify-between pt-4 border-t border-stone-100">
                <div>
                  <div className="font-bold text-[#1A1A1A] text-sm">{t.name}</div>
                  <div className="text-xs text-stone-400">{t.org} · {t.location}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-[900]" style={{color:'#76B900'}}>{t.score}%</div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">match</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="rounded-2xl p-12 text-center" style={{background:'#76B900'}}>
          <h2 className="text-5xl font-[900] text-white mb-3 leading-tight">Start finding grants today.</h2>
          <p className="text-white/80 text-lg mb-8">Free to join. No credit card. Takes 2 minutes.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate('/login?role=seeker')}
              className="px-8 py-3.5 bg-white font-bold rounded-xl transition-all shadow-sm text-sm"
              style={{color:'#76B900'}}>
              Get started free
            </button>
            <button onClick={() => navigate('/login?role=funder')}
              className="px-8 py-3.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl transition-all text-sm">
              Post a grant
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-stone-200 py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="relative inline-flex items-center justify-center w-7 h-7" style={{color:'#76B900'}}>
              <Hexagon className="w-7 h-7 absolute" strokeWidth={2.5} />
              <ArrowUpRight className="w-3.5 h-3.5 absolute" strokeWidth={3} />
            </div>
            <span className="font-bold text-sm">CivicPath</span>
            <span className="text-stone-400 text-sm">· Your community. Funded.</span>
          </div>
          <div className="flex items-center gap-2 border border-stone-200 bg-white rounded-lg px-3 py-1.5">
            <Shield className="w-3.5 h-3.5" style={{color:'#76B900'}} />
            <span className="text-xs text-stone-500"><span className="font-semibold text-[#1A1A1A]">Sovereign Infrastructure</span> · Data never leaves this platform · Hardware isolated</span>
          </div>
          <div className="text-xs text-stone-400">© 2026 CivicPath</div>
        </div>
      </footer>
    </div>
  );
}
