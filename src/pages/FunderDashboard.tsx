import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Plus, CheckCircle2, XCircle, Calendar, Eye, LogOut, Building2, MapPin, Clock, Filter, Hexagon, ArrowUpRight } from 'lucide-react';

const Logo = () => (<div className="relative inline-flex items-center justify-center w-8 h-8 text-[#2E7D32]"><Hexagon className="w-8 h-8 absolute" strokeWidth={2.5} /><ArrowUpRight className="w-4 h-4 absolute" strokeWidth={3} /></div>);
type FunderTab = 'overview' | 'post' | 'applicants' | 'analytics';
interface Grant { id: string; name: string; amount: string; focus: string[]; location: string; deadline: string; status: 'active'|'draft'; applications: number; }
interface Applicant { id: string; org: string; mission: string; location: string; score: number; grant: string; date: string; status: 'pending'|'approved'|'rejected'|'review'; }
const GRANTS: Grant[] = [
  { id:'1', name:'Mom and Pop Small Business Grant', amount:'$10,000', focus:['Small Business'], location:'Miami-Dade County', deadline:'2026-06-30', status:'active', applications:23 },
  { id:'2', name:'MDEAT Black Business Grant', amount:'$25,000', focus:['Business','Community'], location:'Miami-Dade County', deadline:'2026-07-15', status:'active', applications:41 },
  { id:'3', name:'Safe in the 305 Grant', amount:'$50,000', focus:['Community','Safety'], location:'Miami-Dade County', deadline:'2026-08-01', status:'active', applications:18 },
  { id:'4', name:'Cultural Affairs Grant', amount:'$15,000', focus:['Arts','Culture'], location:'Miami-Dade County', deadline:'2026-09-01', status:'active', applications:34 },
  { id:'5', name:'Digital Equity Fund', amount:'$100,000', focus:['Technology','Education'], location:'Miami-Dade County', deadline:'2026-10-01', status:'active', applications:57 },
];
const APPLICANTS: Applicant[] = [
  { id:'1', org:'Sunrise Tech Nonprofit', mission:'AI-driven solutions for Florida communities', location:'Orlando, FL', score:94, grant:'Digital Equity Fund', date:'Mar 20', status:'pending' },
  { id:'2', org:'Miami Arts Collective', mission:'Bringing arts to underserved Miami neighborhoods', location:'Miami, FL', score:91, grant:'Cultural Affairs Grant', date:'Mar 21', status:'pending' },
  { id:'3', org:'Little Haiti Business Hub', mission:'Supporting Caribbean entrepreneurs in Miami', location:'Miami, FL', score:88, grant:'MDEAT Black Business Grant', date:'Mar 21', status:'review' },
  { id:'4', org:'Safe Streets Initiative', mission:'Community safety programs across Miami-Dade', location:'Miami-Dade, FL', score:85, grant:'Safe in the 305 Grant', date:'Mar 22', status:'pending' },
  { id:'5', org:"Maria's Bakery & Cafe", mission:'Family-owned Cuban bakery serving Hialeah since 2010', location:'Hialeah, FL', score:82, grant:'Mom and Pop Small Business Grant', date:'Mar 22', status:'pending' },
  { id:'6', org:'Overtown Digital Lab', mission:'Digital literacy programs for youth in Overtown', location:'Miami, FL', score:79, grant:'Digital Equity Fund', date:'Mar 23', status:'pending' },
];
const FOCUS_AREAS = ['Education','Technology','Housing','Health','Environment','Arts','Small Business','Community'];
const heart = (s: number) => s >= 94 ? '❤️' : s >= 80 ? '🧡' : '💚';

