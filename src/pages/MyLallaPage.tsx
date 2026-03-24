import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Search, BookOpen, Copy, Check, Loader2, Send,
  Zap, Upload, FileText, X, User, Download, Plus, ShieldCheck,
} from 'lucide-react';
import { myLallaQuery, analyzeDocument, getCivicPathProfile } from '../lib/mylallaClient';
import { downloadReportPDF } from '../components/AwardedTab';

// MyLalla logo — NVIDIA green spark/lightning bolt
const MyLallaLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="#76B900"/>
    <path d="M17.5 6L9 17h7.5L14.5 26l10-13H17L17.5 6z" fill="#111111"/>
  </svg>
);

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
  type?: string;
  source?: string;
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
  const [uploadedDoc, setUploadedDoc] = useState<{ name: string; text: string } | null>(null);
  const orgProfile = getCivicPathProfile();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setUploadedDoc({ name: file.name, text: text.slice(0, 100_000) });
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (query?: string) => {
    const text = (query ?? input).trim();
    if (!text || loading) return;

    const userContent = uploadedDoc
      ? `[Analyzing: ${uploadedDoc.name}]\n\n${text}`
      : text;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userContent,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    const docToAnalyze = uploadedDoc;
    setUploadedDoc(null);

    try {
      const data = docToAnalyze
        ? await analyzeDocument(docToAnalyze.text, text, orgProfile)
        : await myLallaQuery({ query: text, sessionId, orgProfile });

      if (data.sessionId) setSessionId(data.sessionId);

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        sources: data.sources || [],
        followUps: data.followUps || [],
        modelTier: data.modelTier + (data.backend === 'gke' ? ' · GKE' : ''),
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

  // DM Sans
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  return (
    // Claude warm dark background: #1C1917 instead of pure black
    <div className="min-h-screen flex flex-col" style={{ background:'#1C1917', color:'#E8E3DC', fontFamily:'DM Sans, Inter, sans-serif' }}>

      {/* Header — Claude style: subtle, not heavy */}
      <header style={{borderBottom:'1px solid rgba(255,255,255,0.06)', background:'rgba(28,25,23,0.95)'}} className="sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-2.5">
            <MyLallaLogo size={28} />
            <span style={{color:'#E8E3DC', fontWeight:700, fontSize:'16px', letterSpacing:'-0.3px'}}>MyLalla</span>
          </div>

          <div className="flex items-center gap-2">
            {orgProfile && (
              <span style={{fontSize:'11px', color:'rgba(232,227,220,0.45)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', padding:'3px 8px', borderRadius:'6px'}} className="hidden sm:flex items-center gap-1.5">
                <User className="w-2.5 h-2.5" /> {orgProfile.name}
              </span>
            )}
            <span style={{fontSize:'10px', color:'#76B900', background:'rgba(118,185,0,0.1)', border:'1px solid rgba(118,185,0,0.2)', padding:'3px 8px', borderRadius:'6px'}} className="hidden sm:flex items-center gap-1.5 font-bold">
              <span style={{width:5,height:5,borderRadius:'50%',background:'#76B900',display:'inline-block',animation:'pulse 2s infinite'}} />
              Nemotron-3-Super
            </span>
            <Link to="/mylalla/pricing" style={{fontSize:'12px', color:'rgba(232,227,220,0.5)', border:'1px solid rgba(255,255,255,0.1)', padding:'5px 12px', borderRadius:'7px'}} className="hover:opacity-80 transition-opacity hidden sm:block font-medium">Pricing</Link>
            <Link to="/seeker" style={{fontSize:'12px', color:'rgba(232,227,220,0.5)', border:'1px solid rgba(255,255,255,0.1)', padding:'5px 12px', borderRadius:'7px'}} className="hover:opacity-80 transition-opacity hidden sm:block font-medium">CivicPath →</Link>
            <button onClick={() => { setMessages([]); setSessionId(null); }} style={{width:28, height:28, borderRadius:'7px', border:'1px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center'}} className="hover:opacity-80 transition-opacity" title="New conversation">
              <Plus className="w-3.5 h-3.5" style={{color:'rgba(232,227,220,0.5)'}} />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-5 sm:px-6 py-6 flex flex-col">

        {/* Empty state — Claude style: centered, warm, clean */}
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center pb-16 gap-10">
            <div>
              <div className="flex justify-center mb-5">
                <MyLallaLogo size={56} />
              </div>
              <h1 style={{fontSize:'28px', fontWeight:600, letterSpacing:'-0.5px', color:'#E8E3DC', marginBottom:'8px'}}>
                How can I help you today?
              </h1>
              <p style={{fontSize:'14px', color:'rgba(232,227,220,0.45)', maxWidth:'380px', margin:'0 auto', lineHeight:1.6}}>
                AI grant advisor powered by Nemotron-3-Super · Live Grants.gov data
              </p>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', width:'100%', maxWidth:'580px'}}>
              {SUGGESTED.map((s, i) => (
                <button key={i} onClick={() => handleSubmit(s.text)}
                  style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'14px 16px', textAlign:'left', transition:'all 0.15s'}}
                  className="hover:opacity-80 group flex items-start gap-3"
                >
                  <span style={{fontSize:'18px', lineHeight:1}}>{s.icon}</span>
                  <span style={{fontSize:'13px', color:'rgba(232,227,220,0.65)', lineHeight:1.5}}>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="flex-1 space-y-6 pb-4">
            {/* Claude-style messages: no bubbles for assistant, clean user pills */}
            {messages.map(msg => (
              <div key={msg.id} style={{display:'flex', flexDirection:'column', gap:'2px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'}}>

                {msg.role === 'user' ? (
                  // User message — pill style, warm tint (Claude pattern)
                  <div style={{background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'18px', padding:'10px 16px', maxWidth:'75%', fontSize:'15px', color:'#E8E3DC', lineHeight:1.6}}>
                    {msg.content}
                  </div>
                ) : (
                  // Assistant — no bubble (Claude style)
                  <div style={{width:'100%'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px'}}>
                      <MyLallaLogo size={20} />
                      <span style={{fontSize:'12px', fontWeight:600, color:'#76B900'}}>MyLalla</span>
                      {msg.modelTier && <span style={{fontSize:'10px', color:'rgba(118,185,0,0.6)', fontFamily:'monospace'}}>· {msg.modelTier}</span>}
                    </div>
                    <div style={{paddingLeft:'28px'}}>
                      <div className="prose prose-sm max-w-none" style={{color:'rgba(232,227,220,0.88)', lineHeight:1.75, fontSize:'15px', fontFamily:'DM Sans, Inter, sans-serif'}}>
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{marginTop:'12px', display:'flex', flexDirection:'column', gap:'6px'}}>
                          <p style={{fontSize:'10px', color:'rgba(232,227,220,0.3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', display:'flex', alignItems:'center', gap:'4px'}}>
                            <Search style={{width:10, height:10}} /> Live sources from Grants.gov
                          </p>
                          {msg.sources.map((src, i) => (
                            <a key={i} href={src.url} target="_blank" rel="noopener noreferrer"
                              style={{display:'flex', alignItems:'flex-start', gap:'10px', padding:'10px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'10px', textDecoration:'none'}} className="hover:opacity-80 transition-opacity">
                              <BookOpen style={{width:13, height:13, color:'#76B900', marginTop:1, flexShrink:0}} />
                              <div>
                                <p style={{fontSize:'12px', fontWeight:600, color:'rgba(232,227,220,0.85)', margin:0}}>{src.title}</p>
                                <p style={{fontSize:'10px', color:'rgba(232,227,220,0.35)', margin:0, marginTop:2}}>{src.agency} · Due: {src.deadline}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                      {/* Follow-ups */}
                      {msg.followUps && msg.followUps.length > 0 && (
                        <div style={{marginTop:'12px', display:'flex', flexDirection:'column', gap:'5px'}}>
                          <p style={{fontSize:'10px', color:'rgba(232,227,220,0.3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em'}}>Suggested</p>
                          {msg.followUps.map((q, i) => (
                            <button key={i} onClick={() => handleSubmit(q)}
                              style={{textAlign:'left', fontSize:'12px', color:'rgba(232,227,220,0.55)', padding:'7px 12px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:'8px', display:'flex', alignItems:'center', gap:'6px'}} className="hover:opacity-80 transition-opacity">
                              <Zap style={{width:11, height:11, color:'#76B900', flexShrink:0}} />{q}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* Actions */}
                      <div style={{display:'flex', gap:'12px', marginTop:'10px'}}>
                        <button onClick={() => { downloadReportPDF(msg.content, `MyLalla — ${new Date().toLocaleDateString()}`, 'Grant Research', 'MyLalla.ai'); }}
                          style={{fontSize:'11px', color:'rgba(232,227,220,0.3)', display:'flex', alignItems:'center', gap:'4px'}} className="hover:opacity-80 transition-opacity">
                          <Download style={{width:11, height:11}} /> Export PDF
                        </button>
                        <button onClick={() => handleCopy(msg.content, msg.id)}
                          style={{fontSize:'11px', color:'rgba(232,227,220,0.3)', display:'flex', alignItems:'center', gap:'4px'}} className="hover:opacity-80 transition-opacity">
                          {copied === msg.id ? <Check style={{width:11, height:11, color:'#76B900'}} /> : <Copy style={{width:11, height:11}} />}
                          {copied === msg.id ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading — Claude style: logo + dots */}
            {loading && (
              <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px'}}>
                  <MyLallaLogo size={20} />
                  <span style={{fontSize:'12px', fontWeight:600, color:'#76B900'}}>MyLalla</span>
                </div>
                <div style={{paddingLeft:'28px', display:'flex', alignItems:'center', gap:'4px'}}>
                  {[0,150,300].map(d => (
                    <span key={d} style={{width:6, height:6, borderRadius:'50%', background:'rgba(118,185,0,0.6)', display:'inline-block', animation:`pulse 1.2s ${d}ms infinite`}} />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Input area — Claude style: clean, warm */}
        <div className="sticky bottom-0 pt-4 pb-2" style={{background:'linear-gradient(to top, #1C1917 70%, transparent)'}}>

          {/* Document upload preview */}
          {uploadedDoc && (
            <div className="flex items-center gap-3 mb-3 px-4 py-2.5 bg-[#76B900]/10 border border-[#76B900]/20 rounded-xl">
              <FileText className="w-4 h-4 text-[#76B900] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#76B900] truncate">{uploadedDoc.name}</p>
                <p className="text-[10px] text-white/40">{(uploadedDoc.text.length / 1000).toFixed(0)}K chars · Ready for analysis</p>
              </div>
              <button onClick={() => setUploadedDoc(null)} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CivicPath profile badge */}
          {orgProfile && messages.length === 0 && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-white/5 border border-white/8 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-[#76B900]/20 flex items-center justify-center shrink-0">
                <User className="w-3 h-3 text-[#76B900]" />
              </div>
              <p className="text-[10px] text-white/50">
                Using your <span className="text-[#76B900] font-bold">{orgProfile.name}</span> profile · {orgProfile.focus_area} · {orgProfile.location}
              </p>
            </div>
          )}

          {/* Claude-style input box */}
          <div style={{background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'16px', overflow:'hidden'}} className="focus-within:border-[#76B900]/40 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ask about grants, funding, compliance, or upload a document..."
              rows={1}
              disabled={loading}
              style={{width:'100%', background:'transparent', padding:'16px 18px 8px', fontSize:'15px', color:'#E8E3DC', outline:'none', resize:'none', fontFamily:'DM Sans, Inter, sans-serif', lineHeight:1.6}}
              className="placeholder:text-[rgba(232,227,220,0.3)] disabled:opacity-50"
            />
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px 12px'}}>
              <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                <button onClick={() => fileRef.current?.click()}
                  style={{fontSize:'11px', color:'rgba(232,227,220,0.35)', display:'flex', alignItems:'center', gap:'4px'}} className="hover:opacity-80 transition-opacity">
                  <Upload style={{width:13, height:13}} /> Upload doc
                </button>
                <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx,.md" className="hidden" onChange={handleFileUpload} />
                <span style={{fontSize:'11px', color:'rgba(232,227,220,0.2)', display:'flex', alignItems:'center', gap:'3px'}}>
                  <ShieldCheck style={{width:11, height:11}} /> Sovereign
                </span>
              </div>
              <button onClick={() => handleSubmit()} disabled={!input.trim() || loading}
                style={{background:'#76B900', color:'#111', fontWeight:700, fontSize:'13px', padding:'7px 16px', borderRadius:'10px', display:'flex', alignItems:'center', gap:'6px', opacity: !input.trim() || loading ? 0.35 : 1, cursor: !input.trim() || loading ? 'not-allowed' : 'pointer'}}>
                {loading ? <Loader2 style={{width:14, height:14}} className="animate-spin" /> : <Send style={{width:13, height:13}} />}
                Send
              </button>
            </div>
          </div>
          <p style={{textAlign:'center', fontSize:'10px', color:'rgba(232,227,220,0.2)', marginTop:'8px'}}>
            MyLalla · Nemotron-3-Super-120B · Live Grants.gov · <a href="/privacy" style={{color:'inherit'}} className="hover:opacity-60">Privacy</a>
          </p>
        </div>

      </main>
    </div>
  );
}
