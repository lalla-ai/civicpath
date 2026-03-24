/**
 * funderGrants.ts — CivicPath Funder-to-Seeker Pipeline
 *
 * Manages the 'funder_grants' Firestore collection.
 * Funders ($199/mo) post grants here → Seekers' Hunter agent queries
 * this collection FIRST before hitting Grants.gov.
 *
 * Revenue model: Funders pay $199/mo for direct access to the seeker pipeline.
 * Each funder_grant becomes a "Direct Funder Connection" for matched seekers.
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

// ── Schema ─────────────────────────────────────────────────────────────────
export interface FunderGrantDoc {
  id?: string;              // Firestore doc ID
  title: string;            // Grant name
  agency: string;           // Funder organization name
  amount: string;           // e.g. "up to $50,000"
  description: string;      // Grant purpose
  deadline: string;         // ISO date string or "Rolling"
  location: string;         // Geographic scope
  focusAreas: string[];     // e.g. ['Technology', 'Education']
  funderEmail: string;      // Contact email
  funderUid: string;        // Firebase UID of funder
  postedAt: Timestamp | null;
  active: boolean;
  url: string;              // Application URL (mailto: or form URL)
  source: 'CivicPath Funder';
}

const COLLECTION = 'funder_grants';

// ── Read all active funder grants ──────────────────────────────────────────
export async function getFunderGrants(): Promise<FunderGrantDoc[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('active', '==', true),
      orderBy('postedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as FunderGrantDoc));
  } catch (err) {
    // Firestore may be unreachable or rules may deny unauthenticated reads — fail silently
    console.warn('[CivicPath] funder_grants query failed:', err);
    return [];
  }
}

// ── Write a new funder grant ───────────────────────────────────────────────
export async function postFunderGrant(grant: Omit<FunderGrantDoc, 'id' | 'postedAt' | 'source'>): Promise<string | null> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...grant,
      source: 'CivicPath Funder' as const,
      active: true,
      postedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('[CivicPath] Failed to post funder grant:', err);
    return null;
  }
}

// ── Map FunderGrantDoc to the standard grant shape used by the Hunter ──────
export interface NormalizedGrant {
  id: string;
  title: string;
  agency: string;
  amount: string;
  openDate: string;
  closeDate: string;
  url: string;
  source: 'CivicPath Funder';
  description?: string;
  location?: string;
  focusAreas?: string[];
  funderEmail?: string;
  isDirect: true;   // flag for "Direct Funder Connection" highlighting
}

export function normalizeFunderGrant(doc: FunderGrantDoc): NormalizedGrant {
  return {
    id: doc.id || `funder-${Date.now()}`,
    title: doc.title,
    agency: doc.agency,
    amount: doc.amount,
    openDate: new Date().toLocaleDateString(),
    closeDate: doc.deadline || 'Rolling',
    url: doc.url || `mailto:${doc.funderEmail}`,
    source: 'CivicPath Funder',
    description: doc.description,
    location: doc.location,
    focusAreas: doc.focusAreas,
    funderEmail: doc.funderEmail,
    isDirect: true,
  };
}
