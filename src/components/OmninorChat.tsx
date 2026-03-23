import { useState, useRef, useEffect } from 'react';
import { generateText } from '../gemini';
import ReactMarkdown from 'react-markdown';

interface Message { role: 'user' | 'assistant'; content: string; }

const SYSTEM = `You are Omninor, CivicPath's AI assistant. You are helpful, concise, and warm.
CivicPath is an AI-powered grant discovery platform with 6 autonomous agents (Hunter, Matchmaker, Drafter, Controller, Submitter, Watcher) that find, score, draft, and submit grant proposals automatically.

Help users with:
- How the platform works
- Pricing (free to start, Pro plan for full pipeline automation)
- Grant sources (Grants.gov, SBA SBIR, NSF, NIH, Florida grants)
- How to set up their profile
- How the 6 agents work
- How to get their first grant match
- Technical issues or questions

Keep answers under 120 words. Be direct and encouraging.`;

export default function OmninorChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    const next: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const history = next.slice(0, -1).map(m =>
        `${m.role === 'user' ? 'User' : 'Omninor'}: ${m.content}`
      ).join('\n');
      const prompt = `${SYSTEM}\n\n${history ? `Conversation:\n${history}\n\n` : ''}User: ${text}\nOmninor:`;
      const reply = await generateText(prompt);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having a connection issue. Try again in a moment!" }]);
    } finally {
      setLoading(false);
    }
  };

  const starters = [
    'How do the 6 agents work?',
    'How do I get my first grant match?',
    'What does the free plan include?',
    'Which grants are available in Florida?',
  ];

  return (
    <>
      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[360px] flex flex-col bg-[#111111] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden"
          style={{ height: '480px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#333] rounded flex items-center justify-center text-[10px] font-black text-white">⌘</div>
              <span className="font-bold text-white text-sm">Omninor</span>
              <span className="text-[9px] font-black text-[#76B900] bg-[#76B900]/10 px-1.5 py-0.5 rounded uppercase tracking-wider">AI Support</span>
            </div>
            <button onClick={() => setOpen(false)}
              className="text-stone-500 hover:text-stone-300 text-lg leading-none transition-colors">×</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3 h-full">
                <div className="mt-2">
                  <p className="text-white text-sm font-semibold">Hi! I'm Omninor ⌘</p>
                  <p className="text-stone-400 text-xs mt-1 leading-relaxed">Ask me anything about CivicPath — how it works, pricing, grants, or getting started.</p>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                  {starters.map(q => (
                    <button key={q} onClick={() => send(q)}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-[#333] text-stone-300 bg-[#1a1a1a] hover:border-[#76B900] hover:text-white transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="w-6 h-6 bg-[#333] rounded flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">⌘</div>
                )}
                <div className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#76B900] text-[#111] font-medium rounded-br-sm'
                    : 'bg-[#1e1e1e] border border-[#2a2a2a] text-stone-200 rounded-bl-sm'
                }`}>
                  {m.role === 'assistant'
                    ? <div className="prose prose-invert prose-xs max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                    : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 bg-[#333] rounded flex items-center justify-center text-[9px] font-black text-white shrink-0">⌘</div>
                <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-[#76B900] rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                  <span className="w-1.5 h-1.5 bg-[#76B900] rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                  <span className="w-1.5 h-1.5 bg-[#76B900] rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[#2a2a2a] shrink-0">
            <form onSubmit={e => { e.preventDefault(); send(); }} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-[#1a1a1a] border border-[#333] text-stone-200 text-xs px-3 py-2 rounded-lg outline-none focus:border-[#76B900] placeholder:text-stone-600 transition-colors"
                disabled={loading}
              />
              <button type="submit" disabled={!input.trim() || loading}
                className="px-3 py-2 bg-[#76B900] text-[#111] font-black text-xs rounded-lg hover:bg-[#8FD400] transition-colors disabled:opacity-30">
                ↑
              </button>
            </form>
            <p className="text-[9px] text-stone-600 text-center mt-1.5">Powered by CivicPath × Gemini</p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-5 right-5 z-50 w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center font-black text-sm transition-all hover:scale-105 active:scale-95 ${
          open ? 'bg-[#333] text-white border border-[#444]' : 'bg-[#111] text-[#76B900] border border-[#2a2a2a] hover:border-[#76B900]'
        }`}
        title="Ask Omninor"
      >
        {open ? '×' : '⌘'}
      </button>
    </>
  );
}
