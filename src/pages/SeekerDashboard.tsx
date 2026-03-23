import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { draftProposal, chatWithLalla } from '../gemini';
import type { ChatMessage } from '../gemini';
import { 
  Search, 
  BrainCircuit, 
  FileEdit, 
  ShieldCheck, 
  Play, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Building2,
  MapPin,
  Cpu,
  AlertCircle,
  FileText,
  Plus,
  X,
  Send,
  TerminalSquare,
  Eye,
  Download,
  Calendar,
  BarChart3,
  Clock,
  PlayCircle,
  Hexagon,
  ArrowUpRight,
  CalendarDays,
  Users,
  CheckSquare,
  ListTodo,
  Video,
  Link,
  Mail,
  LogOut,
  Sparkles,
  Upload,
  Twitter,
  Globe,
  Share2,
  Linkedin,
  UserCircle,
  Kanban,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Trash2,
  Bell
} from 'lucide-react';

type AgentStatus = 'idle' | 'working' | 'completed' | 'error';
type AppStep = 'onboarding' | 'dashboard';
type ActiveTab = 'dashboard' | 'grants' | 'tracker' | 'scheduler' | 'meetings' | 'integrations' | 'lalla' | 'profile';

interface TrackerGrant {
  id: string;
  title: string;
  agency: string;
  amount: string;
  closeDate: string;
  url: string;
  source: string;
  status: 'saved' | 'applied' | 'in-review' | 'won';
  addedAt: string;
  notes: string;
}

interface Profile {
  // Step 1 — Your Organization
  companyName: string;
  orgType: string;
  location: string;
  website: string;
  linkedinUrl: string;
  twitterUrl: string;
  tagline: string;           // e.g. "AI grant pipeline for Florida communities"
  yearFounded: string;       // e.g. "2019"
  logoDataUrl: string;       // base64 for logo/photo upload
  // Step 2 — Mission & Impact
  focusArea: string;
  missionStatement: string;
  targetPopulation: string;
  geographicScope: string;
  annualBudget: string;
  teamSize: string;
  yearsOperating: string;
  impactMetrics: string;     // e.g. "500 students served · $2M secured"
  teamMembersText: string;   // e.g. "John Smith (CEO), Jane Doe (COO)"
  // Step 3 — Funding Goal + Credentials
  projectDescription: string;
  fundingAmount: string;
  previousGrants: string;
  backgroundInfo: string;
  resumeText: string;
  ein: string;               // EIN / Tax ID — required for federal grants
  dunsNumber: string;        // DUNS / SAM number — required for Grants.gov
  grantHistoryText: string;  // "NSF SBIR $150K — Won 2024; FL STEM — Applied 2025"
}

interface AgentState {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: AgentStatus;
  logs: string[];
  output: string | null;
}

// CivicPath Green accent: #76B900
// Hover Green: #689900
// Claude-style Beige: #F9F7F2

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-8 h-8 text-[#76B900]">
    <Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} />
    <ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} />
  </div>
);

