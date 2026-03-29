import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Search, BookOpen, Copy, Check, Send,
  Zap, Upload, FileText, X, User, Download, Plus, ShieldCheck,
  MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { myLallaQuery, analyzeDocument, getCivicPathProfile } from '../lib/mylallaClient';
import { downloadReportPDF } from '../components/AwardedTab';

// MyLalla logo — NVIDIA green spark/lightning bolt
const MyLallaLogo = ({ size = 32 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <rect width="32" height="32" rx="8" fill="#76B900"/>
    <path d="M17.5 6L9 17h7.5L14.5 26l10-13H17L17.5 6z" fill="#111111"/>
  </svg>
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Source {
  title: string;
  agency: string;
  deadline: string;
  url: string;
  type?: string;
  source?: string;
}

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

interface ChatSession {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

// ── Suggested prompts ──────────────────────────────────────────────────────────

const SUGGESTED = [
  { icon: '🔍', text: 'Find NSF grants for AI startups under $500K' },
  { icon: '📋', text: 'What SBIR Phase I requirements do I need to know?' },
  { icon: '🏛️', text: 'Best federal grants for nonprofit education orgs in Florida' },
  { icon: '💡', text: 'How do I write a winning executive summary for NSF?' },
];

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MyLallaPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendSessionId, setBackendSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<{ name: string; text: string } | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const orgProfile = getCivicPathProfile();
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load sessions on mount
  useEffect(() => {
    const saved = localStorage.getItem('civicpath_lalla_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessions(parsed);
      } catch (e) {}
    }
    
    // Auto-close sidebar on mobile
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('civicpath_lalla_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Update current session's messages when messages state changes
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messages, updatedAt: Date.now() } 
          : s
      ).sort((a, b) => b.updatedAt - a.updatedAt));
    }
  }, [messages, currentSessionId]);

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

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setBackendSessionId(null);
    setInput('');
    setUploadedDoc(null);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
      setBackendSessionId(null); // Reset backend context to avoid crosstalk, or save it per session if desired
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      handleNewChat();
    }
  };

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

    let activeSessionId = currentSessionId;

    // Create new session if this is the first message
    if (!activeSessionId) {
      const newId = `session-${Date.now()}`;
      const title = text.length > 40 ? text.slice(0, 40) + '...' : text;
      const newSession: ChatSession = {
        id: newId,
        title,
        updatedAt: Date.now(),
        messages: [],
      };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newId);
      activeSessionId = newId;
    }

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
        : await myLallaQuery({ query: text, sessionId: backendSessionId, orgProfile });

      if (data.sessionId) setBackendSessionId(data.sessionId);

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
    <div className="flex h-screen overflow-hidden selection:bg-[#76B900]/30" style={{ background:'#1C1917', color:'#E8E3DC', fontFamily:'DM Sans, Inter, sans-serif' }}>
      
      {/* ── Sidebar (Claude style) ── */}
      <div 
        className={`shrink-0 flex flex-col bg-[#171514] border-r border-white/5 transition-all duration-300 z-20
          ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
          md:relative absolute inset-y-0 left-0
        `}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/5 shrink-0">
          <Link to="/seeker" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="w-6 h-6 rounded bg-[#2a2624] border border-white/10 flex items-center justify-center text-xs font-bold text-stone-400">←</span>
            <span className="font-bold text-sm text-stone-300">Dashboard</span>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-stone-400 md:hidden">
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 shrink-0">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-[#76B900]/10 hover:bg-[#76B900]/20 text-[#76B900] border border-[#76B900]/20 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">
          {sessions.length === 0 ? (
            <div className="text-center px-4 py-8 text-stone-500 text-xs">
              No chat history yet.<br/>Start a conversation!
            </div>
          ) : (
            <div className="space-y-1">
              <p className="px-2 py-2 text-[10px] font-black text-stone-500 uppercase tracking-wider">Recent</p>
              {sessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors ${
                    currentSessionId === session.id ? 'bg-[#2a2624] text-white font-medium' : 'hover:bg-[#221f1e] text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                  <span className="truncate flex-1 text-[13px]">{session.title}</span>
                  <button 
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-stone-500 hover:text-red-400 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile in Sidebar */}
        <div className="p-4 border-t border-white/5 shrink-0 bg-[#141211]">
          <Link to="/seeker" className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-xl transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center shrink-0 border border-white/10">
              <User className="w-4 h-4 text-stone-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-stone-200 truncate">{orgProfile?.name || 'Guest User'}</p>
              <p className="text-[10px] text-stone-500 truncate">Free Plan</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative bg-[#1C1917]">
        
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#1C1917]/90 backdrop-blur-md border-b border-white/5 shrink-0">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-white/10 text-stone-400 transition-colors">
                  <PanelLeftOpen className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <MyLallaLogo size={22} />
                <span className="font-bold text-stone-200 tracking-tight text-[15px]">MyLalla</span>
                <span className="ml-2 text-[10px] text-[#76B900] bg-[#76B900]/10 border border-[#76B900]/20 px-2 py-0.5 rounded-md hidden sm:flex items-center gap-1 font-bold">
                  <span className="w-1 h-1 rounded-full bg-[#76B900] animate-pulse" />
                  Nemotron-3-Super-120B
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleNewChat} className="md:hidden p-1.5 rounded-lg hover:bg-white/10 text-stone-400 transition-colors">
                <Plus className="w-5 h-5" />
              </button>
              <Link to="/mylalla/pricing" className="text-[11px] font-bold text-stone-400 hover:text-stone-200 border border-white/10 px-3 py-1.5 rounded-lg transition-colors hidden sm:block">Upgrade</Link>
            </div>
          </div>
        </header>

        {/* Chat Feed */}
        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full pb-28 pt-8">
            
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center mt-4 sm:mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 border border-white/10 shadow-lg">
                  <MyLallaLogo size={40} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100 mb-3">
                  Good morning{orgProfile?.name ? `, ${orgProfile.name}` : ''}.
                </h1>
                <p className="text-sm text-stone-400 max-w-md mx-auto mb-10 leading-relaxed">
                  I am your Sovereign AI Grant Advisor. Ask me to find grants, review compliance, or upload a document for analysis.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTED.map((s, i) => (
                    <button key={i} onClick={() => handleSubmit(s.text)}
                      className="flex items-start gap-3 p-4 rounded-2xl bg-[#221f1e] border border-white/5 hover:bg-[#2a2624] hover:border-white/10 transition-all text-left group"
                    >
                      <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{s.icon}</span>
                      <span className="text-sm text-stone-300 font-medium leading-snug">{s.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message Thread */}
            {messages.length > 0 && (
              <div className="space-y-8">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'user' ? (
                      <div className="bg-[#2a2624] text-stone-100 px-5 py-3.5 rounded-3xl rounded-tr-sm max-w-[85%] sm:max-w-[75%] text-[15px] leading-relaxed shadow-sm">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="w-full flex items-start gap-4">
                        <div className="w-8 h-8 rounded-xl bg-[#76B900]/10 flex items-center justify-center shrink-0 border border-[#76B900]/20 mt-1">
                          <MyLallaLogo size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-[13px] text-stone-200">MyLalla</span>
                            {msg.modelTier && <span className="text-[10px] text-stone-500 font-mono bg-white/5 px-1.5 rounded">{msg.modelTier}</span>}
                          </div>
                          
                          <div className="prose prose-sm prose-invert max-w-none text-[15px] leading-relaxed text-stone-300 prose-p:my-3 prose-headings:text-stone-100 prose-a:text-[#76B900] prose-a:no-underline hover:prose-a:underline font-['DM_Sans',_Inter,sans-serif]">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          
                          {/* Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Search className="w-3 h-3" /> Live Sources
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {msg.sources.map((src, i) => (
                                  <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 p-3 bg-[#221f1e] border border-white/5 hover:border-[#76B900]/30 rounded-xl transition-colors group">
                                    <BookOpen className="w-4 h-4 text-[#76B900] shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-stone-200 truncate group-hover:text-[#76B900] transition-colors">{src.title}</p>
                                      <p className="text-[10px] text-stone-500 truncate mt-0.5">{src.agency} · Due: {src.deadline}</p>
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Follow-ups */}
                          {msg.followUps && msg.followUps.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {msg.followUps.map((q, i) => (
                                <button key={i} onClick={() => handleSubmit(q)} className="text-xs font-medium text-[#76B900] bg-[#76B900]/10 border border-[#76B900]/20 hover:bg-[#76B900]/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                                  <Zap className="w-3 h-3" /> {q}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="mt-4 flex items-center gap-3">
                            <button onClick={() => handleCopy(msg.content, msg.id)} className="text-[11px] font-bold text-stone-500 hover:text-stone-300 flex items-center gap-1.5 transition-colors">
                              {copied === msg.id ? <Check className="w-3.5 h-3.5 text-[#76B900]" /> : <Copy className="w-3.5 h-3.5" />}
                              {copied === msg.id ? 'Copied' : 'Copy'}
                            </button>
                            <button onClick={() => downloadReportPDF(msg.content, `MyLalla — ${new Date().toLocaleDateString()}`, 'Grant Research', 'MyLalla.ai')} className="text-[11px] font-bold text-stone-500 hover:text-stone-300 flex items-center gap-1.5 transition-colors">
                              <Download className="w-3.5 h-3.5" /> Export PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Loading State */}
                {loading && (
                  <div className="w-full flex items-start gap-4">
                    <div className="w-8 h-8 rounded-xl bg-[#76B900]/10 flex items-center justify-center shrink-0 border border-[#76B900]/20 mt-1">
                      <MyLallaLogo size={20} />
                    </div>
                    <div className="flex items-center h-8 gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#76B900] animate-bounce" style={{animationDelay:'0ms'}} />
                      <span className="w-2 h-2 rounded-full bg-[#76B900] animate-bounce" style={{animationDelay:'150ms'}} />
                      <span className="w-2 h-2 rounded-full bg-[#76B900] animate-bounce" style={{animationDelay:'300ms'}} />
                    </div>
                  </div>
                )}
                
                <div ref={bottomRef} className="h-4" />
              </div>
            )}
          </div>
        </main>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#1C1917] via-[#1C1917]/95 to-transparent pt-10 pb-6 px-4 sm:px-6 z-10">
          <div className="max-w-3xl mx-auto w-full relative">
            
            {/* Uploaded Doc Preview */}
            {uploadedDoc && (
              <div className="absolute bottom-[100%] left-0 mb-3 flex items-center gap-3 px-4 py-2.5 bg-[#2a2624] border border-[#76B900]/30 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
                <div className="w-8 h-8 rounded-lg bg-[#76B900]/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#76B900]" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-xs font-bold text-stone-200 truncate">{uploadedDoc.name}</p>
                  <p className="text-[10px] text-stone-500 font-mono">{(uploadedDoc.text.length / 1000).toFixed(0)}K chars · Ready</p>
                </div>
                <button onClick={() => setUploadedDoc(null)} className="p-1 rounded-md hover:bg-white/10 text-stone-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="bg-[#221f1e] border border-white/10 rounded-2xl shadow-xl overflow-hidden focus-within:border-[#76B900]/50 focus-within:ring-1 focus-within:ring-[#76B900]/50 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Ask about grants, compliance, or upload a document..."
                rows={1}
                disabled={loading}
                className="w-full bg-transparent px-5 py-4 text-[15px] text-stone-100 placeholder:text-stone-500 outline-none resize-none disabled:opacity-50 min-h-[56px] max-h-[200px]"
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
                  <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx,.md" className="hidden" onChange={handleFileUpload} />
                  <button 
                    onClick={() => fileRef.current?.click()}
                    className="p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-white/5 transition-colors flex items-center justify-center tooltip"
                    title="Upload Document"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  <div className="h-4 w-px bg-white/10 mx-1"></div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md text-stone-500 text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5" /> Sovereign
                  </div>
                </div>
                <button 
                  onClick={() => handleSubmit()} 
                  disabled={!input.trim() || loading}
                  className="bg-white text-[#111] hover:bg-stone-200 disabled:opacity-30 disabled:hover:bg-white p-2 rounded-xl transition-all shadow-sm flex items-center justify-center"
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] font-medium text-stone-500 mt-3 flex items-center justify-center gap-2">
              MyLalla can make mistakes. Verify critical deadlines. <a href="/privacy" className="underline hover:text-stone-300">Privacy Policy</a>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
