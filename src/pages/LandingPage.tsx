import { useNavigate } from 'react-router-dom';
import { Hexagon, ArrowUpRight, Shield, CheckCircle2, Heart, Users, DollarSign, Star, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-white font-sans text-[#1A1A1A]">

      {/* NAV */}
      <nav className="border-b border-gray-100 sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Logo />
            <span className="text-base font-bold tracking-tight">CivicPath</span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm text-gray-500 font-medium">
            <a href="#how" className="hover:text-[#1A1A1A] transition-colors">How it works</a>
            <a href="#funders" className="hover:text-[#1A1A1A] transition-colors">For Funders</a>
            <a href="#testimonials" className="hover:text-[#1A1A1A] transition-colors">Stories</a>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/login?role=seeker')} className="text-sm font-medium text-gray-600 hover:text-[#1A1A1A] transition-colors px-3 py-1.5">Log in</button>
            <button onClick={() => navigate('/login?role=seeker')} className="text-sm font-semibold bg-[#1A1A1A] text-white px-4 py-2 rounded-lg hover:bg-black transition-colors">Get CivicPath free</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center space-x-2 border border-gray-200 rounded-full px-3 py-1 mb-10 text-xs font-medium text-gray-500">
          <span className="w-1.5 h-1.5 bg-[#2E7D32] rounded-full"></span>
          <span>The AI grant marketplace — powered by Gemini</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-[900] text-[#1A1A1A] mb-6 leading-[1.05] tracking-tight">
          Find The Grant<br />
          <span className="text-[#2E7D32]">That Gets You.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          AI matches your mission to the right funder — like eHarmony, but for grants.
          Two-sided. Sovereign. Fully automated.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => navigate('/login?role=seeker')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold rounded-lg transition-all shadow-sm"
          >
            <Heart className="w-4 h-4 fill-current" />
            I'm Looking For Grants
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/login?role=funder')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-[#1A1A1A] font-semibold rounded-lg hover:bg-gray-50 transition-all"
          >
            <DollarSign className="w-4 h-4" />
            I'm a Grant Funder
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-4">Free to get started · No credit card required</p>
      </section>

      {/* DIVIDER */}
      <div className="border-t border-gray-100 max-w-6xl mx-auto" />

      {/* STATS */}
      <section className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-[900] text-[#1A1A1A] mb-1">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* DIVIDER */}
      <div className="border-t border-gray-100 max-w-6xl mx-auto" />

      {/* HOW IT WORKS */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-14">
          <p className="text-xs font-semibold text-[#2E7D32] uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl font-[900] text-[#1A1A1A] max-w-lg leading-tight">From profile to funded in days, not months.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={i} className="group">
              <div className="text-xs font-bold text-gray-300 mb-4 font-mono">{s.n}</div>
              <h3 className="text-base font-bold text-[#1A1A1A] mb-2">{s.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* DIVIDER */}
      <div className="border-t border-gray-100 max-w-6xl mx-auto" />

      {/* MATCH PREVIEW */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row items-start justify-between gap-12">
          <div className="md:w-1/2">
            <p className="text-xs font-semibold text-[#2E7D32] uppercase tracking-widest mb-3">AI Matching</p>
            <h2 className="text-4xl font-[900] text-[#1A1A1A] leading-tight mb-4">Your compatibility score, explained.</h2>
            <p className="text-gray-500 leading-relaxed mb-6">Gemini AI scores every grant 0–100 based on mission alignment, location, focus area, and eligibility — then explains exactly why.</p>
            <button onClick={() => navigate('/login?role=seeker')} className="flex items-center gap-2 text-sm font-semibold text-[#2E7D32] hover:underline">
              See your matches <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="md:w-1/2 space-y-3">
            {[
              { score: 97, grant: 'Digital Equity Fund', funder: 'Miami Dade County', amount: '$100,000', heart: '❤️' },
              { score: 91, grant: 'MDEAT Black Business Grant', funder: 'MDEAT Office', amount: '$25,000', heart: '🧡' },
              { score: 84, grant: 'Safe in the 305 Grant', funder: 'Miami Dade County', amount: '$50,000', heart: '💚' },
            ].map((m, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{m.heart}</span>
                  <div>
                    <div className="text-sm font-bold text-[#1A1A1A]">{m.grant}</div>
                    <div className="text-xs text-gray-400">{m.funder}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#2E7D32]">{m.score}% match</div>
                  <div className="text-xs text-gray-400">{m.amount}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="border-t border-gray-100 max-w-6xl mx-auto" />

      {/* FOR FUNDERS */}
      <section id="funders" className="max-w-6xl mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="md:w-1/2 space-y-4">
            <p className="text-xs font-semibold text-[#2E7D32] uppercase tracking-widest">For Grant Funders</p>
            <h2 className="text-4xl font-[900] text-[#1A1A1A] leading-tight">Post once. Get matched to the right applicants automatically.</h2>
            <p className="text-gray-500 leading-relaxed">CivicPath's AI surfaces the highest-compatibility organizations for every grant you post. No more sifting through unqualified applications.</p>
            <button onClick={() => navigate('/login?role=funder')} className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors">
              Post a grant <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="md:w-1/2 grid grid-cols-2 gap-4">
            {[
              { icon: <Users className="w-5 h-5" />, title: '847 Seekers', desc: 'Verified organizations ready to apply' },
              { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Pre-screened', desc: 'AI checks eligibility before you see them' },
              { icon: <Heart className="w-5 h-5" />, title: 'Match scoring', desc: '0-100 compatibility for every applicant' },
              { icon: <Shield className="w-5 h-5" />, title: 'Sovereign', desc: 'Your data never leaves the platform' },
            ].map((f, i) => (
              <div key={i} className="p-4 border border-gray-100 rounded-xl">
                <div className="text-[#2E7D32] mb-2">{f.icon}</div>
                <div className="text-sm font-bold text-[#1A1A1A] mb-1">{f.title}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DIVIDER */}
      <div className="border-t border-gray-100 max-w-6xl mx-auto" />

      {/* TESTIMONIALS */}
      <section id="testimonials" className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-14">
          <p className="text-xs font-semibold text-[#2E7D32] uppercase tracking-widest mb-3">Stories</p>
          <h2 className="text-4xl font-[900] text-[#1A1A1A] leading-tight">Organizations getting funded.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <div key={i} className="border border-gray-100 rounded-2xl p-6 hover:border-gray-200 hover:shadow-sm transition-all">
              <div className="flex items-center space-x-1 mb-5">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 fill-[#2E7D32] text-[#2E7D32]" />)}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div>
                  <div className="font-semibold text-[#1A1A1A] text-sm">{t.name}</div>
                  <div className="text-xs text-gray-400">{t.org} · {t.location}</div>
                </div>
                <div className="text-right">
                  <div className="text-base font-[900] text-[#2E7D32]">{t.score}%</div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider">match</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className="text-5xl font-[900] text-[#1A1A1A] mb-4 leading-tight">Start finding grants today.</h2>
          <p className="text-gray-500 text-lg mb-10">Free to join. No credit card. Takes 2 minutes.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => navigate('/login?role=seeker')} className="px-8 py-3.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-semibold rounded-lg transition-all shadow-sm">
              Get started free
            </button>
            <button onClick={() => navigate('/login?role=funder')} className="px-8 py-3.5 bg-white border border-gray-200 text-[#1A1A1A] font-semibold rounded-lg hover:bg-gray-50 transition-all">
              Post a grant
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Logo />
            <span className="font-semibold text-sm">CivicPath</span>
            <span className="text-gray-400 text-sm">· Your community. Funded.</span>
          </div>
          <div className="flex items-center space-x-2 border border-gray-100 rounded-lg px-3 py-1.5">
            <Shield className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span className="text-xs text-gray-500"><span className="font-semibold text-[#1A1A1A]">Sovereign Infrastructure</span> · Data never leaves this platform · Hardware isolated</span>
          </div>
          <div className="text-xs text-gray-400">© 2026 CivicPath</div>
        </div>
      </footer>
    </div>
  );
}