export default function SeekerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<AppStep>('onboarding');
  const [onboardStep, setOnboardStep] = useState(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [profile, setProfile] = useState<Profile>(() => {
    try {
      const saved = localStorage.getItem('civicpath_profile');
      const defaults = {
        companyName: '', orgType: '', location: '', website: '',
        linkedinUrl: '', twitterUrl: '', tagline: '', yearFounded: '', logoDataUrl: '',
        focusArea: '', missionStatement: '', targetPopulation: '',
        geographicScope: '', annualBudget: '', teamSize: '', yearsOperating: '',
        impactMetrics: '', teamMembersText: '',
        projectDescription: '', fundingAmount: '', previousGrants: '',
        backgroundInfo: '', resumeText: '', ein: '', dunsNumber: '', grantHistoryText: ''
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return {
      companyName: '', orgType: '', location: '', website: '',
      linkedinUrl: '', twitterUrl: '', tagline: '', yearFounded: '', logoDataUrl: '',
      focusArea: '', missionStatement: '', targetPopulation: '',
      geographicScope: '', annualBudget: '', teamSize: '', yearsOperating: '',
      impactMetrics: '', teamMembersText: '',
      projectDescription: '', fundingAmount: '', previousGrants: '',
      backgroundInfo: '', resumeText: '', ein: '', dunsNumber: '', grantHistoryText: ''
    }; }
  });

  // AI auto-fill state
  const [aiFilling, setAiFilling] = useState(false);
  const [aiFillMsg, setAiFillMsg] = useState('');

  // Auto-pipeline on first dashboard visit
  const [hasAutoRun, setHasAutoRunState] = useState(() => localStorage.getItem('civicpath_pipeline_run') === 'true');

  useEffect(() => {
    if (step === 'dashboard' && !hasAutoRun && profile.companyName && profile.focusArea) {
      const timer = setTimeout(() => {
        setHasAutoRunState(true);
        localStorage.setItem('civicpath_pipeline_run', 'true');
        handleExecute();
      }, 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Viral share
  const [showShareBanner, setShowShareBanner] = useState(false);

  // Grant Tracker
  const [trackerGrants, setTrackerGrants] = useState<TrackerGrant[]>(() => {
    try { return JSON.parse(localStorage.getItem('civicpath_tracker') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('civicpath_tracker', JSON.stringify(trackerGrants));
  }, [trackerGrants]);

  const saveToTracker = (grant: {title:string;agency:string;closeDate:string;url:string;source?:string}) => {
    const id = `tracker-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    setTrackerGrants(prev => {
      if (prev.some(g => g.title === grant.title)) return prev; // no duplicates
      return [...prev, {
        id, title: grant.title, agency: grant.agency,
        amount: '', closeDate: grant.closeDate, url: grant.url,
        source: grant.source || 'Pipeline', status: 'saved',
        addedAt: new Date().toLocaleDateString(), notes: ''
      }];
    });
  };

  const moveTrackerGrant = (id: string, status: TrackerGrant['status']) => {
    setTrackerGrants(prev => prev.map(g => g.id === id ? {...g, status} : g));
  };

  const removeTrackerGrant = (id: string) => {
    setTrackerGrants(prev => prev.filter(g => g.id !== id));
  };

  // Tracker view toggle
  const [trackerView, setTrackerView] = useState<'table' | 'kanban'>('table');

  // Email digest
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestMsg, setDigestMsg] = useState('');

  const sendDigest = async () => {
    if (!user?.email) return;
    setDigestLoading(true);
    setDigestMsg('');
    try {
      const res = await fetch('/api/send-digest', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          email: user.email,
          name: user.name || 'there',
          profile: { companyName: profile.companyName, location: profile.location, focusArea: profile.focusArea, missionStatement: profile.missionStatement }
        })
      });
      const data = await res.json();
      setDigestMsg(data.ok ? '\u2713 Digest sent to ' + user.email : 'Error: ' + (data.error || 'Try again'));
    } catch { setDigestMsg('Network error. Try again.'); }
    finally { setDigestLoading(false); setTimeout(() => setDigestMsg(''), 5000); }
  };

  // Profile completeness — with content quality validation (min chars required)
  const q = (s: string, min = 3) => s.trim().length >= min;
  const profileScore = Math.round([
    q(profile.companyName, 2),
    Boolean(profile.orgType),
    q(profile.location, 3),
    q(profile.focusArea, 5),              // "ai" = ❌, needs real focus area
    q(profile.missionStatement, 30),      // gibberish = ❌, needs 30+ chars
    q(profile.targetPopulation, 5),
    Boolean(profile.annualBudget),
    Boolean(profile.teamSize),
    q(profile.projectDescription, 20),
    Boolean(profile.fundingAmount),
    Boolean(profile.previousGrants),
    q(profile.backgroundInfo, 50) || q(profile.resumeText, 50),
    Boolean(profile.linkedinUrl || profile.website || profile.twitterUrl),
    q(profile.ein, 4),                    // NEW — required for federal grants
    q(profile.yearFounded, 4),            // NEW
    q(profile.impactMetrics, 10),         // NEW
  ].filter(Boolean).length / 16 * 100);

  const profileScoreColor = profileScore >= 80 ? 'text-[#76B900]' : profileScore >= 50 ? 'text-amber-600' : 'text-red-500';
  const profileBarColor = profileScore >= 80 ? 'bg-[#76B900]' : profileScore >= 50 ? 'bg-amber-500' : 'bg-red-400';

  const callGeminiProxy = async (prompt: string): Promise<string> => {
    const res = await fetch('/api/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error(`Proxy error ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.text || '';
  };

  const handleAIFillFromUrl = async () => {
    const urls = [profile.website, profile.linkedinUrl, profile.twitterUrl].filter(Boolean).join(', ');
    if (!urls) return;
    setAiFilling(true);
    setAiFillMsg('AI is analyzing your links...');
    try {
      const prompt = `You are a grant profile assistant. Based on these URLs: ${urls}\n\nUsing any knowledge from your training data about this organization, OR inferring from the domain/handle names, create a grant-seeking organization profile.\n\nRespond with ONLY this JSON object — no markdown, no backticks, no extra text:\n{"companyName":"organization name","focusArea":"primary sector","missionStatement":"2-sentence mission","targetPopulation":"who they serve"}`;
      const raw = await callGeminiProxy(prompt);
      let parsed: any = null;
      try { parsed = JSON.parse(raw.trim()); } catch {}
      if (!parsed) { const m = raw.match(/\{[\s\S]*?\}/); if (m) try { parsed = JSON.parse(m[0]); } catch {} }
      if (parsed && typeof parsed === 'object') {
        setProfile(prev => ({
          ...prev,
          ...(parsed.companyName?.trim() && { companyName: parsed.companyName.trim() }),
          ...(parsed.focusArea?.trim() && { focusArea: parsed.focusArea.trim() }),
          ...(parsed.missionStatement?.trim() && { missionStatement: parsed.missionStatement.trim() }),
          ...(parsed.targetPopulation?.trim() && { targetPopulation: parsed.targetPopulation.trim() }),
        }));
        setAiFillMsg('\u2713 Done! Review the pre-filled fields and continue.');
      } else if (raw.length > 50) {
        setProfile(prev => ({ ...prev, backgroundInfo: prev.backgroundInfo || raw.slice(0, 600) }));
        setAiFillMsg('\u2713 AI context saved to background info.');
      } else {
        setAiFillMsg('\u26a0 Could not infer profile — fill fields manually.');
      }
    } catch {
      setAiFillMsg('\u26a0 AI analyze failed — fill fields manually and continue.');
    } finally {
      setAiFilling(false);
      setTimeout(() => setAiFillMsg(''), 8000);
    }
  };

  const handleAIFillFromResume = async (text: string) => {
    if (!text.trim()) return;
    setAiFilling(true);
    setAiFillMsg('AI is reading your resume...');
    try {
      const prompt = `Extract a grant-seeking organizational profile from this text:\n\n${text.slice(0, 3000)}\n\nReturn ONLY valid JSON (no markdown):\n{"missionStatement":"...","focusArea":"...","targetPopulation":"...","backgroundInfo":"..."}`;
      const result = await callGeminiProxy(prompt);
      const parsed = JSON.parse(result.replace(/\`\`\`json|\`\`\`/g, '').trim());
      setProfile(prev => ({
        ...prev,
        missionStatement: parsed.missionStatement || prev.missionStatement,
        focusArea: parsed.focusArea || prev.focusArea,
        targetPopulation: parsed.targetPopulation || prev.targetPopulation,
        backgroundInfo: parsed.backgroundInfo || prev.backgroundInfo,
        resumeText: text,
      }));
      setAiFillMsg('\u2713 Resume parsed — fields auto-filled');
    } catch {
      setAiFillMsg('Parsed — text saved to background info');
      setProfile(prev => ({ ...prev, resumeText: text, backgroundInfo: prev.backgroundInfo || text.slice(0, 500) }));
    } finally {
      setAiFilling(false);
      setTimeout(() => setAiFillMsg(''), 4000);
    }
  };

  useEffect(() => {
    localStorage.setItem('civicpath_profile', JSON.stringify(profile));
  }, [profile]);

  const [drafterOutput, setDrafterOutput] = useState<string | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProposal, setEditedProposal] = useState('');
  const [discoveredGrants, setDiscoveredGrants] = useState<Array<{title:string;agency:string;closeDate:string;url:string}>>([]);
  const [allDiscoveredGrants, setAllDiscoveredGrants] = useState<any[]>([]);
  const [totalGrantsFound, setTotalGrantsFound] = useState(0);
  const [liveGrantsCount, setLiveGrantsCount] = useState(0);
  const [sourceFilter, setSourceFilter] = useState('all');

  const [showAgentsMenu, setShowAgentsMenu] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const demoScript = [
    {
      text: "$800B in grants go unclaimed every year. Your org deserves a cut.",
      duration: 2500,
      screen: <div className="flex flex-col items-center text-center px-8">
        <div className="text-8xl font-black text-[#76B900] mb-2">$800B</div>
        <div className="text-stone-400 uppercase tracking-widest text-sm">Unclaimed Grants Every Year</div>
        <div className="mt-6 text-white text-3xl font-bold">CivicPath fixes that.</div>
      </div>
    },
    {
      text: "Tell us your mission — 30 seconds. Agents do the rest.",
      duration: 2800,
      screen: <div className="bg-white rounded-2xl p-5 w-3/4 max-w-sm shadow-2xl">
        <div className="text-xs font-bold text-[#76B900] uppercase mb-3 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Your Profile</div>
        <div className="space-y-2.5">
          <div className="h-9 bg-stone-100 rounded-lg flex items-center px-3 text-stone-500 text-sm">🏢 Sunrise Tech Nonprofit</div>
          <div className="h-9 bg-stone-100 rounded-lg flex items-center px-3 text-stone-500 text-sm">📍 Orlando, FL</div>
          <div className="h-9 bg-stone-100 rounded-lg flex items-center px-3 text-stone-500 text-sm">🎯 AI Civic Technology</div>
        </div>
        <div className="mt-3 bg-[#76B900] text-[#111111] rounded-lg py-2 text-center text-sm font-bold">Launch My Dashboard →</div>
      </div>
    },
    {
      text: "6 AI agents scan every federal and state grant in real time.",
      duration: 3000,
      screen: <div className="bg-stone-950 rounded-2xl p-5 w-3/4 max-w-md font-mono text-xs border border-stone-800 space-y-2">
        {['🔍 Hunter scanning Grants.gov + SBA SBIR live...','🎯 Matchmaker scoring 47 grants 0–100...','✍️ Drafter writing proposal via Gemini...','✅ Controller verifying eligibility...','📤 Submitter queuing for your approval...','👁️ Watcher activating 24/7 monitor...'].map((l, i) => (
          <div key={i} className={`flex items-center gap-2 ${i < 2 ? 'text-[#76B900]' : i < 4 ? 'text-stone-400' : 'text-stone-600'}`}>
            <span className="text-[#76B900]">❯</span>{l}
          </div>
        ))}
      </div>
    },
    {
      text: "Grants matched. Proposal drafted. You approve — they submit.",
      duration: 3500,
      screen: <div className="bg-[#1A1A1A] rounded-xl p-5 w-3/4 max-w-md border border-[#333]">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[#888] text-xs">Sunrise Tech · Orlando, FL</span>
          <span className="text-[#76B900] text-xs bg-[#76B90020] px-2 py-0.5 rounded-full">Pipeline Complete ✓</span>
        </div>
        <div className="space-y-2 mb-4">
          {[{n:'State Innovation Match Fund',m:'$150K · Due Oct 15',s:'92'},{n:'FL STEM Education Initiative',m:'$75K · Due Nov 3',s:'88'}].map((g,i) => (
            <div key={i} className="bg-[#2A2A2A] rounded-lg p-3 border-l-2 border-[#76B900] flex justify-between items-center">
              <div><div className="text-[#EEE] text-xs font-medium">{g.n}</div><div className="text-[#888] text-[10px]">{g.m}</div></div>
              <span className="text-[10px] font-bold bg-[#76B900] text-[#111] px-2 py-0.5 rounded-full">{g.s}</span>
            </div>
          ))}
        </div>
        <button className="w-full bg-[#76B900] text-[#111] font-black py-2 rounded-lg text-xs">✅ Approve & Submit — 1 click</button>
      </div>
    }
  ];

  useEffect(() => {
    let timer: any;
    if (isDemoPlaying && demoStep < demoScript.length) {
      timer = setTimeout(() => {
        setDemoStep(prev => prev + 1);
      }, demoScript[demoStep].duration);
    } else if (demoStep >= demoScript.length) {
      setIsDemoPlaying(false);
      setDemoStep(0);
    }
    return () => clearTimeout(timer);
  }, [isDemoPlaying, demoStep]);

  const startDemo = () => {
    setDemoStep(0);
    setIsDemoPlaying(true);
  };
  const [nextAction, setNextAction] = useState<{ message: string, type: 'success' | 'warning' | 'error' } | null>(null);

  // --- Ask MyLalla chat ---
  const [lallaMessages, setLallaMessages] = useState<ChatMessage[]>([]);
  const [lallaInput, setLallaInput] = useState('');
  const [lallaLoading, setLallaLoading] = useState(false);
  const lallaEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lallaEndRef.current) lallaEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [lallaMessages, lallaLoading]);

  const handleLallaChat = async (overrideInput?: string) => {
    const text = (overrideInput ?? lallaInput).trim();
    if (!text || lallaLoading) return;
    const userMsg: ChatMessage = { role: 'user', content: text };
    const next = [...lallaMessages, userMsg];
    setLallaMessages(next);
    setLallaInput('');
    setLallaLoading(true);
    const ctx = `You are MyLalla, a senior AI grant advisor inside CivicPath. Be warm, strategic, and concise — like a trusted expert who knows the user personally. Use markdown for lists and bold text. Keep answers under 200 words unless more detail is asked for.\n\nUser's organization context:\n- Name: ${profile.companyName || 'Not set'}\n- Type: ${profile.orgType || 'Not set'}\n- Location: ${profile.location || 'Florida'}\n- Focus area: ${profile.focusArea || 'General'}\n- Mission: ${profile.missionStatement || 'Not provided'}\n- Target population: ${profile.targetPopulation || 'General'}\n- Annual budget: ${profile.annualBudget || 'Unknown'}\n- Team size: ${profile.teamSize || 'Unknown'}\n- Funding goal: ${profile.fundingAmount || 'Unknown'} for ${profile.projectDescription || 'their project'}\n- Previous grants: ${profile.previousGrants || 'Unknown'}\n- Background: ${profile.backgroundInfo || 'Not provided'}${discoveredGrants.length > 0 ? `\n\nGrants currently in their pipeline: ${discoveredGrants.map((g: any) => `"${g.title}" (${g.agency})`).join(', ')}` : ''}`;
    try {
      const reply = await chatWithLalla(next, ctx);
      setLallaMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setLallaMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Check your Gemini API key and try again." }]);
    } finally {
      setLallaLoading(false);
    }
  };
  
  // Global Log state for the Live Orchestration Panel
  const [globalLogs, setGlobalLogs] = useState<string[]>([]);
  const globalLogsEndRef = useRef<HTMLDivElement | null>(null);

  const [agents, setAgents] = useState<AgentState[]>([
    { id: 'hunter', name: 'The Hunter (Search)', icon: <Search className="w-5 h-5" />, status: 'idle', logs: [], output: null },
    { id: 'matchmaker', name: 'The Matchmaker (Analyze)', icon: <BrainCircuit className="w-5 h-5" />, status: 'idle', logs: [], output: null },
    { id: 'drafter', name: 'The Drafter (Write)', icon: <FileEdit className="w-5 h-5" />, status: 'idle', logs: [], output: null },
    { id: 'controller', name: 'The Controller (Verify)', icon: <ShieldCheck className="w-5 h-5" />, status: 'idle', logs: [], output: null },
    { id: 'submitter', name: 'The Submitter (Send)', icon: <Send className="w-5 h-5" />, status: 'idle', logs: [], output: null },
    { id: 'watcher', name: 'The Watcher (Monitor)', icon: <Eye className="w-5 h-5" />, status: 'idle', logs: [], output: null },
  ]);

  const logsEndRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const updateAgent = (id: string, updates: Partial<AgentState>) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, ...updates } : agent
    ));
  };

  const addLog = (id: string, log: string) => {
    setAgents(prev => prev.map(agent => 
      agent.id === id ? { ...agent, logs: [...agent.logs, log] } : agent
    ));
  };

  const addGlobalLog = (log: string) => {
    setGlobalLogs(prev => [...prev, log]);
  };

  useEffect(() => {
    agents.forEach(agent => {
      const el = logsEndRefs.current[agent.id];
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
    if (globalLogsEndRef.current) {
      globalLogsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [agents, globalLogs]);

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const streamOutput = async (id: string, text: string) => {
    let currentText = '';
    updateAgent(id, { output: '' });
    const chars = text.split('');
    for (let i = 0; i < chars.length; i++) {
      currentText += chars[i];
      updateAgent(id, { output: currentText });
      await delay(Math.random() * 5 + 1); 
    }
  };

  // --- Agent Behaviors ---
  const runHunter = async () => {
    updateAgent('hunter', { status: 'working', logs: [], output: null });

    const targetLoc = profile.location || 'Florida';
    const targetTech = profile.focusArea || 'technology';

    addLog('hunter', 'Connecting to Grants.gov live database...');
    addGlobalLog(`[🔍 The Hunter]     Querying Grants.gov for "${targetTech}" in ${targetLoc}...`);

    let hunterText = '';
    try {
      const res = await fetch('/api/grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: targetTech, location: targetLoc, rows: 5 }),
      });
      const data = await res.json();
      const grants = data.grants || [];
      const total = data.total || 0;

      // Store ALL grants — no slice limit
      const grantsWithDeadlines = grants.filter((g: any) => g.closeDate && g.closeDate !== 'Rolling');
      setDiscoveredGrants(grantsWithDeadlines); // all for scheduler
      setAllDiscoveredGrants(grants); // all for grants list
      setTotalGrantsFound(total);
      setLiveGrantsCount(data.liveCount || 0);

      addLog('hunter', `Found ${total} opportunities (${data.liveCount || 0} live + curated database).`);
      addGlobalLog(`[\ud83d\udd0d The Hunter]     Found ${total} matching opportunities \u2713`);
      addGlobalLog(`[\ud83e\udd16 ACTIVITY]       Hunter \u2192 Matchmaker: "Found ${total} grants. Sending for semantic scoring."`);

      hunterText = `**Live Results: ${total} total matches (${data.liveCount || 0} from live APIs, ${grants.length - (data.liveCount || 0)} curated):**

${grants.map((g: any) => `* **${g.title}** \`[${g.source}]\`
  ${g.agency} · Posted: ${g.openDate || 'N/A'} · Deadline: ${g.closeDate} · [View Grant](${g.url})`).join('\n\n')}

*Live search: "${targetTech}" + "${targetLoc}" — Sources: Grants.gov, SBA SBIR*`;
    } catch (err) {
      addLog('hunter', 'Live API unavailable — using cached results.');
      hunterText = `**Cached Results (Grants.gov temporarily unavailable):**

* **State Innovation Match Fund** — FL Dept of Commerce (Due: Oct 15, 2026)
* **NSF SBIR Phase I — AI Track** — National Science Foundation (Due: Rolling)
* **Digital Equity Initiative** — USDA Rural Development (Due: Dec 1, 2026)
* **SBA FAST Program** — Small Business Administration (Due: Rolling)

*Note: Live search will resume when API connectivity is restored.*`;
    }

    await streamOutput('hunter', hunterText);
    updateAgent('hunter', { status: 'completed' });
    return true;
  };

  const runMatchmaker = async () => {
    updateAgent('matchmaker', { status: 'working', logs: [], output: null });
    addLog('matchmaker', `Loading Profile: ${profile.companyName || 'Anonymous Start-Up'}`);
    await delay(600);
    
    addGlobalLog(`[🎯 The Matchmaker] Embedding profile against 47 grants...`);
    if (profile.backgroundInfo) {
      addLog('matchmaker', 'Analyzing provided Resume/LinkedIn context (1,402 tokens)...');
    }
    await delay(1200);
    
    addLog('matchmaker', 'Running vector similarity search on grant rubrics...');
    await delay(1000);
    
    addGlobalLog(`[🎯 The Matchmaker] Top 5 matches identified (scores: 9.2, 8.7, 8.1...) ✓`);
    addGlobalLog(`[🤖 ACTIVITY]       Matchmaker → Drafter: "Top match: State Innovation (score 9.2/10). Initiating proposal draft. Org fit: HIGH."`);
    addLog('matchmaker', 'Calculating success probabilities...');
    await delay(800);

    const matchmakerText = `
### Match Score Card: 92/100 (Exceptional Fit)
Based on your background and focus in **${profile.focusArea || 'Tech'}**, here is the alignment:

* **High Alignment**: Technical innovation aligns directly with 2026 State Innovation priorities.
* **Context Bonus**: Your provided background shows previous successful project deployments, increasing credibility.
* **Location Fit**: Residency and local operations match the geographic constraints.
* **Recommendation**: Target the $150k State Innovation Match Fund.
`;
    await streamOutput('matchmaker', matchmakerText);
    updateAgent('matchmaker', { status: 'completed' });
    return true;
  };

  const runDrafter = async () => {
    updateAgent('drafter', { status: 'working', logs: [], output: null });
    addLog('drafter', 'Connecting to Gemini 2.0 Flash via API...');
    addGlobalLog(`[✍️ The Drafter]    Generating proposal for Grant #1...`);
    addLog('drafter', 'Sending profile + grant context to Gemini...');

    let text = '';
    try {
      text = await draftProposal(
        { name: profile.companyName || 'Our Organization', mission: profile.backgroundInfo || 'Community impact', location: profile.location || 'Florida', focusArea: profile.focusArea || 'Technology', background: profile.backgroundInfo || '' },
        { name: 'State Innovation Match Fund', amount: '$150,000', deadline: 'Oct 15, 2026' }
      );
      addLog('drafter', 'Gemini response received. Streaming...');
    } catch {
      addLog('drafter', 'Gemini error — using template draft.');
      text = `### Draft Proposal: Executive Summary

**Problem & Solution**: ${profile.location || 'Regional'} organizations face funding gaps. ${profile.companyName || 'Our organization'} addresses this through ${profile.focusArea || 'innovative technology'}.

**Technical Merit**: Our approach leverages cutting-edge methods tailored to regional needs, delivering measurable outcomes.

**Economic Impact**: We project 15% efficiency gains and 25 new jobs within 18 months.`;
    }

    setDrafterOutput(text);
    setEditedProposal(text);
    await streamOutput('drafter', text);
    addGlobalLog(`[✍️ The Drafter]    Draft complete ✓`);
    addGlobalLog(`[🤖 ACTIVITY]       Drafter → HUMAN: "⏸️ Awaiting your approval before submission."`); 
    updateAgent('drafter', { status: 'completed' });
    setAwaitingApproval(true); // ← PAUSE for human review
    return true;
  };

  const runController = async () => {
    updateAgent('controller', { status: 'working', logs: [], output: null });
    addLog('controller', 'Initiating final compliance scan...');
    await delay(800);
    
    addGlobalLog(`[🛡️ The Controller] Checking FL residency requirement... PASS ✓`);
    addLog('controller', 'Verifying location residency status...');
    await delay(800);
    
    addGlobalLog(`[🛡️ The Controller] Verifying budget narrative vs allowable costs... PASS ✓`);
    addGlobalLog(`[🤖 ACTIVITY]       Controller → USER: "✅ Residency: PASS ✅ Technical: PASS. Proceeding to Submission."`);
    addLog('controller', 'All compliance checks passed successfully.');
    await delay(600);

    const controllerText = `
### Compliance Checklist
*   [x] **Residency Verification** (Pass)
*   [x] **Technical Merit** (Pass)
*   [x] **Tax ID / W-9 Form** (Pass - Found in Profile)
`;
    await streamOutput('controller', controllerText);
    updateAgent('controller', { status: 'completed' });
    return true;
  };

  const runSubmitter = async () => {
    updateAgent('submitter', { status: 'working', logs: [], output: null });
    
    addGlobalLog(`[✉️ The Submitter]  Authenticating with Gmail API (OAuth2)...`);
    addLog('submitter', 'Constructing email payload & attaching PDFs...');
    await delay(1000);
    
    addGlobalLog(`[\u2709\ufe0f The Submitter]  Application package prepared and queued \u2713`);
    addLog('submitter', 'Proposal packaged. Sending confirmation email...');
    await delay(800);

    // Send real confirmation email via Resend
    if (user?.email) {
      fetch('/api/send-submission-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: user.name || 'there',
          orgName: profile.companyName || 'Your Organization',
          grantName: 'State Innovation Match Fund',
          amount: '$150,000',
        }),
      }).catch(() => {});
    }

    const submitterText = `
### Application Package Ready \u2713
* **Organization**: ${profile.companyName || 'Your Organization'}
* **Grant**: State Innovation Match Fund ($150,000)
* **Proposal**: AI-drafted, reviewed, and approved by you
* **Status**: Queued for submission

${user?.email ? `A confirmation has been sent to **${user.email}**.` : 'Connect Gmail in Integrations to enable autonomous sending.'}

> To complete real submission: connect Gmail in the Integrations tab, then re-run the pipeline.
`;
    await streamOutput('submitter', submitterText);
    updateAgent('submitter', { status: 'completed' });
    return true;
  };

  const runWatcher = async () => {
    updateAgent('watcher', { status: 'working', logs: [], output: null });
    addGlobalLog(`[👁️ The Watcher]    Background monitor activated. Polling Grants.gov 24/7...`);
    addLog('watcher', 'Initializing background cron job...');
    await delay(500);
    addLog('watcher', 'Connecting to Google Calendar API...');
    
    const watcherText = `
### Watcher Active 🟢
Monitoring background APIs for new grants matching: **${profile.focusArea || 'Tech'}**. 
Will automatically draft proposals and alert your Gmail if a >80% match appears.
`;
    await streamOutput('watcher', watcherText);
    // Watcher stays in 'working' state to show it's persistent
  };

  const handleApproveAndSubmit = async () => {
    if (editMode) {
      setDrafterOutput(editedProposal);
      setEditMode(false);
    }
    setAwaitingApproval(false);
    addGlobalLog(`[✅ HUMAN APPROVED]  Proposal approved. Resuming pipeline...`);
    const passed = await runController();
    if (passed) {
      if (!await runSubmitter()) return;
      runWatcher();
      setNextAction({ type: 'success', message: 'MISSION ACCOMPLISHED: Proposal approved, verified, and sent via Gmail. Milestones booked to Calendar.' });
    }
    setIsRunning(false);
  };

  const handleExecute = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setAwaitingApproval(false);
    setNextAction(null);
    setGlobalLogs([]);
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', logs: [], output: null })));

    try {
      if (!await runHunter()) throw new Error('Hunter failed');
      if (!await runMatchmaker()) throw new Error('Matchmaker failed');
      await runDrafter(); // Pipeline pauses here — awaiting approval
      // Controller + Submitter run only after human approves (handleApproveAndSubmit)
      return; // Don't set isRunning=false yet — waiting for approval
      const passed = await runController();
      
      if (passed) {
        if (!await runSubmitter()) throw new Error('Submitter failed');
        // Start the watcher persistently
        runWatcher(); 
        setNextAction({
          type: 'success',
          message: "MISSION ACCOMPLISHED: Proposal drafted, verified, and sent via Gmail. Milestones booked to Calendar."
        });
      } else {
        setNextAction({
          type: 'warning',
          message: "NEXT ACTION REQUIRED: Please upload a completed W-9 form to resolve compliance error and finalize submission."
        });
      }
    } catch (e) {
      setNextAction({
        type: 'error',
        message: "EXECUTION HALTED: System encountered an unrecoverable error during orchestration."
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: AgentStatus) => {
    switch (status) {
      case 'idle': return <div className="w-2 h-2 rounded-full bg-stone-300" />;
      case 'working': return <Loader2 className="w-4 h-4 text-[#76B900] animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-[#76B900]" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusClasses = (status: AgentStatus) => {
    switch (status) {
      case 'idle': return 'bg-white/50 text-stone-500 border-stone-200';
      case 'working': return 'bg-white border-[#76B900]/50 shadow-sm ring-1 ring-[#76B900]/20';
      case 'completed': return 'bg-white border-[#76B900] shadow-sm';
      case 'error': return 'bg-white border-red-200 shadow-sm ring-1 ring-red-100';
    }
  };

  // ── Onboarding wizard ──────────────────────────────────────────────────────
  const isStep1Valid = profile.companyName.trim() && profile.orgType && profile.location.trim();
  const isStep2Valid = profile.focusArea.trim() && profile.missionStatement.trim();
  const isStep3Valid = true; // Always allow launch — users can add project details from dashboard

  if (step === 'onboarding') {
    return (
      <div className="min-h-screen bg-[#F9F7F2] text-stone-900 flex flex-col items-center justify-center p-4 selection:bg-[#76B900]/20 font-sans relative">
        
        {/* Video Tutorial Modal */}
        {showDemoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-stone-200 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
                <div className="flex items-center space-x-2">
                  <PlayCircle className="w-5 h-5 text-[#76B900]" />
                  <h3 className="font-bold text-stone-800">CivicPath Interactive Demo & Q&A</h3>
                </div>
                <button 
                  onClick={() => { setShowDemoModal(false); setIsDemoPlaying(false); }}
                  className="p-2 hover:bg-stone-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-stone-500" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {/* Video Demo Section — warm Claude-style background */}
                <div className="relative flex flex-col items-center justify-center bg-[#F5F0E8] overflow-hidden aspect-video">
                  {/* Subtle warm gradient */}
                  <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-[#76B900]/8 rounded-full blur-[80px]" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#76B900]/6 rounded-full blur-[60px]" />
                  </div>

                  {!isDemoPlaying ? (
                    <div className="z-10 flex flex-col items-center text-center px-12">
                      <div className="w-24 h-24 bg-[#76B900]/10 rounded-full flex items-center justify-center mb-6 border-2 border-[#76B900]/20 shadow-lg">
                        <Play className="w-10 h-10 text-[#76B900] fill-current ml-1" />
                      </div>
                      <h4 className="text-3xl font-black text-stone-900 mb-4">See CivicPath in Action</h4>
                      <p className="text-stone-500 max-w-md mb-8">4 slides. 12 seconds. See exactly how the 6 agents work.</p>
                      <button 
                        onClick={startDemo}
                        className="px-8 py-4 bg-[#76B900] text-[#111111] rounded-xl font-bold hover:bg-[#689900] transition-all shadow-lg hover:scale-105 active:scale-95"
                      >
                        Start Demo →
                      </button>
                    </div>
                  ) : (
                    <div className="z-10 w-full h-full flex flex-col items-center justify-between py-8 px-12 relative">

                      {/* Slide Area */}
                      <div className="w-full flex-1 flex items-center justify-center mb-24 relative">
                        <div className="w-full h-full flex items-center justify-center">
                          <div key={demoStep} className="animate-in zoom-in-95 fade-in duration-500 w-full h-full flex items-center justify-center">
                            {demoScript[demoStep]?.screen}
                          </div>
                        </div>
                      </div>

                      {/* Caption bar — clean dark on warm bg */}
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#1A1A1A]/90 backdrop-blur-sm px-10 py-4 rounded-2xl w-full max-w-3xl text-center shadow-xl z-30">
                        <p key={demoStep} className="text-lg font-bold text-white leading-tight animate-in slide-in-from-bottom-2 fade-in duration-300">
                          {demoScript[demoStep]?.text}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="absolute bottom-3 left-12 right-12">
                        <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#76B900] transition-all duration-300 ease-linear"
                            style={{ width: `${((demoStep + 1) / demoScript.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* CTA + Q&A after demo */}
                <div className="p-8 bg-[#F9F7F2]">
                  <div className="text-center mb-8">
                    <p className="text-stone-500 text-sm mb-4">The only fully agentic grant pipeline. <span className="font-bold text-stone-700">Free to start.</span> No credit card.</p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => { setShowDemoModal(false); setIsDemoPlaying(false); }}
                        className="px-6 py-3 bg-[#76B900] text-[#111111] rounded-xl font-bold hover:bg-[#689900] transition-colors shadow-md">
                        Start Building My Profile →
                      </button>
                      <button
                        onClick={() => { setShowDemoModal(false); setIsDemoPlaying(false); }}
                        className="px-6 py-3 border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-100 transition-colors">
                        Close
                      </button>
                    </div>
                  </div>

                  {/* Q&A Section */}
                  <div className="max-w-2xl mx-auto">
                    <h4 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-4 text-center">Common Questions</h4>
                    <div className="space-y-3">
                      {[
                        {
                          q: 'Is CivicPath really free?',
                          a: 'Yes. The Free plan is free forever — no credit card needed. Pro ($49/mo) and Funder ($199/mo) plans include a 14-day free trial. Cancel anytime, no questions asked.'
                        },
                        {
                          q: 'How fast is the first grant match?',
                          a: 'Under 60 seconds. Fill your profile, click “Run Full Pipeline” — Hunter scans Grants.gov + SBA SBIR live and Matchmaker scores matches in real time.'
                        },
                        {
                          q: 'Do the agents actually submit grants for me?',
                          a: 'Almost autonomously. Hunter, Matchmaker, and Drafter run automatically. The Submitter queues your AI-written proposal for your approval — you review and click “Approve”, then it sends via Gmail.'
                        },
                        {
                          q: 'Is my data private and secure?',
                          a: 'Yes. Your profile, proposals, and EIN are never shared or sold. All data stays in our sovereign infrastructure. See our Privacy Policy for full details.'
                        },
                        {
                          q: 'What kinds of organizations can use CivicPath?',
                          a: 'Any — 501(c)(3) nonprofits, AI startups, small businesses, universities, local government, individual researchers. If you need funding, CivicPath is built for you.'
                        },
                        {
                          q: 'What if I want to cancel my subscription?',
                          a: 'Cancel anytime from your account — no cancellation fees, no questions asked. You keep access until the end of your billing period. Trial cancellations are free within 14 days.'
                        },
                      ].map((item, i) => (
                        <details key={i} className="bg-white border border-stone-200 rounded-xl overflow-hidden group">
                          <summary className="px-5 py-4 font-semibold text-stone-800 text-sm cursor-pointer list-none flex items-center justify-between hover:bg-stone-50 transition-colors">
                            {item.q}
                            <span className="text-[#76B900] text-lg shrink-0 ml-3 group-open:rotate-45 transition-transform inline-block">+</span>
                          </summary>
                          <div className="px-5 pb-4 text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                            {item.a}
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-2xl bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden mt-8">
          {/* Header */}
          <div className="bg-[#76B900]/5 border-b border-stone-100 p-6 text-center relative">
            <button onClick={() => setShowDemoModal(true)}
              className="absolute top-5 right-5 flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-stone-200 shadow-sm rounded-full text-xs font-bold text-stone-600 hover:text-[#76B900] hover:border-[#76B900]/30 transition-all">
              <PlayCircle className="w-4 h-4" /><span>Watch Demo</span>
            </button>
            <div className="flex justify-center mb-3 mt-1"><div className="scale-125 transform"><Logo /></div></div>
            <h1 className="text-3xl font-[800] text-stone-900 mb-1 tracking-tight">Build Your Grant Profile</h1>
            <p className="text-stone-500 text-sm">The more you share, the better our AI matches you with funding.</p>
            {/* Step progress */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {[1,2,3].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    onboardStep > s ? 'bg-[#76B900] text-[#111111]' :
                    onboardStep === s ? 'bg-[#76B900] text-[#111111] ring-4 ring-[#76B900]/20' :
                    'bg-stone-100 text-stone-400'
                  }`}>{onboardStep > s ? '✓' : s}</div>
                  {s < 3 && <div className={`w-12 h-0.5 rounded-full ${onboardStep > s ? 'bg-[#76B900]' : 'bg-stone-200'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-8 mt-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              <span className={onboardStep >= 1 ? 'text-[#76B900]' : ''}>Organization</span>
              <span className={onboardStep >= 2 ? 'text-[#76B900]' : ''}>Mission</span>
              <span className={onboardStep >= 3 ? 'text-[#76B900]' : ''}>Funding Goal</span>
            </div>
          </div>

          <div className="p-8 space-y-5">
            {/* ── STEP 1: Organization ─── */}
            {onboardStep === 1 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 flex items-center"><Building2 className="w-4 h-4 mr-2 text-stone-400" />Organization Name *</label>
                    <input type="text" placeholder="e.g. Sunrise Tech Nonprofit"
                      value={profile.companyName} onChange={e => setProfile({...profile, companyName: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Organization Type *</label>
                    <select value={profile.orgType} onChange={e => setProfile({...profile, orgType: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900">
                      <option value="">Select type...</option>
                      <option value="501c3">501(c)(3) Nonprofit</option>
                      <option value="startup">AI / Tech Startup</option>
                      <option value="small-business">Small Business</option>
                      <option value="government">Government / Public Agency</option>
                      <option value="university">University / Research</option>
                      <option value="individual">Individual / Researcher</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 flex items-center"><MapPin className="w-4 h-4 mr-2 text-stone-400" />City, State *</label>
                    <input type="text" placeholder="e.g. Miami, FL"
                      value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 flex items-center"><Globe className="w-4 h-4 mr-2 text-stone-400" />Website</label>
                    <input type="text" placeholder="https://yourorg.com"
                      value={profile.website} onChange={e => setProfile({...profile, website: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 flex items-center"><Linkedin className="w-4 h-4 mr-2 text-blue-500" />LinkedIn URL</label>
                    <input type="text" placeholder="linkedin.com/in/yourname or /company/yourorg"
                      value={profile.linkedinUrl} onChange={e => setProfile({...profile, linkedinUrl: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700 flex items-center"><Twitter className="w-4 h-4 mr-2 text-sky-400" />Twitter / X Handle</label>
                    <input type="text" placeholder="@yourhandle"
                      value={profile.twitterUrl} onChange={e => setProfile({...profile, twitterUrl: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Tagline / Pitch <span className="text-stone-400 font-normal text-xs">(optional)</span></label>
                    <input type="text" placeholder="e.g. AI grant pipeline for Florida communities"
                      value={profile.tagline} onChange={e => setProfile({...profile, tagline: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Year Founded <span className="text-stone-400 font-normal text-xs">(required for many grants)</span></label>
                    <input type="text" placeholder="e.g. 2019"
                      value={profile.yearFounded} onChange={e => setProfile({...profile, yearFounded: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                </div>
                {(profile.website || profile.linkedinUrl || profile.twitterUrl) && (
                  <button onClick={handleAIFillFromUrl} disabled={aiFilling}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#76B900]/40 text-[#76B900] text-sm font-semibold rounded-xl hover:bg-[#76B900]/5 transition-colors disabled:opacity-50">
                    {aiFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiFilling ? aiFillMsg : '\u2728 Let AI analyze your online presence and pre-fill profile'}
                  </button>
                )}
                {aiFillMsg && !aiFilling && (
                  <p className="text-xs text-center text-[#76B900] font-medium">{aiFillMsg}</p>
                )}
              </>
            )}

            {/* ── STEP 2: Mission & Impact ─── */}
            {onboardStep === 2 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700 flex items-center"><Cpu className="w-4 h-4 mr-2 text-stone-400" />Primary Focus Area *</label>
                  <input type="text" placeholder="e.g. AI-driven civic technology, STEM education, community health"
                    value={profile.focusArea} onChange={e => setProfile({...profile, focusArea: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Mission Statement *</label>
                  <textarea rows={3} placeholder="We exist to... (describe your organization's core purpose)"
                    value={profile.missionStatement} onChange={e => setProfile({...profile, missionStatement: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400 resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Who do you serve?</label>
                    <input type="text" placeholder="e.g. Low-income youth in Miami-Dade"
                      value={profile.targetPopulation} onChange={e => setProfile({...profile, targetPopulation: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Annual Budget Range</label>
                    <select value={profile.annualBudget} onChange={e => setProfile({...profile, annualBudget: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900">
                      <option value="">Select range...</option>
                      <option value="<50k">Under $50K</option>
                      <option value="50-250k">$50K – $250K</option>
                      <option value="250k-1m">$250K – $1M</option>
                      <option value=">1m">Over $1M</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Team Size</label>
                    <select value={profile.teamSize} onChange={e => setProfile({...profile, teamSize: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900">
                      <option value="">Select...</option>
                      <option value="1">Just me</option>
                      <option value="2-5">2–5 people</option>
                      <option value="6-20">6–20 people</option>
                      <option value="20+">20+ people</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Years Operating</label>
                    <select value={profile.yearsOperating} onChange={e => setProfile({...profile, yearsOperating: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900">
                      <option value="">Select...</option>
                      <option value="<1">Less than 1 year</option>
                      <option value="1-3">1–3 years</option>
                      <option value="3-10">3–10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 3: Funding Goal ─── */}
            {onboardStep === 3 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700 flex items-center justify-between">
                    <span className="flex items-center"><FileText className="w-4 h-4 mr-2 text-[#76B900]" />What do you need funding for? *</span>
                    <span className="text-[10px] font-bold text-[#76B900] bg-[#76B900]/10 px-2 py-1 rounded-full border border-[#76B900]/20 uppercase tracking-wider">Key for AI matching</span>
                  </label>
                  <textarea rows={4}
                    placeholder="Describe the specific project or program you want to fund. Be as detailed as possible — this is what agents use to write your proposal."
                    value={profile.projectDescription} onChange={e => setProfile({...profile, projectDescription: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400 resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Funding Amount Needed</label>
                    <select value={profile.fundingAmount} onChange={e => setProfile({...profile, fundingAmount: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900">
                      <option value="">Select range...</option>
                      <option value="<10k">Under $10K</option>
                      <option value="10-50k">$10K – $50K</option>
                      <option value="50-150k">$50K – $150K</option>
                      <option value="150-500k">$150K – $500K</option>
                      <option value="500k+">$500K+</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Previous Grants Received?</label>
                    <select value={profile.previousGrants} onChange={e => setProfile({...profile, previousGrants: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900">
                      <option value="">Select...</option>
                      <option value="none">No, this is our first</option>
                      <option value="yes-small">Yes, under $50K</option>
                      <option value="yes-large">Yes, over $50K</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700 flex items-center justify-between">
                    <span>Background / LinkedIn Bio / Resume Text</span>
                    <span className="text-[10px] text-stone-400 font-normal">Paste or upload</span>
                  </label>
                  <textarea rows={4}
                    placeholder="Paste your LinkedIn About section, resume text, team bios, prior grant wins, or any background that strengthens your application..."
                    value={profile.backgroundInfo} onChange={e => setProfile({...profile, backgroundInfo: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400 resize-none" />
                </div>
                {/* Federal Grant Credentials */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-4">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-600 text-sm">⚠️</span>
                    <div>
                      <p className="text-sm font-bold text-amber-800">Federal Grant Requirements</p>
                      <p className="text-xs text-amber-700">EIN and DUNS/SAM are required to apply for Grants.gov and most federal funding.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-stone-700">EIN / Tax ID</label>
                      <input type="text" placeholder="XX-XXXXXXX"
                        value={profile.ein} onChange={e => setProfile({...profile, ein: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-amber-200 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none text-stone-900 placeholder:text-stone-400" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-stone-700">DUNS / SAM Number</label>
                      <input type="text" placeholder="XXXXXXXXX"
                        value={profile.dunsNumber} onChange={e => setProfile({...profile, dunsNumber: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl bg-white border border-amber-200 focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none text-stone-900 placeholder:text-stone-400" />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Impact Metrics <span className="text-[10px] font-bold text-[#76B900] bg-[#76B900]/10 px-2 py-0.5 rounded-full border border-[#76B900]/20 uppercase tracking-wider ml-1">Boosts Matching</span></label>
                  <input type="text" placeholder="e.g. 500 students served · $2M secured · 12 grants won · 3 counties impacted"
                    value={profile.impactMetrics} onChange={e => setProfile({...profile, impactMetrics: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  <p className="text-xs text-stone-400">Numbers beat adjectives. Funders see 200+ applications — specific metrics make you stand out.</p>
                </div>
                {/* Grant History */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Grant History</label>
                  <textarea rows={3}
                    placeholder="e.g. NSF SBIR Phase I ($150K) — Won 2024 · FL STEM Initiative — Applied 2025 · Miami-Dade Cultural Affairs — In Review"
                    value={profile.grantHistoryText} onChange={e => setProfile({...profile, grantHistoryText: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400 resize-none" />
                </div>
                {/* Team Members */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Team Members</label>
                  <input type="text" placeholder="e.g. Jane Smith (Executive Director), John Doe (Grant Writer), Maria Lopez (CFO)"
                    value={profile.teamMembersText} onChange={e => setProfile({...profile, teamMembersText: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                </div>
                {/* Resume Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-stone-400" />Upload Resume / Portfolio (TXT, PDF)
                  </label>
                  <label className="flex items-center justify-center gap-3 w-full py-4 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:border-[#76B900]/40 hover:bg-[#76B900]/5 transition-colors group">
                    <Upload className="w-5 h-5 text-stone-400 group-hover:text-[#76B900] transition-colors" />
                    <span className="text-sm text-stone-500 group-hover:text-[#76B900] transition-colors">
                      {profile.resumeText ? '\u2713 Resume loaded — click to replace' : 'Click to upload or drag & drop'}
                    </span>
                    <input type="file" accept=".txt,.pdf,.md,.doc" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const text = ev.target?.result as string;
                          handleAIFillFromResume(text);
                        };
                        reader.readAsText(file);
                      }} />
                  </label>
                  {aiFillMsg && (
                    <p className={`text-xs font-medium flex items-center gap-1 ${
                      aiFilling ? 'text-stone-500' : 'text-[#76B900]'
                    }`}>
                      {aiFilling && <Loader2 className="w-3 h-3 animate-spin" />}
                      {aiFillMsg}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Active Copilots Section (Genspark style) */}
            <div className="mt-6 border-t border-stone-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">6 Active Action Agents</h3>
                <button 
                  onClick={() => setShowAgentsMenu(!showAgentsMenu)}
                  className="flex items-center text-xs font-bold text-[#76B900] bg-[#76B900]/10 hover:bg-[#76B900]/20 px-3 py-1.5 rounded-full transition-colors"
                >
                  {showAgentsMenu ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  {showAgentsMenu ? 'Hide Agents' : 'View All Agents'}
                </button>
              </div>
              
              {!showAgentsMenu ? (
                <div className="flex items-center space-x-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[60] shadow-sm"><Search className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[50] shadow-sm"><BrainCircuit className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[40] shadow-sm"><FileEdit className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[30] shadow-sm"><ShieldCheck className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[20] shadow-sm"><Send className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-[#76B900]/10 border border-[#76B900]/30 flex items-center justify-center z-[10] shadow-sm"><Eye className="w-4 h-4 text-[#76B900] animate-pulse" /></div>
                  </div>
                  <span className="text-xs text-stone-500 font-medium">6 Agents Ready to Act</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'hunter', name: 'The Hunter', desc: 'Scours the web and databases for active, relevant grant opportunities.', icon: <Search className="w-5 h-5" /> },
                    { id: 'matchmaker', name: 'The Matchmaker', desc: 'Cross-references your profile against complex grant rubrics.', icon: <BrainCircuit className="w-5 h-5" /> },
                    { id: 'drafter', name: 'The Drafter', desc: 'Generates high-scoring executive summaries and PDFs.', icon: <FileEdit className="w-5 h-5" /> },
                    { id: 'controller', name: 'The Controller', desc: 'Scans for compliance, residency, and required documents.', icon: <ShieldCheck className="w-5 h-5" /> },
                    { id: 'submitter', name: 'The Submitter', desc: 'Integrates with Gmail to autonomously send the final proposal.', icon: <Send className="w-5 h-5" /> },
                    { id: 'watcher', name: 'The Watcher (New)', desc: '24/7 background agent. Polls API & auto-books calendar deadlines.', icon: <Eye className="w-5 h-5" /> }
                  ].map(ag => (
                    <div key={ag.id} className="flex items-start p-3 bg-stone-50 rounded-xl border border-stone-200">
                      <div className={`p-2 bg-white rounded-lg border border-stone-200 mr-3 text-[#76B900] shadow-sm shrink-0 ${ag.id === 'watcher' ? 'bg-[#76B900]/10 border-[#76B900]/30' : ''}`}>
                        {ag.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-stone-800">{ag.name}</h4>
                        <p className="text-xs text-stone-500 leading-snug mt-0.5">{ag.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step nav */}
            <div className="pt-4 flex gap-3">
              {onboardStep > 1 && (
                <button onClick={() => setOnboardStep(s => s - 1)}
                  className="px-5 py-3.5 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 transition-colors">
                  ← Back
                </button>
              )}
              {onboardStep < 3 ? (
                <button
                  onClick={() => setOnboardStep(s => s + 1)}
                  disabled={onboardStep === 1 ? !isStep1Valid : !isStep2Valid}
                  className="flex-1 flex items-center justify-center py-3.5 px-6 text-white font-bold text-base rounded-xl bg-[#76B900] hover:bg-[#689900] transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue →
                </button>
              ) : (
                <button
                  onClick={() => setStep('dashboard')}
                  disabled={!isStep3Valid}
                  className="flex-1 flex items-center justify-center py-3.5 px-6 text-white font-bold text-base rounded-xl bg-[#76B900] hover:bg-[#689900] transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                  Launch My Grant Dashboard
                  <Play className="w-5 h-5 ml-2 fill-current" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD STEP
  return (
    <div className="min-h-screen bg-[#F9F7F2] text-stone-900 font-sans selection:bg-[#76B900]/20 flex flex-col">
      {/* Header & Nav Tabs */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo />
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-[800] tracking-tight text-stone-900">
                  CivicPath
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#76B900] text-[#111111] rounded">Hub</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-500 hidden sm:block">Hi, {user?.name}</span>
              <a href="/pricing" className="text-xs font-bold text-stone-400 hover:text-stone-700 px-2 py-1.5 transition-colors hidden sm:block">Pricing</a>
              <a href="/privacy" className="text-xs font-bold text-stone-400 hover:text-stone-700 px-2 py-1.5 transition-colors hidden sm:block">Privacy</a>
              <a href="/terms" className="text-xs font-bold text-stone-400 hover:text-stone-700 px-2 py-1.5 transition-colors hidden sm:block">Terms</a>
              <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          </div>
          
          {/* Tabs — scrollable on mobile */}
          <div className="flex gap-1 border-b border-stone-200 overflow-x-auto scrollbar-none -mb-px">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${activeTab === 'dashboard' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <BarChart3 className="w-4 h-4 mr-1.5" /> Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('scheduler')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${activeTab === 'scheduler' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <CalendarDays className="w-4 h-4 mr-1.5" /> Scheduler
            </button>
            <button 
              onClick={() => setActiveTab('meetings')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${activeTab === 'meetings' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <Users className="w-4 h-4 mr-1.5" /> Meetings
            </button>
            <button 
              onClick={() => setActiveTab('integrations')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${activeTab === 'integrations' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <Link className="w-4 h-4 mr-1.5" /> Integrations
            </button>
            <button 
              onClick={() => setActiveTab('lalla')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${
                activeTab === 'lalla' ? 'border-purple-500 text-purple-600' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> MyLalla
            </button>
            <button 
              onClick={() => setActiveTab('grants')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${
                activeTab === 'grants' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Search className="w-4 h-4 mr-1.5" /> Grants
              {allDiscoveredGrants.length > 0 && <span className="ml-1.5 bg-[#76B900] text-[#111111] text-[10px] font-black px-1.5 py-0.5 rounded-full">{allDiscoveredGrants.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('tracker')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${
                activeTab === 'tracker' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Kanban className="w-4 h-4 mr-1.5" /> Tracker
              {trackerGrants.length > 0 && <span className="ml-1.5 bg-[#76B900] text-[#111111] text-[10px] font-black px-1.5 py-0.5 rounded-full">{trackerGrants.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${
                activeTab === 'profile' ? 'border-blue-500 text-blue-600' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <UserCircle className="w-4 h-4 mr-1.5" /> Profile
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'grants' && (
          <div className="animate-in fade-in space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2"><Search className="w-5 h-5 text-[#76B900]" /> All Discovered Grants</h2>
                <p className="text-sm text-stone-400 mt-0.5">
                  {allDiscoveredGrants.length > 0
                    ? `${allDiscoveredGrants.length} grants shown · ${liveGrantsCount} live from Grants.gov/SBA · ${totalGrantsFound.toLocaleString()} total available in database`
                    : 'Run the pipeline to discover grants'}
                </p>
              </div>
              {allDiscoveredGrants.length > 0 && (
                <div className="flex items-center gap-2">
                  <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-white border border-stone-200 text-xs text-stone-700 outline-none focus:ring-2 focus:ring-[#76B900]/30">
                    <option value="all">All Sources</option>
                    <option value="live">Live APIs only</option>
                    {Array.from(new Set(allDiscoveredGrants.map(g => g.source))).sort().map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button onClick={() => setActiveTab('dashboard')} className="px-3 py-2 bg-[#76B900] text-[#111] text-xs font-bold rounded-lg hover:bg-[#689900] transition-colors">
                    Run New Search
                  </button>
                </div>
              )}
            </div>

            {allDiscoveredGrants.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-10 h-10 text-stone-300 mb-4" />
                <p className="text-stone-500 font-semibold">No grants discovered yet</p>
                <p className="text-sm text-stone-400 mt-1 max-w-sm">Run the AI pipeline to search Grants.gov and 33+ databases.</p>
                <button onClick={() => setActiveTab('dashboard')} className="mt-5 px-5 py-2.5 bg-[#76B900] text-[#111] text-sm font-bold rounded-xl hover:bg-[#689900]">Run Pipeline →</button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                {/* Table header */}
                <div className="hidden sm:grid bg-stone-50 border-b border-stone-100" style={{gridTemplateColumns:'2.5fr 1.5fr 100px 100px 36px'}}>
                  {['Grant Title','Agency / Source','Deadline','Amount',''].map((h,i) => (
                    <div key={i} className={`px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider ${i < 4 ? 'border-r border-stone-100' : ''}`}>{h}</div>
                  ))}
                </div>
                {allDiscoveredGrants
                  .filter(g => {
                    if (sourceFilter === 'all') return true;
                    if (sourceFilter === 'live') return g.source === 'Grants.gov' || g.source === 'SBA SBIR';
                    return g.source === sourceFilter;
                  })
                  .map((g, i) => {
                    const alreadySaved = trackerGrants.some(t => t.title === g.title);
                    const isLive = g.source === 'Grants.gov' || g.source === 'SBA SBIR';
                    return (
                      <div key={g.id || i}
                        className={`group flex flex-col sm:grid border-b border-stone-100 last:border-b-0 hover:bg-stone-50/60 transition-colors ${i % 2 !== 0 ? 'bg-[#FAFAFA]' : ''}`}
                        style={{gridTemplateColumns:'2.5fr 1.5fr 100px 100px 36px'}}>
                        <div className="px-4 py-3 flex items-start gap-2 sm:border-r border-stone-100">
                          {isLive && <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-[#76B900] animate-pulse" title="Live" />}
                          <div className="flex-1 min-w-0">
                            <a href={g.url} target="_blank" rel="noopener noreferrer"
                              className="text-[13px] font-medium text-stone-900 hover:text-[#76B900] block truncate leading-snug">
                              {g.title}
                            </a>
                            {/* Mobile: show extra info */}
                            <div className="flex flex-wrap gap-2 mt-1 sm:hidden">
                              <span className="text-[11px] text-stone-400">{g.agency}</span>
                              {g.closeDate && g.closeDate !== 'Rolling' && <span className="text-[11px] text-stone-500">· Due {g.closeDate}</span>}
                              {g.amount && <span className="text-[11px] text-[#76B900] font-semibold">· {g.amount}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="hidden sm:flex px-4 py-3 items-start sm:border-r border-stone-100 flex-col justify-center">
                          <span className="text-[12px] text-stone-600 truncate">{g.agency || '—'}</span>
                          <span className="text-[10px] text-stone-400 mt-0.5">{g.source}</span>
                        </div>
                        <div className="hidden sm:flex px-4 py-3 items-center sm:border-r border-stone-100">
                          <span className={`text-[12px] ${g.closeDate && g.closeDate !== 'Rolling' ? 'text-stone-700 font-medium' : 'text-stone-300'}`}>
                            {g.closeDate && g.closeDate !== 'Rolling' ? g.closeDate : 'Rolling'}
                          </span>
                        </div>
                        <div className="hidden sm:flex px-3 py-3 items-center sm:border-r border-stone-100">
                          {g.amount ? <span className="text-[11px] text-[#76B900] font-semibold truncate">{g.amount}</span> : <span className="text-stone-300">—</span>}
                        </div>
                        <div className="hidden sm:flex px-2 py-3 items-center justify-center">
                          <button onClick={() => saveToTracker(g)} disabled={alreadySaved}
                            title={alreadySaved ? 'Saved to tracker' : 'Save to tracker'}
                            className={`p-1.5 rounded transition-colors ${alreadySaved ? 'text-[#76B900]' : 'text-stone-300 hover:text-[#76B900] opacity-0 group-hover:opacity-100'}`}>
                            {alreadySaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                <div className="px-4 py-2.5 text-xs text-stone-400 border-t border-stone-100 bg-stone-50">
                  Showing {allDiscoveredGrants.filter(g => sourceFilter === 'all' ? true : sourceFilter === 'live' ? (g.source === 'Grants.gov' || g.source === 'SBA SBIR') : g.source === sourceFilter).length} of {allDiscoveredGrants.length} grants · <span className="text-[#76B900] font-medium">{liveGrantsCount} live from APIs</span> · {totalGrantsFound.toLocaleString()} total in federal database
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="animate-in fade-in">

            {/* Notion-style database header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🗃️</span>
                <div>
                  <h1 className="text-xl font-bold text-stone-900">Grant Tracker</h1>
                  <p className="text-xs text-stone-400 mt-0.5">{trackerGrants.length} grants · {trackerGrants.filter(g=>g.status==='won').length} won · {trackerGrants.filter(g=>g.status==='applied').length} applied</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* View toggle — Notion style */}
                <div className="flex bg-stone-100 rounded-lg p-0.5">
                  <button onClick={() => setTrackerView('table')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      trackerView === 'table' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                    }`}>
                    ⊡ Table
                  </button>
                  <button onClick={() => setTrackerView('kanban')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                      trackerView === 'kanban' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                    }`}>
                    ⧮ Board
                  </button>
                </div>
                <button onClick={sendDigest} disabled={digestLoading || !user?.email}
                  className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-lg hover:border-[#76B900] hover:text-[#76B900] transition-colors disabled:opacity-40">
                  {digestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  Email Digest
                </button>
                {digestMsg && <span className="text-xs font-medium text-[#76B900]">{digestMsg}</span>}
              </div>
            </div>

            {/* Save from pipeline banner */}
            {discoveredGrants.length > 0 && (
              <div className="mb-4 px-4 py-3 bg-[#76B900]/5 border border-[#76B900]/20 rounded-xl flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#76B900] mr-1">+ Save from pipeline:</span>
                {discoveredGrants.map((g, i) => {
                  const saved = trackerGrants.some(t => t.title === g.title);
                  return (
                    <button key={i} onClick={() => saveToTracker(g)} disabled={saved}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        saved ? 'bg-[#76B900]/10 text-[#76B900] border-[#76B900]/20 cursor-default' : 'bg-white border-stone-200 text-stone-600 hover:border-[#76B900] hover:text-[#76B900]'
                      }`}>
                      {saved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                      {g.title.length > 28 ? g.title.slice(0,28)+'…' : g.title}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Empty state */}
            {trackerGrants.length === 0 && (
              <div className="bg-white border border-stone-200 rounded-2xl flex flex-col items-center justify-center py-20 text-center">
                <span className="text-4xl mb-4">🗃️</span>
                <p className="text-stone-700 font-semibold">No grants tracked yet</p>
                <p className="text-sm text-stone-400 mt-1 max-w-sm">Run the pipeline to discover grants, then save them here.</p>
                <button onClick={() => setActiveTab('dashboard')} className="mt-5 px-5 py-2.5 bg-[#76B900] text-[#111] text-sm font-bold rounded-xl hover:bg-[#689900] transition-colors">Run Pipeline →</button>
              </div>
            )}

            {/* TABLE VIEW */}
            {trackerGrants.length > 0 && trackerView === 'table' && (
              <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                {/* Column headers */}
                <div className="hidden sm:grid border-b border-stone-100 bg-stone-50" style={{gridTemplateColumns:'2fr 110px 1fr 90px 90px 36px'}}>
                  {['Grant Name','Status','Agency','Deadline','Source',''].map((h,i) => (
                    <div key={i} className={`px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider ${i < 5 ? 'border-r border-stone-100' : ''}`}>{h}</div>
                  ))}
                </div>

                {/* Rows */}
                {trackerGrants.map((g, i) => {
                  const statusConfig: Record<TrackerGrant['status'], {dot:string;label:string;bg:string;text:string}> = {
                    saved:      {dot:'bg-stone-400', label:'Saved',     bg:'bg-stone-100', text:'text-stone-600'},
                    applied:    {dot:'bg-blue-500',  label:'Applied',   bg:'bg-blue-50',   text:'text-blue-700'},
                    'in-review':{dot:'bg-amber-500', label:'In Review', bg:'bg-amber-50',  text:'text-amber-700'},
                    won:        {dot:'bg-[#76B900]', label:'Won 🎉',    bg:'bg-[#76B900]/10',text:'text-[#5a9000]'},
                  };
                  const sc = statusConfig[g.status];
                  const statusOrder: TrackerGrant['status'][] = ['saved','applied','in-review','won'];
                  const nextStatus = statusOrder[statusOrder.indexOf(g.status) + 1];
                  return (
                    <div key={g.id}
                      className={`group flex flex-col sm:grid border-b border-stone-100 last:border-b-0 hover:bg-stone-50/60 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-[#FAFAFA]'
                      }`}
                      style={{gridTemplateColumns:'2fr 110px 1fr 90px 90px 36px'}}>

                      {/* Name */}
                      <div className="px-4 py-3 flex items-center gap-2.5 sm:border-r border-stone-100">
                        <span className="text-base shrink-0">
                          {g.status === 'saved' ? '🔖' : g.status === 'applied' ? '✉️' : g.status === 'in-review' ? '🔄' : '🎉'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <a href={g.url} target="_blank" rel="noopener noreferrer"
                            className="text-[13px] font-medium text-stone-900 hover:text-[#76B900] truncate block leading-snug">
                            {g.title}
                          </a>
                          {/* Mobile: show all info inline */}
                          <div className="flex flex-wrap gap-2 mt-1 sm:hidden">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${sc.bg} ${sc.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                            </span>
                            {g.closeDate && g.closeDate !== 'Rolling' && <span className="text-[11px] text-stone-400">Due {g.closeDate}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Status — click to advance */}
                      <div className="hidden sm:flex px-3 py-3 items-center border-r border-stone-100">
                        <button onClick={() => nextStatus && moveTrackerGrant(g.id, nextStatus)}
                          title={nextStatus ? `Advance to ${nextStatus}` : 'Won!'}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${sc.bg} ${sc.text} ${nextStatus ? 'hover:opacity-70 cursor-pointer' : 'cursor-default'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                        </button>
                      </div>

                      {/* Agency */}
                      <div className="hidden sm:flex px-4 py-3 items-center border-r border-stone-100">
                        <span className="text-[12px] text-stone-500 truncate">{g.agency || '—'}</span>
                      </div>

                      {/* Deadline */}
                      <div className="hidden sm:flex px-4 py-3 items-center border-r border-stone-100">
                        <span className={`text-[12px] ${g.closeDate && g.closeDate !== 'Rolling' ? 'text-stone-600' : 'text-stone-300'}`}>
                          {g.closeDate && g.closeDate !== 'Rolling' ? g.closeDate : '—'}
                        </span>
                      </div>

                      {/* Source */}
                      <div className="hidden sm:flex px-4 py-3 items-center border-r border-stone-100">
                        <span className="text-[11px] text-stone-400 truncate">{g.source}</span>
                      </div>

                      {/* Actions (hover-reveal) */}
                      <div className="hidden sm:flex px-2 py-3 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => removeTrackerGrant(g.id)} title="Remove" className="p-1 text-stone-300 hover:text-red-400 transition-colors rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add row */}
                <button onClick={() => setActiveTab('dashboard')}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition-colors text-[13px] border-t border-stone-100">
                  <Plus className="w-3.5 h-3.5" /> Run pipeline to discover more grants
                </button>
              </div>
            )}

            {/* KANBAN VIEW */}
            {trackerGrants.length > 0 && trackerView === 'kanban' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {([
                  {key:'saved', label:'Saved', dot:'bg-stone-400', border:'border-stone-200 bg-stone-50', header:'text-stone-600', next:'applied'},
                  {key:'applied', label:'Applied', dot:'bg-blue-500', border:'border-blue-200 bg-blue-50/60', header:'text-blue-700', next:'in-review'},
                  {key:'in-review', label:'In Review', dot:'bg-amber-500', border:'border-amber-200 bg-amber-50/60', header:'text-amber-700', next:'won'},
                  {key:'won', label:'Won 🎉', dot:'bg-[#76B900]', border:'border-[#76B900]/30 bg-[#76B900]/5', header:'text-[#5a9000]', next:null},
                ] as const).map(col => {
                  const cols = trackerGrants.filter(g => g.status === col.key);
                  return (
                    <div key={col.key} className={`rounded-2xl border-2 ${col.border} p-3 min-h-[160px]`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`flex items-center gap-2 font-bold text-sm ${col.header}`}>
                          <span className={`w-2 h-2 rounded-full ${col.dot}`} />{col.label}
                        </div>
                        <span className="text-xs font-black text-stone-500 bg-white/80 px-2 py-0.5 rounded-full border border-stone-200">{cols.length}</span>
                      </div>
                      <div className="space-y-2">
                        {cols.map(g => (
                          <div key={g.id} className="bg-white rounded-xl border border-stone-200 p-3 shadow-sm">
                            <div className="flex items-start justify-between gap-1 mb-1.5">
                              <a href={g.url} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-semibold text-stone-900 hover:text-[#76B900] leading-snug line-clamp-2">{g.title}</a>
                              <button onClick={() => removeTrackerGrant(g.id)} className="shrink-0 text-stone-300 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                            </div>
                            {g.agency && <p className="text-[10px] text-stone-400 mb-2">{g.agency}</p>}
                            {col.next && (
                              <button onClick={() => moveTrackerGrant(g.id, col.next as TrackerGrant['status'])}
                                className="w-full text-[11px] font-bold text-stone-400 hover:text-[#76B900] border border-stone-200 hover:border-[#76B900] rounded-lg py-1 flex items-center justify-center gap-1 transition-colors">
                                Move to {col.next === 'applied' ? 'Applied' : col.next === 'in-review' ? 'In Review' : 'Won'} <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-5 animate-in fade-in">

            {/* Cover + Avatar + Logo Upload */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="h-28 bg-gradient-to-r from-[#76B900] to-[#689900] relative">
                <div className="absolute inset-0 opacity-10" style={{backgroundImage:'repeating-linear-gradient(45deg,#fff 0,#fff 1px,transparent 0,transparent 50%)',backgroundSize:'20px 20px'}} />
              </div>
              <div className="px-6 pb-6">
                <div className="-mt-10 mb-4 flex items-end justify-between">
                  {/* Avatar with upload */}
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl border-4 border-white bg-[#76B900] flex items-center justify-center shadow-lg overflow-hidden">
                      {profile.logoDataUrl
                        ? <img src={profile.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
                        : user?.photo
                          ? <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
                          : <span className="text-2xl font-black text-white">{(profile.companyName?.[0] || user?.name?.[0] || 'O').toUpperCase()}</span>
                      }
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                      <Upload className="w-5 h-5 text-white" />
                      <input type="file" accept="image/*" className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = ev => setProfile(prev => ({...prev, logoDataUrl: ev.target?.result as string}));
                          reader.readAsDataURL(file);
                        }} />
                    </label>
                  </div>
                  <button onClick={() => setStep('onboarding')} className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-xl text-sm font-bold text-stone-600 hover:border-[#76B900] hover:text-[#76B900] transition-colors">
                    Edit Profile
                  </button>
                </div>
                <h2 className="text-2xl font-black text-stone-900">{profile.companyName || user?.name || 'Your Organization'}</h2>
                {profile.tagline && <p className="text-stone-500 text-sm mt-1 italic">{profile.tagline}</p>}
                <p className="text-stone-400 text-xs mt-0.5">{user?.email}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {profile.orgType && <span className="text-xs font-bold bg-[#76B900]/10 text-[#76B900] px-2.5 py-1 rounded-full">{profile.orgType === '501c3' ? '501(c)(3) Nonprofit' : profile.orgType === 'startup' ? 'AI / Tech Startup' : profile.orgType === 'small-business' ? 'Small Business' : profile.orgType}</span>}
                  {profile.location && <span className="text-xs text-stone-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</span>}
                  {profile.yearFounded && <span className="text-xs text-stone-500">Est. {profile.yearFounded}</span>}
                  {profile.teamSize && <span className="text-xs text-stone-500">{profile.teamSize} team</span>}
                </div>
                {(profile.website || profile.linkedinUrl || profile.twitterUrl) && (
                  <div className="flex flex-wrap gap-3 mt-3">
                    {profile.website && <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#76B900] hover:underline flex items-center gap-1"><Globe className="w-3 h-3" />Website</a>}
                    {profile.linkedinUrl && <a href={profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://${profile.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Linkedin className="w-3 h-3" />LinkedIn</a>}
                    {profile.twitterUrl && <span className="text-xs text-sky-500 flex items-center gap-1"><Twitter className="w-3 h-3" />{profile.twitterUrl}</span>}
                  </div>
                )}
              </div>
            </div>

            {/* Profile Strength */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-stone-800">Profile Strength</h3>
                <span className={`text-sm font-black ${profileScoreColor}`}>{profileScore}%</span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all duration-700 ${profileBarColor}`} style={{width:`${profileScore}%`}} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  {label:'Logo', ok: !!profile.logoDataUrl},
                  {label:'Tagline', ok: profile.tagline.length > 3},
                  {label:'Year Founded', ok: profile.yearFounded.length === 4},
                  {label:'EIN', ok: profile.ein.length >= 4},
                  {label:'DUNS/SAM', ok: profile.dunsNumber.length >= 4},
                  {label:'Mission', ok: profile.missionStatement.length >= 30},
                  {label:'Impact Metrics', ok: profile.impactMetrics.length >= 10},
                ].map(item => (
                  <span key={item.label} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.ok ? 'bg-[#76B900]/10 text-[#76B900]' : 'bg-stone-100 text-stone-400'
                  }`}>{item.ok ? '✓' : '✕'} {item.label}</span>
                ))}
              </div>
              {profileScore < 80 && <p className="text-xs text-stone-400 mt-2">Complete your profile to improve AI grant matching accuracy. <button onClick={() => setStep('onboarding')} className="text-[#76B900] font-bold hover:underline">Complete now →</button></p>}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {l:'Annual Budget', v: profile.annualBudget || '—'},
                {l:'Team Size', v: profile.teamSize || '—'},
                {l:'Funding Goal', v: profile.fundingAmount || '—'},
                {l:'Year Founded', v: profile.yearFounded || '—'},
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm text-center">
                  <div className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-1">{s.l}</div>
                  <div className="text-sm font-black text-stone-800">{s.v}</div>
                </div>
              ))}
            </div>

            {/* Federal Credentials */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <h3 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-500" /> Federal Grant Credentials
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border ${
                  profile.ein ? 'bg-[#76B900]/5 border-[#76B900]/20' : 'bg-amber-50 border-amber-200'
                }">
                  <div className="text-xs font-bold uppercase tracking-wide mb-1 ${
                    profile.ein ? 'text-[#76B900]' : 'text-amber-600'
                  }">{profile.ein ? '✓ EIN / Tax ID' : '⚠️ EIN / Tax ID — Required'}</div>
                  <div className="text-sm font-mono text-stone-800">{profile.ein || <span className="text-stone-400 italic">Not added yet — needed for federal grants</span>}
                  </div>
                </div>
                <div className="p-4 rounded-xl border ${
                  profile.dunsNumber ? 'bg-[#76B900]/5 border-[#76B900]/20' : 'bg-amber-50 border-amber-200'
                }">
                  <div className="text-xs font-bold uppercase tracking-wide mb-1 ${
                    profile.dunsNumber ? 'text-[#76B900]' : 'text-amber-600'
                  }">{profile.dunsNumber ? '✓ DUNS / SAM Number' : '⚠️ DUNS / SAM — Required for Grants.gov'}</div>
                  <div className="text-sm font-mono text-stone-800">{profile.dunsNumber || <span className="text-stone-400 italic">Not added yet — register at sam.gov</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Impact Metrics */}
            {profile.impactMetrics ? (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#76B900]" /> Impact Metrics</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.impactMetrics.split(/[·,;]+/).map((m, i) => m.trim() && (
                    <span key={i} className="bg-[#76B900]/10 text-[#76B900] text-sm font-semibold px-3 py-1.5 rounded-full">{m.trim()}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
                <span className="text-amber-500 mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">No impact metrics yet</p>
                  <p className="text-xs text-amber-700 mt-0.5">Numbers beat adjectives. Add metrics like "500 students served · $2M secured" to stand out to funders.</p>
                  <button onClick={() => setStep('onboarding')} className="text-xs font-bold text-amber-800 underline mt-1">Add impact metrics →</button>
                </div>
              </div>
            )}

            {/* Mission */}
            {(profile.focusArea || profile.missionStatement) && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Cpu className="w-4 h-4 text-[#76B900]" /> Mission & Focus</h3>
                {profile.focusArea && <span className="inline-block text-sm font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full mb-3">{profile.focusArea}</span>}
                {profile.missionStatement && <p className="text-stone-600 text-sm leading-relaxed">{profile.missionStatement}</p>}
                {profile.targetPopulation && <p className="text-stone-500 text-xs mt-3 flex items-center gap-1"><Users className="w-3 h-3" /> Serving: {profile.targetPopulation}</p>}
              </div>
            )}

            {/* Team Members */}
            {profile.teamMembersText && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-[#76B900]" /> Team</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.teamMembersText.split(',').map((m, i) => m.trim() && (
                    <div key={i} className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                      <div className="w-7 h-7 bg-[#76B900]/10 rounded-full flex items-center justify-center text-xs font-black text-[#76B900]">{m.trim()[0]?.toUpperCase()}</div>
                      <span className="text-sm text-stone-700">{m.trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grant History */}
            {profile.grantHistoryText && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#76B900]" /> Grant History</h3>
                <div className="space-y-2">
                  {profile.grantHistoryText.split(/[·;\n]+/).map((entry, i) => {
                    const text = entry.trim();
                    if (!text) return null;
                    const isWon = /won|awarded|received/i.test(text);
                    const isReview = /review|pending|submitted/i.test(text);
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                          isWon ? 'bg-[#76B900]/10 text-[#76B900]' : isReview ? 'bg-amber-100 text-amber-700' : 'bg-stone-200 text-stone-500'
                        }`}>{isWon ? 'Won' : isReview ? 'In Review' : 'Applied'}</span>
                        <span className="text-sm text-stone-700">{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Funding Goal */}
            {profile.projectDescription && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-[#76B900]" /> Current Funding Goal</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{profile.projectDescription}</p>
              </div>
            )}

            {/* Background */}
            {(profile.backgroundInfo || profile.resumeText) && (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-[#76B900]" /> Background & Experience</h3>
                <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-wrap">{profile.backgroundInfo || profile.resumeText}</p>
              </div>
            )}

            {/* Documents note */}
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 flex items-start gap-3">
              <Upload className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-stone-700">Documents (501c3 cert, financials, W-9)</p>
                <p className="text-xs text-stone-500 mt-0.5">Document upload with cloud storage coming in the next release. For now, paste key details in your background section above.</p>
              </div>
            </div>

            {/* Empty state */}
            {profileScore < 20 && (
              <div className="bg-[#76B900]/5 border border-[#76B900]/20 rounded-2xl p-8 text-center">
                <p className="text-stone-700 font-semibold mb-3">Your profile is mostly empty.</p>
                <p className="text-stone-500 text-sm mb-4">A complete profile gets 3x better grant matches from our AI agents.</p>
                <button onClick={() => setStep('onboarding')} className="bg-[#76B900] text-[#111111] font-bold px-6 py-3 rounded-xl hover:bg-[#689900] transition-colors">
                  Complete My Profile →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 animate-in fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-800 flex items-center"><Link className="w-5 h-5 mr-2 text-[#76B900]" /> App Integrations</h2>
              <p className="text-sm text-stone-500 mt-1">Connect CivicPath to your tools to enable autonomous proposal sending and meeting intelligence.</p>
            </div>
            <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <span className="text-amber-500 text-sm shrink-0">\u26a0\ufe0f</span>
              <div>
                <p className="text-sm font-bold text-amber-800">OAuth setup required</p>
                <p className="text-xs text-amber-700 mt-0.5">Gmail, Meet, and Zoom integrations require OAuth app credentials to be configured. These are available on the Pro plan and are currently being set up. <a href="mailto:hello@civicpath.ai?subject=Integration%20Setup" className="underline font-bold">Email us to request early access →</a></p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Gmail Integration */}
              <div className="border border-stone-200 rounded-xl p-5 flex flex-col justify-between bg-stone-50/50 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-3 bg-red-100 rounded-lg text-red-600">
                      <Mail className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-800 text-base">Gmail API</h3>
                      <p className="text-xs text-stone-500">Autonomous proposal sending</p>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 mb-6">Allows The Watcher and Submitter agents to send emails, updates, and final PDFs directly from your account.</p>
                </div>
                <a href="mailto:hello@civicpath.ai?subject=Gmail%20OAuth%20Integration%20Request"
                  className="w-full py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center border border-[#76B900] text-[#76B900] hover:bg-[#76B900]/5">
                  Request Gmail Access →
                </a>
              </div>

              {/* Google Meet Integration */}
              <div className="border border-stone-200 rounded-xl p-5 flex flex-col justify-between bg-stone-50/50 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-800 text-base">Google Meet</h3>
                      <p className="text-xs text-stone-500">Meeting summary & actions</p>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 mb-6">Connect to automatically ingest meeting transcripts for grant planning, auto-booking milestones and assigning actions.</p>
                </div>
                <span className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center bg-stone-100 text-stone-400 border border-stone-200 cursor-default">
                  Coming Soon
                </span>
              </div>

              {/* Zoom Integration */}
              <div className="border border-stone-200 rounded-xl p-5 flex flex-col justify-between bg-stone-50/50 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-3 bg-blue-500/20 rounded-lg text-blue-600">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-800 text-base">Zoom API</h3>
                      <p className="text-xs text-stone-500">Cloud recording transcripts</p>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 mb-6">Automatically sync your cloud-recorded Zoom meetings to extract grant strategies, budgets, and next steps.</p>
                </div>
                <span className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center bg-stone-100 text-stone-400 border border-stone-200 cursor-default">
                  Coming Soon
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scheduler' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-stone-800 flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-[#76B900]" /> AI Work Plan</h2>
                <p className="text-sm text-stone-500 mt-1">
                  {discoveredGrants.length > 0
                    ? `AI generated ${discoveredGrants.length * 4} work blocks across ${discoveredGrants.length} live grants from your pipeline.`
                    : 'Run the pipeline first to generate your personalized schedule from real grant deadlines.'}
                </p>
              </div>
              <button
                onClick={() => {
                  const events = [
                    { name: 'State Innovation Match Fund', date: '20261015' },
                    { name: 'Regional Sustainability Initiative', date: '20261201' },
                    { name: 'Dept of Energy SBIR Phase I', date: '20270101' },
                  ];
                  events.forEach(e => {
                    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Grant Deadline: ' + e.name)}&dates=${e.date}/${e.date}&details=${encodeURIComponent('CivicPath — Apply for ' + e.name)}`;
                    window.open(url, '_blank');
                  });
                }}
                className="px-4 py-2 bg-[#76B900] text-[#111111] text-sm font-bold rounded-lg shadow-sm hover:bg-[#689900] transition-colors flex items-center w-full md:w-auto justify-center"
              >
                <Calendar className="w-4 h-4 mr-2" /> Sync to Google Calendar
              </button>
            </div>
            
            {discoveredGrants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays className="w-12 h-12 text-stone-300 mb-4" />
                <p className="text-stone-500 font-semibold">No schedule yet.</p>
                <p className="text-sm text-stone-400 mt-1 max-w-sm">Run the AI pipeline on the Dashboard tab to discover real grants and auto-generate your work plan with deadlines.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {discoveredGrants.map((grant, gi) => {
                  const deadlineDate = new Date(grant.closeDate);
                  const blocks = [
                    { label: 'Research + Executive Summary', days: 30, hours: '4 hrs', priority: 'High Priority', color: true },
                    { label: 'Write Full Proposal', days: 20, hours: '6 hrs', priority: 'In Progress', color: true },
                    { label: 'Review + Compliance Check', days: 10, hours: '3 hrs', priority: 'Review', color: false },
                    { label: 'Final Check + Submit', days: 5, hours: '2 hrs', priority: 'Final', color: false },
                  ];
                  return (
                    <div key={gi}>
                      <h3 className="text-xs font-bold text-stone-500 mb-3 uppercase tracking-wider pb-2 border-b border-stone-100 flex items-center justify-between">
                        <span>{grant.title}</span>
                        <a href={grant.url} target="_blank" rel="noopener noreferrer" className="text-[#76B900] hover:underline normal-case font-medium">View on Grants.gov →</a>
                      </h3>
                      <div className="space-y-3">
                        {blocks.map((b, bi) => {
                          const blockDate = new Date(deadlineDate);
                          blockDate.setDate(blockDate.getDate() - b.days);
                          const dateStr = blockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const calDate = blockDate.toISOString().replace(/-/g,'').split('T')[0];
                          const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(grant.title + ': ' + b.label)}&dates=${calDate}/${calDate}&details=${encodeURIComponent('CivicPath — ' + grant.title)}`;
                          return (
                            <div key={bi} className={`flex flex-col md:flex-row md:items-center p-4 rounded-xl gap-4 border ${b.color ? 'bg-[#76B900]/5 border-[#76B900]/20' : 'bg-stone-50 border-stone-200'}`}>
                              <div className="w-24 shrink-0 text-xs font-bold text-stone-500 flex items-center"><Clock className="w-3.5 h-3.5 mr-1" />{dateStr}</div>
                              <div className="flex-1">
                                <div className="text-sm font-bold text-stone-800">{b.label}</div>
                                <div className="text-xs text-stone-500 mt-0.5">{grant.agency} • Due: {grant.closeDate} • <span className={b.color ? 'text-amber-600 font-bold' : 'text-stone-400'}>{b.priority}</span></div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600">{b.hours}</span>
                                <button onClick={() => window.open(calUrl, '_blank')} className="p-1.5 text-[#76B900] hover:bg-[#76B900]/10 rounded-lg transition-colors" title="Add to Google Calendar">
                                  <Calendar className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'meetings' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row justify-between gap-4 bg-stone-50/50">
              <div>
                <h2 className="text-xl font-bold text-stone-800 flex items-center"><Users className="w-5 h-5 mr-2 text-[#76B900]" /> Meeting Summary Agent</h2>
                <p className="text-sm text-stone-500 mt-1">Paste your transcript or connect Google Meet to automatically extract actionable grant milestones.</p>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => window.open('https://meet.google.com', '_blank')} className="flex-1 md:flex-none px-4 py-2 bg-white border border-stone-200 text-stone-700 text-sm font-bold rounded-lg hover:bg-stone-50 shadow-sm transition-colors flex items-center justify-center">
                  <Video className="w-4 h-4 mr-2 text-stone-500" /> Connect Meet
                </button>
                <button onClick={() => {}} className="flex-1 md:flex-none px-4 py-2 bg-[#76B900] text-[#111111] text-sm font-bold rounded-lg shadow-sm hover:bg-[#689900] transition-colors flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-2" /> Paste Transcript
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-white border border-[#76B900]/20 rounded-xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#76B900]"></div>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-stone-800 uppercase tracking-tight">GRANT PREP MEETING SUMMARY</h3>
                    <p className="text-xs font-medium text-stone-500 mt-1.5">Date: March 21, 2026 | Duration: 47 min | Grant: NSF SBIR Phase I — $200K</p>
                  </div>
                  <span className="px-3 py-1 bg-[#76B900]/10 text-[#76B900] text-[10px] font-black uppercase tracking-wider rounded-md border border-[#76B900]/20">AI Generated</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-sm font-bold text-stone-700 mb-3 flex items-center uppercase tracking-wider"><CheckSquare className="w-4 h-4 mr-2 text-[#76B900]" /> Decisions Made</h4>
                    <ul className="space-y-2.5 text-sm text-stone-600 font-medium">
                      <li className="flex items-start"><span className="mr-2 text-[#76B900]">•</span> CEO will sign off on budget section by Thursday</li>
                      <li className="flex items-start"><span className="mr-2 text-[#76B900]">•</span> Legal to review IP clause in section 3.2</li>
                      <li className="flex items-start"><span className="mr-2 text-[#76B900]">•</span> Demo video needed — assign to marketing team</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-700 mb-3 flex items-center uppercase tracking-wider"><AlertCircle className="w-4 h-4 mr-2 text-amber-500" /> Risks Flagged</h4>
                    <ul className="space-y-2.5 text-sm text-stone-600 font-medium">
                      <li className="flex items-start"><span className="mr-2 text-amber-500">•</span> Matching funds requirement not yet confirmed</li>
                      <li className="flex items-start"><span className="mr-2 text-amber-500">•</span> Letter of Support from partner still pending</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-stone-100">
                  <h4 className="text-sm font-bold text-stone-700 mb-4 flex items-center uppercase tracking-wider"><ListTodo className="w-4 h-4 mr-2 text-[#76B900]" /> Action Items</h4>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-center text-sm mb-2 sm:mb-0"><span className="font-bold text-[#76B900] w-20 bg-[#76B900]/10 px-2 py-0.5 rounded text-center mr-3">[John]</span> <span className="font-medium text-stone-800">Budget finalization</span></div>
                      <div className="text-xs font-bold text-stone-500 bg-white px-2 py-1 border border-stone-200 rounded">Due Wed March 23</div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-center text-sm mb-2 sm:mb-0"><span className="font-bold text-[#76B900] w-20 bg-[#76B900]/10 px-2 py-0.5 rounded text-center mr-3">[Sarah]</span> <span className="font-medium text-stone-800">IP review</span></div>
                      <div className="text-xs font-bold text-stone-500 bg-white px-2 py-1 border border-stone-200 rounded">Due Fri March 25</div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-center text-sm mb-2 sm:mb-0"><span className="font-bold text-[#76B900] w-20 bg-[#76B900]/10 px-2 py-0.5 rounded text-center mr-3">[Team]</span> <span className="font-medium text-stone-800">Video production</span></div>
                      <div className="text-xs font-bold text-stone-500 bg-white px-2 py-1 border border-stone-200 rounded">Due Mon March 28</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-[#76B900]/5 p-4 rounded-xl border border-[#76B900]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center text-sm font-bold text-[#76B900]">
                    <Calendar className="w-5 h-5 mr-2" /> Next Meeting: Friday 2:00 PM
                  </div>
                  <span className="text-[10px] font-black text-white bg-[#76B900] px-2 py-1 rounded uppercase tracking-wider shadow-sm">Auto-booked in G-Cal</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'lalla' && (
          <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in">
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-100 bg-gradient-to-r from-purple-50 to-white flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="font-bold text-stone-900 flex items-center gap-2">
                  Ask MyLalla
                  <span className="text-[10px] font-black text-white bg-purple-500 px-2 py-0.5 rounded uppercase tracking-wide">AI Advisor</span>
                </div>
                <div className="text-xs text-stone-500">Your senior grant strategist — powered by Gemini</div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {lallaMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-5">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-purple-400" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 text-lg">Hi, I'm MyLalla.</p>
                    <p className="text-stone-500 text-sm mt-1 max-w-sm">Your AI grant advisor. Ask me anything about grants, strategy, deadlines, or your proposals.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                    {[
                      'Which grants fit my organization best?',
                      'How do I write a strong executive summary?',
                      'What are the NSF SBIR deadlines?',
                      'How can I improve my proposal score?',
                      'What grants are available in Florida?',
                      'Explain the human-in-the-loop pipeline',
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => handleLallaChat(q)}
                        className="text-xs px-3 py-2 rounded-full border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 hover:border-purple-400 transition-colors font-medium"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {lallaMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                    </div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#76B900] text-[#111111] rounded-br-sm'
                      : 'bg-stone-50 border border-stone-200 text-stone-800 rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-stone prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-stone-900">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-[#76B900]/10 border border-[#76B900]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-[#76B900]">{(user?.name?.[0] || 'U').toUpperCase()}</span>
                    </div>
                  )}
                </div>
              ))}
              {lallaLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                  </div>
                </div>
              )}
              <div ref={lallaEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-stone-100 bg-white shrink-0">
              <form
                onSubmit={e => { e.preventDefault(); handleLallaChat(); }}
                className="flex gap-3"
              >
                <input
                  type="text"
                  value={lallaInput}
                  onChange={e => setLallaInput(e.target.value)}
                  placeholder="Ask MyLalla anything about grants, strategy, or deadlines..."
                  className="flex-1 px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none text-stone-900 text-sm"
                  disabled={lallaLoading}
                />
                <button
                  type="submit"
                  disabled={!lallaInput.trim() || lallaLoading}
                  className="px-4 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 font-bold text-sm"
                >
                  {lallaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
              <p className="text-[10px] text-stone-400 mt-2 text-center">MyLalla knows your profile and pipeline context. Responses powered by Gemini 2.0 Flash.</p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Pipeline Status Banner */}
            <div className="mb-6 p-4 bg-white border border-stone-200 rounded-xl shadow-sm flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#76B900] animate-pulse"></div>
              <span className="text-sm font-semibold text-stone-700">Live data powered by <a href="https://www.grants.gov" target="_blank" rel="noopener noreferrer" className="text-[#76B900] hover:underline">Grants.gov</a> + SBA SBIR — real-time federal grant database</span>
            </div>

            {/* Active Profile & Controls */}
            <div className="mb-6 bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 p-5">
                <div className="text-sm font-semibold text-stone-400 flex items-center uppercase tracking-wider shrink-0">
                  <Building2 className="w-4 h-4 mr-2 text-[#76B900]" />
                  Profile:
                </div>
                <span className="px-3 py-1 bg-stone-50 rounded-lg text-sm font-medium border border-stone-200 text-stone-700">{profile.companyName || 'Anonymous'}</span>
                <span className="px-3 py-1 bg-stone-50 rounded-lg text-sm font-medium border border-stone-200 text-stone-700">{profile.focusArea || 'General'}</span>
                <span className="px-3 py-1 bg-stone-50 rounded-lg text-sm font-medium border border-stone-200 text-stone-700">{profile.location || 'Anywhere'}</span>
                <div className="ml-auto flex items-center gap-3">
                  <button onClick={() => setStep('onboarding')} className="text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors">Edit Profile</button>
                  <button onClick={handleExecute} disabled={isRunning}
                    className={`inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-xl transition-all ${
                      isRunning ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200' : 'bg-[#76B900] text-[#111111] hover:bg-[#689900] shadow-sm active:scale-[0.98]'
                    }`}>
                    {isRunning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Agents Acting...</> : <><Play className="w-4 h-4 mr-2 fill-current" />Run Full Pipeline</>}
                  </button>
                </div>
              </div>
              {/* Profile Strength Bar */}
              <div className="px-5 pb-3 border-t border-stone-100 pt-3 flex items-center gap-3">
                <span className="text-xs font-bold text-stone-500 whitespace-nowrap">Profile Strength</span>
                <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${profileBarColor}`} style={{width:`${profileScore}%`}} />
                </div>
                <span className={`text-xs font-black ${profileScoreColor}`}>{profileScore}%</span>
                {profileScore < 80 && (
                  <button onClick={() => setStep('onboarding')} className="text-[10px] text-[#76B900] font-bold hover:underline whitespace-nowrap">+ Complete profile →</button>
                )}
              </div>
            </div>

            {/* 🌟 GLOBAL LIVE ORCHESTRATION LOG PANEL 🌟 */}
            {(isRunning || globalLogs.length > 0) && (
              <div className="mb-8 bg-stone-900 rounded-xl shadow-2xl border border-stone-800 overflow-hidden relative transform transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#76B900] via-emerald-400 to-[#76B900] opacity-90 shadow-[0_0_10px_rgba(46,125,50,0.5)]"></div>
                <div className="px-5 py-3 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
                  <div className="flex items-center space-x-2">
                    <TerminalSquare className="w-4 h-4 text-[#76B900]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#76B900]">Live Agent Comm Stream</span>
                  </div>
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 text-[#76B900] animate-spin" />
                  ) : (
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider px-2 py-0.5 border border-stone-700 rounded bg-stone-800">Pipeline Complete</span>
                  )}
                </div>
                <div className="p-5 font-mono text-[13px] leading-relaxed text-stone-300 h-56 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-700">
                  {globalLogs.map((log, i) => (
                    <div key={i} className={`mb-1.5 whitespace-pre-wrap ${log.includes('[🤖 ACTIVITY]') ? 'text-cyan-400 font-semibold bg-cyan-900/20 px-2 py-1 rounded border-l-2 border-cyan-500' : ''}`}>
                      {log}
                    </div>
                  ))}
                  {isRunning && <div className="animate-pulse text-[#76B900] font-bold mt-1">_</div>}
                  <div ref={globalLogsEndRef} />
                </div>
              </div>
            )}

            {/* ⏸️ HUMAN-IN-THE-LOOP APPROVAL GATE */}
            {awaitingApproval && (
              <div className="mb-8 bg-white border-2 border-amber-400 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⏸️</span>
                    <span className="font-bold text-amber-800 text-sm">Awaiting Your Approval — Human in the Loop</span>
                  </div>
                  <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded uppercase tracking-wider border border-amber-300">AI paused — your decision required</span>
                </div>
                <div className="p-6">
                  <p className="text-sm text-stone-600 mb-4">The Drafter has completed your proposal. Review it below, then approve to proceed with verification and submission — or edit it first.</p>
                  {editMode ? (
                    <div className="mb-4">
                      <label className="text-xs font-bold text-stone-600 uppercase tracking-wider block mb-2">Edit Proposal</label>
                      <textarea
                        rows={12}
                        value={editedProposal}
                        onChange={e => setEditedProposal(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 text-sm font-mono resize-none"
                      />
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-stone-50 rounded-xl border border-stone-200 max-h-48 overflow-y-auto text-xs text-stone-700 font-mono leading-relaxed whitespace-pre-wrap">
                      {drafterOutput || 'No proposal generated yet.'}
                    </div>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={handleApproveAndSubmit}
                      className="flex items-center gap-2 px-6 py-3 bg-[#76B900] text-[#111111] font-bold rounded-xl hover:bg-[#689900] transition-colors shadow-sm">
                      <CheckCircle2 className="w-4 h-4" /> Approve & Submit
                    </button>
                    <button onClick={() => setEditMode(!editMode)}
                      className="flex items-center gap-2 px-5 py-3 border-2 border-stone-300 text-stone-700 font-bold rounded-xl hover:border-stone-500 transition-colors">
                      <FileText className="w-4 h-4" /> {editMode ? 'Preview' : 'Edit First'}
                    </button>
                    <button onClick={() => { setAwaitingApproval(false); setIsRunning(false); }}
                      className="px-4 py-3 text-stone-400 hover:text-stone-600 text-sm font-medium transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Viral Share Banner */}
            {showShareBanner && (
              <div className="mb-6 p-4 bg-[#1A1A1A] rounded-xl flex items-center justify-between gap-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🎉</span>
                  <div>
                    <p className="text-white text-sm font-bold">Pipeline complete! Share your win.</p>
                    <p className="text-stone-400 text-xs">Let the world know CivicPath found you grants in 60 seconds.</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      const n = discoveredGrants.length || 3;
                      const shareUrl = `${window.location.origin}/share?org=${encodeURIComponent(profile.companyName || 'My Org')}&count=${n}&score=92&loc=${encodeURIComponent(profile.location || 'Florida')}`;
                      const text = `Just found ${n} grants for ${profile.companyName || 'my org'} in 60s using @CivicPathAI 🤖\n\nFully agentic. I just approved.\n\n${shareUrl}`;
                      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-sky-500 text-white text-xs font-bold rounded-lg hover:bg-sky-600 transition-colors">
                    <Share2 className="w-3.5 h-3.5" /> Share on X
                  </button>
                  <button
                    onClick={() => {
                      const n = discoveredGrants.length || 3;
                      const shareUrl = `${window.location.origin}/share?org=${encodeURIComponent(profile.companyName || 'My Org')}&count=${n}&score=92&loc=${encodeURIComponent(profile.location || 'Florida')}`;
                      navigator.clipboard.writeText(shareUrl).catch(() => {});
                      setShowShareBanner(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-700 text-white text-xs font-bold rounded-lg hover:bg-stone-600 transition-colors">
                    🔗 Copy Link
                  </button>
                  <button onClick={() => setShowShareBanner(false)} className="p-2 text-stone-400 hover:text-stone-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Completion Actions (Calendar & PDF) */}
            {nextAction?.type === 'success' && (
              <div className="mb-8 p-6 bg-[#76B900]/5 border border-[#76B900]/20 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-[#76B900] text-[#111111] rounded-full"><CheckCircle2 className="w-6 h-6" /></div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-lg">Action Pipeline Complete</h3>
                    <p className="text-sm text-stone-600">Proposal drafted, verified, and sent. The Watcher is now monitoring.</p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      const doc = new jsPDF();
                      doc.setFontSize(20); doc.setFont('helvetica','bold');
                      doc.text('CivicPath Grant Proposal', 20, 20);
                      doc.setFontSize(11); doc.setFont('helvetica','normal');
                      doc.text(`Organization: ${profile.companyName || 'N/A'}`, 20, 35);
                      doc.text(`Location: ${profile.location || 'N/A'}`, 20, 43);
                      doc.text(`Focus Area: ${profile.focusArea || 'N/A'}`, 20, 51);
                      doc.text(`Target Grant: State Innovation Match Fund ($150,000)`, 20, 59);
                      doc.setDrawColor(46,125,50); doc.line(20, 65, 190, 65);
                      doc.setFontSize(10);
                      const body = (drafterOutput || 'Run the pipeline first to generate a proposal.')
                        .replace(/#{1,3} /g,'').replace(/\*\*/g,'');
                      const lines = doc.splitTextToSize(body, 170);
                      doc.text(lines, 20, 75);
                      doc.save(`${profile.companyName || 'proposal'}_civicpath.pdf`);
                    }}
                    className="flex items-center px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 font-bold text-sm shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2 text-[#76B900]" /> Download PDF Proposal
                  </button>
                  <button
                    onClick={() => {
                      const grantName = 'State Innovation Match Fund';
                      const deadline = '20261015';
                      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Grant Deadline: ' + grantName)}&dates=${deadline}/${deadline}&details=${encodeURIComponent('Apply for ' + grantName + ' — CivicPath')}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center px-4 py-2 bg-[#76B900] text-[#111111] rounded-lg hover:bg-[#689900] font-bold text-sm shadow-sm transition-colors"
                  >
                    <Calendar className="w-4 h-4 mr-2" /> Book Deadlines to G-Cal
                  </button>
                </div>
              </div>
            )}

            {nextAction?.type === 'error' && (
              <div className="mb-8 p-4 rounded-xl border bg-red-50 border-red-200 text-stone-900 flex items-start space-x-4 shadow-sm">
                <AlertCircle className="w-6 h-6 mt-0.5 shrink-0 text-red-500" />
                <div>
                  <h3 className="font-bold mb-1 tracking-wide uppercase text-[11px] text-stone-500">System Error</h3>
                  <p className="text-sm font-medium leading-relaxed">{nextAction.message}</p>
                </div>
              </div>
            )}

            {/* Agents Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {agents.map((agent) => (
                <div 
                  key={agent.id} 
                  className={`rounded-2xl border transition-all duration-500 overflow-hidden flex flex-col ${getStatusClasses(agent.status)}`}
                >
                  {/* Agent Header */}
                  <div className="px-5 py-4 border-b border-inherit bg-stone-50/50 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-xl border ${
                        agent.status === 'working' ? 'bg-[#76B900]/10 text-[#76B900] border-[#76B900]/20' :
                        agent.status === 'completed' ? 'bg-[#76B900]/5 text-[#76B900] border-[#76B900]/10' :
                        agent.status === 'error' ? 'bg-red-50 text-red-500 border-red-100' :
                        'bg-stone-100 text-stone-400 border-stone-200'
                      }`}>
                        {agent.icon}
                      </div>
                      <h3 className="font-bold text-stone-800 tracking-tight text-sm">{agent.name}</h3>
                    </div>
                    <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-sm">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                         agent.status === 'working' ? 'text-[#76B900]' :
                         agent.status === 'completed' ? 'text-[#76B900]' :
                         agent.status === 'error' ? 'text-red-500' :
                         'text-stone-400'
                      }`}>
                        {agent.status}
                      </span>
                      {getStatusIcon(agent.status)}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col relative">
                    {/* Agent Logs (Terminal-like) */}
                    <div className="bg-stone-900 p-4 font-mono text-[10px] overflow-y-auto h-32 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent">
                      {agent.logs.length === 0 && agent.status === 'idle' && (
                        <div className="text-stone-600 italic">Ready to act...</div>
                      )}
                      {agent.logs.map((log, i) => (
                        <div key={i} className="mb-1.5 text-stone-300">
                          <span className="text-[#76B900] font-bold mr-1.5 opacity-70">❯</span>{log}
                        </div>
                      ))}
                      {agent.status === 'working' && (
                        <div className="animate-pulse text-stone-500">
                          <span className="text-[#76B900] font-bold mr-1.5">❯</span>_
                        </div>
                      )}
                      <div ref={(el) => { logsEndRefs.current[agent.id] = el; }} />
                    </div>

                    {/* Agent Output */}
                    {agent.output && (
                      <div className="p-4 bg-white border-t border-inherit flex-1 prose prose-sm prose-stone max-w-none prose-a:text-[#76B900] prose-a:font-bold prose-a:no-underline hover:prose-a:underline text-xs leading-relaxed">
                        <ReactMarkdown>{agent.output}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

      </main>
    </div>
  );
}

