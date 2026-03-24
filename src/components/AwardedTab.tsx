import { useState, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import {
  Upload, FileText, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, Loader2, X, ShieldCheck,
  Trophy, Calendar, AlertCircle, Eye, RotateCcw,
  Download, Plus, Send, CalendarPlus,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { auth } from '../firebase';
import {
  saveAwardedGrant, loadAwardedGrants, saveReportDraft,
  updateReportDraftStatus,
} from '../lib/db';
import type { AwardedGrantDoc, ReportDeadline, ReportDraftDoc } from '../lib/db';

interface Profile {
  companyName: string; orgType?: string; location?: string;
  focusArea?: string; missionStatement?: string; ein?: string;
  annualBudget?: string; teamSize?: string; impactMetrics?: string;
  backgroundInfo?: string;
}

interface Props {
  profile: Profile;
  user: { email?: string; name?: string } | null;
  onGoToProfile?: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────

function getSoftDate(dueDate: string): string {
  try {
    const d = new Date(dueDate);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  } catch { return dueDate; }
}

function getDaysUntil(dateStr: string): number {
  const due = new Date(dateStr);
  const now = new Date();
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function statusBadge(status: ReportDeadline['status'], daysUntil: number) {
  if (status === 'submitted') return { label: 'Submitted ✓', cls: 'bg-blue-500 text-white' };
  if (status === 'approved') return { label: 'Approved ✓', cls: 'bg-[#76B900] text-[#111]' };
  if (status === 'drafted') return { label: 'Draft Ready', cls: 'bg-amber-500 text-white' };
  if (status === 'overdue' || daysUntil < 0) return { label: 'OVERDUE', cls: 'bg-red-500 text-white' };
  if (daysUntil <= 7) return { label: `${daysUntil}d — Urgent`, cls: 'bg-red-100 text-red-700 border border-red-300' };
  if (daysUntil <= 30) return { label: `${daysUntil}d left`, cls: 'bg-amber-100 text-amber-700' };
  return { label: `${daysUntil}d left`, cls: 'bg-stone-100 text-stone-600' };
}

// ── Export helpers ───────────────────────────────────────────────────

function mdToHtml(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:13pt;color:#333;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:16px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:15pt;color:#222;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:18pt;color:#111;">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li style="margin:2px 0;">$1</li>')
    .replace(/\[PLACEHOLDER:([^\]]+)\]/g, '<span style="background:#fff0f0;color:#dc2626;padding:0 4px;border-radius:3px">[TO FILL: $1]</span>')
    .replace(/\n\n/g, '</p><p style="margin:6pt 0;">')
    .replace(/\n/g, '<br/>');
}

export function downloadReportPDF(reportText: string, title: string, grantTitle: string, orgName: string) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const margin = 20;
  const pageWidth = 210 - margin * 2;
  let y = margin;

  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(title, pageWidth);
  doc.text(titleLines, margin, y); y += titleLines.length * 8 + 4;

  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text(`Organization: ${orgName}`, margin, y); y += 5;
  doc.text(`Grant: ${grantTitle}`, margin, y); y += 5;
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · CivicPath Post-Award Compliance`, margin, y); y += 8;

  doc.setDrawColor(118, 185, 0); doc.setLineWidth(0.5);
  doc.line(margin, y, 210 - margin, y); y += 6;

  doc.setTextColor(30); doc.setFontSize(10);
  const lines = reportText.split('\n');
  for (const raw of lines) {
    if (y > 270) { doc.addPage(); y = margin; }
    const line = raw.replace(/^#{1,3} /, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\[PLACEHOLDER:[^\]]+\]/g, '[TO FILL]');
    const isHeading = /^#{1,3} /.test(raw);
    if (isHeading) {
      if (y > margin + 8) y += 3;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text(line, margin, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    } else if (line.trim()) {
      const wrapped = doc.splitTextToSize(line, pageWidth);
      wrapped.forEach((l: string) => {
        if (y > 270) { doc.addPage(); y = margin; }
        doc.text(l, margin, y); y += 5;
      });
    } else {
      y += 2;
    }
  }
  doc.save(`${title.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '')}.pdf`);
}

export function downloadReportDOCX(reportText: string, title: string, grantTitle: string, orgName: string) {
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"/><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt;margin:2cm;}h3{font-size:13pt;color:#333;border-bottom:1px solid #ddd;padding-bottom:3pt;}h1{font-size:18pt;}p{line-height:1.5;margin:6pt 0;}li{margin:2pt 0;}</style></head><body><h1>${title}</h1><p><strong>Organization:</strong> ${orgName}</p><p><strong>Grant:</strong> ${grantTitle}</p><p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})} &middot; CivicPath Post-Award Compliance</p><hr/><p>${mdToHtml(reportText)}</p></body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${title.replace(/\s+/g,'-').replace(/[^a-zA-Z0-9-]/g,'')}.doc` });
  a.click(); URL.revokeObjectURL(a.href);
}

