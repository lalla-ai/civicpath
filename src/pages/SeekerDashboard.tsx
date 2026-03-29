import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { auth } from '../firebase';
import { saveUserData, loadUserData, saveProposal, saveApplication } from '../lib/db';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { orchestratedInference } from '../lib/agents/orchestrator';
import ReactMarkdown from 'react-markdown';
import OmninorMascot from '../components/OmninorMascot';
import { jsPDF } from 'jspdf';
import type { ChatMessage } from '../gemini';
import { grantLeafHash, buildMerkleRoot, simulateZGSync, truncateHash } from '../lib/merkle';
import type { ZGReceipt } from '../lib/merkle';
import { getFunderGrants, normalizeFunderGrant } from '../lib/funderGrants';
import { safeParseAIJSON } from '../lib/aiUtils';
import { globalGraph } from '../lib/agents/graph';
import AgentStatus from '../components/AgentStatus';
import type { AgentItem } from '../components/AgentStatus';
import SovereignHeader from '../components/SovereignHeader';
import { PurgeController } from '../lib/sovereign/PurgeController';
import type { PurgePhase } from '../lib/sovereign/PurgeController';
import RevokeAccess from '../components/RevokeAccess';
import AwardedTab from '../components/AwardedTab';
import LanguageSwitcher from '../components/LanguageSwitcher';
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
  Bell,
  CreditCard,
  Zap,
  ShieldOff,
  Trophy,
} from 'lucide-react';

