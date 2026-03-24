import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Send, Loader2, Sparkles, ExternalLink,
  Search, BookOpen, ShieldCheck, Copy, Check,
  ArrowRight, Zap,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  followUps?: string[];
  modelTier?: string;
  queryType?: string;
  timestamp: number;
}

interface Source {
  title: string;
  agency: string;
  deadline: string;
  url: string;
  type: string;
}

// ── Suggested prompts ──────────────────────────────────────────────────────────

const SUGGESTED = [
  { icon: '🔍', text: 'Find NSF grants for AI startups under $500K' },
  { icon: '📋', text: 'What SBIR Phase I requirements do I need to know?' },
  { icon: '🏛️', text: 'Best federal grants for nonprofit education orgs in Florida' },
  { icon: '💡', text: 'How do I write a winning executive summary for NSF?' },
  { icon: '📅', text: 'What grants are closing in the next 30 days for health tech?' },
  { icon: '🤝', text: 'Explain the difference between grants and cooperative agreements' },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MyLallaPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  const handleSubmit = async (query?: string) => {
    const text = (query ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/sovereign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mylalla-research',
          query: text,
          sessionId,
        }),
      });

      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || data.error || 'Sorry, I could not generate a response. Please try again.',
        sources: data.sources || [],
        followUps: data.followUps || [],
        modelTier: data.modelTier,
        queryType: data.queryType,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const modelColor = (tier?: string) => {
    if (!tier) return 'text-stone-500';
    if (tier.includes('Nemotron')) return 'text-green-400';
    if (tier.includes('Gemini')) return 'text-blue-400';
    return 'text-purple-400';
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white flex flex-col" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <header className="border-b border-white/8 bg-[#0A0A0B]/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-[#76B900] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight">MyLalla</span>
              <span className="text-white/30 text-xs ml-2 font-mono">AI Grant Advisor</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-[10px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Nemotron-3-Super
            </span>
            <Link
              to="/seeker"
              className="text-xs font-bold text-white/50 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20"
            >
              CivicPath →
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-6 flex flex-col">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-12 gap-8">
            <div>
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/30 to-[#76B900]/30 border border-white/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-10 h-10 text-white/80" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
                Ask MyLalla anything<br />
                <span className="bg-gradient-to-r from-purple-400 to-[#76B900] bg-clip-text text-transparent">about grants.</span>
              </h1>
              <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
                Powered by Nemotron-3-Super · Live Grants.gov data · Sovereign AI
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {SUGGESTED.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(s.text)}
                  className="flex items-center gap-3 p-4 bg-white/5 border border-white/8 rounded-2xl hover:bg-white/10 hover:border-white/15 transition-all text-left group"
                >
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <span className="text-sm text-white/70 group-hover:text-white/90 transition-colors leading-snug">{s.text}</span>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-[#76B900] shrink-0 ml-auto transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-1 space-y-6 pb-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                {/* Assistant avatar */}
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-[#76B900] flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-3 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>

                  {/* Message bubble */}
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#76B900] text-[#111] font-medium rounded-br-sm'
                      : 'bg-white/8 border border-white/10 text-white/90 rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none prose-headings:text-white prose-headings:font-bold prose-p:text-white/85 prose-li:text-white/85 prose-strong:text-white prose-code:text-[#76B900] prose-code:bg-white/10 prose-code:px-1 prose-code:rounded">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>

                  {/* Sources */}
                  {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                    <div className="w-full space-y-2">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                        <Search className="w-3 h-3" /> Live sources from Grants.gov
                      </p>
                      <div className="space-y-2">
                        {msg.sources.map((src, i) => (
                          <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-start gap-3 p-3 bg-white/5 border border-white/8 rounded-xl hover:bg-white/10 hover:border-[#76B900]/30 transition-all group">
                            <div className="w-5 h-5 rounded bg-[#76B900]/20 flex items-center justify-center shrink-0 mt-0.5">
                              <BookOpen className="w-3 h-3 text-[#76B900]" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white/80 group-hover:text-white line-clamp-2">{src.title}</p>
                              <p className="text-[10px] text-white/40 mt-0.5">{src.agency} · Due: {src.deadline}</p>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-white/20 group-hover:text-[#76B900] shrink-0 mt-0.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-ups */}
                  {msg.role === 'assistant' && msg.followUps && msg.followUps.length > 0 && (
                    <div className="w-full space-y-2">
                      <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Suggested next questions</p>
                      <div className="flex flex-col gap-1.5">
                        {msg.followUps.map((q, i) => (
                          <button key={i} onClick={() => handleSubmit(q)}
                            className="text-left text-xs text-white/60 hover:text-white px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 rounded-xl transition-all flex items-center gap-2">
                            <Zap className="w-3 h-3 text-[#76B900] shrink-0" />
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta row */}
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-3 w-full">
                      {msg.modelTier && (
                        <span className={`text-[10px] font-mono ${modelColor(msg.modelTier)}`}>
                          ⬡ {msg.modelTier}
                        </span>
                      )}
                      <button onClick={() => handleCopy(msg.content, msg.id)}
                        className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors ml-auto">
                        {copied === msg.id ? <Check className="w-3 h-3 text-[#76B900]" /> : <Copy className="w-3 h-3" />}
                        {copied === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  )}
                </div>

                {/* User avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-[#76B900]/20 border border-[#76B900]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#76B900]">Y</span>
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-[#76B900] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#76B900] animate-spin" />
                  <span className="text-xs text-white/50">MyLalla is researching...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Input area */}
        <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[#0A0A0B] to-transparent">
          <div className="bg-white/8 border border-white/12 rounded-2xl overflow-hidden focus-within:border-[#76B900]/50 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ask MyLalla about grants, funding, compliance, or strategy..."
              rows={1}
              disabled={loading}
              className="w-full bg-transparent px-5 py-4 text-sm text-white placeholder:text-white/25 outline-none resize-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2 text-[10px] text-white/25">
                <ShieldCheck className="w-3 h-3" />
                <span>Sovereign · Zero data retention</span>
              </div>
              <button
                onClick={() => handleSubmit()}
                disabled={!input.trim() || loading}
                className="flex items-center gap-2 px-4 py-2 bg-[#76B900] text-[#111] font-bold rounded-xl hover:bg-[#689900] transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Research
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/20 mt-2">
            MyLalla · Powered by Nemotron-3-Super-120B · Live Grants.gov · <a href="/privacy" className="hover:text-white/40">Privacy</a>
          </p>
        </div>

      </main>
    </div>
  );
}
