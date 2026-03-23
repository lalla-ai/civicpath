import { useNavigate } from 'react-router-dom';
import { Hexagon, ArrowUpRight, Shield, CheckCircle2, Zap, Heart, Users, DollarSign, Star } from 'lucide-react';

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-9 h-9 text-[#2E7D32]">
    <Hexagon className="w-9 h-9 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

const stats = [
  { value: '1,247', label: 'Grants Matched', icon: <Heart className="w-5 h-5" /> },
  { value: '847', label: 'Organizations Funded', icon: <CheckCircle2 className="w-5 h-5" /> },
  { value: '$2.4M', label: 'Active Grant Value', icon: <DollarSign className="w-5 h-5" /> },
  { value: '43', label: 'Active Funders', icon: <Users className="w-5 h-5" /> },
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

  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans text-stone-900">
      {/* NAV */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Logo />
            <span className="text-xl font-[800] tracking-tight">CivicPath</span>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/login?role=seeker')} className="text-sm font-bold text-stone-600 hover:text-[#2E7D32] transition-colors px-4 py-2">Sign In</button>
            <button onClick={() => navigate('/login?role=seeker')} className="text-sm font-bold bg-[#2E7D32] text-white px-5 py-2 rounded-xl hover:bg-[#1B5E20] transition-colors shadow-sm">Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center space-x-2 bg-[#2E7D32]/10 border border-[#2E7D32]/20 rounded-full px-4 py-1.5 mb-8">
          <Zap className="w-3.5 h-3.5 text-[#2E7D32]" />
          <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-wider">Powered by Gemini AI</span>
        </div>
        <h1 className="text-6xl md:text-7xl font-[900] text-stone-900 mb-6 leading-[1.05] tracking-tight">
          Find The Grant<br />
          <span className="text-[#2E7D32]">That Gets You</span>
        </h1>
        <p className="text-xl text-stone-500 max-w-2xl mx-auto mb-12 leading-relaxed">
          AI matches your mission to the right funder — every time.
          Like eHarmony, but for grants. Two-sided. Sovereign. Automated.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('/login?role=seeker')}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98]"
          >
            <Heart className="w-5 h-5 fill-current" />
            I Am Looking For Grants
          </button>
          <button
            onClick={() => navigate('/login?role=funder')}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 bg-white border-2 border-[#2E7D32] text-[#2E7D32] font-bold text-lg rounded-2xl shadow-sm hover:bg-[#2E7D32]/5 transition-all active:scale-[0.98]"
          >
            <DollarSign className="w-5 h-5" />
            I Am A Grant Funder
          </button>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="bg-[#2E7D32] py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center text-white">
                <div className="flex justify-center mb-2 opacity-80">{s.icon}</div>
                <div className="text-3xl font-[900] mb-1">{s.value}</div>
                <div className="text-sm font-medium opacity-80">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-[900] text-stone-900 mb-4">How CivicPath Works</h2>
          <p className="text-stone-500 text-lg max-w-xl mx-auto">From profile to funded in days, not months.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="text-4xl font-[900] text-[#2E7D32]/20 mb-4">{s.n}</div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">{s.title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MATCH PREVIEW */}
      <section className="bg-[#E8F5E9] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-[900] text-stone-900 mb-3">Your Match Score</h2>
            <p className="text-stone-600">Gemini AI analyzes your mission and scores every grant 0 to 100.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { score: 97, grant: 'Digital Equity Fund', amount: '$100K', match: 'Perfect Match' },
              { score: 91, grant: 'MDEAT Black Business Grant', amount: '$25K', match: 'Strong Match' },
              { score: 84, grant: 'Safe in the 305 Grant', amount: '$50K', match: 'Good Match' },
            ].map((m, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm w-64 flex flex-col items-center text-center hover:shadow-md transition-all">
                <div className={`text-4xl mb-2`}>{m.score >= 94 ? '❤️' : m.score >= 80 ? '🧡' : '💚'}</div>
                <div className="text-3xl font-[900] text-[#2E7D32] mb-1">{m.score}%</div>
                <div className="text-sm font-bold text-stone-800 mb-1">{m.grant}</div>
                <div className="text-xs font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-0.5 rounded-full mb-2">{m.amount}</div>
                <div className="text-xs text-stone-500">{m.match}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-[900] text-stone-900 mb-4">Organizations Getting Funded</h2>
          <p className="text-stone-500 text-lg">Real results from real communities.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
              <div className="flex items-center space-x-1 mb-4">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-[#2E7D32] text-[#2E7D32]" />)}
              </div>
              <p className="text-stone-600 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-900 text-sm">{t.name}</div>
                  <div className="text-xs text-stone-500">{t.org} · {t.location}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-[900] text-[#2E7D32]">{t.score}%</div>
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">match</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-stone-900 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl font-[900] text-white mb-4">Ready to Get Funded?</h2>
          <p className="text-stone-400 text-lg mb-10">Join 847 organizations already using CivicPath.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/login?role=seeker')} className="w-full sm:w-auto px-8 py-4 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-lg rounded-2xl shadow-lg transition-all">
              Start Finding Grants
            </button>
            <button onClick={() => navigate('/login?role=funder')} className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-lg rounded-2xl transition-all">
              Post a Grant
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-white border-t border-stone-200 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Logo />
            <span className="font-bold text-stone-700">CivicPath</span>
            <span className="text-stone-400 text-sm">· Your community. Funded.</span>
          </div>
          <div className="flex items-center space-x-2 border border-[#2E7D32]/30 bg-[#2E7D32]/5 rounded-xl px-4 py-2">
            <Shield className="w-4 h-4 text-[#2E7D32]" />
            <div className="text-xs">
              <div className="font-bold text-[#2E7D32]">Sovereign Infrastructure</div>
              <div className="text-stone-500">Your data never leaves this platform · Hardware isolated · Built for government</div>
            </div>
          </div>
          <div className="text-xs text-stone-400">© 2026 CivicPath. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