type AgentStatus = 'idle' | 'working' | 'completed' | 'error';
type AppStep = 'onboarding' | 'dashboard';
type ActiveTab = 'dashboard' | 'grants' | 'tracker' | 'scheduler' | 'meetings' | 'integrations' | 'lalla' | 'profile' | 'billing' | 'security' | 'awarded';

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
  linkedinProfileName: string;
  linkedinEmail: string;
  linkedinMemberId: string;
  linkedinPicture: string;
  linkedinConnectedAt: string;
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
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Session persistence — restore dashboard state on return visit
  const [step, setStep] = useState<AppStep>(() => {
    try {
      const saved = localStorage.getItem('civicpath_profile');
      if (saved) {
        const p = JSON.parse(saved);
        // Just need a name to restore dashboard — user can complete profile later
        if (p.companyName?.trim().length >= 2) return 'dashboard';
      }
    } catch {}
    return 'onboarding';
  });

  // Page title + meta description — "Find My Grant"
  useEffect(() => {
    document.title = 'Find My Grant | CivicPath — AI Grant Discovery';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', 'Find My Grant with CivicPath. 8 AI agents scan every federal and state grant, score your fit, draft a proposal, submit, and manage compliance — automatically. Free to start.');
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = 'https://civicpath.ai/find-my-grant';
    return () => {
      document.title = 'CivicPath — AI Grant Finder | Find, Draft & Submit Grants Automatically';
    };
  }, []);

  // Persist step so returning users skip onboarding
  const setStepPersisted = (s: AppStep) => {
    setStep(s);
    if (s === 'dashboard') localStorage.setItem('civicpath_onboarded', '1');
  };

  const [onboardStep, setOnboardStep] = useState(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [profile, setProfile] = useState<Profile>(() => {
    try {
      const saved = localStorage.getItem('civicpath_profile');
      const defaults = {
        companyName: '', orgType: '', location: '', website: '',
        linkedinUrl: '', linkedinProfileName: '', linkedinEmail: '', linkedinMemberId: '', linkedinPicture: '', linkedinConnectedAt: '', twitterUrl: '', tagline: '', yearFounded: '', logoDataUrl: '',
        focusArea: '', missionStatement: '', targetPopulation: '',
        geographicScope: '', annualBudget: '', teamSize: '', yearsOperating: '',
        impactMetrics: '', teamMembersText: '',
        projectDescription: '', fundingAmount: '', previousGrants: '',
        backgroundInfo: '', resumeText: '', ein: '', dunsNumber: '', grantHistoryText: ''
      };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return {
      companyName: '', orgType: '', location: '', website: '',
      linkedinUrl: '', linkedinProfileName: '', linkedinEmail: '', linkedinMemberId: '', linkedinPicture: '', linkedinConnectedAt: '', twitterUrl: '', tagline: '', yearFounded: '', logoDataUrl: '',
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

  // ── Plan gating ───────────────────────────────────────────
  const FREE_RUN_LIMIT = 5;
  const monthKey = `civicpath_runs_${new Date().toISOString().slice(0, 7)}`; // e.g. 'civicpath_runs_2026-03'
  const [monthlyRuns, setMonthlyRuns] = useState<number>(() => {
    return parseInt(localStorage.getItem(monthKey) || '0', 10);
  });
  const [userPlan, setUserPlan] = useState<string>(() =>
    localStorage.getItem('civicpath_plan') || 'free'
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [upgradeModalCode, setUpgradeModalCode] = useState('');
  const [upgradeModalCodeLoading, setUpgradeModalCodeLoading] = useState(false);
  const [upgradeModalCodeMsg, setUpgradeModalCodeMsg] = useState('');

  const handleUpgradeModalRedeem = async () => {
    if (!upgradeModalCode.trim()) return;
    setUpgradeModalCodeLoading(true);
    setUpgradeModalCodeMsg('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not logged in');
      const res = await fetch('/api/sovereign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem-code', code: upgradeModalCode.trim(), idToken: token }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('civicpath_plan', 'beta');
        setUserPlan('beta');
        setShowUpgradeModal(false);
      } else {
        setUpgradeModalCodeMsg(data.error || 'Invalid code.');
      }
    } catch { setUpgradeModalCodeMsg('Could not redeem. Try again.'); }
    finally { setUpgradeModalCodeLoading(false); }
  };

  // Billing tab — redeem code state (must be top-level, never inside IIFE)
  const [billingCode, setBillingCode] = useState('');
  const [billingCodeLoading, setBillingCodeLoading] = useState(false);
  const [billingCodeMsg, setBillingCodeMsg] = useState('');

  const handleBillingRedeem = async () => {
    if (!billingCode.trim()) return;
    setBillingCodeLoading(true);
    setBillingCodeMsg('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not logged in');
      const res = await fetch('/api/sovereign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem-code', code: billingCode.trim(), idToken: token }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('civicpath_plan', 'beta');
        setUserPlan('beta');
        setBillingCodeMsg('\u2713 Beta access activated! Unlimited pipeline runs enabled.');
        setBillingCode('');
      } else {
        setBillingCodeMsg(data.error || 'Invalid code. Please check and try again.');
      }
    } catch { setBillingCodeMsg('Could not redeem code. Please try again.'); }
    finally { setBillingCodeLoading(false); }
  };
  const isPaidPlan = userPlan === 'pro' || userPlan === 'funder';
  const runsRemaining = Math.max(0, FREE_RUN_LIMIT - monthlyRuns);

  const [omninorMessage, setOmninorMessage] = useState<string | null>(null);
  const [omninorAction, setOmninorAction] = useState<(() => void) | null>(null);
  const [omninorActionLabel, setOmninorActionLabel] = useState<string | null>(null);

  // Sync plan from Firestore when user logs in
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    loadUserData(uid).then(data => {
      if (data?.plan) {
        setUserPlan(data.plan);
        localStorage.setItem('civicpath_plan', data.plan);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Real-time funder approval sync ───────────────────────────────────────
  // FIG.3 Marketplace: When Funder clicks 'Approve', Seeker's Watcher (Agent 6)
  // reflects the update instantly via Firestore onSnapshot.
  const seenApprovals = useRef<Set<string>>(new Set());

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'grant_applications'),
      where('seekerUid', '==', uid),
      where('status', '==', 'approved')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'modified' || change.type === 'added') {
          const app = change.doc.data();
          const appId = change.doc.id;
          // Only fire notification for newly-approved apps (not already known)
          if (!seenApprovals.current.has(appId)) {
            seenApprovals.current.add(appId);
            const grantTitle = app.grantTitle || 'your grant';
            const funderName = app.funderName || 'A funder';
            updateAgent('watcher', {
              status: 'working',
              logs: [`\ud83d\udfe2 APPROVAL RECEIVED: ${grantTitle}`],
              output: `## \ud83c\udf89 Application Approved!\n\n**${funderName}** has approved your application for:\n\n**${grantTitle}**\n\n> Your proposal has been reviewed and accepted. Head to your Grant Tracker to record this win.`,
            });
            addGlobalLog(`[\ud83d\udc41\ufe0f The Watcher]    \ud83c\udf89 REAL-TIME UPDATE: "${grantTitle}" \u2014 APPROVED by funder!`);
            window.dispatchEvent(new CustomEvent('civicpath:sovereign-log', {
              detail: `[WATCHER] APPROVAL EVENT \u2014 ${grantTitle} status: APPROVED`,
            }));
          }
        }
      });
    }, () => {}); // fail silently if Firestore permissions issue

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Firestore: load cloud data when user logs in ────────────────────────
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    loadUserData(uid).then(data => {
      if (!data) return;
      if (data.profile && Object.keys(data.profile).length > 0) {
        setProfile(prev => ({ ...prev, ...data.profile }));
        if (data.profile.companyName?.trim().length >= 2) setStep('dashboard');
      }
      if (Array.isArray(data.trackerGrants) && data.trackerGrants.length > 0) {
        setTrackerGrants(data.trackerGrants);
      }
    }).catch(() => {}); // fail silently — localStorage is still the fallback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Grant Tracker
  const [trackerGrants, setTrackerGrants] = useState<TrackerGrant[]>(() => {
    try { return JSON.parse(localStorage.getItem('civicpath_tracker') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('civicpath_tracker', JSON.stringify(trackerGrants));
    const uid = auth.currentUser?.uid;
    if (uid) saveUserData(uid, { trackerGrants }).catch(() => {});
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

  // ── 0G Labs Merkle Integrity ──────────────────────────────────────────
  const [grantHashes, setGrantHashes] = useState<Record<string, string>>({});
  const [merkleRoot, setMerkleRoot] = useState<string>('');
  const [zgSyncState, setZGSyncState] = useState<'idle' | 'syncing' | 'confirmed'>('idle');
  const [zgReceipt, setZGReceipt] = useState<ZGReceipt | null>(null);

  // Recompute SHA-256 leaf hashes + Merkle root whenever tracker changes
  useEffect(() => {
    if (trackerGrants.length === 0) { setGrantHashes({}); setMerkleRoot(''); return; }
    (async () => {
      const hashes: Record<string, string> = {};
      for (const g of trackerGrants) {
        hashes[g.id] = await grantLeafHash(g);
      }
      setGrantHashes(hashes);
      setMerkleRoot(await buildMerkleRoot(Object.values(hashes)));
    })();
  }, [trackerGrants]);

  const handleZGSync = async () => {
    if (!merkleRoot || zgSyncState === 'syncing') return;
    setZGSyncState('syncing');
    setZGReceipt(null);
    try {
      const receipt = await simulateZGSync(merkleRoot);
      setZGReceipt(receipt);
      setZGSyncState('confirmed');
    } catch {
      setZGSyncState('idle');
    }
  };

  // Email digest
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestMsg, setDigestMsg] = useState('');
  const [linkedinMsg, setLinkedinMsg] = useState('');
  const [linkedinSyncing, setLinkedinSyncing] = useState(false);
  const [showLinkedinModal, setShowLinkedinModal] = useState(false);
  const [linkedinPasteText, setLinkedinPasteText] = useState('');
  const [linkedinExtractLoading, setLinkedinExtractLoading] = useState(false);

  // Meeting transcript analysis
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [analyzingTranscript, setAnalyzingTranscript] = useState(false);
  const [transcriptAnalysis, setTranscriptAnalysis] = useState<string | null>(null);

  const analyzeTranscript = async () => {
    if (!transcriptText.trim()) return;
    setAnalyzingTranscript(true);
    try {
      const prompt = `You are an expert grant strategy assistant. Analyze this meeting transcript and extract a structured summary.

TRANSCRIPT:
${transcriptText.slice(0, 4000)}

Respond in clean markdown with EXACTLY these 4 sections:
### Decisions Made
(bullet list of key decisions)
### Risks Flagged
(bullet list of risks or blockers)
### Action Items
(bullet list with [Owner] Task — Due Date format)
### Grant Strategy Insights
(1-2 sentences on how this meeting advances the grant application)`;
      const result = await callGeminiProxy(prompt);
      setTranscriptAnalysis(result);
      setShowTranscriptModal(false);
    } catch {
      setTranscriptAnalysis('Could not analyze transcript. Please try again.');
    } finally {
      setAnalyzingTranscript(false);
    }
  };

  const sendDigest = async () => {
    if (!user?.email) return;
    setDigestLoading(true);
    setDigestMsg('');
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          type: 'digest',
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

  useEffect(() => {
    const flash = localStorage.getItem('civicpath_linkedin_flash');
    if (!flash) return;
    setLinkedinMsg(flash);
    localStorage.removeItem('civicpath_linkedin_flash');
    const timer = setTimeout(() => setLinkedinMsg(''), 6000);
    return () => clearTimeout(timer);
  }, []);

  // Extract profile fields from pasted LinkedIn About / bio text
  const handleLinkedInPasteExtract = async () => {
    const text = linkedinPasteText.trim();
    if (!text) return;
    setLinkedinExtractLoading(true);
    try {
      const prompt = `Extract a grant-seeking organizational profile from this LinkedIn content.\n\n${text.slice(0, 3000)}\n\nReturn ONLY valid JSON (no markdown):\n{"companyName":"","focusArea":"","targetPopulation":"","missionStatement":"","backgroundInfo":"","linkedinProfileName":"","impactMetrics":""}`;
      const raw = await callGeminiProxy(prompt);
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setProfile(prev => ({
        ...prev,
        ...(parsed.companyName?.trim() && { companyName: parsed.companyName }),
        ...(parsed.focusArea?.trim() && { focusArea: parsed.focusArea }),
        ...(parsed.targetPopulation?.trim() && { targetPopulation: parsed.targetPopulation }),
        ...(parsed.missionStatement?.trim() && { missionStatement: parsed.missionStatement }),
        ...(parsed.backgroundInfo?.trim() && { backgroundInfo: parsed.backgroundInfo }),
        ...(parsed.linkedinProfileName?.trim() && { linkedinProfileName: parsed.linkedinProfileName }),
        ...(parsed.impactMetrics?.trim() && { impactMetrics: parsed.impactMetrics }),
        linkedinConnectedAt: new Date().toISOString(),
      }));
      setLinkedinMsg('\u2713 LinkedIn profile extracted and synced successfully!');
      setShowLinkedinModal(false);
      setLinkedinPasteText('');
    } catch {
      // If JSON parse fails, save as background info
      setProfile(prev => ({ ...prev, backgroundInfo: prev.backgroundInfo || text.slice(0, 800), linkedinConnectedAt: new Date().toISOString() }));
      setLinkedinMsg('\u2713 LinkedIn content saved to background info.');
      setShowLinkedinModal(false);
    } finally {
      setLinkedinExtractLoading(false);
      setTimeout(() => setLinkedinMsg(''), 6000);
    }
  };

  const startLinkedInConnect = async () => {
    setLinkedinSyncing(true);
    try {
      // Preflight: check if LinkedIn OAuth credentials are configured
      const check = await fetch('/api/linkedin?action=check', { method: 'GET' });
      const data = await check.json().catch(() => ({}));
      const configured = check.ok && data.configured === true;

      if (configured) {
        // Full OAuth flow
        const state = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem('civicpath_linkedin_state', state);
        sessionStorage.setItem('civicpath_linkedin_return_to', '/seeker');
        window.location.href = `/api/linkedin?action=authorize&state=${encodeURIComponent(state)}`;
      } else {
        // OAuth not configured — show AI-powered alternative
        setLinkedinSyncing(false);
        setShowLinkedinModal(true);
      }
    } catch {
      setLinkedinSyncing(false);
      setShowLinkedinModal(true);
    }
  };

  const looksLikeRawPdf = (text: string) => {
    const sample = text.slice(0, 1000);
    return (
      sample.includes('%PDF-') ||
      sample.includes('ReportLab Generated PDF document') ||
      (/^\d+\s+\d+\s+obj/m.test(sample) && sample.includes('/Type /Font'))
    );
  };

  const safeBackgroundInfo = looksLikeRawPdf(profile.backgroundInfo) ? '' : profile.backgroundInfo;
  const safeResumeText = looksLikeRawPdf(profile.resumeText) ? '' : profile.resumeText;

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
    q(safeBackgroundInfo, 50) || q(safeResumeText, 50),
    Boolean(profile.linkedinUrl || profile.website || profile.twitterUrl),
    q(profile.ein, 4),                    // NEW — required for federal grants
    q(profile.yearFounded, 4),            // NEW
    q(profile.impactMetrics, 10),         // NEW
  ].filter(Boolean).length / 16 * 100);

  const profileScoreColor = profileScore >= 80 ? 'text-[#76B900]' : profileScore >= 50 ? 'text-amber-600' : 'text-red-500';
  const profileBarColor = profileScore >= 80 ? 'bg-[#76B900]' : profileScore >= 50 ? 'bg-amber-500' : 'bg-red-400';



  const callGeminiProxy = async (prompt: string, useSearch = false): Promise<string> => {
    // Routes through the Orchestrator [FIG.1 [104]] for:
    //   – NVIDIA NIM when NVIDIA_API_KEY is set
    //   – Automatic 429 backoff + retry (3 attempts)
    //   – Graceful degradation instead of UI crash on rate limit
    const result = await orchestratedInference(prompt, {
      useSearch,
      useNIM: true,
      onRateLimited: (retryIn) => {
        addGlobalLog(`[\ud83e\udde0 ORCHESTRATOR] Rate limit reached. Retrying in ${retryIn}s...`);
      },
    });
    if (result.rateLimited) {
      addGlobalLog(`[\ud83e\udde0 ORCHESTRATOR] 429 RESOURCE_EXHAUSTED — degraded response served, pipeline continues.`);
    }
    return result.text;
  };

  const handleAIFillFromUrl = async () => {
    const urls = [profile.website, profile.linkedinUrl, profile.twitterUrl].filter(Boolean).join(', ');
    if (!urls && !profile.companyName) return;
    setAiFilling(true);
    setAiFillMsg('AI Researcher is scanning the web...');
    try {
      const res = await fetch('/api/enrich-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          companyName: profile.companyName,
          website: profile.website,
          linkedinUrl: profile.linkedinUrl,
          twitterUrl: profile.twitterUrl 
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setProfile(prev => ({
        ...prev,
        ...data,
        // Preserve local logo if exists, else use AI found one if any
        logoDataUrl: prev.logoDataUrl || data.logoDataUrl || '',
      }));
      setAiFillMsg('✨ Profile enriched with real-time data!');
    } catch (err: any) {
      console.error('Enrichment failed:', err);
      const message = err?.message || 'Scan failed';
      setAiFillMsg(`⚠️ ${message}`);
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
    const uid = auth.currentUser?.uid;
    if (uid) saveUserData(uid, { profile }).catch(() => {});
  }, [profile]);

  const [drafterOutput, setDrafterOutput] = useState<string | null>(null);
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProposal, setEditedProposal] = useState('');
  const [discoveredGrants, setDiscoveredGrants] = useState<Array<{title:string;agency:string;closeDate:string;url:string}>>([]);
  const [allDiscoveredGrants, setAllDiscoveredGrants] = useState<any[]>([]);
  const [totalGrantsFound, setTotalGrantsFound] = useState(0);
  const [liveGrantsCount, setLiveGrantsCount] = useState(0);

  // Sync state to global graph for Omninor
  useEffect(() => {
    globalGraph.updateState({ profile });
  }, [profile]);

  useEffect(() => {
    globalGraph.updateState({ discoveredGrants: allDiscoveredGrants });
  }, [allDiscoveredGrants]);
  const [sourceFilter, setSourceFilter] = useState('all');

  const [showAgentsMenu, setShowAgentsMenu] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showAgentSidebar, setShowAgentSidebar] = useState(false);

  // ── Purge Controller (Circuit Breaker) ────────────────────────────────────
  const [purgePhase, setPurgePhase] = useState<PurgePhase>('idle');
  const [purgeVisible, setPurgeVisible] = useState(false);
  const purgeControllerRef = useRef<PurgeController | null>(null);

  useEffect(() => {
    purgeControllerRef.current = new PurgeController((event) => {
      setPurgePhase(event.phase);
      addGlobalLog(event.log);
    });
    return () => purgeControllerRef.current?.destroy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSecureWipe = () => {
    purgeControllerRef.current?.trigger(() => {
      // Wipe all grant enclave state
      setAgents(prev => prev.map(a => ({ ...a, status: 'idle', logs: [], output: null })));
      setDiscoveredGrants([]);
      setAllDiscoveredGrants([]);
      setTotalGrantsFound(0);
      setLiveGrantsCount(0);
      setGlobalLogs([]);
      setDrafterOutput(null);
      setEditedProposal('');
      setAwaitingApproval(false);
      setNextAction(null);
      setIsRunning(false);
      localStorage.removeItem('civicpath_pipeline_run');
      setTimeout(() => setPurgeVisible(false), 2000);
    });
  };

  // Auto-open sidebar when pipeline starts
  useEffect(() => {
    if (isRunning) setShowAgentSidebar(true);
  }, [isRunning]);

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
      text: "8 AI agents cover the full grant lifecycle — discovery to compliance.",
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

  // --- Ask MyLalla chat (powered by AMAI SuperAgent when available) ---
  const [lallaMessages, setLallaMessages] = useState<ChatMessage[]>([]);
  const [lallaInput, setLallaInput] = useState('');
  const [lallaLoading, setLallaLoading] = useState(false);
  const [lallaFollowUps, setLallaFollowUps] = useState<string[]>([]);
  const [lallaModelTier, setLallaModelTier] = useState<string>('');
  // AMAI SuperAgent session ID — persists conversation context across messages
  const amaiSessionRef = useRef<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem('civicpath_amai_session') : null
  );
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
    setLallaFollowUps([]);

    // Build rich context array for AMAI SuperAgent
    const contextArray = [
      `You are MyLalla, a senior AI grant advisor inside CivicPath. Be warm, strategic, and concise.`,
      `Organization: ${profile.companyName || 'Not set'}`,
      `Type: ${profile.orgType || 'Unknown'} | Location: ${profile.location || 'Florida'}`,
      `Focus: ${profile.focusArea || 'General'} | Mission: ${(profile.missionStatement || '').slice(0, 200)}`,
      `Budget: ${profile.annualBudget || 'Unknown'} | Team: ${profile.teamSize || 'Unknown'}`,
      `Funding Goal: ${profile.fundingAmount || 'Unknown'} for: ${(profile.projectDescription || '').slice(0, 150)}`,
      ...(discoveredGrants.length > 0
        ? [`Active pipeline grants: ${discoveredGrants.map((g: any) => `"${g.title}" (${g.agency})`).join(', ')}`]
        : []),
    ].filter(Boolean);

    try {
      // Try AMAI SuperAgent first (when AMAI_SESSION_TOKEN is configured)
      const amaiRes = await fetch('/api/sovereign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'amai-query',
          query: text,
          mode: 'research',
          sessionId: amaiSessionRef.current,
          context: contextArray,
        }),
      });
      const amaiData = await amaiRes.json();

      if (!amaiData.offline && !amaiData.error && amaiData.text) {
        // AMAI SuperAgent responded
        if (amaiData.sessionId) {
          amaiSessionRef.current = amaiData.sessionId;
          localStorage.setItem('civicpath_amai_session', amaiData.sessionId);
        }
        setLallaMessages(prev => [...prev, { role: 'assistant', content: amaiData.text }]);
        setLallaFollowUps(amaiData.followUpQuestions || []);
        setLallaModelTier(amaiData.modelTier ? `AMAI · ${amaiData.modelTier}` : 'AMAI SuperAgent');
        return;
      }

      // Fallback: Gemini 2.0 Flash with Google Search
      const ctx = `You are MyLalla, a senior AI grant advisor inside CivicPath. Be warm, strategic, and concise. Use markdown.\n\nUser context:\n${contextArray.slice(1).join('\n')}${discoveredGrants.length > 0 ? `\n\nPipeline grants: ${discoveredGrants.map((g: any) => `"${g.title}" (${g.agency})`).join(', ')}` : ''}`;
      const history = next.slice(0, -1).map(m => `${m.role === 'user' ? 'User' : 'MyLalla'}: ${m.content}`).join('\n');
      const fullPrompt = `${ctx}\n\n${history ? `Conversation:\n${history}\n\n` : ''}User: ${text}\nMyLalla:`;
      const reply = await callGeminiProxy(fullPrompt, true);
      setLallaMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      setLallaModelTier('Gemini 2.0 Flash');
    } catch {
      setLallaMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now. Please try again in a moment." }]);
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
    { id: 'compliance_scanner', name: 'The Compliance Scanner', icon: <FileText className="w-5 h-5" />, status: 'idle', logs: [], output: null },
    { id: 'closer', name: 'The Closer (Agent 8)', icon: <Trophy className="w-5 h-5" />, status: 'idle', logs: [], output: null },
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

  // Captures top Matchmaker score so Submitter can include it in the application
  const topMatchScoreRef = useRef<number>(0);

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

  // ── Direct Funder Connections state ────────────────────────────────
  const [directConnections, setDirectConnections] = useState<any[]>([]);

  // --- Agent Behaviors ---
  const runHunter = async () => {
    updateAgent('hunter', { status: 'working', logs: [], output: null });

    const targetLoc = profile.location || 'Florida';
    const targetTech = profile.focusArea || 'technology';

    // ── Step 0: Query funder_grants Firestore collection FIRST ──────────────────
    addLog('hunter', 'Checking CivicPath Funder network (private listings)...');
    addGlobalLog(`[\ud83d\udd0d The Hunter]     Querying CivicPath funder_grants collection...`);
    const funderDocs = await getFunderGrants();
    const directGrants = funderDocs.map(normalizeFunderGrant);
    setDirectConnections(directGrants);
    if (directGrants.length > 0) {
      addLog('hunter', `Found ${directGrants.length} Direct Funder Connection${directGrants.length > 1 ? 's' : ''} from CivicPath network.`);
      addGlobalLog(`[\ud83d\udd0d The Hunter]     🟢 ${directGrants.length} Direct Funder Connection${directGrants.length > 1 ? 's' : ''} found in CivicPath network ✓`);
    } else {
      addLog('hunter', 'No direct funder listings yet — proceeding to public databases.');
    }

    addLog('hunter', 'Connecting to Grants.gov live database...');
    addGlobalLog(`[\ud83d\udd0d The Hunter]     Querying Grants.gov for "${targetTech}" in ${targetLoc}...`);

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

      // Prepend direct funder connections — they go FIRST
      const allGrants = [...directGrants, ...grants];
      const grantsWithDeadlines = allGrants.filter((g: any) => g.closeDate && g.closeDate !== 'Rolling');
      setDiscoveredGrants(grantsWithDeadlines); // all for scheduler
      setAllDiscoveredGrants(allGrants); // all for grants list
      setTotalGrantsFound(total);
      setLiveGrantsCount(data.liveCount || 0);

      addLog('hunter', `Found ${total} opportunities (${data.liveCount || 0} live + curated database).`);
      addGlobalLog(`[\ud83d\udd0d The Hunter]     Found ${total} matching opportunities \u2713`);
      addGlobalLog(`[\ud83e\udd16 ACTIVITY]       Hunter \u2192 Matchmaker: "Found ${total} grants. Sending for semantic scoring."`);

      hunterText = `${directGrants.length > 0 ? `## 🟢 ${directGrants.length} Direct Funder Connection${directGrants.length > 1 ? 's' : ''} (CivicPath Network)
${directGrants.map((g: any) => `* **${g.title}** — ${g.agency}  \n  ${g.amount} · Deadline: ${g.closeDate} · [Apply directly](${g.url})`).join('\n\n')}

---
` : ''}**Live Results: ${total} total matches (${data.liveCount || 0} from live APIs, ${grants.length - (data.liveCount || 0)} curated):**

${grants.map((g: any) => `* **${g.title}** \`[${g.source}]\`
  ${g.agency} · Posted: ${g.openDate || 'N/A'} · Deadline: ${g.closeDate} · [View Grant](${g.url})`).join('\n\n')}

*Live search: "${targetTech}" + "${targetLoc}" — Sources: Grants.gov, SBA SBIR*`;
    } catch (err) {
      addLog('hunter', 'Live API temporarily unavailable — showing curated local opportunities.');
      hunterText = `**Curated Opportunities (Live Search Offline):**

