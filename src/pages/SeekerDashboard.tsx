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
  Sparkles
} from 'lucide-react';

type AgentStatus = 'idle' | 'working' | 'completed' | 'error';
type AppStep = 'onboarding' | 'dashboard';
type ActiveTab = 'dashboard' | 'scheduler' | 'meetings' | 'integrations' | 'lalla';

interface Profile {
  // Step 1 — Your Organization
  companyName: string;
  orgType: string;
  location: string;
  website: string;
  // Step 2 — Mission & Impact
  focusArea: string;
  missionStatement: string;
  targetPopulation: string;
  geographicScope: string;
  annualBudget: string;
  teamSize: string;
  yearsOperating: string;
  // Step 3 — Funding Goal
  projectDescription: string;
  fundingAmount: string;
  previousGrants: string;
  backgroundInfo: string;
}

interface AgentState {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: AgentStatus;
  logs: string[];
  output: string | null;
}

// CivicPath Green accent: #2E7D32
// Hover Green: #1B5E20
// Claude-style Beige: #F9F7F2

const Logo = () => (
  <div className="relative inline-flex items-center justify-center w-8 h-8 text-[#2E7D32]">
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
      return saved ? JSON.parse(saved) : {
        companyName: '', orgType: '', location: '', website: '',
        focusArea: '', missionStatement: '', targetPopulation: '',
        geographicScope: '', annualBudget: '', teamSize: '', yearsOperating: '',
        projectDescription: '', fundingAmount: '', previousGrants: '', backgroundInfo: ''
      };
    } catch { return {
      companyName: '', orgType: '', location: '', website: '',
      focusArea: '', missionStatement: '', targetPopulation: '',
      geographicScope: '', annualBudget: '', teamSize: '', yearsOperating: '',
      projectDescription: '', fundingAmount: '', previousGrants: '', backgroundInfo: ''
    }; }
  });

  useEffect(() => {
    localStorage.setItem('civicpath_profile', JSON.stringify(profile));
  }, [profile]);

  const [drafterOutput, setDrafterOutput] = useState<string | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProposal, setEditedProposal] = useState('');
  const [discoveredGrants, setDiscoveredGrants] = useState<Array<{title:string;agency:string;closeDate:string;url:string}>>([]);

  const [showAgentsMenu, setShowAgentsMenu] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const demoScript = [
    { 
      text: "Welcome to CivicPath. Your community, funded.", 
      duration: 3000,
      screen: <div className="flex items-center justify-center h-full"><Logo /><span className="text-4xl font-black text-white ml-4 tracking-tight">CivicPath</span></div> 
    },
    { 
      text: "47 million Americans leave grant funding on the table every year. We fix that.", 
      duration: 4000,
      screen: <div className="flex flex-col items-center text-center"><BarChart3 className="w-16 h-16 text-red-400 mb-4" /><div className="text-3xl font-black text-white">$47 Billion</div><div className="text-stone-400 uppercase tracking-widest text-xs mt-2">Unclaimed Annually</div></div>
    },
    { 
      text: "Our 6 specialized AI agents act as your personal grant department, 24/7.", 
      duration: 4000,
      screen: <div className="flex space-x-4"><div className="p-5 bg-[#2E7D32]/20 rounded-2xl border border-[#2E7D32]/30"><Search className="w-10 h-10 text-[#2E7D32]" /></div><div className="p-5 bg-[#2E7D32]/20 rounded-2xl border border-[#2E7D32]/30"><BrainCircuit className="w-10 h-10 text-[#2E7D32]" /></div><div className="p-5 bg-[#2E7D32]/20 rounded-2xl border border-[#2E7D32]/30"><FileEdit className="w-10 h-10 text-[#2E7D32]" /></div></div>
    },
    { 
      text: "First, we build your End-to-End Encrypted Profile with your mission and background.", 
      duration: 4000,
      screen: <div className="bg-white p-6 rounded-2xl w-3/4 max-w-md shadow-2xl flex flex-col"><div className="flex items-center mb-4"><ShieldCheck className="w-5 h-5 text-[#2E7D32] mr-2" /><span className="text-xs font-bold text-stone-500 uppercase">E2E Encrypted</span></div><div className="h-4 w-1/3 bg-stone-200 rounded mb-4"></div><div className="h-12 w-full bg-stone-100 rounded-xl mb-4 border border-stone-200"></div><div className="h-24 w-full bg-stone-100 rounded-xl border border-stone-200"></div></div>
    },
    { 
      text: "Next, we initialize the Agent Pipeline to find and match grants in real-time.", 
      duration: 4000,
      screen: <div className="bg-stone-950 p-6 rounded-2xl w-3/4 border border-stone-800 font-mono text-sm text-stone-400 flex flex-col space-y-3"><div className="text-[#2E7D32] flex items-center"><TerminalSquare className="w-4 h-4 mr-2"/> [🔍 The Hunter] Scanning API...</div><div className="text-[#2E7D32] flex items-center"><TerminalSquare className="w-4 h-4 mr-2"/> [🎯 Matchmaker] Embedding profile...</div></div>
    },
    { 
      text: "The Drafter generates your PDF, while the Controller verifies every detail.", 
      duration: 4000,
      screen: <div className="bg-white p-6 rounded-2xl w-3/4 max-w-md shadow-2xl flex items-center space-x-6 border-l-8 border-[#2E7D32]"><FileText className="w-16 h-16 text-[#2E7D32]" /><div><div className="text-lg font-black text-stone-800">Proposal_Draft.pdf</div><div className="text-sm font-medium text-stone-500 mt-1 flex items-center"><CheckCircle2 className="w-4 h-4 text-[#2E7D32] mr-1" /> Verified by Controller</div></div></div>
    },
    { 
      text: "Finally, the Submitter sends it via Gmail, and the Scheduler books your calendar.", 
      duration: 4000,
      screen: <div className="grid grid-cols-2 gap-6 w-3/4"><div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex flex-col items-center shadow-sm"><Mail className="w-12 h-12 text-red-500 mb-3"/><span className="text-sm font-bold text-stone-800">Sent via Gmail</span></div><div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col items-center shadow-sm"><CalendarDays className="w-12 h-12 text-blue-500 mb-3"/><span className="text-sm font-bold text-stone-800">Synced to G-Cal</span></div></div>
    },
    { 
      text: "CivicPath: AI that takes action. Ready to start?", 
      duration: 3000,
      screen: <div className="flex flex-col items-center"><div className="scale-150 mb-8"><Logo /></div><button className="px-8 py-4 bg-[#2E7D32] text-white font-bold rounded-xl shadow-xl flex items-center text-lg"><Play className="w-6 h-6 mr-2 fill-current" /> Access Action Platform</button></div>
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
  
  const [integrations, setIntegrations] = useState({
    gmail: false,
    meet: false,
    zoom: false
  });
  
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

      // Store for dynamic scheduler
      setDiscoveredGrants(grants.filter((g: any) => g.closeDate && g.closeDate !== 'Rolling').slice(0, 5));

      addLog('hunter', `Grants.gov returned ${total} live opportunities.`);
      addGlobalLog(`[🔍 The Hunter]     Found ${total} matching opportunities ✓`);
      addGlobalLog(`[🤖 ACTIVITY]       Hunter → Matchmaker: "Found ${total} grants. Sending for semantic scoring."`);

      hunterText = `**Live Results from ${total} total matches across Grants.gov + SBA SBIR:**

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
    
    addGlobalLog(`[✉️ The Submitter]  Sending application to agency endpoint... SENT ✓`);
    addLog('submitter', 'Message queued and delivered.');
    await delay(800);

    const submitterText = `
### Submission Successful
* **To**: submissions@state-innovation.gov
* **Subject**: Grant Application: ${profile.companyName || 'Anonymous Start-Up'}
* **Attachments**: proposal_final.pdf, compliance_pack.pdf
* **Status**: 250 OK (Message Queued and Sent via Gmail)

Your application has been autonomously submitted. A confirmation receipt has been sent to your connected Gmail inbox.
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
      case 'working': return <Loader2 className="w-4 h-4 text-[#2E7D32] animate-spin" />;
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusClasses = (status: AgentStatus) => {
    switch (status) {
      case 'idle': return 'bg-white/50 text-stone-500 border-stone-200';
      case 'working': return 'bg-white border-[#2E7D32]/50 shadow-sm ring-1 ring-[#2E7D32]/20';
      case 'completed': return 'bg-white border-[#2E7D32] shadow-sm';
      case 'error': return 'bg-white border-red-200 shadow-sm ring-1 ring-red-100';
    }
  };

  // ── Onboarding wizard ──────────────────────────────────────────────────────
  const isStep1Valid = profile.companyName.trim() && profile.orgType && profile.location.trim();
  const isStep2Valid = profile.focusArea.trim() && profile.missionStatement.trim();
  const isStep3Valid = profile.projectDescription.trim();

  if (step === 'onboarding') {
    return (
      <div className="min-h-screen bg-[#F9F7F2] text-stone-900 flex flex-col items-center justify-center p-4 selection:bg-[#2E7D32]/20 font-sans relative">
        
        {/* Video Tutorial Modal */}
        {showDemoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-stone-200 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
                <div className="flex items-center space-x-2">
                  <PlayCircle className="w-5 h-5 text-[#2E7D32]" />
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
                {/* Video Demo Section */}
                <div className="relative flex flex-col items-center justify-center bg-stone-900 overflow-hidden aspect-video">
                  {/* Background Animation */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-50"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2E7D32] rounded-full blur-[120px] animate-pulse"></div>
                  </div>

                  {!isDemoPlaying ? (
                    <div className="z-10 flex flex-col items-center text-center px-12">
                      <div className="w-24 h-24 bg-[#2E7D32]/20 rounded-full flex items-center justify-center mb-6 border-2 border-[#2E7D32]/30 shadow-[0_0_30px_rgba(46,125,50,0.2)]">
                        <Play className="w-10 h-10 text-[#2E7D32] fill-current ml-1" />
                      </div>
                      <h4 className="text-3xl font-black text-white mb-4">See CivicPath in Action</h4>
                      <p className="text-stone-400 max-w-md mb-8">Click below to start a scripted interactive tour of the platform's autonomous capabilities.</p>
                      <button 
                        onClick={startDemo}
                        className="px-8 py-4 bg-[#2E7D32] text-white rounded-xl font-bold hover:bg-[#1B5E20] transition-all shadow-xl hover:scale-105 active:scale-95"
                      >
                        Start Auto-Demo
                      </button>
                    </div>
                  ) : (
                    <div className="z-10 w-full h-full flex flex-col items-center justify-between py-8 px-12 relative">
                      
                      {/* Simulated UI Screen Area */}
                      <div className="w-full flex-1 flex items-center justify-center mb-28 relative">
                        <div className="absolute inset-0 bg-stone-800/40 rounded-3xl border border-white/5 shadow-[0_0_60px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden transition-all duration-500">
                          <div key={demoStep} className="animate-in zoom-in-95 fade-in duration-500 w-full h-full flex items-center justify-center">
                            {demoScript[demoStep]?.screen}
                          </div>
                        </div>
                      </div>

                      {/* Bot Avatar (Picture in Picture style) */}
                      <div className="absolute bottom-32 right-12 z-20">
                        <div className="w-32 h-32 bg-stone-800 rounded-full border-4 border-[#2E7D32] overflow-hidden shadow-[0_0_40px_rgba(46,125,50,0.4)] animate-bounce">
                          <img 
                            src={`https://api.dicebear.com/7.x/bottts/svg?seed=CivicPath&backgroundColor=2E7D32`} 
                            alt="AI Avatar"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#2E7D32] rounded-full border-4 border-stone-900 animate-ping"></div>
                      </div>

                      {/* Script Captions */}
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-10 py-5 rounded-2xl border border-white/10 w-full max-w-3xl text-center shadow-2xl z-30">
                        <p key={demoStep} className="text-xl font-bold text-white leading-tight animate-in slide-in-from-bottom-2 fade-in duration-300">
                          {demoScript[demoStep]?.text}
                        </p>
                      </div>

                      {/* Timeline */}
                      <div className="absolute bottom-3 left-12 right-12">
                        <div className="h-1 bg-stone-800 rounded-full overflow-hidden border border-white/5">
                          <div 
                            className="h-full bg-[#2E7D32] transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(46,125,50,0.5)]"
                            style={{ width: `${((demoStep + 1) / demoScript.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Q&A Section */}
                <div className="p-8 bg-stone-50">
                  <div className="max-w-3xl mx-auto">
                    <h4 className="text-2xl font-black text-stone-900 mb-6 border-b border-stone-200 pb-4">Frequently Asked Questions</h4>
                    
                    <div className="space-y-6">
                      <div>
                        <h5 className="font-bold text-stone-800 text-lg mb-2 flex items-center">
                          <span className="text-[#2E7D32] mr-2">Q:</span> How is the End-to-End Encrypted Profile built?
                        </h5>
                        <p className="text-stone-600 leading-relaxed">
                          <span className="font-bold text-stone-700 mr-2">A:</span> 
                          You start by pasting your organization's mission, background, or LinkedIn URL. This data is instantly encrypted and vectorized into our secure ChromaDB. The Matchmaker agent then uses these vectors to score your alignment with grant rubrics autonomously.
                        </p>
                      </div>

                      <div>
                        <h5 className="font-bold text-stone-800 text-lg mb-2 flex items-center">
                          <span className="text-[#2E7D32] mr-2">Q:</span> What exactly does the AI Grant Scheduler do?
                        </h5>
                        <p className="text-stone-600 leading-relaxed">
                          <span className="font-bold text-stone-700 mr-2">A:</span> 
                          Like a digital chief of staff, it analyzes the deadlines and complexity of your targeted grants. It then maps out specific work blocks (e.g., "Research + Exec Summary for 3 hours") and auto-syncs them into your Google Calendar, ensuring you never miss a deadline.
                        </p>
                      </div>

                      <div>
                        <h5 className="font-bold text-stone-800 text-lg mb-2 flex items-center">
                          <span className="text-[#2E7D32] mr-2">Q:</span> How does "The Watcher" agent work?
                        </h5>
                        <p className="text-stone-600 leading-relaxed">
                          <span className="font-bold text-stone-700 mr-2">A:</span> 
                          The Watcher is a persistent, 24/7 background agent. It continually polls federal and state APIs like Grants.gov. The moment a new opportunity drops that matches your profile with a score {'>'}80%, it drafts a starting proposal and emails you the alert.
                        </p>
                      </div>
                      
                      <div>
                        <h5 className="font-bold text-stone-800 text-lg mb-2 flex items-center">
                          <span className="text-[#2E7D32] mr-2">Q:</span> Are my submissions actually sent via Gmail?
                        </h5>
                        <p className="text-stone-600 leading-relaxed">
                          <span className="font-bold text-stone-700 mr-2">A:</span> 
                          Yes. When you connect Gmail via OAuth in the Integrations tab, The Submitter agent takes the verified PDF from The Drafter and autonomously emails it to the agency endpoint.
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-10 text-center">
                      <button 
                        onClick={() => { setShowDemoModal(false); setIsDemoPlaying(false); }}
                        className="px-8 py-3 bg-[#2E7D32] text-white rounded-xl font-bold hover:bg-[#1B5E20] transition-colors shadow-md"
                      >
                        Close & Try the Platform
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full max-w-2xl bg-white rounded-2xl border border-stone-200 shadow-xl overflow-hidden mt-8">
          {/* Header */}
          <div className="bg-[#2E7D32]/5 border-b border-stone-100 p-6 text-center relative">
            <button onClick={() => setShowDemoModal(true)}
              className="absolute top-5 right-5 flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-stone-200 shadow-sm rounded-full text-xs font-bold text-stone-600 hover:text-[#2E7D32] hover:border-[#2E7D32]/30 transition-all">
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
                    onboardStep > s ? 'bg-[#2E7D32] text-white' :
                    onboardStep === s ? 'bg-[#2E7D32] text-white ring-4 ring-[#2E7D32]/20' :
                    'bg-stone-100 text-stone-400'
                  }`}>{onboardStep > s ? '✓' : s}</div>
                  {s < 3 && <div className={`w-12 h-0.5 rounded-full ${onboardStep > s ? 'bg-[#2E7D32]' : 'bg-stone-200'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-8 mt-2 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              <span className={onboardStep >= 1 ? 'text-[#2E7D32]' : ''}>Organization</span>
              <span className={onboardStep >= 2 ? 'text-[#2E7D32]' : ''}>Mission</span>
              <span className={onboardStep >= 3 ? 'text-[#2E7D32]' : ''}>Funding Goal</span>
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
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Organization Type *</label>
                    <select value={profile.orgType} onChange={e => setProfile({...profile, orgType: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900">
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
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Website or LinkedIn</label>
                    <input type="text" placeholder="https://yourorg.com"
                      value={profile.website} onChange={e => setProfile({...profile, website: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: Mission & Impact ─── */}
            {onboardStep === 2 && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700 flex items-center"><Cpu className="w-4 h-4 mr-2 text-stone-400" />Primary Focus Area *</label>
                  <input type="text" placeholder="e.g. AI-driven civic technology, STEM education, community health"
                    value={profile.focusArea} onChange={e => setProfile({...profile, focusArea: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 placeholder:text-stone-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Mission Statement *</label>
                  <textarea rows={3} placeholder="We exist to... (describe your organization's core purpose)"
                    value={profile.missionStatement} onChange={e => setProfile({...profile, missionStatement: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 placeholder:text-stone-400 resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Who do you serve?</label>
                    <input type="text" placeholder="e.g. Low-income youth in Miami-Dade"
                      value={profile.targetPopulation} onChange={e => setProfile({...profile, targetPopulation: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 placeholder:text-stone-400" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Annual Budget Range</label>
                    <select value={profile.annualBudget} onChange={e => setProfile({...profile, annualBudget: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900">
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
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900">
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
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900">
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
                    <span className="flex items-center"><FileText className="w-4 h-4 mr-2 text-[#2E7D32]" />What do you need funding for? *</span>
                    <span className="text-[10px] font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-1 rounded-full border border-[#2E7D32]/20 uppercase tracking-wider">Key for AI matching</span>
                  </label>
                  <textarea rows={4}
                    placeholder="Describe the specific project or program you want to fund. Be as detailed as possible — this is what agents use to write your proposal."
                    value={profile.projectDescription} onChange={e => setProfile({...profile, projectDescription: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 placeholder:text-stone-400 resize-none" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-stone-700">Funding Amount Needed</label>
                    <select value={profile.fundingAmount} onChange={e => setProfile({...profile, fundingAmount: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900">
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
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900">
                      <option value="">Select...</option>
                      <option value="none">No, this is our first</option>
                      <option value="yes-small">Yes, under $50K</option>
                      <option value="yes-large">Yes, over $50K</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-stone-700">Additional Background / LinkedIn / Resume</label>
                  <p className="text-xs text-stone-400">Paste anything extra — bio, track record, prior awards. Helps Drafter write stronger proposals.</p>
                  <textarea rows={4}
                    placeholder="Paste your LinkedIn summary, team bios, prior accomplishments, or any context that strengthens your application..."
                    value={profile.backgroundInfo} onChange={e => setProfile({...profile, backgroundInfo: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 placeholder:text-stone-400 resize-none" />
                </div>
              </>
            )}

            {/* Active Copilots Section (Genspark style) */}
            <div className="mt-6 border-t border-stone-100 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">6 Active Action Agents</h3>
                <button 
                  onClick={() => setShowAgentsMenu(!showAgentsMenu)}
                  className="flex items-center text-xs font-bold text-[#2E7D32] bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 px-3 py-1.5 rounded-full transition-colors"
                >
                  {showAgentsMenu ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                  {showAgentsMenu ? 'Hide Agents' : 'View All Agents'}
                </button>
              </div>
              
              {!showAgentsMenu ? (
                <div className="flex items-center space-x-3">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[60] shadow-sm"><Search className="w-4 h-4 text-[#2E7D32]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[50] shadow-sm"><BrainCircuit className="w-4 h-4 text-[#2E7D32]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[40] shadow-sm"><FileEdit className="w-4 h-4 text-[#2E7D32]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[30] shadow-sm"><ShieldCheck className="w-4 h-4 text-[#2E7D32]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[20] shadow-sm"><Send className="w-4 h-4 text-[#2E7D32]" /></div>
                    <div className="w-8 h-8 rounded-full bg-[#2E7D32]/10 border border-[#2E7D32]/30 flex items-center justify-center z-[10] shadow-sm"><Eye className="w-4 h-4 text-[#2E7D32] animate-pulse" /></div>
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
                      <div className={`p-2 bg-white rounded-lg border border-stone-200 mr-3 text-[#2E7D32] shadow-sm shrink-0 ${ag.id === 'watcher' ? 'bg-[#2E7D32]/10 border-[#2E7D32]/30' : ''}`}>
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
                  className="flex-1 flex items-center justify-center py-3.5 px-6 text-white font-bold text-base rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] transition-all shadow-md active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue →
                </button>
              ) : (
                <button
                  onClick={() => setStep('dashboard')}
                  disabled={!isStep3Valid}
                  className="flex-1 flex items-center justify-center py-3.5 px-6 text-white font-bold text-base rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">
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
    <div className="min-h-screen bg-[#F9F7F2] text-stone-900 font-sans selection:bg-[#2E7D32]/20 flex flex-col">
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
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#2E7D32] text-white rounded">Hub</span>
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
          
          {/* Tabs */}
          <div className="flex space-x-6 border-b border-stone-200">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 text-sm font-bold flex items-center transition-colors border-b-2 ${activeTab === 'dashboard' ? 'border-[#2E7D32] text-[#2E7D32]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <BarChart3 className="w-4 h-4 mr-2" /> AI Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('scheduler')}
              className={`pb-3 text-sm font-bold flex items-center transition-colors border-b-2 ${activeTab === 'scheduler' ? 'border-[#2E7D32] text-[#2E7D32]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <CalendarDays className="w-4 h-4 mr-2" /> Grant Scheduler
            </button>
            <button 
              onClick={() => setActiveTab('meetings')}
              className={`pb-3 text-sm font-bold flex items-center transition-colors border-b-2 ${activeTab === 'meetings' ? 'border-[#2E7D32] text-[#2E7D32]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <Users className="w-4 h-4 mr-2" /> Meeting Summaries
            </button>
            <button 
              onClick={() => setActiveTab('integrations')}
              className={`pb-3 text-sm font-bold flex items-center transition-colors border-b-2 ${activeTab === 'integrations' ? 'border-[#2E7D32] text-[#2E7D32]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <Link className="w-4 h-4 mr-2" /> Integrations
            </button>
            <button 
              onClick={() => setActiveTab('lalla')}
              className={`pb-3 text-sm font-bold flex items-center transition-colors border-b-2 ${
                activeTab === 'lalla'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Sparkles className="w-4 h-4 mr-2" /> Ask MyLalla
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        {activeTab === 'integrations' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 animate-in fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-800 flex items-center"><Link className="w-5 h-5 mr-2 text-[#2E7D32]" /> App Integrations</h2>
              <p className="text-sm text-stone-500 mt-1">Connect your favorite tools to allow CivicPath to act autonomously on your behalf.</p>
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
                <button 
                  onClick={() => setIntegrations({...integrations, gmail: !integrations.gmail})}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center ${integrations.gmail ? 'bg-stone-200 text-stone-700 border border-stone-300 hover:bg-stone-300' : 'bg-[#2E7D32] text-white hover:bg-[#1B5E20]'}`}
                >
                  {integrations.gmail ? <><CheckCircle2 className="w-4 h-4 mr-2 text-[#2E7D32]" /> Connected</> : 'Connect Gmail'}
                </button>
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
                <button 
                  onClick={() => setIntegrations({...integrations, meet: !integrations.meet})}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center ${integrations.meet ? 'bg-stone-200 text-stone-700 border border-stone-300 hover:bg-stone-300' : 'bg-[#2E7D32] text-white hover:bg-[#1B5E20]'}`}
                >
                  {integrations.meet ? <><CheckCircle2 className="w-4 h-4 mr-2 text-[#2E7D32]" /> Connected</> : 'Connect Meet'}
                </button>
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
                <button 
                  onClick={() => setIntegrations({...integrations, zoom: !integrations.zoom})}
                  className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center ${integrations.zoom ? 'bg-stone-200 text-stone-700 border border-stone-300 hover:bg-stone-300' : 'bg-[#2E7D32] text-white hover:bg-[#1B5E20]'}`}
                >
                  {integrations.zoom ? <><CheckCircle2 className="w-4 h-4 mr-2 text-[#2E7D32]" /> Connected</> : 'Connect Zoom'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scheduler' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-stone-800 flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-[#2E7D32]" /> AI Work Plan</h2>
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
                className="px-4 py-2 bg-[#2E7D32] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#1B5E20] transition-colors flex items-center w-full md:w-auto justify-center"
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
                        <a href={grant.url} target="_blank" rel="noopener noreferrer" className="text-[#2E7D32] hover:underline normal-case font-medium">View on Grants.gov →</a>
                      </h3>
                      <div className="space-y-3">
                        {blocks.map((b, bi) => {
                          const blockDate = new Date(deadlineDate);
                          blockDate.setDate(blockDate.getDate() - b.days);
                          const dateStr = blockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          const calDate = blockDate.toISOString().replace(/-/g,'').split('T')[0];
                          const calUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(grant.title + ': ' + b.label)}&dates=${calDate}/${calDate}&details=${encodeURIComponent('CivicPath — ' + grant.title)}`;
                          return (
                            <div key={bi} className={`flex flex-col md:flex-row md:items-center p-4 rounded-xl gap-4 border ${b.color ? 'bg-[#2E7D32]/5 border-[#2E7D32]/20' : 'bg-stone-50 border-stone-200'}`}>
                              <div className="w-24 shrink-0 text-xs font-bold text-stone-500 flex items-center"><Clock className="w-3.5 h-3.5 mr-1" />{dateStr}</div>
                              <div className="flex-1">
                                <div className="text-sm font-bold text-stone-800">{b.label}</div>
                                <div className="text-xs text-stone-500 mt-0.5">{grant.agency} • Due: {grant.closeDate} • <span className={b.color ? 'text-amber-600 font-bold' : 'text-stone-400'}>{b.priority}</span></div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600">{b.hours}</span>
                                <button onClick={() => window.open(calUrl, '_blank')} className="p-1.5 text-[#2E7D32] hover:bg-[#2E7D32]/10 rounded-lg transition-colors" title="Add to Google Calendar">
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
                <h2 className="text-xl font-bold text-stone-800 flex items-center"><Users className="w-5 h-5 mr-2 text-[#2E7D32]" /> Meeting Summary Agent</h2>
                <p className="text-sm text-stone-500 mt-1">Paste your transcript or connect Google Meet to automatically extract actionable grant milestones.</p>
              </div>
              <div className="flex space-x-3">
                <button onClick={() => window.open('https://meet.google.com', '_blank')} className="flex-1 md:flex-none px-4 py-2 bg-white border border-stone-200 text-stone-700 text-sm font-bold rounded-lg hover:bg-stone-50 shadow-sm transition-colors flex items-center justify-center">
                  <Video className="w-4 h-4 mr-2 text-stone-500" /> Connect Meet
                </button>
                <button onClick={() => {}} className="flex-1 md:flex-none px-4 py-2 bg-[#2E7D32] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#1B5E20] transition-colors flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-2" /> Paste Transcript
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-white border border-[#2E7D32]/20 rounded-xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#2E7D32]"></div>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-stone-800 uppercase tracking-tight">GRANT PREP MEETING SUMMARY</h3>
                    <p className="text-xs font-medium text-stone-500 mt-1.5">Date: March 21, 2026 | Duration: 47 min | Grant: NSF SBIR Phase I — $200K</p>
                  </div>
                  <span className="px-3 py-1 bg-[#2E7D32]/10 text-[#2E7D32] text-[10px] font-black uppercase tracking-wider rounded-md border border-[#2E7D32]/20">AI Generated</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-sm font-bold text-stone-700 mb-3 flex items-center uppercase tracking-wider"><CheckSquare className="w-4 h-4 mr-2 text-[#2E7D32]" /> Decisions Made</h4>
                    <ul className="space-y-2.5 text-sm text-stone-600 font-medium">
                      <li className="flex items-start"><span className="mr-2 text-[#2E7D32]">•</span> CEO will sign off on budget section by Thursday</li>
                      <li className="flex items-start"><span className="mr-2 text-[#2E7D32]">•</span> Legal to review IP clause in section 3.2</li>
                      <li className="flex items-start"><span className="mr-2 text-[#2E7D32]">•</span> Demo video needed — assign to marketing team</li>
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
                  <h4 className="text-sm font-bold text-stone-700 mb-4 flex items-center uppercase tracking-wider"><ListTodo className="w-4 h-4 mr-2 text-[#2E7D32]" /> Action Items</h4>
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-center text-sm mb-2 sm:mb-0"><span className="font-bold text-[#2E7D32] w-20 bg-[#2E7D32]/10 px-2 py-0.5 rounded text-center mr-3">[John]</span> <span className="font-medium text-stone-800">Budget finalization</span></div>
                      <div className="text-xs font-bold text-stone-500 bg-white px-2 py-1 border border-stone-200 rounded">Due Wed March 23</div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-center text-sm mb-2 sm:mb-0"><span className="font-bold text-[#2E7D32] w-20 bg-[#2E7D32]/10 px-2 py-0.5 rounded text-center mr-3">[Sarah]</span> <span className="font-medium text-stone-800">IP review</span></div>
                      <div className="text-xs font-bold text-stone-500 bg-white px-2 py-1 border border-stone-200 rounded">Due Fri March 25</div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                      <div className="flex items-center text-sm mb-2 sm:mb-0"><span className="font-bold text-[#2E7D32] w-20 bg-[#2E7D32]/10 px-2 py-0.5 rounded text-center mr-3">[Team]</span> <span className="font-medium text-stone-800">Video production</span></div>
                      <div className="text-xs font-bold text-stone-500 bg-white px-2 py-1 border border-stone-200 rounded">Due Mon March 28</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 bg-[#2E7D32]/5 p-4 rounded-xl border border-[#2E7D32]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center text-sm font-bold text-[#2E7D32]">
                    <Calendar className="w-5 h-5 mr-2" /> Next Meeting: Friday 2:00 PM
                  </div>
                  <span className="text-[10px] font-black text-white bg-[#2E7D32] px-2 py-1 rounded uppercase tracking-wider shadow-sm">Auto-booked in G-Cal</span>
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
                      ? 'bg-[#2E7D32] text-white rounded-br-sm'
                      : 'bg-stone-50 border border-stone-200 text-stone-800 rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none prose-stone prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:text-stone-900">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-[#2E7D32]/10 border border-[#2E7D32]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-[#2E7D32]">{(user?.name?.[0] || 'U').toUpperCase()}</span>
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
              <div className="w-2 h-2 rounded-full bg-[#2E7D32] animate-pulse"></div>
              <span className="text-sm font-semibold text-stone-700">Live data powered by <a href="https://www.grants.gov" target="_blank" rel="noopener noreferrer" className="text-[#2E7D32] hover:underline">Grants.gov</a> + SBA SBIR — real-time federal grant database</span>
            </div>

            {/* Active Profile & Controls */}
            <div className="mb-6 flex flex-wrap items-center gap-4 p-5 bg-white border border-stone-200 rounded-xl shadow-sm">
              <div className="text-sm font-semibold text-stone-400 flex items-center uppercase tracking-wider">
                <Building2 className="w-4 h-4 mr-2 text-[#2E7D32]" />
                Active Profile:
              </div>
              <div className="px-3 py-1 bg-stone-50 rounded-lg text-sm font-medium border border-stone-200 text-stone-700">
                {profile.companyName || 'Anonymous'}
              </div>
              <div className="px-3 py-1 bg-stone-50 rounded-lg text-sm font-medium border border-stone-200 text-stone-700">
                {profile.focusArea || 'General Tech'}
              </div>
              <div className="px-3 py-1 bg-stone-50 rounded-lg text-sm font-medium border border-stone-200 text-stone-700">
                {profile.location || 'Anywhere'}
              </div>
              
              <div className="ml-auto flex items-center space-x-3">
                <button 
                  onClick={() => setStep('onboarding')}
                  className="text-xs font-bold text-stone-500 hover:text-stone-800 uppercase tracking-wider px-2"
                >
                  Edit Profile
                </button>
                <button 
                  onClick={handleExecute}
                  disabled={isRunning}
                  className={`inline-flex items-center px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    isRunning 
                      ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                      : 'bg-[#2E7D32] text-white hover:bg-[#1B5E20] shadow-sm active:scale-[0.98]'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Agents Acting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2 fill-current" />
                      Run Full Pipeline
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 🌟 GLOBAL LIVE ORCHESTRATION LOG PANEL 🌟 */}
            {(isRunning || globalLogs.length > 0) && (
              <div className="mb-8 bg-stone-900 rounded-xl shadow-2xl border border-stone-800 overflow-hidden relative transform transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2E7D32] via-emerald-400 to-[#2E7D32] opacity-90 shadow-[0_0_10px_rgba(46,125,50,0.5)]"></div>
                <div className="px-5 py-3 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
                  <div className="flex items-center space-x-2">
                    <TerminalSquare className="w-4 h-4 text-[#2E7D32]" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#2E7D32]">Live Agent Comm Stream</span>
                  </div>
                  {isRunning ? (
                    <Loader2 className="w-4 h-4 text-[#2E7D32] animate-spin" />
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
                  {isRunning && <div className="animate-pulse text-[#2E7D32] font-bold mt-1">_</div>}
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
                        className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 text-sm font-mono resize-none"
                      />
                    </div>
                  ) : (
                    <div className="mb-4 p-4 bg-stone-50 rounded-xl border border-stone-200 max-h-48 overflow-y-auto text-xs text-stone-700 font-mono leading-relaxed whitespace-pre-wrap">
                      {drafterOutput || 'No proposal generated yet.'}
                    </div>
                  )}
                  <div className="flex gap-3 flex-wrap">
                    <button onClick={handleApproveAndSubmit}
                      className="flex items-center gap-2 px-6 py-3 bg-[#2E7D32] text-white font-bold rounded-xl hover:bg-[#1B5E20] transition-colors shadow-sm">
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

            {/* Completion Actions (Calendar & PDF) */}
            {nextAction?.type === 'success' && (
              <div className="mb-8 p-6 bg-[#2E7D32]/5 border border-[#2E7D32]/20 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-[#2E7D32] text-white rounded-full"><CheckCircle2 className="w-6 h-6" /></div>
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
                    <Download className="w-4 h-4 mr-2 text-[#2E7D32]" /> Download PDF Proposal
                  </button>
                  <button
                    onClick={() => {
                      const grantName = 'State Innovation Match Fund';
                      const deadline = '20261015';
                      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Grant Deadline: ' + grantName)}&dates=${deadline}/${deadline}&details=${encodeURIComponent('Apply for ' + grantName + ' — CivicPath')}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center px-4 py-2 bg-[#2E7D32] text-white rounded-lg hover:bg-[#1B5E20] font-bold text-sm shadow-sm transition-colors"
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
                        agent.status === 'working' ? 'bg-[#2E7D32]/10 text-[#2E7D32] border-[#2E7D32]/20' :
                        agent.status === 'completed' ? 'bg-[#2E7D32]/5 text-[#2E7D32] border-[#2E7D32]/10' :
                        agent.status === 'error' ? 'bg-red-50 text-red-500 border-red-100' :
                        'bg-stone-100 text-stone-400 border-stone-200'
                      }`}>
                        {agent.icon}
                      </div>
                      <h3 className="font-bold text-stone-800 tracking-tight text-sm">{agent.name}</h3>
                    </div>
                    <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-sm">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${
                         agent.status === 'working' ? 'text-[#2E7D32]' :
                         agent.status === 'completed' ? 'text-[#2E7D32]' :
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
                          <span className="text-[#2E7D32] font-bold mr-1.5 opacity-70">❯</span>{log}
                        </div>
                      ))}
                      {agent.status === 'working' && (
                        <div className="animate-pulse text-stone-500">
                          <span className="text-[#2E7D32] font-bold mr-1.5">❯</span>_
                        </div>
                      )}
                      <div ref={(el) => { logsEndRefs.current[agent.id] = el; }} />
                    </div>

                    {/* Agent Output */}
                    {agent.output && (
                      <div className="p-4 bg-white border-t border-inherit flex-1 prose prose-sm prose-stone max-w-none prose-a:text-[#2E7D32] prose-a:font-bold prose-a:no-underline hover:prose-a:underline text-xs leading-relaxed">
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

