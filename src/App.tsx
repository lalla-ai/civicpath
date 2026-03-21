import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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
  DollarSign,
  Link,
  Mail
} from 'lucide-react';

type AgentStatus = 'idle' | 'working' | 'completed' | 'error';
type AppStep = 'onboarding' | 'dashboard';
type ActiveTab = 'dashboard' | 'scheduler' | 'meetings' | 'integrations';

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

function App() {
  const [step, setStep] = useState<AppStep>('onboarding');
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [profile, setProfile] = useState({
    companyName: 'Sunrise Tech Nonprofit',
    focusArea: 'AI-driven agricultural optimization',
    location: 'Orlando, FL',
    backgroundInfo: 'Focused on sustainable, AI-driven solutions for local communities in Florida. Our team has successfully deployed 3 pilot projects reducing resource usage by 15%.'
  });

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

  // --- Mock Agent Behaviors ---
  const runHunter = async () => {
    updateAgent('hunter', { status: 'working', logs: [], output: null });
    
    addLog('hunter', 'Initializing Web Search Protocol...');
    await delay(600);
    
    const targetLoc = profile.location || 'Florida';
    const targetTech = profile.focusArea || 'tech';
    
    addGlobalLog(`[🔍 The Hunter]     Scanning Grants.gov API for ${targetLoc} ${targetTech} grants...`);
    addLog('hunter', `Executing Query: [2026 grants "${targetTech}" "${targetLoc}"]`);
    await delay(1200);
    
    addLog('hunter', 'Crawling high-authority agency domains...');
    await delay(1000);
    
    addGlobalLog(`[🔍 The Hunter]     Found 47 matching opportunities ✓`);
    addGlobalLog(`[🤖 ACTIVITY]       Hunter → Matchmaker: "Found 47 FL grants. Sending batch for semantic scoring. Priority: tech focus."`);
    addLog('hunter', 'Extracting JSON metadata (Deadlines, Amounts)...');
    await delay(800);
    
    const hunterText = `
**Live Search Results Gathered:**
* [State Innovation Match Fund](https://example.gov/match) - $150k (Due: Oct 15, 2026)
* [National Tech Seed Grant](https://example.gov/seed) - $250k (Rolling)
* [Regional Sustainability Initiative](https://example.gov/sustain) - $50k (Due: Dec 1, 2026)
* [Department of Energy SBIR Phase I](https://example.gov/sbir) - $200k (Due: Jan 2027)

*Status: 47 highly relevant grants found matching the location and tech focus.*
`;
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
    await delay(800);
    
    addGlobalLog(`[✍️ The Drafter]    Generating executive summary for Grant #1...`);
    addLog('drafter', 'Loading grant rubric and agency specific guidelines...');
    await delay(1000);
    
    addLog('drafter', 'Generating Section 2: Technical Merit...');
    await delay(1000);

    const drafterText = `
### Draft Proposal: Executive Summary

**Problem & Solution**: Regional sectors face increasing volatility. Our platform addresses these challenges by providing real-time, sensor-based insights that maximize output while minimizing resource consumption.

**Technical Merit**: Utilizing proprietary machine learning algorithms trained on specific regional data, our solution outperforms generic optimization tools. 

**Economic Impact**: We anticipate a 15% reduction in resource usage and a significant boost to the local economy. Expansion plan includes creating 25 high-wage technical jobs within the next 18 months.
`;
    await streamOutput('drafter', drafterText);
    
    addGlobalLog(`[✍️ The Drafter]    Draft complete and formatted to PDF standards ✓`);
    addGlobalLog(`[🤖 ACTIVITY]       Drafter → Controller: "Draft complete (847 words). Requesting compliance check before presenting."`);
    updateAgent('drafter', { status: 'completed' });
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

  const handleExecute = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setNextAction(null);
    setGlobalLogs([]);
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', logs: [], output: null })));

    try {
      if (!await runHunter()) throw new Error('Hunter failed');
      if (!await runMatchmaker()) throw new Error('Matchmaker failed');
      if (!await runDrafter()) throw new Error('Drafter failed');
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
          <div className="bg-[#2E7D32]/5 border-b border-stone-100 p-8 text-center relative">
            <button 
              onClick={() => setShowDemoModal(true)}
              className="absolute top-6 right-6 flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-stone-200 shadow-sm rounded-full text-xs font-bold text-stone-600 hover:text-[#2E7D32] hover:border-[#2E7D32]/30 transition-all"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Watch Demo</span>
            </button>
            <div className="flex justify-center mb-4 mt-2">
              <div className="scale-150 transform mb-2">
                <Logo />
              </div>
            </div>
            <h1 className="text-4xl font-[800] text-stone-900 mb-2 tracking-tight">CivicPath</h1>
            <p className="text-stone-500 text-lg font-medium">Your community. Funded.</p>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 flex items-center">
                  <Building2 className="w-4 h-4 mr-2 text-stone-400" />
                  Company / Project Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Sunrise Tech Nonprofit"
                  value={profile.companyName}
                  onChange={e => setProfile({...profile, companyName: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] transition-all outline-none text-stone-900 placeholder:text-stone-400"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-stone-700 flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-stone-400" />
                  Location
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Orlando, FL"
                  value={profile.location}
                  onChange={e => setProfile({...profile, location: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] transition-all outline-none text-stone-900 placeholder:text-stone-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-stone-700 flex items-center">
                <Cpu className="w-4 h-4 mr-2 text-stone-400" />
                Technology Focus Area
              </label>
              <input 
                type="text" 
                placeholder="e.g. AI-driven agricultural optimization"
                value={profile.focusArea}
                onChange={e => setProfile({...profile, focusArea: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] transition-all outline-none text-stone-900 placeholder:text-stone-400"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-sm font-semibold text-stone-700 flex items-center justify-between">
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-2 text-[#2E7D32]" />
                  Paste Resume / LinkedIn Details
                </span>
                <span className="text-[10px] font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-1 rounded-full border border-[#2E7D32]/20 uppercase tracking-wider">Highly Recommended</span>
              </label>
              <p className="text-xs text-stone-500 pb-1">Providing background context significantly increases match accuracy and proposal quality.</p>
              <textarea 
                rows={5}
                placeholder="Paste your resume, LinkedIn summary, or detailed background here..."
                value={profile.backgroundInfo}
                onChange={e => setProfile({...profile, backgroundInfo: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] transition-all outline-none text-stone-900 placeholder:text-stone-400 resize-none"
              />
            </div>

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

            <div className="pt-4 flex space-x-4">
              <button 
                onClick={() => setStep('dashboard')}
                className="flex-1 flex items-center justify-center py-4 px-6 text-white font-bold text-lg rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                Access Action Platform
                <Play className="w-5 h-5 ml-2 fill-current" />
              </button>
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
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setStep('onboarding')}>
              <Logo />
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-[800] tracking-tight text-stone-900">
                  CivicPath
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#2E7D32] text-white rounded">Hub</span>
              </div>
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
                  onClick={() => {
                    alert('Demo: Initiating Gmail OAuth2 connection...');
                    setIntegrations({...integrations, gmail: !integrations.gmail});
                  }} 
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
                  onClick={() => {
                    alert('Demo: Redirecting to Google Workspace connection...');
                    setIntegrations({...integrations, meet: !integrations.meet});
                  }} 
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
                  onClick={() => {
                    alert('Demo: Contacting Zoom OAuth server...');
                    setIntegrations({...integrations, zoom: !integrations.zoom});
                  }} 
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
                <h2 className="text-xl font-bold text-stone-800 flex items-center"><CalendarDays className="w-5 h-5 mr-2 text-[#2E7D32]" /> Auto-Scheduled Work Plan</h2>
                <p className="text-sm text-stone-500 mt-1">AI has allocated 23 hours across 3 active grants based on deadlines and priority.</p>
              </div>
              <button onClick={() => alert('Demo: Background Watcher is syncing these events to your Google Calendar.')} className="px-4 py-2 bg-[#2E7D32] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#1B5E20] transition-colors flex items-center w-full md:w-auto justify-center">
                <Calendar className="w-4 h-4 mr-2" /> Sync to Google Calendar
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Day 1 */}
              <div>
                <h3 className="text-xs font-bold text-stone-500 mb-3 uppercase tracking-wider pb-2 border-b border-stone-100">Monday, March 23</h3>
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center p-4 bg-[#2E7D32]/5 border border-[#2E7D32]/20 rounded-xl gap-4">
                    <div className="w-24 shrink-0 text-sm font-bold text-[#2E7D32] flex items-center"><Clock className="w-4 h-4 mr-1.5" /> 9:00 AM</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-stone-800">Grant A: Research + Executive Summary</div>
                      <div className="text-xs font-medium text-stone-500 mt-0.5">State Innovation Match Fund ($150k) • <span className="text-amber-600 font-bold">High Priority</span></div>
                    </div>
                    <div className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 shadow-sm">4 hrs block</div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center p-4 bg-stone-50 border border-stone-200 rounded-xl gap-4">
                    <div className="w-24 shrink-0 text-sm font-bold text-stone-500 flex items-center"><Clock className="w-4 h-4 mr-1.5" /> 2:00 PM</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-stone-800">Grant A: Budget Narrative Prep</div>
                      <div className="text-xs font-medium text-stone-500 mt-0.5">State Innovation Match Fund ($150k)</div>
                    </div>
                    <div className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 shadow-sm">3 hrs block</div>
                  </div>
                </div>
              </div>
              {/* Day 2 */}
              <div>
                <h3 className="text-xs font-bold text-stone-500 mb-3 uppercase tracking-wider pb-2 border-b border-stone-100">Tuesday, March 24</h3>
                <div className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center p-4 bg-[#2E7D32]/5 border border-[#2E7D32]/20 rounded-xl gap-4">
                    <div className="w-24 shrink-0 text-sm font-bold text-[#2E7D32] flex items-center"><Clock className="w-4 h-4 mr-1.5" /> 9:00 AM</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-stone-800">Grant A: Review AI Draft + Submit <span className="ml-2">✅</span></div>
                      <div className="text-xs font-medium text-stone-500 mt-0.5">State Innovation Match Fund ($150k) • <span className="text-[#2E7D32] font-bold">Final Review</span></div>
                    </div>
                    <div className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 shadow-sm">3 hrs block</div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center p-4 bg-stone-50 border border-stone-200 rounded-xl gap-4">
                    <div className="w-24 shrink-0 text-sm font-bold text-stone-500 flex items-center"><Clock className="w-4 h-4 mr-1.5" /> 1:00 PM</div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-stone-800">Grant C: Profile Alignment Analysis</div>
                      <div className="text-xs font-medium text-stone-500 mt-0.5">Regional Sustainability Initiative ($50k)</div>
                    </div>
                    <div className="px-3 py-1 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-600 shadow-sm">2 hrs block</div>
                  </div>
                </div>
              </div>
            </div>
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
                <button onClick={() => alert('Demo: Connecting to Google Meet API (OAuth2)...')} className="flex-1 md:flex-none px-4 py-2 bg-white border border-stone-200 text-stone-700 text-sm font-bold rounded-lg hover:bg-stone-50 shadow-sm transition-colors flex items-center justify-center">
                  <Video className="w-4 h-4 mr-2 text-stone-500" /> Connect Meet
                </button>
                <button onClick={() => alert('Demo: Simulating transcript paste and processing...')} className="flex-1 md:flex-none px-4 py-2 bg-[#2E7D32] text-white text-sm font-bold rounded-lg shadow-sm hover:bg-[#1B5E20] transition-colors flex items-center justify-center">
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

        {activeTab === 'dashboard' && (
          <>
            {/* Impact Metrics Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-center relative overflow-hidden">
                <div className="absolute right-0 top-0 w-16 h-16 bg-[#2E7D32]/5 rounded-bl-full -mr-8 -mt-8"></div>
                <div className="flex items-center text-stone-500 mb-1"><BarChart3 className="w-4 h-4 mr-1.5" /> <span className="text-xs font-bold uppercase tracking-wider">Grants Fetched Live</span></div>
                <div className="text-2xl font-black text-stone-900 flex items-baseline">75 <span className="text-[10px] ml-2 font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Verified</span></div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-center">
                <div className="flex items-center text-stone-500 mb-1"><Search className="w-4 h-4 mr-1.5" /> <span className="text-xs font-bold uppercase tracking-wider">Match Accuracy</span></div>
                <div className="text-2xl font-black text-stone-900">94%</div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-center">
                <div className="flex items-center text-[#2E7D32] mb-1"><Clock className="w-4 h-4 mr-1.5" /> <span className="text-xs font-bold uppercase tracking-wider">Saved Per User</span></div>
                <div className="text-2xl font-black text-[#2E7D32]">38 hrs</div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-center">
                <div className="flex items-center text-stone-500 mb-1"><DollarSign className="w-4 h-4 mr-1.5" /> <span className="text-xs font-bold uppercase tracking-wider">In Active Grants</span></div>
                <div className="text-2xl font-black text-stone-900">$2.4M</div>
              </div>
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
                  <button onClick={() => alert('Demo: Downloading proposal_final.pdf...')} className="flex items-center px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg hover:bg-stone-50 font-bold text-sm shadow-sm transition-colors">
                    <Download className="w-4 h-4 mr-2 text-[#2E7D32]" /> Download PDF Proposal
                  </button>
                  <button onClick={() => alert('Demo: Booking 3 milestone events to Google Calendar...')} className="flex items-center px-4 py-2 bg-[#2E7D32] text-white rounded-lg hover:bg-[#1B5E20] font-bold text-sm shadow-sm transition-colors">
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

export default App;