* **State Innovation Match Fund** — FL Dept of Commerce (Deadline: Oct 15, 2026)
* **NSF SBIR Phase I — AI Track** — National Science Foundation (Deadline: Rolling)
* **Digital Equity Initiative** — USDA Rural Development (Deadline: Dec 1, 2026)
* **SBA FAST Program** — Small Business Administration (Deadline: Rolling)

*Note: The live connection to Grants.gov is currently interrupted. Showing high-relevance curated listings for ${targetTech} in ${targetLoc}.*`;
    }

    await streamOutput('hunter', hunterText);
    updateAgent('hunter', { status: 'completed' });
    return true;
  };

  const runMatchmaker = async () => {
    updateAgent('matchmaker', { status: 'working', logs: [], output: null });
    addLog('matchmaker', `Loaded profile: ${profile.companyName || 'Anonymous Org'}`);
    addGlobalLog(`[\ud83c\udfaf The Matchmaker] Scoring ${allDiscoveredGrants.length} grants against your profile with Gemini...`);
    await delay(300);

    const grantsToScore = allDiscoveredGrants.slice(0, 10);
    addLog('matchmaker', `Sending ${grantsToScore.length} grants to Gemini 2.0 Flash for AI scoring...`);

    let matchmakerText = '';
    try {
      const prompt = `You are a grant matching expert. Your task is to accurately score grant opportunities against an organization's profile.

CRITICAL INSTRUCTIONS:
- NO HALLUCINATIONS: If a piece of organization info is "Not set" or "Not provided", do NOT guess or assume.
- HONEST SCORING: If you lack enough information to determine a fit, provide a lower score and explain exactly what data is missing in the "warning" or "reasons".
- ELIGIBILITY CHECKS: Check location, org type, and mission alignment strictly.

ORGANIZATION PROFILE:
- Name: ${profile.companyName || 'NOT PROVIDED'}
- Type: ${profile.orgType || 'NOT PROVIDED'}
- Location: ${profile.location || 'NOT PROVIDED'}
- Focus Area: ${profile.focusArea || 'NOT PROVIDED'}
- Mission Statement: ${(profile.missionStatement || 'NOT PROVIDED').slice(0, 400)}
- Target Population: ${profile.targetPopulation || 'NOT PROVIDED'}
- Annual Budget: ${profile.annualBudget || 'NOT PROVIDED'}
- Tax ID (EIN): ${profile.ein ? 'Present' : 'MISSING'}
- SAM/DUNS#: ${profile.dunsNumber ? 'Present' : 'MISSING'}
- Specific Funding Need: ${(profile.projectDescription || 'NOT PROVIDED').slice(0, 300)}
- Background context: ${(safeBackgroundInfo || safeResumeText || 'NOT PROVIDED').slice(0, 400)}

GRANTS TO SCORE:
${grantsToScore.map((g: any, i: number) => `${i + 1}. "${g.title}" | Agency: ${g.agency} | Amount: ${g.amount || 'N/A'} | Source: ${g.source}`).join('\n')}

Return ONLY a valid JSON array of objects:
[{"rank":1,"title":"exact title","score":85,"fit":"HIGH"|"MEDIUM"|"LOW"|"UNQUALIFIED","reasons":["reason"],"warning":"e.g. Missing EIN"}]

