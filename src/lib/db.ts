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
