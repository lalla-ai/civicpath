/**
 * db.ts — CivicPath Firestore Source of Truth
 *
 * Every logged-in user's data is persisted here.
 * localStorage is kept as an offline/unauthenticated fallback.
 *
 * Schema:
 *   users/{uid}             — profile + trackerGrants (merged doc)
 *   users/{uid}/proposals/  — individual drafted proposals (sub-collection)
 */

import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── User data (profile + tracker) ─────────────────────────────────────────

export interface UserData {
  profile?: Record<string, any>;
  trackerGrants?: any[];
  role?: string;
  plan?: string;
  planActivatedAt?: string | null;
  updatedAt?: any;
}

/** Upsert profile and/or tracker grants for a user. Uses merge so partial updates are safe. */
export async function saveUserData(uid: string, data: Partial<UserData>): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { ...data, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Load all persisted data for a user. Returns null if no record exists yet. */
export async function loadUserData(uid: string): Promise<UserData | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as UserData) : null;
  } catch (err) {
    console.warn('[CivicPath] loadUserData failed:', err);
    return null;
  }
}

// ── Proposals ─────────────────────────────────────────────────────────────

export interface ProposalDoc {
  id?: string;
  text: string;
  grantTitle: string;
  orgName?: string;
  grantAgency?: string;
  grantAmount?: string;
  createdAt?: any;
}

/** Save a drafted proposal to the user's proposals sub-collection. */
export async function saveProposal(uid: string, proposal: Omit<ProposalDoc, 'id' | 'createdAt'>): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, 'users', uid, 'proposals'), {
      ...proposal,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.warn('[CivicPath] saveProposal failed:', err);
    return null;
  }
}

/** Load all proposals for a user, newest first. */
export async function loadProposals(uid: string): Promise<ProposalDoc[]> {
  try {
    const q = query(collection(db, 'users', uid, 'proposals'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProposalDoc));
  } catch (err) {
    console.warn('[CivicPath] loadProposals failed:', err);
    return [];
  }
}

// ── Grant Applications (seeker → funder pipeline) ──────────────────────

export interface GrantApplicationDoc {
  id?: string;
  seekerUid: string;
  seekerEmail: string;
  orgName: string;
  orgType?: string;
  location: string;
  mission: string;
  focusArea?: string;
  grantTitle: string;
  grantAgency: string;
  grantAmount?: string;
  grantDeadline?: string;
  proposalText: string;
  status: 'pending' | 'in-review' | 'approved' | 'rejected';
  score?: number;
  funderUid?: string;
  funderEmail?: string;
  submittedAt?: any;
  updatedAt?: any;
}

/** Save a seeker’s submitted application to the shared grant_applications collection. */
export async function saveApplication(
  app: Omit<GrantApplicationDoc, 'id' | 'submittedAt' | 'updatedAt'>
): Promise<string | null> {
  try {
    const ref = await addDoc(collection(db, 'grant_applications'), {
      ...app,
      submittedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.warn('[CivicPath] saveApplication failed:', err);
    return null;
  }
}

/** Load all applications, newest first. Funders call this to see their inbox. */
export async function loadApplications(maxResults = 100): Promise<GrantApplicationDoc[]> {
  try {
    const q = query(
      collection(db, 'grant_applications'),
      orderBy('submittedAt', 'desc'),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as GrantApplicationDoc));
  } catch (err) {
    console.warn('[CivicPath] loadApplications failed:', err);
    return [];
  }
}

// ── Post-Award Compliance ─────────────────────────────────────────────

export interface AuditEntry {
  event: string;
  timestamp: string;
  note?: string;
}

export interface ReportDeadline {
  id: string;
  type: 'interim' | 'progress' | 'financial' | 'narrative' | 'final' | 'other';
  title: string;
  dueDate: string;       // ISO date string
  softDueDate: string;   // 7 days before dueDate
  period: string;        // e.g. 'Q1 2026', 'Year 1'
  status: 'upcoming' | 'drafted' | 'approved' | 'submitted' | 'overdue';
  reportDraftId?: string;
  submittedAt?: string;         // ISO date when marked submitted
  submissionMethod?: string;    // 'email' | 'portal' | 'mail' | 'other'
}

export interface AwardedGrantDoc {
  id?: string;
  uid: string;
  orgName: string;
  grantTitle: string;
  agency: string;
  awardAmount: string;
  awardDate: string;
  fundingPeriod: string;
  programOfficer?: string;
  specialRequirements?: string[];
  deadlines: ReportDeadline[];
  fileName: string;
  status: 'active' | 'completed' | 'at-risk';
  auditTrail: AuditEntry[];
  extractedAt?: any;
}

export interface ReportDraftDoc {
  id?: string;
  awardedGrantId: string;
  deadlineId: string;
  uid: string;
  reportType: string;
  reportText: string;
  hardBlocks: string[];
  status: 'draft' | 'approved' | 'submitted';
  auditTrail: AuditEntry[];
  generatedAt?: any;
  approvedAt?: any;
}

/** Save (upsert) an awarded grant. Pass existingId to update. */
export async function saveAwardedGrant(
  uid: string,
  grant: Omit<AwardedGrantDoc, 'id' | 'extractedAt'>,
  existingId?: string
): Promise<string | null> {
  try {
    if (existingId) {
      await setDoc(
        doc(db, 'users', uid, 'awarded_grants', existingId),
        { ...grant, extractedAt: serverTimestamp() },
        { merge: true }
      );
      return existingId;
    } else {
      const ref = await addDoc(
        collection(db, 'users', uid, 'awarded_grants'),
        { ...grant, extractedAt: serverTimestamp() }
      );
      return ref.id;
    }
  } catch (err) {
    console.warn('[CivicPath] saveAwardedGrant failed:', err);
    return null;
  }
}

/** Load all awarded grants for a user, newest first. */
export async function loadAwardedGrants(uid: string): Promise<AwardedGrantDoc[]> {
  try {
    const q = query(
      collection(db, 'users', uid, 'awarded_grants'),
      orderBy('extractedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AwardedGrantDoc));
  } catch (err) {
    console.warn('[CivicPath] loadAwardedGrants failed:', err);
    return [];
  }
}

/** Save a report draft for a user. */
export async function saveReportDraft(
  uid: string,
  draft: Omit<ReportDraftDoc, 'id' | 'generatedAt'>
): Promise<string | null> {
  try {
    const ref = await addDoc(
      collection(db, 'users', uid, 'report_drafts'),
      { ...draft, generatedAt: serverTimestamp() }
    );
    return ref.id;
  } catch (err) {
    console.warn('[CivicPath] saveReportDraft failed:', err);
    return null;
  }
}

/** Update the status of a report draft (approved / submitted). */
export async function updateReportDraftStatus(
  uid: string,
  draftId: string,
  status: ReportDraftDoc['status']
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', uid, 'report_drafts', draftId),
      { status, approvedAt: status === 'approved' ? serverTimestamp() : null },
      { merge: true }
    );
  } catch (err) {
    console.warn('[CivicPath] updateReportDraftStatus failed:', err);
  }
}

/** Update the status of an application (funder approve / reject). */
export async function updateApplicationStatus(
  id: string,
  status: GrantApplicationDoc['status']
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'grant_applications', id),
      { status, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    console.warn('[CivicPath] updateApplicationStatus failed:', err);
  }
}
