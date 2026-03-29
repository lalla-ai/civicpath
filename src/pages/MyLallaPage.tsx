import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Search, BookOpen, Copy, Check, Send,
  Zap, Upload, FileText, X, User, Download, Plus, ShieldCheck,
  MessageSquare, Trash2, PanelLeftClose, PanelLeftOpen,
  Mic, Volume2, VolumeX, Sun, Moon, ChevronDown, Edit2
} from 'lucide-react';
import { myLallaQuery, analyzeDocument, getCivicPathProfile } from '../lib/mylallaClient';
import { downloadReportPDF } from '../components/AwardedTab';

// MyLalla logo
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
  
  // Theme & Voice State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('mylalla_theme') as 'light' | 'dark') || 'light');
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

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
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, []);

  // Persist sessions
  useEffect(() => {
    localStorage.setItem('civicpath_lalla_sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Persist theme
  useEffect(() => {
    localStorage.setItem('mylalla_theme', theme);
  }, [theme]);

  // Update current session's messages
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId ? { ...s, messages, updatedAt: Date.now() } : s
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

  // ── Voice Interactions (STT / TTS) ──
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      if (e.results[0].isFinal) {
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
  };

  const toggleSpeech = (text: string, id: string) => {
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
    } else {
      window.speechSynthesis.cancel(); // Stop anything else
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => setSpeakingId(null);
      window.speechSynthesis.speak(utterance);
      setSpeakingId(id);
    }
  };

  // ── Chat Actions ──
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
      setBackendSessionId(null);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) handleNewChat();
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

    if (!activeSessionId) {
      const newId = `session-${Date.now()}`;
      const title = text.length > 40 ? text.slice(0, 40) + '...' : text;
      const newSession: ChatSession = { id: newId, title, updatedAt: Date.now(), messages: [] };
      setSessions(prev => [newSession, ...prev]);
      setCurrentSessionId(newId);
      activeSessionId = newId;
    }

    const userContent = uploadedDoc ? `[Analyzing: ${uploadedDoc.name}]\n\n${text}` : text;
    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: userContent, timestamp: Date.now() };

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
        id: `error-${Date.now()}`, role: 'assistant', content: "I'm having trouble connecting right now. Please try again.", timestamp: Date.now(),
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

  // ── Theme Dictionaries ──
  const isDark = theme === 'dark';
  const c = {
    bg: isDark ? 'bg-[#1C1917]' : 'bg-[#FFFFFF]',
    mainBg: isDark ? 'bg-[#1C1917]' : 'bg-[#FFFFFF]',
    sidebar: isDark ? 'bg-[#171514]' : 'bg-[#F9F9F8]',
    text: isDark ? 'text-[#E8E3DC]' : 'text-[#111111]',
    textMuted: isDark ? 'text-stone-400' : 'text-stone-500',
    border: isDark ? 'border-white/5' : 'border-stone-200',
    borderHover: isDark ? 'hover:border-white/10' : 'hover:border-stone-300',
    hover: isDark ? 'hover:bg-white/5' : 'hover:bg-stone-100',
    card: isDark ? 'bg-[#221f1e]' : 'bg-[#FDFCFB]',
    input: isDark ? 'bg-[#221f1e] border-white/10 text-white' : 'bg-white border-stone-200 text-stone-900',
    prose: isDark ? 'prose-invert text-stone-300 prose-headings:text-stone-100' : 'text-stone-800 prose-headings:text-stone-900',
  };

  return (
    <div className={`flex h-screen overflow-hidden selection:bg-[#76B900]/30 ${c.mainBg} ${c.text}`} style={{ fontFamily:'DM Sans, Inter, sans-serif' }}>
      
      {/* ── Sidebar ── */}
      <div 
        className={`shrink-0 flex flex-col ${c.sidebar} ${c.border} border-r transition-all duration-300 z-20
          ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'}
          md:relative absolute inset-y-0 left-0
        `}
      >
        <div className={`p-4 flex items-center justify-between border-b ${c.border} shrink-0`}>
          <Link to="/seeker" className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${c.text}`}>
            <span className={`w-6 h-6 rounded ${isDark ? 'bg-[#2a2624] border-white/10' : 'bg-white border-stone-200'} border flex items-center justify-center text-xs font-bold`}>←</span>
            <span className="font-bold text-sm">Dashboard</span>
          </Link>
          <button onClick={() => setIsSidebarOpen(false)} className={`p-1.5 rounded-lg ${c.hover} md:hidden`}>
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 shrink-0">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-[#76B900]/10 hover:bg-[#76B900]/20 text-[#5a9000] border border-[#76B900]/20 py-2.5 rounded-xl font-bold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-none">
          {sessions.length === 0 ? (
            <div className={`text-center px-4 py-8 ${c.textMuted} text-xs`}>
              No chat history yet.<br/>Start a conversation!
            </div>
          ) : (
            <div className="space-y-1">
              <p className={`px-2 py-2 text-[10px] font-black ${c.textMuted} uppercase tracking-wider`}>Recent</p>
              {sessions.map(session => (
                <div 
                  key={session.id}
                  onClick={() => handleSelectSession(session.id)}
                  className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors ${
                    currentSessionId === session.id 
                      ? (isDark ? 'bg-[#2a2624] text-white font-medium' : 'bg-white shadow-sm border border-stone-200 text-stone-900 font-medium')
                      : `${c.hover} ${c.textMuted} hover:${isDark ? 'text-stone-200' : 'text-stone-900'}`
                  }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0 opacity-50" />
                  <span className="truncate flex-1 text-[13px]">{session.title}</span>
                  <button 
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-stone-500 hover:text-red-500 transition-all shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile in Sidebar */}
        <div className={`p-4 border-t ${c.border} shrink-0`}>
          <Link to="/seeker" className={`flex items-center gap-3 ${c.hover} p-2 rounded-xl transition-colors cursor-pointer`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${isDark ? 'bg-stone-800 border-white/10' : 'bg-stone-200 border-stone-300'}`}>
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{orgProfile?.name || 'Guest User'}</p>
              <p className={`text-[10px] ${c.textMuted} truncate`}>Free Plan</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className={`flex-1 flex flex-col h-full min-w-0 relative ${c.bg}`}>
        
        {/* Header */}
        <header className={`sticky top-0 z-10 ${c.bg}/90 backdrop-blur-md border-b ${c.border} shrink-0`}>
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!isSidebarOpen && (
                <button onClick={() => setIsSidebarOpen(true)} className={`p-1.5 rounded-lg ${c.hover} transition-colors`}>
                  <PanelLeftOpen className="w-5 h-5" />
                </button>
              )}
              
              {/* Claude-style Model Selector */}
              <div className="relative">
                <button onClick={() => setModelSelectorOpen(!modelSelectorOpen)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${c.hover} transition-colors font-medium text-[15px]`}>
                  Nemotron-3-Super
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </button>
                {modelSelectorOpen && (
                  <div className={`absolute top-full left-0 mt-1 w-56 rounded-xl shadow-lg border ${c.border} ${isDark ? 'bg-[#1C1917]' : 'bg-white'} py-2 z-50`}>
                    <div className={`px-4 py-2 flex items-center gap-3 ${isDark ? 'bg-white/5' : 'bg-stone-50'}`}>
                      <Check className="w-4 h-4 text-[#76B900]" />
                      <div>
                        <p className="text-sm font-bold">Nemotron-3-Super</p>
                        <p className={`text-[10px] ${c.textMuted}`}>Fastest, recommended</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setTheme(isDark ? 'light' : 'dark')} className={`p-2 rounded-lg ${c.hover} transition-colors`}>
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={handleNewChat} className={`md:hidden p-1.5 rounded-lg ${c.hover} transition-colors`}>
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Chat Feed */}
        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full pb-36 pt-8">
            
            {/* Empty State */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-center mt-4 sm:mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 border shadow-lg ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-stone-200'}`}>
                  <MyLallaLogo size={40} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                  Good morning{orgProfile?.name ? `, ${orgProfile.name}` : ''}.
                </h1>
                <p className={`text-sm ${c.textMuted} max-w-md mx-auto mb-10 leading-relaxed`}>
                  I am your Sovereign AI Grant Advisor. Ask me to find grants, review compliance, or upload a document for analysis.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                  {SUGGESTED.map((s, i) => (
                    <button key={i} onClick={() => handleSubmit(s.text)}
                      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all text-left group ${c.card} ${c.border} ${c.borderHover}`}
                    >
                      <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">{s.icon}</span>
                      <span className={`text-sm font-medium leading-snug ${isDark ? 'text-stone-300' : 'text-stone-600'}`}>{s.text}</span>
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
                      <div className="flex flex-col items-end gap-1.5 max-w-[85%] sm:max-w-[75%] group">
                        <div className={`px-5 py-3.5 rounded-2xl shadow-sm text-[15px] leading-relaxed ${isDark ? 'bg-[#2a2624] text-stone-100' : 'bg-[#F9F9F8] text-stone-900 border border-stone-200'}`}>
                          {msg.content}
                        </div>
                        <button className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${c.textMuted}`}>
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      </div>
                    ) : (
                      <div className="w-full flex items-start gap-4">
                        <div className="w-8 h-8 rounded-xl bg-[#76B900]/10 flex items-center justify-center shrink-0 border border-[#76B900]/20 mt-1">
                          <MyLallaLogo size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="font-bold text-[14px]">MyLalla</span>
                            {msg.modelTier && <span className={`text-[10px] font-mono px-1.5 rounded ${isDark ? 'bg-white/5 text-stone-500' : 'bg-stone-100 text-stone-500'}`}>{msg.modelTier}</span>}
                          </div>
                          
                          <div className={`prose prose-sm max-w-none text-[15px] leading-relaxed prose-p:my-3 prose-a:text-[#76B900] prose-a:no-underline hover:prose-a:underline font-['DM_Sans',_Inter,sans-serif] ${c.prose}`}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                          
                          {/* Sources */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className={`mt-4 pt-4 border-t ${c.border}`}>
                              <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${c.textMuted}`}>
                                <Search className="w-3 h-3" /> Live Sources
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {msg.sources.map((src, i) => (
                                  <a key={i} href={src.url} target="_blank" rel="noopener noreferrer" className={`flex items-start gap-3 p-3 border rounded-xl transition-colors group ${c.card} ${c.border} hover:border-[#76B900]/40`}>
                                    <BookOpen className="w-4 h-4 text-[#76B900] shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold truncate group-hover:text-[#76B900] transition-colors">{src.title}</p>
                                      <p className={`text-[10px] truncate mt-0.5 ${c.textMuted}`}>{src.agency} · Due: {src.deadline}</p>
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
                                <button key={i} onClick={() => handleSubmit(q)} className="text-xs font-medium text-[#5a9000] bg-[#76B900]/10 border border-[#76B900]/20 hover:bg-[#76B900]/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                                  <Zap className="w-3 h-3" /> {q}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Claude-style Actions Row */}
                          <div className={`mt-6 flex items-center gap-1 ${c.textMuted}`}>
                            <button onClick={() => handleCopy(msg.content, msg.id)} className={`p-2 rounded-lg ${c.hover} transition-colors tooltip`} title="Copy to clipboard">
                              {copied === msg.id ? <Check className="w-4 h-4 text-[#76B900]" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button onClick={() => toggleSpeech(msg.content, msg.id)} className={`p-2 rounded-lg ${c.hover} transition-colors tooltip`} title="Read response aloud">
                              {speakingId === msg.id ? <VolumeX className="w-4 h-4 text-red-500 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
                            </button>
                            <button onClick={() => handleSubmit(msg.content.slice(0, 20))} className={`p-2 rounded-lg ${c.hover} transition-colors tooltip`} title="Retry response">
                              <Zap className="w-4 h-4 rotate-180" />
                            </button>
                            <button onClick={() => downloadReportPDF(msg.content, `MyLalla — ${new Date().toLocaleDateString()}`, 'Grant Research', 'MyLalla.ai')} className={`p-2 rounded-lg ${c.hover} transition-colors tooltip`} title="Export as PDF">
                              <Download className="w-4 h-4" />
                            </button>
                            <div className={`w-px h-5 mx-2 ${isDark ? 'bg-white/10' : 'bg-stone-200'}`}></div>
                            <button className={`p-2 rounded-lg ${c.hover} transition-colors tooltip hover:text-[#76B900]`} title="Helpful">
                              <ShieldCheck className="w-4 h-4" />
                            </button>
                            <button className={`p-2 rounded-lg ${c.hover} transition-colors tooltip hover:text-red-400`} title="Not helpful">
                              <Trash2 className="w-4 h-4" />
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
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${isDark ? 'from-[#1C1917] via-[#1C1917]/95' : 'from-[#FFFFFF] via-[#FFFFFF]/95'} to-transparent pt-10 pb-6 px-4 sm:px-6 z-10`}>
          <div className="max-w-3xl mx-auto w-full relative">
            
            {/* Uploaded Doc Preview */}
            {uploadedDoc && (
              <div className={`absolute bottom-[100%] left-0 mb-3 flex items-center gap-3 px-4 py-2.5 border border-[#76B900]/30 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 ${isDark ? 'bg-[#2a2624]' : 'bg-white'}`}>
                <div className="w-8 h-8 rounded-lg bg-[#76B900]/20 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-[#76B900]" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <p className="text-xs font-bold truncate">{uploadedDoc.name}</p>
                  <p className={`text-[10px] font-mono ${c.textMuted}`}>{(uploadedDoc.text.length / 1000).toFixed(0)}K chars · Ready</p>
                </div>
                <button onClick={() => setUploadedDoc(null)} className={`p-1 rounded-md ${c.hover} transition-colors`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className={`border rounded-2xl shadow-xl overflow-hidden focus-within:border-[#76B900]/50 focus-within:ring-1 focus-within:ring-[#76B900]/50 transition-all ${c.input}`}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder="Ask about grants, compliance, or upload a document..."
                rows={1}
                disabled={loading}
                className={`w-full bg-transparent px-5 py-4 text-[15px] outline-none resize-none disabled:opacity-50 min-h-[56px] max-h-[200px] ${isDark ? 'placeholder:text-stone-500 text-stone-100' : 'placeholder:text-stone-400 text-stone-900'}`}
              />
              <div className="flex items-center justify-between px-3 pb-3">
                <div className="flex items-center gap-1">
                  <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx,.md" className="hidden" onChange={handleFileUpload} />
                  <button 
                    onClick={() => fileRef.current?.click()}
                    className={`p-2 rounded-lg ${c.textMuted} ${c.hover} transition-colors flex items-center justify-center tooltip`}
                    title="Upload Document"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  
                  {/* Voice Input Button */}
                  <button 
                    onClick={toggleListening}
                    className={`p-2 rounded-lg transition-colors flex items-center justify-center tooltip ${isListening ? 'text-red-500 bg-red-500/10' : `${c.textMuted} ${c.hover}`}`}
                    title="Speak"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  
                  <div className={`h-4 w-px mx-1 ${isDark ? 'bg-white/10' : 'bg-stone-300'}`}></div>
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${c.textMuted}`}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Sovereign
                  </div>
                </div>
                <button 
                  onClick={() => handleSubmit()} 
                  disabled={!input.trim() || loading}
                  className={`p-2 rounded-xl transition-all shadow-sm flex items-center justify-center disabled:opacity-30 ${isDark ? 'bg-white text-[#111] hover:bg-stone-200' : 'bg-stone-900 text-white hover:bg-stone-800'}`}
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </div>
            </div>
            <p className={`text-center text-[10px] font-medium mt-3 flex items-center justify-center gap-2 ${c.textMuted}`}>
              MyLalla can make mistakes. Verify critical deadlines. <a href="/privacy" className="underline hover:opacity-80">Privacy Policy</a>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