export default function FunderDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FunderTab>('overview');
  const [grants, setGrants] = useState<Grant[]>(GRANTS);
  const [applicants, setApplicants] = useState<Applicant[]>(APPLICANTS);
  const [celebration, setCelebration] = useState<string | null>(null);
  const [proposalModal, setProposalModal] = useState<Applicant | null>(null);
  const [filterGrant, setFilterGrant] = useState('all');
  const [form, setForm] = useState({ name:'', description:'', amount:'', deadline:'', focus:[] as string[], location:'Miami Dade County', requirements:'' });

  const totalApps = grants.reduce((s,g) => s + g.applications, 0);
  const avgScore = Math.round(applicants.reduce((s,a) => s + a.score, 0) / applicants.length);
  const funded = applicants.filter(a => a.status === 'approved').length;

  const handleApprove = (id: string) => {
    const name = applicants.find(a => a.id === id)?.org || '';
    setApplicants(prev => prev.map(a => a.id === id ? {...a, status:'approved'} : a));
    setCelebration(name);
    setTimeout(() => setCelebration(null), 3500);
  };
  const handleReject = (id: string) => setApplicants(prev => prev.map(a => a.id === id ? {...a, status:'rejected'} : a));
  const handleSchedule = (a: Applicant) => window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Discovery Call: ' + a.org)}&details=${encodeURIComponent('CivicPath grant review')}`, '_blank');
  const handlePost = () => {
    if (!form.name || !form.amount) return;
    setGrants(prev => [{ id:String(Date.now()), name:form.name, amount:form.amount, focus:form.focus, location:form.location, deadline:form.deadline, status:'active', applications:0 }, ...prev]);
    setForm({ name:'', description:'', amount:'', deadline:'', focus:[], location:'Miami Dade County', requirements:'' });
    setActiveTab('overview');
  };
  const filtered = filterGrant === 'all' ? applicants : applicants.filter(a => a.grant === filterGrant);
  const tabs: {id:FunderTab;label:string}[] = [{id:'overview',label:'📊 Overview'},{id:'post',label:'➕ Post Grant'},{id:'applicants',label:'👥 Applicants'},{id:'analytics',label:'📈 Analytics'}];

  return (
    <div className="min-h-screen bg-[#F9F7F2] font-sans flex flex-col">
      {celebration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-10 text-center shadow-2xl max-w-sm mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-black text-stone-900 mb-2">Award Sent!</h2>
            <p className="text-stone-600 text-sm mb-4"><span className="font-bold text-[#2E7D32]">{celebration}</span> has been notified. Onboarding meeting scheduled.</p>
            <div className="flex items-center justify-center gap-2 text-xs text-[#2E7D32] font-semibold bg-[#2E7D32]/10 px-3 py-2 rounded-lg"><CheckCircle2 className="w-4 h-4" /> Award email sent · Calendar booked</div>
          </div>
        </div>
      )}
      {proposalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-stone-200 overflow-hidden max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div><h3 className="font-bold text-stone-900">{proposalModal.org}</h3><p className="text-xs text-stone-500">{proposalModal.grant} · Score: {proposalModal.score}/100</p></div>
              <button onClick={() => setProposalModal(null)} className="p-2 hover:bg-stone-200 rounded-full"><XCircle className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-sm text-stone-600 space-y-3">
              <div><span className="font-bold text-stone-800">Organization:</span> {proposalModal.org}</div>
              <div><span className="font-bold text-stone-800">Mission:</span> {proposalModal.mission}</div>
              <div><span className="font-bold text-stone-800">Location:</span> {proposalModal.location}</div>
              <div><span className="font-bold text-stone-800">Match Score:</span> <span className="text-[#2E7D32] font-bold">{proposalModal.score}/100</span></div>
              <div className="p-4 bg-[#2E7D32]/5 rounded-xl border border-[#2E7D32]/20">
                <p className="font-bold text-stone-800 mb-2">Why they match:</p>
                <ul className="space-y-1"><li>• Strong mission alignment with grant objectives</li><li>• Location matches geographic requirements</li><li>• Demonstrated community impact track record</li></ul>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-stone-100 flex gap-3">
              <button onClick={() => { handleApprove(proposalModal.id); setProposalModal(null); }} className="flex-1 py-2.5 bg-[#2E7D32] text-white font-bold rounded-xl hover:bg-[#1B5E20] text-sm">Approve & Fund</button>
              <button onClick={() => { handleReject(proposalModal.id); setProposalModal(null); }} className="flex-1 py-2.5 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 text-sm">Reject</button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}><Logo /><h1 className="text-2xl font-[800] tracking-tight text-stone-900">CivicPath</h1><span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-600 text-white rounded">Funder</span></div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-stone-500 hidden sm:block">Hi, {user?.name}</span>
              <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg hover:bg-stone-100"><LogOut className="w-3.5 h-3.5" /> Sign Out</button>
            </div>
          </div>
          <div className="flex space-x-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`pb-3 px-4 text-sm font-bold transition-colors border-b-2 ${activeTab === t.id ? 'border-[#2E7D32] text-[#2E7D32]' : 'border-transparent text-stone-500 hover:text-stone-700'}`}>{t.label}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[{l:'Grants Posted',v:grants.length,c:'text-stone-900'},{l:'Total Applications',v:totalApps,c:'text-stone-900'},{l:'Avg Match Score',v:`${avgScore}%`,c:'text-[#2E7D32]'},{l:'Orgs Funded',v:funded,c:'text-[#2E7D32]'}].map((s,i) => (
                <div key={i} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
                  <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">{s.l}</div>
                  <div className={`text-2xl font-black ${s.c}`}>{s.v}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-stone-900">Active Grants</h2>
                <button onClick={() => setActiveTab('post')} className="flex items-center gap-1.5 px-4 py-2 bg-[#2E7D32] text-white text-sm font-bold rounded-lg hover:bg-[#1B5E20]"><Plus className="w-4 h-4" /> Post New</button>
              </div>
              <div className="space-y-3">
                {grants.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-200">
                    <div><div className="font-bold text-stone-900 text-sm">{g.name}</div><div className="text-xs text-stone-500 mt-0.5 flex items-center gap-3"><span>{g.amount}</span><span>{g.location}</span><span>Due {g.deadline}</span></div></div>
                    <div className="flex items-center gap-3"><span className="text-xs font-bold text-[#2E7D32] bg-[#2E7D32]/10 px-2 py-1 rounded-full">{g.applications} apps</span><button onClick={() => setActiveTab('applicants')} className="text-xs font-bold text-stone-400 hover:text-[#2E7D32]">View →</button></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-stone-900">Top Applicants</h2><button onClick={() => setActiveTab('applicants')} className="text-sm font-bold text-[#2E7D32] hover:underline">View all →</button></div>
              <div className="space-y-3">
                {applicants.slice(0,3).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div className="flex items-center gap-3"><span className="text-xl">{heart(a.score)}</span><div><div className="font-bold text-stone-900 text-sm">{a.org}</div><div className="text-xs text-stone-500">{a.grant}</div></div></div>
                    <span className="text-sm font-black text-[#2E7D32]">{a.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'post' && (
          <div className="animate-in fade-in max-w-3xl">
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8">
              <h2 className="text-xl font-bold text-stone-900 mb-6">Post a New Grant</h2>
              <div className="space-y-5">
                <div><label className="text-sm font-semibold text-stone-700 block mb-1.5">Grant Name *</label><input value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Digital Equity Fund" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900" /></div>
                <div><label className="text-sm font-semibold text-stone-700 block mb-1.5">Description</label><textarea rows={3} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Describe the grant purpose..." className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900 resize-none" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-semibold text-stone-700 block mb-1.5">Amount *</label><input value={form.amount} onChange={e => setForm({...form,amount:e.target.value})} placeholder="e.g. up to $50,000" className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900" /></div>
                  <div><label className="text-sm font-semibold text-stone-700 block mb-1.5">Deadline</label><input type="date" value={form.deadline} onChange={e => setForm({...form,deadline:e.target.value})} className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900" /></div>
                </div>
                <div><label className="text-sm font-semibold text-stone-700 block mb-1.5">Location Scope</label><select value={form.location} onChange={e => setForm({...form,location:e.target.value})} className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#2E7D32]/40 focus:border-[#2E7D32] outline-none text-stone-900"><option>Miami Dade County</option><option>South Florida</option><option>Statewide Florida</option><option>Federal</option></select></div>
                <div><label className="text-sm font-semibold text-stone-700 block mb-2">Focus Areas</label><div className="flex flex-wrap gap-2">{FOCUS_AREAS.map(f => (<button key={f} onClick={() => setForm(prev => ({...prev,focus:prev.focus.includes(f)?prev.focus.filter(x=>x!==f):[...prev.focus,f]}))} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${form.focus.includes(f)?'bg-[#2E7D32] text-white border-[#2E7D32]':'border-stone-200 text-stone-600 hover:border-[#2E7D32] hover:text-[#2E7D32]'}`}>{f}</button>))}</div></div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handlePost} className="flex-1 py-3.5 bg-[#2E7D32] text-white font-bold rounded-xl hover:bg-[#1B5E20] shadow-sm">Publish Grant</button>
                  <button onClick={() => setActiveTab('overview')} className="px-6 py-3.5 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'applicants' && (
          <div className="animate-in fade-in space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div><h2 className="text-xl font-bold text-stone-900">All Applicants</h2><p className="text-sm text-stone-500 mt-0.5">{applicants.length} total applications across {grants.length} grants</p></div>
              <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-stone-400" /><select value={filterGrant} onChange={e => setFilterGrant(e.target.value)} className="px-3 py-2 rounded-lg bg-white border border-stone-200 text-sm text-stone-700 outline-none focus:ring-2 focus:ring-[#2E7D32]/40"><option value="all">All Grants</option>{grants.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}</select></div>
            </div>
            <div className="space-y-4">
              {filtered.map(a => (
                <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-5 ${a.status==='approved'?'border-[#2E7D32]/40 bg-[#2E7D32]/5':a.status==='rejected'?'border-red-200 bg-red-50/30':'border-stone-200'}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="text-2xl mt-0.5">{heart(a.score)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900">{a.org}</span>
                          {a.status==='approved'&&<span className="text-[10px] font-black text-white bg-[#2E7D32] px-2 py-0.5 rounded uppercase">Funded ✓</span>}
                          {a.status==='rejected'&&<span className="text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded uppercase">Rejected</span>}
                          {a.status==='review'&&<span className="text-[10px] font-black text-white bg-amber-500 px-2 py-0.5 rounded uppercase">Under Review</span>}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">{a.mission}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-stone-400"><span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.location}</span><span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{a.grant}</span><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.date}</span></div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="text-2xl font-black text-[#2E7D32]">{a.score}%</div>
                      {(a.status==='pending'||a.status==='review')&&(
                        <div className="flex gap-2">
                          <button onClick={() => setProposalModal(a)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-stone-200 text-stone-600 rounded-lg hover:border-[#2E7D32] hover:text-[#2E7D32]"><Eye className="w-3.5 h-3.5" /> Proposal</button>
                          <button onClick={() => handleApprove(a.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#2E7D32] text-white rounded-lg hover:bg-[#1B5E20]"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
                          <button onClick={() => handleReject(a.id)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-red-200 text-red-600 rounded-lg hover:bg-red-50"><XCircle className="w-3.5 h-3.5" /> Reject</button>
                          <button onClick={() => handleSchedule(a)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50"><Calendar className="w-3.5 h-3.5" /> Call</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="animate-in fade-in space-y-6">
            <h2 className="text-xl font-bold text-stone-900">Analytics</h2>
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
              <h3 className="font-bold text-stone-800 mb-5">Applications Per Grant</h3>
              <div className="space-y-3">{grants.map(g => (<div key={g.id} className="flex items-center gap-3"><div className="w-48 text-xs text-stone-600 truncate shrink-0">{g.name}</div><div className="flex-1 bg-stone-100 rounded-full h-5 overflow-hidden"><div className="h-full bg-[#2E7D32] rounded-full" style={{width:`${Math.round((g.applications/57)*100)}%`}} /></div><span className="text-sm font-bold text-stone-700 w-8 text-right">{g.applications}</span></div>))}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-4">Match Score Distribution</h3>
                <div className="space-y-3">{[{l:'90-100% ❤️',c:applicants.filter(a=>a.score>=90).length},{l:'80-89% 🧡',c:applicants.filter(a=>a.score>=80&&a.score<90).length},{l:'70-79% 💚',c:applicants.filter(a=>a.score<80).length}].map((b,i) => (<div key={i} className="flex items-center gap-3"><div className="w-24 text-xs text-stone-600 shrink-0">{b.l}</div><div className="flex-1 bg-stone-100 rounded-full h-5 overflow-hidden"><div className="h-full bg-[#2E7D32] rounded-full" style={{width:`${Math.round((b.c/applicants.length)*100)}%`}} /></div><span className="text-sm font-bold text-stone-700 w-4">{b.c}</span></div>))}</div>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
                <h3 className="font-bold text-stone-800 mb-4">Application Status</h3>
                <div className="space-y-3">{[{l:'Pending',c:applicants.filter(a=>a.status==='pending').length,col:'bg-stone-400'},{l:'Under Review',c:applicants.filter(a=>a.status==='review').length,col:'bg-amber-400'},{l:'Funded',c:applicants.filter(a=>a.status==='approved').length,col:'bg-[#2E7D32]'},{l:'Rejected',c:applicants.filter(a=>a.status==='rejected').length,col:'bg-red-400'}].map((s,i) => (<div key={i} className="flex items-center gap-3"><div className="w-24 text-xs text-stone-600 shrink-0">{s.l}</div><div className="flex-1 bg-stone-100 rounded-full h-5 overflow-hidden"><div className={`h-full ${s.col} rounded-full`} style={{width:`${Math.round((s.c/applicants.length)*100)}%`}} /></div><span className="text-sm font-bold text-stone-700 w-4">{s.c}</span></div>))}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
              <h3 className="font-bold text-stone-800 mb-4">Top Scoring Applicants</h3>
              <div className="space-y-2">{[...applicants].sort((a,b)=>b.score-a.score).map((a,i) => (<div key={a.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl"><span className="text-sm font-black text-stone-400 w-5">#{i+1}</span><span className="text-lg">{heart(a.score)}</span><div className="flex-1"><div className="font-bold text-stone-900 text-sm">{a.org}</div><div className="text-xs text-stone-500">{a.grant}</div></div><span className="font-black text-[#2E7D32]">{a.score}%</span></div>))}</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