// ── Google Calendar helper ──────────────────────────────────────────

function toCalDate(iso: string): string {
  return iso.replace(/-/g, '');
}

function addToCalendar(deadline: ReportDeadline, grantTitle: string) {
  const nextDay = (iso: string) => {
    const d = new Date(iso); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0].replace(/-/g, '');
  };
  // Official deadline event
  const officialUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`[${grantTitle}] ${deadline.title}`)}&dates=${toCalDate(deadline.dueDate)}/${nextDay(deadline.dueDate)}&details=${encodeURIComponent(`CivicPath Compliance: ${deadline.title}\nGrant: ${grantTitle}\nPeriod: ${deadline.period}`)}`;
  window.open(officialUrl, '_blank');
  // Soft deadline event (7 days before)
  setTimeout(() => {
    const softUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`[${grantTitle}] ${deadline.title} — Internal Review`)}&dates=${toCalDate(deadline.softDueDate)}/${nextDay(deadline.softDueDate)}&details=${encodeURIComponent(`Internal review due (7 days before official deadline)\nOfficial deadline: ${deadline.dueDate}\nGrant: ${grantTitle}`)}` ;
    window.open(softUrl, '_blank');
  }, 800);
}

function typeIcon(type: ReportDeadline['type']): string {
  const map: Record<string, string> = {
    financial: '💰', narrative: '📝', progress: '📊',
    interim: '⏱️', final: '🏁', other: '📋',
  };
  return map[type] || '📋';
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AwardedTab({ profile, onGoToProfile }: Props) {
  const [grants, setGrants] = useState<AwardedGrantDoc[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAuditId, setShowAuditId] = useState<string | null>(null);

  // Upload modal
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [uploadFile, setUploadFile] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Report modal
  const [showReport, setShowReport] = useState(false);
  const [reportGrant, setReportGrant] = useState<AwardedGrantDoc | null>(null);
  const [reportDeadline, setReportDeadline] = useState<ReportDeadline | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<ReportDraftDoc | null>(null);
  const [approving, setApproving] = useState(false);

  // Manual deadline add modal
  const [showAddDeadline, setShowAddDeadline] = useState<string | null>(null); // grant id
  const [newDeadline, setNewDeadline] = useState({ title: '', dueDate: '', type: 'other' as ReportDeadline['type'], period: '', notes: '' });
  const [savingDeadline, setSavingDeadline] = useState(false);

  // Submission modal (after Approve)
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitDate, setSubmitDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitMethod, setSubmitMethod] = useState('email');
  const [submitting, setSubmitting] = useState(false);

  // Master calendar filter
  const [calFilter, setCalFilter] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoadingGrants(false); return; }
    loadAwardedGrants(uid)
      .then(data => { setGrants(data); if (data.length > 0) setExpandedId(data[0].id || null); })
      .catch(() => {})
      .finally(() => setLoadingGrants(false));
  }, []);

  // ── File reader ──────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      reader.readAsText(file);
      reader.onload = () => {
        const text = reader.result as string;
        const base64 = btoa(unescape(encodeURIComponent(text)));
        setUploadFile({ base64, mimeType: 'text/plain', name: file.name });
        setUploadText(text.slice(0, 200) + '...');
      };
    } else {
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        setUploadFile({ base64, mimeType: file.type || 'application/pdf', name: file.name });
        setUploadText(`[${file.name} — ${(file.size / 1024).toFixed(0)} KB]`);
      };
    }
  };

  const handleExtract = async () => {
    const content = uploadFile?.base64 || (uploadText.trim() ? btoa(unescape(encodeURIComponent(uploadText))) : '');
    if (!content) return;
    setExtracting(true);
    setExtractError('');
    try {
      const res = await fetch('/api/extract-award-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          mimeType: uploadFile?.mimeType || 'text/plain',
          fileName: uploadFile?.name || 'award-letter.txt',
          orgName: profile.companyName,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const uid = auth.currentUser?.uid;
      const newGrant: Omit<AwardedGrantDoc, 'id' | 'extractedAt'> = {
        uid: uid || '',
        orgName: profile.companyName,
        grantTitle: data.grantTitle || 'Awarded Grant',
        agency: data.agency || '',
        awardAmount: data.awardAmount || '',
        awardDate: data.awardDate || '',
        fundingPeriod: data.fundingPeriod || '',
        programOfficer: data.programOfficer || '',
        specialRequirements: data.specialRequirements || [],
        deadlines: (data.deadlines || []).map((d: any, i: number) => ({
          id: `dl-${Date.now()}-${i}`,
          type: d.type || 'other',
          title: d.title,
          dueDate: d.dueDate,
          softDueDate: d.softDueDate || getSoftDate(d.dueDate),
          period: d.period || '',
          status: 'upcoming' as const,
        })),
        fileName: uploadFile?.name || 'paste',
        status: 'active',
        auditTrail: [{
          event: 'letter_uploaded',
          timestamp: new Date().toISOString(),
          note: `Award letter uploaded: ${uploadFile?.name || 'text paste'}`,
        }],
      };

      let saved: AwardedGrantDoc;
      if (uid) {
        const id = await saveAwardedGrant(uid, newGrant);
        saved = { ...newGrant, id: id || String(Date.now()) };
      } else {
        saved = { ...newGrant, id: String(Date.now()) };
      }

      setGrants(prev => [saved, ...prev]);
      setExpandedId(saved.id || null);
      setShowUpload(false);
      setUploadText('');
      setUploadFile(null);
    } catch (err: any) {
      setExtractError(err.message || 'Extraction failed — please try again.');
    } finally {
      setExtracting(false);
    }
  };

  // ── Report drafting ──────────────────────────────────────────────────────

  const handleDraftReport = async (grant: AwardedGrantDoc, deadline: ReportDeadline) => {
    setReportGrant(grant);
    setReportDeadline(deadline);
    setDraft(null);
    setShowReport(true);
    setDrafting(true);
    try {
      const res = await fetch('/api/draft-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline, grant, profile }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newDraft: ReportDraftDoc = {
        awardedGrantId: grant.id || '',
        deadlineId: deadline.id,
        uid: auth.currentUser?.uid || '',
        reportType: deadline.type,
        reportText: data.reportText,
        hardBlocks: data.hardBlocks || [],
        status: 'draft',
        auditTrail: [{ event: 'generated', timestamp: new Date().toISOString(), note: 'AI-generated' }],
      };

      const uid = auth.currentUser?.uid;
      if (uid) {
        const draftId = await saveReportDraft(uid, newDraft);
        newDraft.id = draftId || undefined;
        // Update deadline status in grant
        const updatedGrant = {
          ...grant,
          deadlines: grant.deadlines.map(d =>
            d.id === deadline.id ? { ...d, status: 'drafted' as const, reportDraftId: draftId || undefined } : d
          ),
          auditTrail: [...grant.auditTrail, {
            event: 'report_drafted',
            timestamp: new Date().toISOString(),
            note: `${deadline.title} draft generated by AI`,
          }],
        };
        await saveAwardedGrant(uid, updatedGrant, grant.id);
        setGrants(prev => prev.map(g => g.id === grant.id ? { ...updatedGrant, id: grant.id } : g));
        setReportGrant({ ...updatedGrant, id: grant.id });
      }
      setDraft(newDraft);
    } catch (err: any) {
      setDraft({
        awardedGrantId: grant.id || '', deadlineId: deadline.id, uid: '',
        reportType: deadline.type,
        reportText: `# ${deadline.title}\n\nCould not generate draft: ${err.message}\n\nPlease try again.`,
        hardBlocks: ['AI drafting service unavailable — try again'],
        status: 'draft', auditTrail: [],
      });
    } finally {
      setDrafting(false);
    }
  };

  const handleApprove = async () => {
    if (!draft || !reportGrant || !reportDeadline) return;
    setApproving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (uid && draft.id) {
        await updateReportDraftStatus(uid, draft.id, 'approved');
        const updatedGrant = {
          ...reportGrant,
          deadlines: reportGrant.deadlines.map(d =>
            d.id === reportDeadline.id ? { ...d, status: 'approved' as const } : d
          ),
          auditTrail: [...reportGrant.auditTrail, {
            event: 'report_approved',
            timestamp: new Date().toISOString(),
            note: `${reportDeadline.title} — approved by user`,
          }],
        };
        await saveAwardedGrant(uid, updatedGrant, reportGrant.id);
        setGrants(prev => prev.map(g => g.id === reportGrant.id ? { ...updatedGrant, id: reportGrant.id } : g));
        setReportGrant({ ...updatedGrant, id: reportGrant.id });
      }
      setShowReport(false);
      setDraft(null);
      setShowSubmitModal(true); // Offer to mark as submitted right after approving
    } finally {
      setApproving(false);
    }
  };

  const handleMarkSubmitted = async () => {
    if (!reportGrant || !reportDeadline) return;
    setSubmitting(true);
    try {
      const uid = auth.currentUser?.uid;
      if (uid) {
        const updatedGrant = {
          ...reportGrant,
          deadlines: reportGrant.deadlines.map(d =>
            d.id === reportDeadline.id ? { ...d, status: 'submitted' as const, submittedAt: submitDate, submissionMethod: submitMethod } : d
          ),
          auditTrail: [...reportGrant.auditTrail, {
            event: 'report_submitted',
            timestamp: new Date().toISOString(),
            note: `${reportDeadline.title} submitted via ${submitMethod} on ${submitDate}`,
          }],
        };
        await saveAwardedGrant(uid, updatedGrant, reportGrant.id);
        setGrants(prev => prev.map(g => g.id === reportGrant.id ? { ...updatedGrant, id: reportGrant.id } : g));
      }
    } finally {
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const handleAddDeadline = async (grantId: string) => {
    if (!newDeadline.title || !newDeadline.dueDate) return;
    setSavingDeadline(true);
    const grant = grants.find(g => g.id === grantId);
    if (!grant) { setSavingDeadline(false); return; }
    const soft = getSoftDate(newDeadline.dueDate);
    const dl: ReportDeadline = {
      id: `dl-manual-${Date.now()}`,
      type: newDeadline.type,
      title: newDeadline.title,
      dueDate: newDeadline.dueDate,
      softDueDate: soft,
      period: newDeadline.period || 'Manual Entry',
      status: 'upcoming',
    };
    const updatedGrant = {
      ...grant,
      deadlines: [...grant.deadlines, dl],
      auditTrail: [...grant.auditTrail, {
        event: 'deadline_added',
        timestamp: new Date().toISOString(),
        note: `Manual deadline added: ${dl.title} (due ${dl.dueDate})`,
      }],
    };
    const uid = auth.currentUser?.uid;
    if (uid) await saveAwardedGrant(uid, updatedGrant, grantId).catch(() => {});
    setGrants(prev => prev.map(g => g.id === grantId ? { ...updatedGrant, id: grantId } : g));
    setNewDeadline({ title: '', dueDate: '', type: 'other', period: '', notes: '' });
    setShowAddDeadline(null);
    setSavingDeadline(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-in fade-in space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#76B900]" /> Post-Award Compliance Manager
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            Upload your Award Letter. The Compliance Agent extracts every deadline, drafts reports, and flags what's missing.
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#76B900] text-[#111111] font-bold rounded-xl hover:bg-[#689900] transition-colors text-sm shrink-0"
        >
          <Upload className="w-4 h-4" /> Upload Award Letter
        </button>
      </div>

      {/* Loading */}
      {loadingGrants && (
        <div className="flex items-center gap-3 py-12 justify-center text-stone-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading your awarded grants...</span>
        </div>
      )}

      {/* ── Master Compliance Calendar (Gap 3) ─────────────────────────── */}
      {grants.length >= 1 && (() => {
        const grantColors = ['#76B900', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];
        const now = new Date();
        const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
        const monthEnd = new Date(now); monthEnd.setDate(monthEnd.getDate() + 30);
        const allDeadlines = grants.flatMap((g, gi) =>
          g.deadlines
            .filter(d => {
              if (d.status === 'submitted') return false;
              const due = new Date(d.dueDate);
              if (calFilter === 'week') return due >= now && due <= weekEnd;
              if (calFilter === 'month') return due >= now && due <= monthEnd;
              return due >= new Date(now.getTime() - 86400000 * 7); // upcoming + 1 week past
            })
            .map(d => ({ ...d, grantTitle: g.grantTitle, grantId: g.id, color: grantColors[gi % grantColors.length], grant: g }))
        ).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        return (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
              <h3 className="font-bold text-stone-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#76B900]" /> Compliance Master Calendar
                <span className="text-xs font-normal text-stone-400">({allDeadlines.length} upcoming across {grants.length} grant{grants.length > 1 ? 's' : ''})</span>
              </h3>
              <div className="flex items-center gap-1">
                {(['all', 'week', 'month'] as const).map(f => (
                  <button key={f} onClick={() => setCalFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      calFilter === f ? 'bg-[#76B900] text-[#111]' : 'text-stone-500 hover:bg-stone-100'
                    }`}>
                    {f === 'all' ? 'All' : f === 'week' ? 'This Week' : '30 Days'}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {allDeadlines.length === 0 && (
                <p className="text-sm text-stone-400 text-center py-8">No upcoming deadlines in this range.</p>
              )}
              {allDeadlines.map((d, i) => {
                const days = getDaysUntil(d.dueDate);
                const badge = statusBadge(d.status, days);
                return (
                  <div key={`${d.grantId}-${d.id}-${i}`} className={`flex items-center gap-3 px-5 py-3 hover:bg-stone-50 ${
                    days < 0 && d.status === 'upcoming' ? 'bg-red-50' : days <= 7 && d.status === 'upcoming' ? 'bg-amber-50' : ''
                  }`}>
                    <div className="w-1 h-10 rounded-full shrink-0" style={{ background: d.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-stone-900 text-sm truncate">{d.title}</div>
                      <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold truncate" style={{ color: d.color }}>{d.grantTitle}</span>
                        <span>·</span><span>{d.period}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-stone-500">{d.dueDate}</span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                      {d.status === 'upcoming' && (
                        <button onClick={() => addToCalendar(d, d.grantTitle)} title="Add both dates to Google Calendar"
                          className="p-1.5 text-stone-400 hover:text-[#76B900] hover:bg-[#76B900]/10 rounded-lg transition-colors">
                          <CalendarPlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(d.status === 'upcoming' || d.status === 'drafted') && (
                        <button onClick={() => handleDraftReport(d.grant, d)}
                          className="text-xs font-bold px-2.5 py-1 bg-stone-900 text-white rounded-lg hover:bg-stone-700">
                          Draft
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Empty state */}
      {!loadingGrants && grants.length === 0 && (
        <div
          onClick={() => setShowUpload(true)}
          className="border-2 border-dashed border-stone-200 rounded-2xl p-16 text-center cursor-pointer hover:border-[#76B900]/40 hover:bg-[#76B900]/5 transition-all group"
        >
          <Trophy className="w-12 h-12 text-stone-300 group-hover:text-[#76B900] mx-auto mb-4 transition-colors" />
          <h3 className="font-bold text-stone-700 mb-2">Won a grant? Upload the Award Letter.</h3>
          <p className="text-sm text-stone-400 max-w-sm mx-auto mb-4">
            The Compliance Agent will extract every reporting deadline, build your calendar, and draft reports when due.
          </p>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#76B900]">
            <Upload className="w-4 h-4" /> Upload Award Letter
          </span>
        </div>
      )}

      {/* Grant cards */}
      {grants.map(grant => {
        const isExpanded = expandedId === grant.id;
        const overdue = grant.deadlines.filter(d => getDaysUntil(d.dueDate) < 0 && d.status === 'upcoming').length;
        const urgent = grant.deadlines.filter(d => { const days = getDaysUntil(d.dueDate); return days >= 0 && days <= 7 && d.status === 'upcoming'; }).length;

        return (
          <div key={grant.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${overdue > 0 ? 'border-red-200' : urgent > 0 ? 'border-amber-200' : 'border-stone-200'}`}>
            {/* Grant header */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : (grant.id || null))}
              className="w-full flex items-center justify-between p-5 text-left hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${grant.status === 'active' ? 'bg-[#76B900]/10' : 'bg-stone-100'}`}>
                  🏆
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-900">{grant.grantTitle}</span>
                    <span className="text-xs font-black bg-[#76B900] text-[#111] px-2 py-0.5 rounded uppercase">{grant.awardAmount}</span>
                    {overdue > 0 && <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded">⚠️ {overdue} overdue</span>}
                    {urgent > 0 && !overdue && <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">🔔 {urgent} urgent</span>}
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{grant.agency} · {grant.fundingPeriod}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-stone-400">{grant.deadlines.length} deadlines</span>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-stone-400" /> : <ChevronRight className="w-4 h-4 text-stone-400" />}
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-stone-100 px-5 pb-5">

                {/* Grant metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
                  {[
                    { l: 'Agency', v: grant.agency },
                    { l: 'Award Date', v: grant.awardDate },
                    { l: 'Program Officer', v: grant.programOfficer || 'Not listed' },
                    { l: 'File', v: grant.fileName },
                  ].map((item, i) => (
                    <div key={i} className="bg-stone-50 rounded-xl p-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">{item.l}</div>
                      <div className="text-xs font-medium text-stone-700 truncate">{item.v}</div>
                    </div>
                  ))}
                </div>

                {/* Special requirements */}
                {grant.specialRequirements && grant.specialRequirements.length > 0 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-xs font-bold text-amber-800 mb-1">⚠️ Special Requirements from Award Letter</p>
                    <ul className="space-y-0.5">
                      {grant.specialRequirements.map((r, i) => (
                        <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                          <span className="shrink-0 mt-0.5">•</span>{r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Compliance calendar */}
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Compliance Calendar
                  </h4>
                  <button onClick={() => setShowAddDeadline(grant.id || null)}
                    className="flex items-center gap-1 text-xs font-bold text-[#76B900] hover:bg-[#76B900]/10 px-2.5 py-1 rounded-lg transition-colors">
                    <Plus className="w-3 h-3" /> Add Deadline
                  </button>
                </div>
                <div className="space-y-2">
                  {grant.deadlines.length === 0 && (
                    <p className="text-sm text-stone-400 text-center py-4">No deadlines extracted. Re-upload the letter.</p>
                  )}
                  {[...grant.deadlines].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(deadline => {
                    const days = getDaysUntil(deadline.dueDate);
                    const badge = statusBadge(deadline.status, days);
                    return (
                      <div key={deadline.id} className={`flex items-center justify-between p-3 rounded-xl border gap-3 ${
                        days < 0 && deadline.status === 'upcoming' ? 'bg-red-50 border-red-200' :
                        days <= 7 && deadline.status === 'upcoming' ? 'bg-amber-50 border-amber-200' :
                        deadline.status === 'approved' ? 'bg-[#76B900]/5 border-[#76B900]/20' :
                        'bg-stone-50 border-stone-200'
                      }`}>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-lg shrink-0">{typeIcon(deadline.type)}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-stone-900 text-sm truncate">{deadline.title}</div>
                            <div className="text-xs text-stone-500 mt-0.5">
                              {deadline.period && <span className="mr-2">{deadline.period}</span>}
                              Due: <strong>{deadline.dueDate}</strong>
                              {deadline.status === 'upcoming' && <span className="ml-2 text-stone-400">· Internal review by {deadline.softDueDate}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
                          {deadline.status === 'upcoming' && (
                            <button onClick={() => addToCalendar(deadline, grant.grantTitle)}
                              title="Add both deadline + review date to Google Calendar"
                              className="p-1.5 text-stone-400 hover:text-[#76B900] hover:bg-[#76B900]/10 rounded-lg transition-colors">
                              <CalendarPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(deadline.status === 'upcoming' || deadline.status === 'drafted') && (
                            <button
                              onClick={() => handleDraftReport(grant, deadline)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-700 transition-colors"
                            >
                              {deadline.status === 'drafted' ? <><RotateCcw className="w-3 h-3" /> Re-draft</> : <><FileText className="w-3 h-3" /> Draft Report</>}
                            </button>
                          )}
                          {deadline.status === 'approved' && (
                            <>
                              <button onClick={() => { setReportGrant(grant); setReportDeadline(deadline); setShowSubmitModal(true); }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600">
                                <Send className="w-3 h-3" /> Submit
                              </button>
                              <button onClick={() => handleDraftReport(grant, deadline)}
                                className="flex items-center gap-1 px-2.5 py-1.5 border border-stone-200 text-stone-500 text-xs font-bold rounded-lg hover:bg-stone-50">
                                <Eye className="w-3 h-3" /> View
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Audit trail toggle */}
                <button
                  onClick={() => setShowAuditId(showAuditId === grant.id ? null : (grant.id || null))}
                  className="mt-4 flex items-center gap-1.5 text-xs font-bold text-stone-400 hover:text-stone-700 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {showAuditId === grant.id ? 'Hide' : 'View'} Sovereign Audit Trail ({grant.auditTrail.length} events)
                </button>
                {showAuditId === grant.id && (
                  <div className="mt-2 bg-stone-950 rounded-xl p-4 font-mono text-xs space-y-1.5 max-h-40 overflow-y-auto">
                    {grant.auditTrail.map((entry, i) => (
                      <div key={i} className="flex gap-3 text-stone-400">
                        <span className="text-stone-600 shrink-0">{entry.timestamp.slice(0, 19).replace('T', ' ')}</span>
                        <span className="text-[#76B900]">[{entry.event}]</span>
                        <span>{entry.note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Upload Modal ────────────────────────────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-stone-900">Upload Award Letter</h3>
                <p className="text-xs text-stone-500 mt-0.5">PDF, DOCX, TXT, or paste the text directly</p>
              </div>
              <button onClick={() => { setShowUpload(false); setUploadText(''); setUploadFile(null); setExtractError(''); }} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* File drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#76B900]/40 hover:bg-[#76B900]/5 transition-all"
              >
                <Upload className="w-6 h-6 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-stone-600">
                  {uploadFile ? <span className="text-[#76B900]">✓ {uploadFile.name}</span> : 'Click to upload PDF, DOCX, or TXT'}
                </p>
                <p className="text-xs text-stone-400 mt-1">Max 4MB</p>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={handleFileChange} />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-xs text-stone-400 font-medium">or paste text</span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              <textarea
                value={uploadText}
                onChange={e => { setUploadText(e.target.value); setUploadFile(null); }}
                rows={6}
                placeholder="Paste the full text of your award letter here..."
                className="w-full px-4 py-3 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-sm text-stone-700 placeholder:text-stone-400 resize-none font-mono"
              />

              {extractError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />{extractError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleExtract}
                  disabled={extracting || (!uploadFile && !uploadText.trim())}
                  className="flex-1 py-3 bg-[#76B900] text-[#111111] font-bold rounded-xl hover:bg-[#689900] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {extracting ? <><Loader2 className="w-4 h-4 animate-spin" />Extracting with Gemini...</> : '🔍 Extract Deadlines & Compliance Requirements'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Report Modal ────────────────────────────────────────────────────── */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-stone-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
              <div>
                <h3 className="font-bold text-stone-900">{reportDeadline?.title}</h3>
                <p className="text-xs text-stone-500 mt-0.5">{reportGrant?.grantTitle} · Due: {reportDeadline?.dueDate}</p>
              </div>
              <button onClick={() => { setShowReport(false); setDraft(null); }} className="p-2 hover:bg-stone-200 rounded-full">
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {drafting && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 text-[#76B900] animate-spin" />
                  <p className="text-stone-600 font-medium">Drafting your {reportDeadline?.type} report...</p>
                  <p className="text-xs text-stone-400">Gemini is writing a professional compliance report using your profile data.</p>
                </div>
              )}

              {!drafting && draft && (
                <>
                  {/* Hard Blocks with Fix Now links (Gap 4) */}
                  {draft.hardBlocks.length > 0 && (() => {
                    const fixMap: Record<string, string> = {
                      'EIN': 'EIN',
                      'Tax ID': 'EIN',
                      'mission': 'missionStatement',
                      'impact metrics': 'impactMetrics',
                      'background': 'backgroundInfo',
                      'budget': 'annualBudget',
                      'team': 'teamSize',
                    };
                    const getAnchor = (block: string) => {
                      for (const [key, anchor] of Object.entries(fixMap)) {
                        if (block.toLowerCase().includes(key.toLowerCase())) return anchor;
                      }
                      return null;
                    };
                    return (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          <span className="font-bold text-red-800 text-sm">⛔ Hard Blocks — Resolve before approving</span>
                        </div>
                        <ul className="space-y-1.5">
                          {draft.hardBlocks.map((block, i) => {
                            getAnchor(block);
                            return (
                              <li key={i} className="flex items-start justify-between gap-2 text-sm text-red-700">
                                <div className="flex items-start gap-2">
                                  <span className="shrink-0 mt-0.5 font-bold">{i + 1}.</span>
                                  <span>{block}</span>
                                </div>
                                {onGoToProfile && (
                                  <button onClick={onGoToProfile}
                                    className="shrink-0 text-[10px] font-black text-white bg-red-500 hover:bg-red-600 px-2 py-0.5 rounded-full transition-colors whitespace-nowrap">
                                    Fix Now →
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                        <p className="text-xs text-red-500 mt-3">Click “Fix Now” to jump to your Profile and fill in the missing data, then re-draft.</p>
                      </div>
                    );
                  })()}

                  {/* Report text */}
                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-5">
                    <div className="prose prose-sm prose-stone max-w-none prose-headings:font-bold prose-headings:text-stone-900 prose-p:text-stone-700 prose-li:text-stone-700">
                      <ReactMarkdown>{draft.reportText}</ReactMarkdown>
                    </div>
                  </div>

                  {/* Audit trail note */}
                  <div className="flex items-center gap-2 text-xs text-stone-400 bg-stone-50 rounded-xl px-4 py-2">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Generated {new Date().toLocaleString()} · Sovereign Audit Trail active · Human approval required before submission
                  </div>
                </>
              )}
            </div>

            {!drafting && draft && (
              <div className="px-6 py-4 border-t border-stone-100 shrink-0 space-y-2">
                {/* Export row (Gap 1) */}
                <div className="flex gap-2">
                  <button onClick={() => reportGrant && reportDeadline && downloadReportPDF(draft.reportText, reportDeadline.title, reportGrant.grantTitle, profile.companyName)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 text-xs">
                    <Download className="w-3.5 h-3.5" /> PDF
                  </button>
                  <button onClick={() => reportGrant && reportDeadline && downloadReportDOCX(draft.reportText, reportDeadline.title, reportGrant.grantTitle, profile.companyName)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 text-xs">
                    <Download className="w-3.5 h-3.5" /> DOCX
                  </button>
                  <div className="flex-1" />
                  <button onClick={() => reportGrant && reportDeadline && handleDraftReport(reportGrant, reportDeadline)}
                    className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 font-bold rounded-xl hover:bg-stone-50 text-xs">
                    <RotateCcw className="w-3.5 h-3.5" /> Re-draft
                  </button>
                </div>
                {/* Approve row */}
                <button onClick={handleApprove} disabled={approving}
                  className="w-full py-2.5 bg-[#76B900] text-[#111111] font-bold rounded-xl hover:bg-[#689900] transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {approving ? <><Loader2 className="w-4 h-4 animate-spin" />Approving...</> : <><CheckCircle2 className="w-4 h-4" /> Approve Report — Mark as Reviewed</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Mark as Submitted Modal (Gap 5) ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-stone-200 p-6">
            <h3 className="font-bold text-stone-900 mb-1 flex items-center gap-2">
              <Send className="w-4 h-4 text-blue-500" /> Mark as Submitted to Funder
            </h3>
            <p className="text-xs text-stone-500 mb-5">
              {reportDeadline?.title} — {reportGrant?.grantTitle}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Submission Date *</label>
                <input type="date" value={submitDate} onChange={e => setSubmitDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-blue-300 outline-none text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Submission Method</label>
                <select value={submitMethod} onChange={e => setSubmitMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-blue-300 outline-none text-sm">
                  <option value="email">Email to Program Officer</option>
                  <option value="portal">Grant Portal Submission</option>
                  <option value="mail">Physical Mail</option>
                  <option value="online">Online System (e.g. Fluxx, Submittable)</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 border border-stone-200 text-stone-500 font-bold rounded-xl hover:bg-stone-50 text-sm">Not yet</button>
              <button onClick={handleMarkSubmitted} disabled={submitting}
                className="flex-1 py-2.5 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Mark Submitted
              </button>
            </div>
            <p className="text-[10px] text-stone-400 text-center mt-3">This will be recorded in the Sovereign Audit Trail with timestamp.</p>
          </div>
        </div>
      )}

      {/* ── Add Deadline Modal (Gap 2) ── */}
      {showAddDeadline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-bold text-stone-900">Add Compliance Deadline</h3>
              <button onClick={() => setShowAddDeadline(null)} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Deadline Name *</label>
                <input type="text" placeholder="e.g. Q3 Progress Report, Site Visit"
                  value={newDeadline.title} onChange={e => setNewDeadline(p => ({...p, title: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">Official Due Date *</label>
                  <input type="date" value={newDeadline.dueDate} onChange={e => setNewDeadline(p => ({...p, dueDate: e.target.value}))}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-stone-600 block mb-1">Type</label>
                  <select value={newDeadline.type} onChange={e => setNewDeadline(p => ({...p, type: e.target.value as ReportDeadline['type']}))}
                    className="w-full px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-sm">
                    <option value="progress">Progress Report</option>
                    <option value="financial">Financial Report</option>
                    <option value="narrative">Narrative Report</option>
                    <option value="interim">Interim Report</option>
                    <option value="final">Final Report</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-stone-600 block mb-1">Reporting Period (optional)</label>
                <input type="text" placeholder="e.g. Q3 2026, Year 2, Mid-Project"
                  value={newDeadline.period} onChange={e => setNewDeadline(p => ({...p, period: e.target.value}))}
                  className="w-full px-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#76B900]/40 focus:border-[#76B900] outline-none text-sm" />
              </div>
              <p className="text-xs text-stone-400">Internal review reminder will be set to 7 days before the official due date automatically.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowAddDeadline(null)}
                  className="flex-1 py-3 border border-stone-200 text-stone-500 font-bold rounded-xl hover:bg-stone-50 text-sm">Cancel</button>
                <button onClick={() => handleAddDeadline(showAddDeadline)}
                  disabled={savingDeadline || !newDeadline.title || !newDeadline.dueDate}
                  className="flex-1 py-3 bg-[#76B900] text-[#111] font-bold rounded-xl hover:bg-[#689900] disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                  {savingDeadline ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add to Compliance Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
