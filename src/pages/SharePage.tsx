import { Link, useSearchParams } from 'react-router-dom';
import { Hexagon, ArrowUpRight, Trophy, ExternalLink } from 'lucide-react';

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-8 h-8 text-[#76B900]">
    <Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

export default function SharePage() {
  const [params] = useSearchParams();
  const org = params.get('org') || 'An organization';
  const count = params.get('count') || '3';
  const score = params.get('score') || '92';
  const location = params.get('loc') || 'Florida';

  const tweetText = `Just found ${count} grants for ${org} in under 60 seconds using @CivicPathAI 🤖\n\nFully agentic — AI wrote the proposal. I just approved.\n\nTry it free → grant-scout-ui.vercel.app\n\n#Grants #AI #Nonprofit`;

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Share card */}
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-lg mb-6">
          {/* Dark header */}
          <div className="bg-[#111111] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-white font-bold">CivicPath</span>
            </div>
            <span className="text-[#76B900] text-xs font-bold uppercase tracking-wider">AI Grant Engine</span>
          </div>

          {/* Result */}
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-[#76B900]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-[#76B900]" />
            </div>
            <h1 className="text-2xl font-black text-stone-900 mb-1">{org}</h1>
            <p className="text-stone-400 text-sm mb-6">{location}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#F9F7F2] rounded-xl p-4">
                <div className="text-3xl font-black text-[#76B900]">{count}</div>
                <div className="text-xs text-stone-400 mt-1 font-medium">Grants Found</div>
              </div>
              <div className="bg-[#F9F7F2] rounded-xl p-4">
                <div className="text-3xl font-black text-stone-900">{score}</div>
                <div className="text-xs text-stone-400 mt-1 font-medium">Top Score</div>
              </div>
              <div className="bg-[#F9F7F2] rounded-xl p-4">
                <div className="text-3xl font-black text-stone-900">60s</div>
                <div className="text-xs text-stone-400 mt-1 font-medium">Time Taken</div>
              </div>
            </div>

            <p className="text-stone-500 text-sm">
              6 AI agents found, scored, and drafted a grant proposal — automatically.
            </p>
          </div>

          {/* CTA */}
          <div className="px-8 pb-8 flex flex-col gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
              target="_blank" rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-[#111111] text-white font-bold py-3 rounded-xl hover:bg-[#222] transition-colors text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Share on X (Twitter)
            </a>
            <Link to="/login?role=seeker"
              className="w-full flex items-center justify-center gap-2 bg-[#76B900] text-[#111] font-bold py-3 rounded-xl hover:bg-[#689900] transition-colors text-sm">
              Find My Grants Free → <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400">Powered by CivicPath · 6 AI agents · Gemini 2.0 Flash · Google Cloud ADK Finalist 2026</p>
      </div>
    </div>
  );
}