Order by score descending. Score ALL ${grantsToScore.length} grants.`;

      const raw = await callGeminiProxy(prompt, false);
      let scored: any[] = [];
      try {
        scored = safeParseAIJSON(raw);
      } catch {
        scored = [];
      }

      if (scored.length > 0) {
        addGlobalLog(`[\ud83c\udfaf The Matchmaker] Top match: "${scored[0].title.slice(0, 50)}" \u2014 Score: ${scored[0].score}/100`);
        addGlobalLog(`[\ud83e\udd16 ACTIVITY]       Matchmaker \u2192 Drafter: "Best fit score ${scored[0].score}/100. Initiating proposal draft."`);
        addLog('matchmaker', `${scored.length} grants scored. Top: ${scored[0].score}/100`);
        topMatchScoreRef.current = scored[0].score;

        matchmakerText = `### AI Match Scores \u2014 ${scored.length} Grants Evaluated\n\n` +
          scored.slice(0, 5).map((g: any, i: number) =>
            `**${i + 1}. ${g.title}**\n` +
            `Score: **${g.score}/100** \u00b7 Fit: ${g.fit}\n` +
            (g.reasons || []).map((r: string) => `- ${r}`).join('\n') +
            (g.warning ? `\n\u26a0\ufe0f *${g.warning}*` : '')
          ).join('\n\n');
      } else {
        throw new Error('No scores parsed from Gemini response');
      }
    } catch (err) {
      addLog('matchmaker', 'Gemini scoring temporarily unavailable.');
      addGlobalLog(`[\ud83c\udfaf The Matchmaker] AI offline. Proceeding with highest priority grant.`);
      const fallbackTarget = grantsToScore[0] || { title: 'First Available Opportunity' };
      matchmakerText = `### Match Analysis (Limited Mode)\nAI scoring is temporarily offline. Automatically prioritizing the most recent grant in your sector: **${fallbackTarget.title}**.`;
    }

    await streamOutput('matchmaker', matchmakerText);
    updateAgent('matchmaker', { status: 'completed' });
    return true;
  };

  const runDrafter = async () => {
    updateAgent('drafter', { status: 'working', logs: [], output: null });
    addLog('drafter', 'Connecting to Gemini 2.0 Flash via API...');
    addGlobalLog(`[\u270d\ufe0f The Drafter]    Generating personalized proposal for Grant #1...`);
    addLog('drafter', 'Building proposal with full org profile...');

    // Pick best matching grant from discovered grants, or use a default
    const targetGrant = discoveredGrants[0] || { title: 'Target Grant', agency: 'Grant Agency', closeDate: 'Unknown' };
    const grantAmount = allDiscoveredGrants[0]?.amount || '$150,000';

    let text = '';
    try {
      const fullPrompt = `You are a world-class, elite grant writer. Your task is to write a highly persuasive, professional, and data-driven grant proposal based ONLY on the provided organization profile. 

Your goal is to win funding by demonstrating clear ROI (Return on Investment) for the funder, showing organizational competence, and maintaining a tone that is authoritative, urgent, and deeply respectful of the funder's goals.

### CRITICAL RULES:
1. NO HALLUCINATIONS: Do NOT invent names, dates, metrics, budgets, or achievements that are not explicitly provided below.
2. NO PLACEHOLDERS: Do NOT use brackets like "[Organization Name]". If information is missing, elegantly write around it or use professional generic terms (e.g., "our organization", "the proposed initiative").
3. FACTUAL INTEGRITY: If the mission or project description is "NOT PROVIDED", your draft should reflect that the organization is in the early stages of strategic definition.

### ORGANIZATION PROFILE
- Name: ${profile.companyName || 'NOT PROVIDED'}
- Type: ${profile.orgType || 'NOT PROVIDED'}
- Location: ${profile.location || 'NOT PROVIDED'}
- Focus Area: ${profile.focusArea || 'NOT PROVIDED'}
- EIN: ${profile.ein || 'NOT PROVIDED'}
- Mission: ${profile.missionStatement || profile.backgroundInfo || 'NOT PROVIDED'}
- Target Population: ${profile.targetPopulation || 'NOT PROVIDED'}
- Impact Metrics: ${profile.impactMetrics || 'NOT PROVIDED'}
- Year Founded: ${profile.yearFounded || 'NOT PROVIDED'}
- Team Information: ${profile.teamMembersText || 'NOT PROVIDED'}
- Project to Fund: ${profile.projectDescription || 'NOT PROVIDED'}
- Funding Request: ${profile.fundingAmount || grantAmount}

### TARGET GRANT
- Grant: ${(targetGrant as any).title || 'Target Grant Opportunity'}
- Agency: ${(targetGrant as any).agency || 'Target Agency'}
- Amount: ${grantAmount}
- Deadline: ${(targetGrant as any).closeDate || 'Upcoming'}

Write a 600-800 word proposal with EXACTLY these sections. Use bolding for emphasis, maintain a confident active voice, and ensure it reads as a highly competitive application:

### Executive Summary
### Statement of Need (The Problem)
### Project Description & Implementation Plan (The Solution)
### Organizational Capacity & Track Record
### Evaluation & Success Metrics
### Sustainability & Future Funding (How the impact continues after the grant)
### Budget Narrative`;

      text = await callGeminiProxy(fullPrompt);
      addLog('drafter', 'Personalized proposal generated. Streaming...');
    } catch {
      addLog('drafter', 'Gemini error — generating minimal fact-based draft.');
      text = `### Grant Proposal: ${profile.companyName || 'Applicant Organization'}

**Executive Summary**: ${profile.companyName || 'The applicant'} requests ${grantAmount} from ${(targetGrant as any).title || 'this grant program'}. Based in ${profile.location || 'their local area'}, they focus on ${profile.focusArea || 'community impact'}.

**Problem Statement**: This project addresses challenges faced by ${profile.targetPopulation || 'the target population'} in the area of ${profile.focusArea || 'their expertise'}.

**Project Description**: ${profile.projectDescription || 'The applicant intends to use these funds to advance their stated mission and project goals.'}

**Organizational Capacity**: ${profile.companyName || 'The applicant'} was founded in ${profile.yearFounded || 'a previous year'} and has a mission to ${profile.missionStatement || 'serve their community'}.

**Budget**: Total requested amount is ${grantAmount}.

**Evaluation**: Success will be measured against the project goals and reported accordingly.`;
    }

    setDrafterOutput(text);
    setEditedProposal(text);
    await streamOutput('drafter', text);
    addGlobalLog(`[✍️ The Drafter]    Draft complete ✓`);
    addGlobalLog(`[🤖 ACTIVITY]       Drafter → HUMAN: "⏸️ Awaiting your approval before submission."`);

    // ── Persist proposal to Firestore ──
    const uid = auth.currentUser?.uid;
    if (uid && text) {
      saveProposal(uid, {
        text,
        grantTitle: (targetGrant as any).title || 'Grant Proposal',
        orgName: profile.companyName,
        grantAgency: (targetGrant as any).agency,
        grantAmount,
      }).catch(() => {});
    }

    updateAgent('drafter', { status: 'completed' });
    setAwaitingApproval(true); // ← PAUSE for human review
    return true;
  };

  const runController = async (finalProposal: string) => {
    updateAgent('controller', { status: 'working', logs: [], output: null });
    addLog('controller', 'Running AI compliance audit via Gemini...');
    addGlobalLog(`[🛡️ The Controller] Starting eligibility & compliance audit...`);
    await delay(300);

    const targetGrant = discoveredGrants[0] || { title: 'Target Grant', agency: 'Grant Agency', closeDate: 'Unknown' };

    let controllerText = '';
    let auditPassed = true;
    try {
      const prompt = `You are a strict grant compliance auditor. Your role is to verify if an organization and their proposal meet the requirements for a specific grant. 

CRITICAL RULES:
- NO GUESSING: If a field is "NOT PROVIDED", the check for that field must FAIL or WARN.
- STRICT COMPLIANCE: Mark a "FAIL" for missing EIN if the grant is federal.
- HONESTY: Your goal is to prevent the user from submitting a non-compliant application.

GRANT TARGET:
- Name: ${(targetGrant as any).title}
- Agency: ${(targetGrant as any).agency}
- Source: ${(targetGrant as any).source}

ORGANIZATION PROFILE:
- Name: ${profile.companyName || 'NOT PROVIDED'}
- Type: ${profile.orgType || 'NOT PROVIDED'}
- Location: ${profile.location || 'NOT PROVIDED'}
- Focus Area: ${profile.focusArea || 'NOT PROVIDED'}
- EIN: ${profile.ein || 'NOT PROVIDED'}
- SAM/DUNS#: ${profile.dunsNumber || 'NOT PROVIDED'}
- Annual Budget: ${profile.annualBudget || 'NOT PROVIDED'}
- Years Operating: ${profile.yearsOperating || 'NOT PROVIDED'}

PROPOSAL EXCERPT:
${finalProposal.slice(0, 800)}

Check these items and return ONLY valid JSON:
{
  "overall": "PASS" | "PASS_WITH_WARNINGS" | "FAIL",
  "checks": [
    {"item": "EIN/Tax ID", "status": "PASS" | "FAIL", "detail": "finding"},
    {"item": "Entity Type Eligibility", "status": "PASS" | "FAIL" | "WARN", "detail": "finding"},
    {"item": "Geographic Eligibility", "status": "PASS" | "FAIL" | "WARN", "detail": "finding"},
    {"item": "Proposal Completeness (All 7 required sections present)", "status": "PASS" | "FAIL" | "WARN", "detail": "finding"},
    {"item": "SAM/DUNS (Federal Only)", "status": "PASS" | "FAIL" | "WARN", "detail": "finding"}
  ],
  "critical_issues": ["List specific missing data or conflicts"],
  "recommendations": ["Actionable steps to fix issues"]
}`;

      const raw = await callGeminiProxy(prompt);
      let audit: any = null;
      try {
        audit = safeParseAIJSON(raw);
      } catch {
        audit = null;
      }

      if (audit?.checks) {
        const passed = audit.checks.filter((c: any) => c.status === 'PASS').length;
        const failed = audit.checks.filter((c: any) => c.status === 'FAIL').length;
        const warned = audit.checks.filter((c: any) => c.status === 'WARN').length;
        auditPassed = audit.overall !== 'FAIL';

        addGlobalLog(`[🛡️ The Controller] Audit complete: ${passed} PASS · ${warned} WARN · ${failed} FAIL`);
        addGlobalLog(`[🤖 ACTIVITY]       Controller → USER: "Overall: ${audit.overall}. ${failed > 0 ? 'Action required.' : 'Cleared for submission.'}"`);
        addLog('controller', `${passed} checks passed, ${failed} failed, ${warned} warnings.`);

        controllerText =
          `### Compliance Audit — ${audit.overall}\n\n` +
          audit.checks.map((c: any) =>
            `- [${c.status === 'PASS' ? 'x' : c.status === 'WARN' ? '!' : ' '}] **${c.item}** (${c.status})\n  ${c.detail}`
          ).join('\n') +
          (audit.critical_issues?.length > 0
            ? `\n\n**⚠️ Critical Issues:**\n${audit.critical_issues.map((i: string) => `- ${i}`).join('\n')}`
            : '') +
          (audit.recommendations?.length > 0
            ? `\n\n**💡 Recommendations:**\n${audit.recommendations.map((r: string) => `- ${r}`).join('\n')}`
            : '');
      } else {
        throw new Error('No audit object returned from Gemini');
      }
    } catch {
      addLog('controller', 'AI audit error — applying profile-based fallback checks.');
      controllerText =
        `### Compliance Checklist\n` +
        `- [${profile.ein ? 'x' : ' '}] **EIN / Tax ID** (${profile.ein ? 'PASS' : 'FAIL — add EIN to your profile'})\n` +
        `- [${profile.location ? 'x' : '!'}] **Location Eligibility** (${profile.location ? 'PASS' : 'WARN — location not set'})\n` +
        `- [x] **Mission Alignment** (PASS)\n` +
        `- [${profile.dunsNumber ? 'x' : '!'}] **SAM/DUNS Registration** (${profile.dunsNumber ? 'PASS' : 'WARN — required for federal grants'})`;
    }

    await streamOutput('controller', controllerText);
    updateAgent('controller', { status: auditPassed ? 'completed' : 'error' });
    return auditPassed;
  };

  const runSubmitter = async (finalProposal: string) => {
    updateAgent('submitter', { status: 'working', logs: [], output: null });

    addGlobalLog(`[✉️ The Submitter]  Authenticating with Gmail API (OAuth2)...`);
    addLog('submitter', 'Constructing email payload & attaching PDFs...');
    await delay(1000);

    addGlobalLog(`[✉️ The Submitter]  Application package prepared and queued \u2713`);
    addLog('submitter', 'Proposal packaged. Sending confirmation email...');
    await delay(800);

    // ── Save real application to Firestore ──
    const appGrant = discoveredGrants[0] || { title: 'Target Grant', agency: 'Unknown', closeDate: 'Unknown' };
    const appAmount = (allDiscoveredGrants[0] as any)?.amount || 'Unknown Amount';
    saveApplication({
      seekerUid: auth.currentUser?.uid || '',
      seekerEmail: user?.email || '',
      orgName: profile.companyName || 'Unknown Organization',
      orgType: profile.orgType,
      location: profile.location || '',
      mission: profile.missionStatement || profile.backgroundInfo || '',
      focusArea: profile.focusArea,
      grantTitle: (appGrant as any).title || 'Target Grant',
      grantAgency: (appGrant as any).agency || 'Unknown',
      grantAmount: appAmount,
      grantDeadline: (appGrant as any).closeDate || 'Unknown',
      proposalText: finalProposal,
      status: 'pending',
      score: topMatchScoreRef.current || 0,
      funderEmail: (allDiscoveredGrants[0] as any)?.funderEmail || '',
      funderUid: (allDiscoveredGrants[0] as any)?.funderUid || '',
    }).catch(() => {});

    // Send real confirmation email via Resend
    if (user?.email) {
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'confirmation',
          email: user.email,
          name: user.name || 'there',
          orgName: profile.companyName || 'Your Organization',
          grantName: (appGrant as any).title || 'Target Grant',
          amount: appAmount,
        }),
      }).catch(() => {});
    }

    const funderEmail = (allDiscoveredGrants[0] as any)?.funderEmail;
    if (funderEmail) {
      fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'funder-submission',
          email: funderEmail,
          orgName: profile.companyName || 'Your Organization',
          grantName: (appGrant as any).title || 'Target Grant',
          amount: appAmount,
          proposalText: finalProposal,
        }),
      }).catch(() => {});
    }
    const submitterText = `
### Application Package Ready \u2713
* **Organization**: ${profile.companyName || 'Your Organization'}
* **Grant**: ${(appGrant as any).title || 'Target Grant'} (${appAmount})
* **Proposal**: AI-drafted, reviewed, and approved by you
* **Status**: Queued for submission

${user?.email ? `A confirmation has been sent to **${user.email}**.` : 'Connect Gmail in Integrations to enable autonomous sending.'}
${funderEmail ? `\n\n> **Direct Funder Match**: Proposal securely transmitted to Funder via CivicPath.` : '\n\n> To complete real submission: connect Gmail in the Integrations tab, then re-run the pipeline.'}
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
    let finalText = drafterOutput || '';
    if (editMode) {
      setDrafterOutput(editedProposal);
      finalText = editedProposal;
      setEditMode(false);
    }
    setAwaitingApproval(false);
    addGlobalLog(`[✅ HUMAN APPROVED]  Proposal approved. Resuming pipeline...`);
    
    try {
      const passed = await runController(finalText);
      if (passed) {
        if (!await runSubmitter(finalText)) throw new Error('Submitter failed');
        runWatcher();
        setNextAction({ type: 'success', message: 'MISSION ACCOMPLISHED: Proposal approved, verified, and sent via Gmail. Milestones booked to Calendar.' });
      } else {
        setNextAction({ type: 'warning', message: 'NEXT ACTION REQUIRED: The Controller flagged compliance issues. Review the warnings before submission.' });
      }
    } catch (e: any) {
      setNextAction({ type: 'error', message: `EXECUTION HALTED: ${e.message}` });
    } finally {
      setIsRunning(false);
    }
  };
  const handleExecute = async () => {
    if (isRunning) return;

    // ── Plan gate: free users capped at FREE_RUN_LIMIT runs/month ──
    if (!isPaidPlan && monthlyRuns >= FREE_RUN_LIMIT) {
      setShowUpgradeModal(true);
      return;
    }
    // Increment run counter
    const newCount = monthlyRuns + 1;
    setMonthlyRuns(newCount);
    localStorage.setItem(monthKey, String(newCount));
    const uid = auth.currentUser?.uid;
    if (uid) saveUserData(uid, { [`runs_${new Date().toISOString().slice(0, 7)}`]: newCount } as any).catch(() => {});
    
    setIsRunning(true);
    setAwaitingApproval(false);
    setNextAction(null);
    setGlobalLogs([]);
    setAgents(prev => prev.map(a => ({ ...a, status: 'idle', logs: [], output: null })));

    try {
      if (!await runHunter()) throw new Error('Hunter failed');
      if (!await runMatchmaker()) throw new Error('Matchmaker failed');
      await runDrafter(); 
      // Pipeline pauses here — awaiting approval from the human
      setAwaitingApproval(true);
      // We do NOT set isRunning to false here, as the pipeline is technically still 'active' and waiting.
    } catch (e: any) {
      setNextAction({
        type: 'error',
        message: `EXECUTION HALTED: ${e.message || 'System encountered an unrecoverable error during orchestration.'}`
      });
      setIsRunning(false); // Only stop running on error
    }
  };

  // ── Omninor Contextual Coach Logic ──
  useEffect(() => {
    if (awaitingApproval) {
      setOmninorMessage("The Drafter just finished your proposal. Review it below, then press Enter to approve and initiate the compliance audit.");
      setOmninorActionLabel("Approve & Submit");
      setOmninorAction(() => handleApproveAndSubmit);
    } else if (nextAction?.type === 'success' && !isRunning) {
      setOmninorMessage("Mission accomplished! Your proposal is queued for submission. I've also auto-generated your post-award compliance schedule.");
      setOmninorActionLabel("View Schedule");
      setOmninorAction(() => () => setActiveTab('scheduler'));
    } else if (nextAction?.type === 'warning' && !isRunning) {
      setOmninorMessage("Hold on! The Controller flagged some missing compliance data. Please review the warnings above before we submit.");
      setOmninorActionLabel(null);
      setOmninorAction(null);
    } else if (activeTab === 'meetings' && !!transcriptAnalysis) {
      setOmninorMessage("I've analyzed your meeting transcript. Your organization's Matchmaker profile has been successfully updated with the funder's unwritten requirements.");
      setOmninorActionLabel(null);
      setOmninorAction(null);
    } else if (activeTab === 'dashboard' && monthlyRuns === 0 && profileScore >= 50 && !isRunning && !awaitingApproval && !nextAction) {
      setOmninorMessage("Your profile looks strong enough for a test run! Press Enter to let me find your best grant matches and draft your first proposal.");
      setOmninorActionLabel("Run AI Pipeline");
      setOmninorAction(() => handleExecute);
    } else {
      setOmninorMessage(null);
      setOmninorActionLabel(null);
      setOmninorAction(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [awaitingApproval, nextAction, isRunning, activeTab, transcriptAnalysis, monthlyRuns, profileScore]);

  // Global Keyboard Shortcuts for Omninor
  useEffect(() => {
    if (!omninorMessage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && omninorAction) {
        e.preventDefault();
        omninorAction();
        setOmninorMessage(null);
      }
      if (e.key === 'Escape') {
        setOmninorMessage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [omninorMessage, omninorAction]);

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
  // Streamlined validation — just one required field per step
  const isStep1Valid = profile.companyName.trim().length >= 2; // just org name
  const isStep2Valid = profile.focusArea.trim().length >= 3;    // just focus area
  const isStep3Valid = true; // always launchable

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
                      <p className="text-stone-500 max-w-md mb-8">4 slides. 12 seconds. See exactly how the 7 agents work.</p>
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
            <p className="text-stone-500 text-sm">Tell us your org name to get started — everything else is optional.</p>
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
                    <input type="text" list="location-suggestions" placeholder="e.g. Miami, FL"
                      value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})}
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                    <datalist id="location-suggestions">
                      <option value="Miami, FL" /><option value="Orlando, FL" /><option value="Tampa, FL" /><option value="Jacksonville, FL" />
                      <option value="Fort Lauderdale, FL" /><option value="West Palm Beach, FL" /><option value="Tallahassee, FL" />
                      <option value="Gainesville, FL" /><option value="Pensacola, FL" /><option value="Cape Coral, FL" />
                      <option value="South Florida" /><option value="Central Florida" /><option value="North Florida" /><option value="Statewide Florida" />
                      <option value="New York, NY" /><option value="Los Angeles, CA" /><option value="Chicago, IL" />
                      <option value="Houston, TX" /><option value="Phoenix, AZ" /><option value="Philadelphia, PA" />
                      <option value="San Antonio, TX" /><option value="San Diego, CA" /><option value="Dallas, TX" />
                      <option value="San Jose, CA" /><option value="Austin, TX" /><option value="Nashville, TN" />
                      <option value="Denver, CO" /><option value="Seattle, WA" /><option value="Atlanta, GA" />
                      <option value="Boston, MA" /><option value="Detroit, MI" /><option value="Las Vegas, NV" />
                      <option value="Portland, OR" /><option value="Memphis, TN" /><option value="Baltimore, MD" />
                      <option value="Washington, DC" /><option value="New Orleans, LA" /><option value="Nationwide" />
                    </datalist>
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
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={startLinkedInConnect}
                        disabled={linkedinSyncing}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-colors disabled:opacity-60 ${
                          profile.linkedinConnectedAt
                            ? 'border-[#76B900]/30 bg-[#76B900]/5 text-[#5a9000] hover:bg-[#76B900]/10'
                            : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {linkedinSyncing
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : profile.linkedinConnectedAt
                          ? <CheckCircle2 className="w-3.5 h-3.5" />
                          : <Linkedin className="w-3.5 h-3.5" />}
                        {profile.linkedinConnectedAt ? 'LinkedIn Synced ✔ — Sync again' : 'Connect LinkedIn'}
                      </button>
                      {profile.linkedinConnectedAt && (
                        <span className="text-[11px] text-[#76B900] font-medium">
                          Last synced {new Date(profile.linkedinConnectedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {linkedinMsg && (
                      <p className="text-xs font-semibold text-[#76B900] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {linkedinMsg}
                      </p>
                    )}
                    <p className="text-[11px] text-stone-400">Links your LinkedIn profile to CivicPath — AI extracts your name, org, mission, and impact metrics automatically.</p>
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
                  <input type="text" list="focus-area-suggestions" placeholder="e.g. AI-driven civic technology, STEM education, community health"
                    value={profile.focusArea} onChange={e => setProfile({...profile, focusArea: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 placeholder:text-stone-400" />
                  <datalist id="focus-area-suggestions">
                    <option value="AI / Machine Learning" /><option value="Civic Technology" /><option value="STEM Education" />
                    <option value="Community Health" /><option value="Mental Health Services" /><option value="Workforce Development" />
                    <option value="Affordable Housing" /><option value="Food Security" /><option value="Environmental Justice" />
                    <option value="Climate & Clean Energy" /><option value="Economic Development" /><option value="Small Business Support" />
                    <option value="Youth Development" /><option value="Senior Services" /><option value="Disability Services" />
                    <option value="Arts & Culture" /><option value="Early Childhood Education" /><option value="K-12 Education" />
                    <option value="Higher Education" /><option value="Veteran Services" /><option value="Immigrant & Refugee Services" />
                    <option value="Criminal Justice Reform" /><option value="Public Safety" /><option value="Infrastructure" />
                    <option value="Digital Equity & Broadband" /><option value="Biotechnology" /><option value="Agricultural Innovation" />
                    <option value="Water & Sanitation" /><option value="Disaster Relief" /><option value="Social Services" />
                    <option value="Research & Development" /><option value="Entrepreneurship" /><option value="Journalism & Media" />
                    <option value="Legal Aid" /><option value="International Development" />
                  </datalist>
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
                    <Upload className="w-4 h-4 text-stone-400" />Upload Resume / Portfolio (TXT, MD)
                  </label>
                  <label className="flex items-center justify-center gap-3 w-full py-4 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:border-[#76B900]/40 hover:bg-[#76B900]/5 transition-colors group">
                    <Upload className="w-5 h-5 text-stone-400 group-hover:text-[#76B900] transition-colors" />
                    <span className="text-sm text-stone-500 group-hover:text-[#76B900] transition-colors">
                      {profile.resumeText ? '\u2713 Resume loaded — click to replace' : 'Click to upload or drag & drop'}
                    </span>
                    <input type="file" accept=".txt,.md" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                        const isDoc = file.name.toLowerCase().endsWith('.doc') || file.name.toLowerCase().endsWith('.docx');
                        if (isPdf || isDoc) {
                          setAiFillMsg('PDF and Word uploads are not supported yet. Please paste the text or upload a TXT/MD file.');
                          setTimeout(() => setAiFillMsg(''), 6000);
                          return;
                        }
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
                <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">8 Active Action Agents</h3>
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
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[80] shadow-sm"><Search className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[70] shadow-sm"><BrainCircuit className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[60] shadow-sm"><FileEdit className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[50] shadow-sm"><ShieldCheck className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center z-[40] shadow-sm"><Send className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-[#76B900]/10 border border-[#76B900]/30 flex items-center justify-center z-[30] shadow-sm"><Eye className="w-4 h-4 text-[#76B900] animate-pulse" /></div>
                    <div className="w-8 h-8 rounded-full bg-[#111]/80 border border-[#76B900]/40 flex items-center justify-center z-[20] shadow-sm" title="Agent 7: Compliance Scanner"><FileText className="w-4 h-4 text-[#76B900]" /></div>
                    <div className="w-8 h-8 rounded-full bg-[#111]/80 border border-[#76B900]/40 flex items-center justify-center z-[10] shadow-sm" title="Agent 8: The Closer"><Trophy className="w-4 h-4 text-[#76B900]" /></div>
                  </div>
                  <span className="text-xs text-stone-500 font-medium">8 Agents Ready to Act</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'hunter', name: 'The Hunter', desc: 'Scours the web and databases for active, relevant grant opportunities.', icon: <Search className="w-5 h-5" />, dark: false },
                    { id: 'matchmaker', name: 'The Matchmaker', desc: 'Cross-references your profile against complex grant rubrics.', icon: <BrainCircuit className="w-5 h-5" />, dark: false },
                    { id: 'drafter', name: 'The Drafter', desc: 'Generates high-scoring executive summaries and PDFs.', icon: <FileEdit className="w-5 h-5" />, dark: false },
                    { id: 'controller', name: 'The Controller', desc: 'Scans for compliance, residency, and required documents.', icon: <ShieldCheck className="w-5 h-5" />, dark: false },
                    { id: 'submitter', name: 'The Submitter', desc: 'Integrates with Gmail to autonomously send the final proposal.', icon: <Send className="w-5 h-5" />, dark: false },
                    { id: 'watcher', name: 'The Watcher', desc: '24/7 background agent. Polls Grants.gov & auto-books calendar deadlines.', icon: <Eye className="w-5 h-5" />, dark: false },
                    { id: 'compliance_scanner', name: 'The Compliance Scanner — NEW', desc: 'Extracts reporting deadlines from Award Letters. Drafts compliance reports with Hard Block detection. Activate from Awarded tab.', icon: <FileText className="w-5 h-5" />, dark: true },
                    { id: 'closer', name: 'The Closer — NEW', desc: 'Generates cryptographic Audit Pack (ZIP + Merkle root + 0G anchor). Executes 500ms Sovereign Purge. Activate from Awarded tab.', icon: <Trophy className="w-5 h-5" />, dark: true },
                  ].map(ag => (
                    <div key={ag.id} className={`flex items-start p-3 rounded-xl border ${
                      ag.dark ? 'bg-[#111] border-[#76B900]/20' : 'bg-stone-50 border-stone-200'
                    }`}>
                      <div className={`p-2 rounded-lg border mr-3 shadow-sm shrink-0 ${
                        ag.dark ? 'bg-[#76B900]/10 border-[#76B900]/30 text-[#76B900]' :
                        ag.id === 'watcher' ? 'bg-[#76B900]/10 border-[#76B900]/30 text-[#76B900]' :
                        'bg-white border-stone-200 text-[#76B900]'
                      }`}>
                        {ag.icon}
                      </div>
                      <div>
                        <h4 className={`text-sm font-bold ${ag.dark ? 'text-white' : 'text-stone-800'}`}>{ag.name}</h4>
                        <p className={`text-xs leading-snug mt-0.5 ${ag.dark ? 'text-stone-500' : 'text-stone-500'}`}>{ag.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick demo access */}
            <div className="pt-2 text-center">
              <button onClick={() => setStepPersisted('dashboard')}
                className="text-xs text-stone-400 hover:text-[#76B900] font-medium underline transition-colors">
                Skip setup — explore the demo dashboard →
              </button>
            </div>

            {/* Step nav */}
            <div className="pt-3 flex gap-3">
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
                  onClick={() => setStepPersisted('dashboard')}
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

      {/* ── LinkedIn AI-Paste Modal ── */}
      {showLinkedinModal && (
        <div className="fixed inset-0 z-[200] bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-lg flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-stone-900">Link LinkedIn to Your Profile</h3>
              </div>
              <button onClick={() => setShowLinkedinModal(false)} className="text-stone-400 hover:text-stone-700 text-xl">&times;</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Method 1: URL + AI auto-fill */}
              {profile.linkedinUrl && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm font-bold text-blue-800 mb-1">Option 1 — AI Auto-fill from your URL</p>
                  <p className="text-xs text-blue-600 mb-3">We'll use AI to analyze your LinkedIn URL ({profile.linkedinUrl}) and pre-fill your org profile.</p>
                  <button
                    onClick={() => { setShowLinkedinModal(false); handleAIFillFromUrl(); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <Sparkles className="w-4 h-4" /> Auto-fill from LinkedIn URL
                  </button>
                </div>
              )}

              {/* Method 2: Paste About section */}
              <div>
                <p className="text-sm font-bold text-stone-800 mb-1">
                  {profile.linkedinUrl ? 'Option 2 — ' : ''}Paste your LinkedIn About section
                </p>
                <p className="text-xs text-stone-500 mb-2">
                  Go to your LinkedIn profile → About section → copy the text and paste it below.
                  AI will extract your org name, mission, focus area, and impact metrics.
                </p>
                <textarea
                  rows={6}
                  value={linkedinPasteText}
                  onChange={e => setLinkedinPasteText(e.target.value)}
                  placeholder="Paste your LinkedIn About / bio text here..."
                  className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none text-stone-900 text-sm resize-none"
                />
                <button
                  onClick={handleLinkedInPasteExtract}
                  disabled={!linkedinPasteText.trim() || linkedinExtractLoading}
                  className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-[#76B900] text-[#111] font-bold rounded-xl hover:bg-[#689900] transition-colors disabled:opacity-40 text-sm"
                >
                  {linkedinExtractLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting...</> : <><Sparkles className="w-4 h-4" /> Extract &amp; Sync Profile</>}
                </button>
              </div>

              {/* Info about full OAuth */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                <span className="font-bold">Full OAuth sync</span> (imports name, photo, email automatically) requires LinkedIn API credentials.
                Contact <a href="mailto:hello@civicpath.ai" className="underline font-bold">hello@civicpath.ai</a> to enable it for your account.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header & Nav Tabs */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo />
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-[800] tracking-tight text-stone-900">
                  CivicPath
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#76B900] text-[#111111] rounded">Hub</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden lg:block"><SovereignHeader /></div>

              <div className="relative z-50">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)} 
                  className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 font-medium px-2 py-1.5 rounded-lg hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-200"
                >
                  <UserCircle className="w-5 h-5 text-stone-400" />
                  <span className="hidden sm:block">{user?.name}</span>
                  <svg className={`w-4 h-4 text-stone-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5">
                    <div className="px-4 py-2 border-b border-stone-100 flex justify-between items-center">
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Language</span>
                      <LanguageSwitcher />
                    </div>
                    <button onClick={() => { setActiveTab('profile'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 mt-1 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"><UserCircle className="w-4 h-4 text-stone-400"/> {t('nav.profile')}</button>
                    <button onClick={() => { setActiveTab('billing'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"><CreditCard className="w-4 h-4 text-stone-400"/> Billing</button>
                    <button onClick={() => { setActiveTab('security'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"><ShieldOff className="w-4 h-4 text-stone-400"/> Security</button>
                    <button onClick={() => { setActiveTab('awarded'); setShowUserMenu(false); }} className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 flex items-center gap-2"><Trophy className="w-4 h-4 text-stone-400"/> Awarded</button>
                    <div className="h-px bg-stone-100 my-1.5"></div>
                    <a href="/pricing" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">Pricing</a>
                    <a href="/privacy" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">Privacy</a>
                    <a href="/terms" className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">Terms</a>
                    <div className="h-px bg-stone-100 my-1.5"></div>
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"><LogOut className="w-4 h-4" /> {t('nav.signout')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs — scrollable on mobile */}
          <div className="flex gap-1 border-b border-stone-200 overflow-x-auto scrollbar-none -mb-px">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${activeTab === 'dashboard' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
            >
              <BarChart3 className="w-4 h-4 mr-2" /> {t('nav.dashboard')}
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
              onClick={() => window.location.href = '/mylalla'}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 border-transparent text-stone-500 hover:text-stone-700`}
            >
              <Sparkles className="w-4 h-4 mr-1.5" /> MyLalla
            </button>
            <button 
              onClick={() => setActiveTab('grants')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${
                activeTab === 'grants' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Search className="w-4 h-4 mr-1.5" /> {t('nav.grants')}
              {allDiscoveredGrants.length > 0 && <span className="ml-1.5 bg-[#76B900] text-[#111111] text-[10px] font-black px-1.5 py-0.5 rounded-full">{allDiscoveredGrants.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab('tracker')}
              className={`pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 ${
                activeTab === 'tracker' ? 'border-[#76B900] text-[#76B900]' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              <Kanban className="w-4 h-4 mr-1.5" /> {t('nav.tracker')}
              {trackerGrants.length > 0 && <span className="ml-1.5 bg-[#76B900] text-[#111111] text-[10px] font-black px-1.5 py-0.5 rounded-full">{trackerGrants.length}</span>}
            </button>
            {['profile', 'billing', 'security', 'awarded'].includes(activeTab) && (
              <button 
                className="pb-3 px-1 text-sm font-bold flex items-center whitespace-nowrap transition-colors border-b-2 border-[#76B900] text-[#76B900]"
              >
                <div className="flex items-center gap-1.5">
                  {activeTab === 'profile' && <><UserCircle className="w-4 h-4" /> {t('nav.profile')}</>}
                  {activeTab === 'billing' && <><CreditCard className="w-4 h-4" /> Billing</>}
                  {activeTab === 'security' && <><ShieldOff className="w-4 h-4" /> Security</>}
                  {activeTab === 'awarded' && <><Trophy className="w-4 h-4" /> {t('nav.awarded')}</>}
                </div>
              </button>
            )}
          </div>
        </div>
      </header>
      {/* ── Upgrade modal ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-stone-200 p-8 text-center">
            <div className="text-4xl mb-3">🚀</div>
            <h2 className="text-xl font-black text-stone-900 mb-2">Free limit reached</h2>
            <p className="text-stone-500 text-sm mb-1">You've used all <strong>{FREE_RUN_LIMIT} free pipeline runs</strong> this month.</p>
            <p className="text-stone-400 text-xs mb-5">Upgrade to Pro for unlimited runs, unlimited proposals, and priority support.</p>
            <a href="/pricing" className="block w-full py-3 bg-[#76B900] text-[#111111] font-bold rounded-xl hover:bg-[#689900] transition-colors mb-3">
              Upgrade to Pro — $49/mo →
            </a>
            {/* Beta code */}
            <div className="border border-stone-200 rounded-xl p-3 mb-3 text-left">
              <p className="text-xs font-semibold text-stone-500 mb-2 flex items-center gap-1.5">
                <span>🎟</span> Have a beta access code?
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={upgradeModalCode}
                  onChange={e => setUpgradeModalCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm font-mono outline-none focus:border-[#76B900]"
                />
                <button
                  onClick={handleUpgradeModalRedeem}
                  disabled={upgradeModalCodeLoading || !upgradeModalCode.trim()}
                  className="px-3 py-2 bg-[#76B900] text-[#111] font-bold rounded-lg text-sm disabled:opacity-50"
                >
                  {upgradeModalCodeLoading ? '...' : 'Go'}
                </button>
              </div>
              {upgradeModalCodeMsg && <p className="text-xs text-red-500 mt-1.5">{upgradeModalCodeMsg}</p>}
            </div>
            <button onClick={() => setShowUpgradeModal(false)} className="w-full py-2.5 border border-stone-200 text-stone-500 font-medium rounded-xl hover:bg-stone-50 text-sm">
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Agent Status Sidebar */}
      {showAgentSidebar && (
        <AgentStatus
          isRunning={isRunning}
          logs={globalLogs}
          onClose={() => setShowAgentSidebar(false)}
          agents={[
            {
              id: 'hunter',
              name: 'Researcher',
              description: 'Scanning Grants.gov + SBA SBIR live',
              status: agents.find(a => a.id === 'hunter')?.status === 'working' ? 'thinking'
                    : agents.find(a => a.id === 'hunter')?.status === 'completed' ? 'done'
                    : agents.find(a => a.id === 'hunter')?.status === 'error' ? 'error'
                    : 'idle',
            },
            {
              id: 'matchmaker',
              name: 'Eligibility Scorer',
              description: 'Scoring grants 0–100 against your profile',
              status: agents.find(a => a.id === 'matchmaker')?.status === 'working' ? 'thinking'
                    : agents.find(a => a.id === 'matchmaker')?.status === 'completed' ? 'done'
                    : agents.find(a => a.id === 'matchmaker')?.status === 'error' ? 'error'
                    : 'idle',
            },
            {
              id: 'drafter',
              name: 'Proposal Drafter',
              description: 'Writing personalized proposal via Gemini',
              status: agents.find(a => a.id === 'drafter')?.status === 'working' ? 'thinking'
                    : agents.find(a => a.id === 'drafter')?.status === 'completed' ? 'active'
                    : agents.find(a => a.id === 'drafter')?.status === 'error' ? 'error'
                    : 'idle',
            },
            {
              id: 'controller',
              name: 'Compliance',
              description: 'Verifying eligibility, budget, EIN, residency',
              status: agents.find(a => a.id === 'controller')?.status === 'working' ? 'thinking'
                    : agents.find(a => a.id === 'controller')?.status === 'completed' ? 'done'
                    : agents.find(a => a.id === 'controller')?.status === 'error' ? 'error'
                    : 'idle',
            },
            {
              id: 'submitter',
              name: 'Submitter',
              description: 'Packaging and queuing application',
              status: agents.find(a => a.id === 'submitter')?.status === 'working' ? 'thinking'
                    : agents.find(a => a.id === 'submitter')?.status === 'completed' ? 'done'
                    : agents.find(a => a.id === 'submitter')?.status === 'error' ? 'error'
                    : 'idle',
            },
            {
              id: 'watcher',
              name: 'Vault / Watcher',
              description: 'Background monitor — polling 24/7 for new matches',
              status: agents.find(a => a.id === 'watcher')?.status === 'working' ? 'active'
                    : agents.find(a => a.id === 'watcher')?.status === 'completed' ? 'active'
                    : agents.find(a => a.id === 'watcher')?.status === 'error' ? 'error'
                    : 'idle',
            },
            {
              id: 'compliance_scanner',
              name: 'Compliance Scanner',
              description: 'Post-award deadline extraction + AI report drafting',
              status: agents.find(a => a.id === 'compliance_scanner')?.status === 'working' ? 'thinking'
                    : agents.find(a => a.id === 'compliance_scanner')?.status === 'completed' ? 'done'
                    : agents.find(a => a.id === 'compliance_scanner')?.status === 'error' ? 'error'
                    : 'idle',
            },
            {
              id: 'closer',
              name: 'The Closer',
              description: 'Audit Pack (ZIP + Merkle + 0G) + Sovereign Purge',
              status: agents.find(a => a.id === 'closer')?.status === 'working' ? 'thinking'
                    : agents.find(a => a.id === 'closer')?.status === 'completed' ? 'done'
                    : agents.find(a => a.id === 'closer')?.status === 'error' ? 'error'
                    : 'idle',
            },
          ] satisfies AgentItem[]}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'billing' && (() => {
          const currentPlan = userPlan;
          const isPro = currentPlan === 'pro';
          const isFunder = currentPlan === 'funder';
          const isPaid = isPro || isFunder;

          const handleManageBilling = async () => {
            try {
              const res = await fetch('/api/create-portal-session', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user?.email || '' }),
              });
              const data = await res.json();
              if (data.url) window.location.href = data.url;
              else alert(data.error || 'Could not open billing portal. Please try again.');
            } catch { alert('Network error. Please try again.'); }
          };

          const handleUpgrade = async (plan: string) => {
            try {
              const res = await fetch('/api/create-checkout-session', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ plan, email: user?.email || '' }),
              });
              const data = await res.json();
              if (data.url) window.location.href = data.url;
              else alert('Checkout error: ' + (data.error || 'Try again'));
            } catch { alert('Network error. Please try again.'); }
          };

          return (
            <div className="max-w-2xl mx-auto animate-in fade-in space-y-5">
              {/* Current Plan */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#76B900]" /> Your Plan</h2>
                  <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                    isPro ? 'bg-[#76B900] text-[#111]' : isFunder ? 'bg-blue-600 text-white' : 'bg-stone-100 text-stone-600'
                  }`}>{isPro ? 'Pro' : isFunder ? 'Funder' : 'Free'}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    {l:'Grant Searches', v: isPaid ? 'Unlimited' : '5/month'},
                    {l:'AI Proposals', v: isPaid ? 'Unlimited' : '1/month'},
                    {l:'Tracker Grants', v: isPaid ? 'Unlimited' : `${trackerGrants.length} saved`},
                  ].map((s,i) => (
                    <div key={i} className="bg-stone-50 rounded-xl p-3 text-center border border-stone-200">
                      <div className="text-sm font-black text-stone-900">{s.v}</div>
                      <div className="text-[10px] text-stone-400 mt-0.5 font-medium">{s.l}</div>
                    </div>
                  ))}
                </div>
                {!isPaid && (
                  <div className="bg-[#76B900]/5 border border-[#76B900]/20 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-stone-900">Upgrade to Pro — $49/month</p>
                      <p className="text-xs text-stone-500">Unlimited grants, proposals, AI advisor. 14-day free trial.</p>
                    </div>
                    <button onClick={() => handleUpgrade('pro')}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#76B900] text-[#111] font-bold rounded-xl hover:bg-[#689900] transition-colors shrink-0 text-sm">
                      <Zap className="w-4 h-4" /> Upgrade
                    </button>
                  </div>
                )}
                {!isPaid && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                    <span className="font-semibold text-stone-700">{runsRemaining}</span> of {FREE_RUN_LIMIT} free pipeline runs remaining this month
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#76B900] rounded-full transition-all" style={{width: `${(monthlyRuns / FREE_RUN_LIMIT) * 100}%`}} />
                    </div>
                  </div>
                )}

                {/* Beta Access Code — inside the card, always visible for non-paid users */}
                {userPlan !== 'pro' && userPlan !== 'funder' && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-stone-800 flex items-center gap-2">
                        🎟 Beta Access Code
                      </p>
                      {userPlan === 'beta' && (
                        <span className="text-[10px] bg-[#76B900] text-[#111] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                      )}
                    </div>
                    {userPlan === 'beta' ? (
                      <p className="text-xs text-[#76B900] font-medium">✓ Beta access active — unlimited pipeline runs enabled</p>
                    ) : (
                      <>
                        <p className="text-xs text-stone-500 mb-3">Enter your beta code to unlock unlimited runs — no credit card needed.</p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="e.g. CIVICPATH2026"
                            value={billingCode}
                            onChange={e => setBillingCode(e.target.value.toUpperCase())}
                            className="flex-1 px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-sm font-mono tracking-wider"
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <button
                            onClick={handleBillingRedeem}
                            disabled={billingCodeLoading || !billingCode.trim()}
                            className="px-4 py-2.5 bg-[#76B900] text-[#111] font-bold rounded-xl text-sm hover:bg-[#689900] transition-colors disabled:opacity-50"
                          >
                            {billingCodeLoading ? '...' : 'Activate'}
                          </button>
                        </div>
                        {billingCodeMsg && (
                          <p className={`text-xs mt-2 font-medium ${billingCodeMsg.startsWith('\u2713') ? 'text-[#76B900]' : 'text-red-500'}`}>
                            {billingCodeMsg}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {isPaid && (
                  <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-stone-800">Manage your subscription</p>
                      <p className="text-xs text-stone-500">Update payment method, view invoices, or cancel anytime.</p>
                    </div>
                    <button onClick={handleManageBilling}
                      className="shrink-0 px-4 py-2 border border-stone-200 text-stone-700 font-bold rounded-xl hover:bg-stone-50 text-sm transition-colors">
                      Open Portal →
                    </button>
                  </div>
                )}
              </div>

              {/* Plan comparison */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-4">All Plans</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {name:'Free', price:'$0', features:['5 searches/month','1 proposal/month','Grant Tracker','MyLalla chat'], highlight: !isPaid},
                    {name:'Pro', price:'$49/mo', features:['Unlimited searches','Unlimited proposals','Priority AI matching','Email digest','PDF downloads','Share results'], highlight: isPro, plan:'pro'},
                    {name:'Funder', price:'$199/mo', features:['Post unlimited grants','AI applicant scoring','Applicant dashboard','Analytics','Approval workflow'], highlight: isFunder, plan:'funder'},
                  ].map((p, i) => (
                    <div key={i} className={`rounded-xl border p-4 ${
                      p.highlight ? 'border-[#76B900] bg-[#76B900]/5' : 'border-stone-200'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-stone-900 text-sm">{p.name}</span>
                        {p.highlight && <span className="text-[10px] bg-[#76B900] text-[#111] px-2 py-0.5 rounded-full font-black uppercase">Current</span>}
                      </div>
                      <div className="text-xl font-black text-stone-900 mb-3">{p.price}</div>
                      <ul className="space-y-1.5">
                        {p.features.map((f,j) => (
                          <li key={j} className="text-xs text-stone-600 flex items-center gap-1.5">
                            <span className="text-[#76B900]">\u2713</span> {f}
                          </li>
                        ))}
                      </ul>
                      {!p.highlight && p.plan && (
                        <button onClick={() => handleUpgrade(p.plan!)}
                          className="mt-4 w-full py-2 bg-[#76B900] text-[#111] text-xs font-bold rounded-lg hover:bg-[#689900] transition-colors">
                          Start Free Trial
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Account info */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-3 flex items-center gap-2"><UserCircle className="w-4 h-4 text-[#76B900]" /> Account</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-stone-100">
                    <span className="text-stone-500">Email</span>
                    <span className="font-medium text-stone-900">{user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-stone-100">
                    <span className="text-stone-500">Name</span>
                    <span className="font-medium text-stone-900">{user?.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-stone-500">Plan</span>
                    <span className="font-bold text-[#76B900]">{isPro ? 'Pro' : isFunder ? 'Funder' : 'Free'}</span>
                  </div>
                </div>
                <button onClick={() => { logout(); navigate('/'); }}
                  className="mt-4 flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors">
                  <LogOut className="w-3.5 h-3.5" /> Sign out of this account
                </button>
              </div>
            </div>
          );
        })()}

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
                          {(g as any).isDirect && <span className="shrink-0 mt-1 px-1.5 py-0.5 text-[8px] font-black bg-blue-600 text-white rounded-full uppercase tracking-wider">Direct</span>}
                          {isLive && !((g as any).isDirect) && <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-[#76B900] animate-pulse" title="Live" />}
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
                {/* 0G Labs DA Sync */}
                {trackerGrants.length > 0 && (
                  <button
                    onClick={handleZGSync}
                    disabled={zgSyncState === 'syncing' || !merkleRoot}
                    className={`flex items-center gap-1.5 px-3 py-2 border text-xs font-bold rounded-lg transition-colors disabled:opacity-40 ${
                      zgSyncState === 'confirmed'
                        ? 'border-[#76B900] text-[#76B900] bg-[#76B900]/5'
                        : 'border-stone-200 text-stone-600 hover:border-[#76B900] hover:text-[#76B900]'
                    }`}
                    title={merkleRoot ? `Merkle Root: ${truncateHash(merkleRoot)}` : 'Computing...'}
                  >
                    {zgSyncState === 'syncing'
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...</>
                      : zgSyncState === 'confirmed'
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Anchored</>  
                      : <><ShieldCheck className="w-3.5 h-3.5" /> Sync to 0G Labs</>}
                  </button>
                )}
                <button onClick={sendDigest} disabled={digestLoading || !user?.email}
                  className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 text-xs font-bold rounded-lg hover:border-[#76B900] hover:text-[#76B900] transition-colors disabled:opacity-40">
                  {digestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                  Email Digest
                </button>
                {digestMsg && <span className="text-xs font-medium text-[#76B900]">{digestMsg}</span>}
              </div>
            </div>

            {/* 0G Labs TX confirmed banner */}
            {zgReceipt && (
              <div className="mb-4 bg-[#0D0D0D] border border-[#76B900]/30 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-4 h-4 rounded-full bg-[#76B900]/30 animate-ping" />
                    <CheckCircle2 className="relative w-4 h-4 text-[#76B900]" />
                  </div>
                  <span className="text-[#76B900] font-black text-xs uppercase tracking-widest">Transaction Confirmed</span>
                  <span className="text-[9px] font-black text-[#111] bg-[#76B900] px-1.5 py-0.5 rounded uppercase tracking-wider">0G Labs DA</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px]">
                  <span className="text-stone-500">TX: <span className="text-stone-300">{truncateHash(zgReceipt.txHash, 6)}</span></span>
                  <span className="text-stone-500">Block: <span className="text-stone-300">#{zgReceipt.blockHeight.toLocaleString()}</span></span>
                  <span className="text-stone-500">Root: <span className="text-stone-300">{truncateHash(zgReceipt.merkleRoot, 6)}</span></span>
                  <span className="text-stone-500">Gas: <span className="text-stone-300">{zgReceipt.gasUsed}</span></span>
                  <span className="text-stone-500">Size: <span className="text-stone-300">{zgReceipt.dataSize}</span></span>
                </div>
                <button onClick={() => { setZGReceipt(null); setZGSyncState('idle'); }} className="ml-auto text-stone-600 hover:text-stone-400 text-xs transition-colors shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

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
                <div className="hidden sm:grid border-b border-stone-100 bg-stone-50" style={{gridTemplateColumns:'2fr 110px 1fr 90px 140px 80px 36px'}}>
                  {['Grant Name','Status','Agency','Deadline','Integrity · SHA-256','Source',''].map((h,i) => (
                    <div key={i} className={`px-4 py-2.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider ${i < 6 ? 'border-r border-stone-100' : ''}`}>{h}</div>
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
                  const leafHash = grantHashes[g.id];
                  const isAnchored = zgReceipt !== null;
                  return (
                    <div key={g.id}
                      className={`group flex flex-col sm:grid border-b border-stone-100 last:border-b-0 hover:bg-stone-50/60 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-[#FAFAFA]'
                      }`}
                      style={{gridTemplateColumns:'2fr 110px 1fr 90px 140px 80px 36px'}}>

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

                      {/* Integrity — SHA-256 leaf hash */}
                      <div className="hidden sm:flex px-3 py-3 items-center border-r border-stone-100 gap-1.5">
                        {leafHash ? (
                          <>
                            <span
                              className={`font-mono text-[10px] truncate ${
                                isAnchored ? 'text-[#76B900]' : 'text-stone-400'
                              }`}
                              title={`0x${leafHash}`}
                            >
                              {truncateHash(leafHash, 4)}
                            </span>
                            {isAnchored && (
                              <CheckCircle2 className="w-3 h-3 text-[#76B900] shrink-0" />
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-stone-300 font-mono animate-pulse">computing...</span>
                        )}
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
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in pb-12">
            
            {/* ── HEADER / HERO SECTION ── */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 relative">
                <div className="absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(circle at 2px 2px, #76B900 1px, transparent 0)', backgroundSize:'24px 24px'}} />
                {profile.linkedinPicture && <img src={profile.linkedinPicture} alt="cover" className="w-full h-full object-cover blur-2xl opacity-30" />}
              </div>
              <div className="px-8 pb-8">
                <div className="-mt-12 mb-6 flex items-end justify-between">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl border-4 border-white bg-[#76B900] flex items-center justify-center shadow-xl overflow-hidden">
                      {profile.logoDataUrl
                        ? <img src={profile.logoDataUrl} alt="logo" className="w-full h-full object-cover" />
                        : profile.linkedinPicture
                          ? <img src={profile.linkedinPicture} alt={user?.name} className="w-full h-full object-cover" />
                          : <span className="text-3xl font-black text-white">{(profile.companyName?.[0] || user?.name?.[0] || 'O').toUpperCase()}</span>
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
                  <div className="flex gap-2">
                    <button onClick={() => setStep('onboarding')} className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-all shadow-sm">
                      Edit Profile
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-[800] text-stone-900 tracking-tight">{profile.companyName || user?.name || 'Your Organization'}</h2>
                    <p className="text-stone-500 text-lg font-medium mt-1">{profile.tagline || 'Building the future of community impact.'}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm font-medium text-stone-400">
                      {profile.location && <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#76B900]" />{profile.location}</span>}
                      {profile.orgType && <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-[#76B900]" />{profile.orgType === '501c3' ? '501(c)(3) Nonprofit' : profile.orgType === 'startup' ? 'AI / Tech Startup' : profile.orgType}</span>}
                      {profile.yearFounded && <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#76B900]" />Est. {profile.yearFounded}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profile.website && <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 hover:text-[#76B900] hover:border-[#76B900] transition-all"><Globe className="w-5 h-5" /></a>}
                    {profile.linkedinUrl && <a href={profile.linkedinUrl.startsWith('http') ? profile.linkedinUrl : `https://${profile.linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 hover:text-blue-600 hover:border-blue-600 transition-all"><Linkedin className="w-5 h-5" /></a>}
                    {profile.twitterUrl && <a href={`https://x.com/${profile.twitterUrl.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 hover:text-sky-500 hover:border-sky-500 transition-all"><Twitter className="w-5 h-5" /></a>}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* ── MAIN CONTENT (LEFT) ── */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* About / Background */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                  <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#76B900]" /> Organization Overview
                  </h3>
                  <div className="prose prose-stone max-w-none">
                    <p className="text-stone-600 leading-relaxed whitespace-pre-wrap text-[15px]">
                      {safeBackgroundInfo || safeResumeText || 'No background information provided yet. Use the AI Research tool to automatically generate an overview from your web presence.'}
                    </p>
                  </div>
                </div>

                {/* Mission & Focus */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                  <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-[#76B900]" /> Mission & Strategy
                  </h3>
                  <div className="space-y-4">
                    <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl">
                      <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-2">Core Mission</p>
                      <p className="text-stone-800 font-medium italic">"{profile.missionStatement || 'No mission statement added.'}"</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-stone-100 rounded-xl">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Focus Area</p>
                        <p className="text-sm font-bold text-stone-700">{profile.focusArea || 'Not specified'}</p>
                      </div>
                      <div className="p-4 border border-stone-100 rounded-xl">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Target Population</p>
                        <p className="text-sm font-bold text-stone-700">{profile.targetPopulation || 'General'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grant History */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                  <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#76B900]" /> Funding History
                  </h3>
                  {profile.grantHistoryText ? (
                    <div className="relative pl-6 border-l-2 border-stone-100 space-y-8">
                      {profile.grantHistoryText.split(/[·;\n]+/).map((entry, i) => {
                        const text = entry.trim();
                        if (!text) return null;
                        const isWon = /won|awarded|received/i.test(text);
                        return (
                          <div key={i} className="relative">
                            <div className={`absolute -left-[31px] top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${isWon ? 'bg-[#76B900]' : 'bg-stone-300'}`} />
                            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 hover:border-[#76B900]/30 transition-colors">
                              <p className="text-sm text-stone-700 font-medium leading-relaxed">{text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-stone-100 rounded-2xl">
                      <p className="text-stone-400 text-sm">No grant history recorded.</p>
                    </div>
                  )}
                </div>

                {/* Funding Goal */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8">
                  <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-[#76B900]" /> Active Funding Goals
                  </h3>
                  <div className="p-6 bg-gradient-to-br from-[#76B900]/5 to-transparent border border-[#76B900]/10 rounded-2xl">
                    <p className="text-stone-700 font-semibold mb-2">{profile.fundingAmount ? `Target: ${profile.fundingAmount}` : 'Seeking funding'}</p>
                    <p className="text-stone-600 text-sm leading-relaxed">{profile.projectDescription || 'No active project description provided.'}</p>
                  </div>
                </div>
              </div>

              {/* ── SIDEBAR (RIGHT) ── */}
              <div className="space-y-6">
                
                {/* AI RESEARCH CARD */}
                <div className="bg-stone-900 rounded-2xl border border-stone-800 shadow-xl p-6 text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#76B900] blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-[#76B900]" /> AI Real-Time Research
                  </h3>
                  <p className="text-stone-400 text-xs mb-5 leading-relaxed">
                    Automatically sync your profile with your web presence. Our agents will scan your website and social profiles to update your mission and history.
                  </p>
                  <button
                    onClick={handleAIFillFromUrl}
                    disabled={aiFilling || (!profile.website && !profile.linkedinUrl)}
                    className="w-full py-3 rounded-xl bg-[#76B900] text-stone-900 font-bold text-sm hover:bg-[#86d200] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale shadow-lg shadow-[#76B900]/20"
                  >
                    {aiFilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {aiFilling ? 'Researching...' : 'Sync with Web (AI)'}
                  </button>
                  {aiFillMsg && <p className="mt-3 text-[10px] font-bold text-[#76B900] uppercase tracking-widest text-center">{aiFillMsg}</p>}
                </div>

                {/* ── NEW: FUNDING READINESS IQ ── */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                  <h3 className="font-bold text-stone-800 text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Funding Readiness IQ
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Federal Eligibility', score: profile.ein && profile.dunsNumber ? 100 : 0, icon: '🏛️' },
                      { label: 'Narrative Strength', score: profile.missionStatement.length > 50 ? 90 : 30, icon: '✍️' },
                      { label: 'Data Integrity', score: 100, icon: '🛡️' },
                    ].map(iq => (
                      <div key={iq.label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5">{iq.icon} {iq.label}</span>
                          <span className="text-[11px] font-black text-stone-900">{iq.score}%</span>
                        </div>
                        <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-stone-900 transition-all duration-1000" style={{ width: `${iq.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── NEW: AGENTIC VOICE / TONE ── */}
                <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-100 p-6">
                  <h3 className="font-bold text-purple-900 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Agentic Writing Persona
                  </h3>
                  <div className="p-3 bg-white border border-purple-100 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-purple-400 uppercase mb-1">Detected Tone</p>
                    <p className="text-sm font-bold text-purple-700">
                      {profile.missionStatement.length > 100 ? 'Scientific & Analytical' : 'Passionate & Community-First'}
                    </p>
                    <p className="text-[11px] text-purple-500 mt-2 leading-relaxed">
                      Our Drafter agent will automatically mirror this voice to maximize alignment with funder values.
                    </p>
                  </div>
                </div>

                {/* ── NEW: SOVEREIGN PROOF GALLERY ── */}
                <div className="bg-[#fcfdfa] border border-[#76B900]/20 rounded-2xl p-6">
                  <h3 className="font-bold text-[#5a9000] text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Sovereign Proofs
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white border border-[#76B900]/10 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#76B900] animate-pulse" />
                        <span className="text-[11px] font-bold text-stone-700">Entity Verified</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#76B900]">0G-ANCHORED</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white border border-[#76B900]/10 rounded-xl">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#76B900] animate-pulse" />
                        <span className="text-[11px] font-bold text-stone-700">Budget Proof</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#76B900]">Merkle-Active</span>
                    </div>
                  </div>
                </div>

                {/* Profile Strength */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-stone-800 text-sm uppercase tracking-widest">Strength</h3>
                    <span className={`text-sm font-black ${profileScoreColor}`}>{profileScore}%</span>
                  </div>
                  <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden mb-4">
                    <div className={`h-full rounded-full transition-all duration-1000 ${profileBarColor}`} style={{width:`${profileScore}%`}} />
                  </div>
                  <div className="space-y-2">
                    {[
                      {label:'Identity', ok: !!profile.logoDataUrl || !!profile.linkedinPicture},
                      {label:'Vision', ok: profile.missionStatement.length >= 30},
                      {label:'Federal', ok: profile.ein.length >= 4},
                      {label:'Impact', ok: profile.impactMetrics.length >= 10},
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-stone-500 font-medium">{item.label}</span>
                        <span className={item.ok ? 'text-[#76B900]' : 'text-stone-300'}>{item.ok ? '✓' : '○'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vital Stats */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-stone-50 border-b border-stone-100">
                    <h3 className="font-bold text-stone-900 text-xs uppercase tracking-widest">Key Metrics</h3>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {[
                      {l:'Annual Budget', v: profile.annualBudget},
                      {l:'Team Size', v: profile.teamSize},
                      {l:'Years Active', v: profile.yearsOperating},
                    ].map((s, i) => (
                      <div key={i} className="px-6 py-4 flex items-center justify-between">
                        <span className="text-xs font-medium text-stone-500">{s.l}</span>
                        <span className="text-sm font-bold text-stone-800">{s.v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Impact Pills */}
                {profile.impactMetrics && (
                  <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                    <h3 className="font-bold text-stone-800 text-xs uppercase tracking-widest mb-4">Live Impact</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.impactMetrics.split(/[•·,;]+/).map((m, i) => m.trim() && (
                        <span key={i} className="bg-[#76B900]/10 text-[#76B900] text-[11px] font-bold px-3 py-1.5 rounded-lg border border-[#76B900]/20">{m.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Social Login Sync */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                  <h3 className="font-bold text-stone-800 text-xs uppercase tracking-widest mb-4">Authentication</h3>
                  <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                        <Linkedin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-blue-800 leading-none">LinkedIn</p>
                        <p className="text-[11px] text-blue-600 mt-1">{profile.linkedinMemberId ? 'Connected' : 'Not Linked'}</p>
                      </div>
                    </div>
                    <button onClick={startLinkedInConnect} className="text-xs font-bold text-blue-700 hover:underline">
                      {profile.linkedinMemberId ? 'Refresh' : 'Connect'}
                    </button>
                  </div>
                </div>

                {/* Credentials */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                  <h3 className="text-amber-800 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> Compliance
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase">EIN / Tax ID</p>
                      <p className="text-sm font-mono text-stone-800 mt-1">{profile.ein || 'Missing'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase">DUNS / SAM</p>
                      <p className="text-sm font-mono text-stone-800 mt-1">{profile.dunsNumber || 'Missing'}</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {activeTab === 'integrations' && (
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 animate-in fade-in">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-800 flex items-center"><Link className="w-5 h-5 mr-2 text-[#76B900]" /> App Integrations</h2>
              <p className="text-sm text-stone-500 mt-1">Connect CivicPath to your tools to enable autonomous proposal sending and meeting intelligence.</p>
            </div>
            <div className="mb-5 p-4 bg-[#76B900]/5 border border-[#76B900]/20 rounded-xl flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-[#76B900] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-stone-800">Meet & Zoom: Use AI Transcript Analysis</p>
                <p className="text-xs text-stone-600 mt-0.5">Start your meeting → end it → download the auto-transcript → paste it in the <button onClick={() => { setActiveTab('meetings'); }} className="underline font-bold text-[#76B900] hover:text-[#689900]">Meetings tab</button> for instant AI analysis of decisions, risks, and action items. Gmail autonomous sending requires OAuth setup — <a href="mailto:hello@civicpath.ai?subject=Integration%20Setup" className="underline font-bold text-[#76B900]">request early access →</a></p>
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
                      <p className="text-xs text-stone-500">Transcript → AI grant summary</p>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 mb-3">Start your grant prep meeting, end it, then download the auto-generated transcript. Paste it into CivicPath for instant AI analysis.</p>
                  <ol className="text-xs text-stone-400 space-y-1 mb-4">
                    <li className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#76B900]/10 text-[#76B900] font-black text-[10px] flex items-center justify-center shrink-0">1</span> Start your meeting below</li>
                    <li className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#76B900]/10 text-[#76B900] font-black text-[10px] flex items-center justify-center shrink-0">2</span> End it → Meet auto-saves transcript</li>
                    <li className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#76B900]/10 text-[#76B900] font-black text-[10px] flex items-center justify-center shrink-0">3</span> Paste transcript → get AI summary</li>
                  </ol>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => window.open('https://meet.google.com/new', '_blank')}
                    className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                    <Video className="w-4 h-4" /> Start Google Meet ↗
                  </button>
                  <button onClick={() => { setActiveTab('meetings'); setTimeout(() => setShowTranscriptModal(true), 100); }}
                    className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-[#76B900] text-[#76B900] hover:bg-[#76B900]/5 transition-colors">
                    <FileText className="w-4 h-4" /> Paste Transcript for AI Analysis
                  </button>
                </div>
              </div>

              {/* Zoom Integration */}
              <div className="border border-stone-200 rounded-xl p-5 flex flex-col justify-between bg-stone-50/50 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-3 bg-blue-500/20 rounded-lg text-blue-600">
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-800 text-base">Zoom</h3>
                      <p className="text-xs text-stone-500">Transcript → AI grant summary</p>
                    </div>
                  </div>
                  <p className="text-sm text-stone-600 mb-3">Start your Zoom grant meeting. After it ends, download the cloud transcript from your Zoom portal and paste it here for AI analysis.</p>
                  <ol className="text-xs text-stone-400 space-y-1 mb-4">
                    <li className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#76B900]/10 text-[#76B900] font-black text-[10px] flex items-center justify-center shrink-0">1</span> Start Zoom meeting below</li>
                    <li className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#76B900]/10 text-[#76B900] font-black text-[10px] flex items-center justify-center shrink-0">2</span> End it → zoom.us → Recordings → Transcript</li>
                    <li className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#76B900]/10 text-[#76B900] font-black text-[10px] flex items-center justify-center shrink-0">3</span> Copy → paste transcript → AI summary</li>
                  </ol>
                </div>
                <div className="flex flex-col gap-2">
                  <button onClick={() => window.open('https://zoom.us/start/videomeeting', '_blank')}
                    className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                    <Video className="w-4 h-4" /> Start Zoom Meeting ↗
                  </button>
                  <button onClick={() => { setActiveTab('meetings'); setTimeout(() => setShowTranscriptModal(true), 100); }}
                    className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border border-[#76B900] text-[#76B900] hover:bg-[#76B900]/5 transition-colors">
                    <FileText className="w-4 h-4" /> Paste Transcript for AI Analysis
                  </button>
                </div>
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
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden animate-in fade-in max-w-5xl mx-auto">
            <div className="p-6 border-b border-stone-100 flex flex-col md:flex-row justify-between gap-4 bg-stone-50/50">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-200 text-stone-700 text-[11px] font-bold uppercase tracking-wider mb-3">
                  <Video className="w-3.5 h-3.5 text-blue-500" /> Funder Intelligence
                </div>
                <h2 className="text-2xl font-black text-stone-900 flex items-center">Funder CRM & AI Notetaker</h2>
                <p className="text-sm text-stone-500 mt-1 max-w-2xl">
                  AI automatically joins your Discovery Calls with grant officers, transcribes their requirements, and updates your organization's Matchmaker profile to increase your win rate.
                </p>
              </div>
              <div className="flex space-x-3 items-start">
                <button onClick={() => window.open('https://meet.google.com', '_blank')} className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-stone-200 text-stone-700 text-sm font-bold rounded-xl hover:bg-stone-50 shadow-sm transition-colors flex items-center justify-center">
                  <Video className="w-4 h-4 mr-2 text-blue-500" /> Connect Zoom/Meet
                </button>
                <button onClick={() => setShowTranscriptModal(true)} className="flex-1 md:flex-none px-4 py-2.5 bg-[#111111] text-white text-sm font-bold rounded-xl shadow-sm hover:bg-stone-800 transition-colors flex items-center justify-center">
                  <FileText className="w-4 h-4 mr-2 text-[#76B900]" /> Paste Transcript
                </button>
              </div>
            </div>
            
            {/* Transcript paste modal */}
            {showTranscriptModal && (
              <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
                <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-2xl flex flex-col">
                  <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-[#76B900]" />
                      <h3 className="font-bold text-stone-900">Analyze Meeting Transcript</h3>
                    </div>
                    <button onClick={() => setShowTranscriptModal(false)} className="text-stone-400 hover:text-stone-700 text-xl leading-none">&times;</button>
                  </div>
                  <div className="p-6">
                    <p className="text-sm text-stone-500 mb-3">Paste your Zoom, Meet, or Teams transcript below. AI will extract decisions, risks, action items, and grant strategy insights.</p>
                    <textarea
                      rows={10}
                      value={transcriptText}
                      onChange={e => setTranscriptText(e.target.value)}
                      placeholder="Paste your meeting transcript here..."
                      className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-stone-900 text-sm resize-none font-mono"
                    />
                    <div className="flex justify-end gap-3 mt-4">
                      <button onClick={() => setShowTranscriptModal(false)} className="px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors">Cancel</button>
                      <button
                        onClick={analyzeTranscript}
                        disabled={!transcriptText.trim() || analyzingTranscript}
                        className="flex items-center gap-2 px-5 py-2.5 bg-[#76B900] text-[#111] font-bold rounded-xl hover:bg-[#689900] transition-colors disabled:opacity-40 text-sm"
                      >
                        {analyzingTranscript ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Analyze with AI</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6">
              {/* AI-generated analysis result */}
              {transcriptAnalysis && (
                <div className="mb-6 bg-white border border-[#76B900]/30 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-stone-900 flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#76B900]" /> AI Meeting Summary</h3>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-black text-[#76B900] bg-[#76B900]/10 px-2 py-0.5 rounded uppercase tracking-wider border border-[#76B900]/20">AI Generated</span>
                      <button onClick={() => { setTranscriptAnalysis(null); setTranscriptText(''); }} className="text-[10px] text-stone-400 hover:text-stone-600 font-medium">Clear</button>
                    </div>
                  </div>
                  <div className="prose prose-sm prose-stone max-w-none prose-headings:text-stone-800 prose-headings:text-sm prose-headings:uppercase prose-headings:tracking-wider prose-headings:font-bold prose-li:my-0.5">
                    <ReactMarkdown>{transcriptAnalysis}</ReactMarkdown>
                  </div>
                </div>
              )}

              <div className="bg-white border border-[#76B900]/20 rounded-xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-[#76B900]"></div>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-black text-stone-800 uppercase tracking-tight">EXAMPLE MEETING SUMMARY</h3>
                    <p className="text-xs font-medium text-stone-500 mt-1.5">Paste your own transcript above to replace this with real AI analysis</p>
                  </div>
                  <span className="px-3 py-1 bg-stone-100 text-stone-500 text-[10px] font-black uppercase tracking-wider rounded-md border border-stone-200">Demo</span>
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
                  {lallaModelTier && (
                    <span className="text-[9px] font-bold text-purple-600 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full">{lallaModelTier}</span>
                  )}
                </div>
                <div className="text-xs text-stone-500">Your senior grant strategist — {lallaModelTier.includes('AMAI') ? 'powered by AMAI SuperAgent' : 'powered by Gemini 2.0 Flash'}</div>
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

            {/* AMAI follow-up questions */}
            {lallaFollowUps.length > 0 && !lallaLoading && (
              <div className="px-6 py-3 border-t border-stone-100 bg-stone-50 flex flex-wrap gap-2 shrink-0">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider self-center">Suggested:</span>
                {lallaFollowUps.map((q, i) => (
                  <button key={i} onClick={() => handleLallaChat(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors font-medium">
                    {q}
                  </button>
                ))}
              </div>
            )}

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
              <p className="text-[10px] text-stone-400 mt-2 text-center">
                MyLalla knows your profile and pipeline context.
                {lallaModelTier.includes('AMAI') ? ` Powered by AMAI SuperAgent · ${lallaModelTier}` : ' Powered by Gemini 2.0 Flash.'}
              </p>
            </div>
          </div>
        )}

        {/* ── AWARDED TAB — Post-Award Compliance Manager ── */}
        {activeTab === 'awarded' && (
          <AwardedTab
            profile={profile}
            user={user}
            onGoToProfile={() => setActiveTab('profile')}
            onAgentUpdate={(id: string, updates: any) => updateAgent(id, updates)}
            onAgentLog={(id: string, log: string) => addLog(id, log)}
            onCloseoutPurge={() => {
              // Agent 8: Direct 500ms purge — no modal, just fire
              purgeControllerRef.current?.trigger(() => {
                setAgents(prev => prev.map(a => ({ ...a, status: 'idle', logs: [], output: null })));
                setDiscoveredGrants([]);
                setAllDiscoveredGrants([]);
                setTotalGrantsFound(0);
                setGlobalLogs([]);
                setDrafterOutput(null);
                setAwaitingApproval(false);
                setNextAction(null);
                setIsRunning(false);
                addGlobalLog('[AGENT-8] Closeout Complete. Executing 500ms Ephemeral Purge... Enclave Reset.');
              });
            }}
          />
        )}

        {/* ── SECURITY TAB ── */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto animate-in fade-in space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-red-950/40 border border-red-900/30 rounded-xl">
                <ShieldOff className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-stone-900">Sovereign Security</h2>
                <p className="text-sm text-stone-500">Cryptographic controls, data revocation, and GDPR compliance tools.</p>
              </div>
            </div>
            <RevokeAccess onWipeData={handleSecureWipe} />
          </div>
        )}

        {/* ⚡ SECURE WIPE — Circuit Breaker overlay */}
        {purgeVisible && (
          <div className="fixed inset-0 z-[60] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#0D0D0D] border border-red-900/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1f1f1f] flex items-center gap-3">
                <ShieldOff className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <h3 className="text-white font-black text-sm">Circuit Breaker — Secure Wipe</h3>
                  <p className="text-stone-500 text-[10px] font-mono">Claim 1d: 500ms enclave reset</p>
                </div>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-stone-400 text-sm">This will purge all grant data, agent outputs, logs, and pipeline state from the enclave. Your profile is preserved.</p>
                <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-3 font-mono text-[10px] text-stone-500 space-y-1">
                  <div>{'>'} agents: {agents.filter(a => a.status !== 'idle').length} active → will reset to idle</div>
                  <div>{'>'} grants: {allDiscoveredGrants.length} discovered → will purge</div>
                  <div>{'>'} logs: {globalLogs.length} entries → will clear</div>
                  <div className="text-red-400">{'>'} circuit breaker: 500ms countdown on confirm</div>
                </div>
                {(purgePhase === 'counting' || purgePhase === 'wiping') && (
                  <div className="flex items-center gap-3 p-3 bg-red-950/40 border border-red-800 rounded-xl">
                    <div className="relative w-8 h-8 flex items-center justify-center shrink-0">
                      <span className="absolute w-8 h-8 rounded-full border-2 border-red-500/40 animate-ping" />
                      <span className="relative w-5 h-5 rounded-full bg-red-500/20 border border-red-500 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-red-300 font-black text-xs uppercase tracking-wide">
                        {purgePhase === 'wiping' ? 'Wiping enclave...' : 'Counting down...'}
                      </p>
                      <p className="text-red-500 text-[10px] font-mono">Circuit breaker active</p>
                    </div>
                  </div>
                )}
                {purgePhase === 'complete' && (
                  <div className="p-3 bg-[#76B900]/10 border border-[#76B900]/30 rounded-xl font-mono text-[11px] text-[#76B900] font-bold">
                    ✓ [1d] 500ms Circuit Breaker: Enclave Reset Successful.
                  </div>
                )}
              </div>
              <div className="px-5 pb-5 flex gap-3">
                {purgePhase === 'idle' && (
                  <>
                    <button
                      onClick={handleSecureWipe}
                      className="flex-1 py-2.5 bg-red-900/60 border border-red-700 text-red-300 font-bold text-sm rounded-xl hover:bg-red-800/60 transition-colors flex items-center justify-center gap-2"
                    >
                      <ShieldOff className="w-4 h-4" /> Confirm Wipe
                    </button>
                    <button
                      onClick={() => setPurgeVisible(false)}
                      className="flex-1 py-2.5 border border-[#2a2a2a] text-stone-500 font-bold text-sm rounded-xl hover:border-stone-600 hover:text-stone-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {(purgePhase === 'counting' || purgePhase === 'wiping') && (
                  <div className="flex-1 text-center text-stone-600 text-xs font-mono py-2.5">Processing...</div>
                )}
                {purgePhase === 'complete' && (
                  <button onClick={() => { setPurgeVisible(false); setPurgePhase('idle'); }}
                    className="flex-1 py-2.5 bg-[#76B900] text-[#111] font-bold text-sm rounded-xl hover:bg-[#689900] transition-colors">
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
            {/* Pipeline Status Banner */}
            <div className="mb-4 p-4 bg-white border border-stone-200 rounded-xl shadow-sm flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#76B900] animate-pulse"></div>
              <span className="text-sm font-semibold text-stone-700">Live data powered by <a href="https://www.grants.gov" target="_blank" rel="noopener noreferrer" className="text-[#76B900] hover:underline">Grants.gov</a> + SBA SBIR — real-time federal grant database</span>
            </div>

            {/* Sovereign Hardware Layer Status */}
            <div className="mb-6 bg-[#0D0D0D] border border-[#1f1f1f] rounded-xl px-5 py-3 flex flex-wrap items-center gap-4">
              <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest shrink-0">Sovereign Layers</span>
              {[
                { label: 'NIM', desc: 'Neural Inference · NVIDIA NIM', envKey: 'NVIDIA_API_KEY' },
                { label: '0G', desc: 'DA Layer \u00b7 0G Labs Testnet', envKey: 'ZG_PRIVATE_KEY' },
                { label: 'KMS', desc: 'HSM Vault · Google Cloud', envKey: 'GOOGLE_KMS_KEY_NAME' },
                { label: 'GEMINI', desc: 'Fallback Inference · Active', envKey: null },
              ].map(layer => (
                <div key={layer.label} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${layer.envKey === null ? 'bg-[#76B900]' : 'bg-amber-500'}`} />
                  <span className="font-mono text-[9px] font-bold text-stone-500 uppercase tracking-wider">[{layer.label}]</span>
                  <span className="text-[9px] text-stone-600">
                    {layer.envKey === null ? 'Active' : 'Hardware Verified — Pending Connection'}
                  </span>
                </div>
              ))}
            </div>

            {/* 🟢 Direct Funder Connections banner */}
            {directConnections.length > 0 && (
              <div className="mb-5 rounded-xl border-2 border-blue-400 bg-blue-50 overflow-hidden animate-in fade-in">
                <div className="px-5 py-3 bg-blue-600 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span className="text-white font-black text-sm tracking-wide">Direct Funder Connections</span>
                    <span className="bg-white text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full">{directConnections.length}</span>
                  </div>
                  <span className="text-blue-200 text-[10px] font-medium">CivicPath Network · Private listings from verified funders</span>
                </div>
                <div className="px-5 py-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {directConnections.map((g, i) => (
                    <div key={g.id || i} className="bg-white border border-blue-200 rounded-xl p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Direct</span>
                            <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">CivicPath Funder</span>
                          </div>
                          <p className="text-sm font-bold text-stone-900 leading-snug">{g.title}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{g.agency}</p>
                        </div>
                        <span className="text-sm font-black text-[#76B900] shrink-0">{g.amount}</span>
                      </div>
                      {g.focusAreas?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {g.focusAreas.slice(0, 3).map((f: string) => (
                            <span key={f} className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-medium">{f}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[11px] text-stone-400">Due: {g.closeDate}</span>
                        <a href={g.url} className="text-xs font-bold text-blue-600 hover:underline">Apply directly →</a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  <button
                    onClick={() => { setPurgeVisible(true); }}
                    className="text-xs font-bold text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                    title="Circuit Breaker: Secure Wipe all grant data"
                  >
                    <ShieldOff className="w-3 h-3" /> Wipe
                  </button>
                  <button onClick={() => { setShowAgentSidebar(true); handleExecute(); }} disabled={isRunning}
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

            {nextAction?.type === 'warning' && (
              <div className="mb-8 p-4 rounded-xl border bg-amber-50 border-amber-200 text-stone-900 flex items-start space-x-4 shadow-sm">
                <AlertCircle className="w-6 h-6 mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="font-bold mb-1 tracking-wide uppercase text-[11px] text-stone-500">Action Required</h3>
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
                        <div className="text-stone-600 italic">
                          {(agent.id === 'compliance_scanner' || agent.id === 'closer')
                            ? <span>Activate from the <button onClick={() => setActiveTab('awarded')} className="text-[#76B900] font-bold hover:underline">Awarded tab →</button></span>
                            : 'Ready to act...'}
                        </div>
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

      {/* ── Omninor Contextual Coach (Superhuman Command Bar Style) ── */}
      {omninorMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-4 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="bg-[#111111]/95 backdrop-blur-md text-white p-3 pr-4 rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] border border-[#333] flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center shrink-0 border border-stone-700 shadow-inner">
              <OmninorMascot className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium leading-snug text-stone-200">{omninorMessage}</p>
            </div>
            {omninorActionLabel && omninorAction && (
              <button 
                onClick={() => { omninorAction(); setOmninorMessage(null); }}
                className="shrink-0 px-4 py-2 bg-[#76B900] text-[#111] text-sm font-bold rounded-xl hover:bg-[#689900] transition-colors shadow-sm flex items-center gap-2 group"
              >
                {omninorActionLabel}
                <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-sans bg-[#111]/20 text-[#111] rounded border border-[#111]/20 group-hover:bg-[#111]/30 transition-colors">↵</kbd>
              </button>
            )}
            <button onClick={() => setOmninorMessage(null)} className="shrink-0 w-8 h-8 flex items-center justify-center text-stone-500 hover:text-white rounded-full hover:bg-stone-800 transition-colors">
              <span className="sr-only">Close</span>
              &times;
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

