/**
 * mylallaClient.ts — MyLalla API Smart Client
 *
 * Routes intelligently between:
 *   1. GKE FastAPI backend (api.mylalla.ai) — when VITE_MYLALLA_API_URL is set
 *   2. Vercel serverless (sovereign.ts mylalla-research) — always available fallback
 *
 * The frontend never needs to know which backend is active.
 */

const GKE_API = import.meta.env.VITE_MYLALLA_API_URL || null;

export interface MyLallaRequest {
  query: string;
  sessionId?: string | null;
  orgProfile?: Record<string, any> | null;
  mode?: 'auto' | 'research' | 'fast' | 'document';
  documentText?: string;
}

export interface MyLallaResponse {
  response: string;
  sources: Source[];
  followUps: string[];
  modelTier: string;
  sessionId: string;
  queryType: string;
  latencyMs?: number;
  backend: 'gke' | 'vercel';
}

export interface Source {
  title: string;
  agency: string;
  deadline: string;
  url: string;
  source?: string;
}

/**
 * Main query function — routes to GKE FastAPI or Vercel serverless.
 * Automatically falls back to Vercel if GKE is unreachable.
 */
export async function myLallaQuery(req: MyLallaRequest): Promise<MyLallaResponse> {
  // Try GKE FastAPI first if configured
  if (GKE_API) {
    try {
      const res = await fetch(`${GKE_API}/v1/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: req.query,
          session_id: req.sessionId,
          org_profile: req.orgProfile,
          mode: req.mode || 'auto',
          document_text: req.documentText,
        }),
        signal: AbortSignal.timeout(40_000),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          response: data.response,
          sources: data.sources || [],
          followUps: data.follow_ups || [],
          modelTier: data.model_tier,
          sessionId: data.session_id,
          queryType: data.query_type,
          latencyMs: data.latency_ms,
          backend: 'gke',
        };
      }
    } catch {
      // GKE unreachable — fall through to Vercel
      console.warn('[MyLalla] GKE backend unreachable, using Vercel fallback');
    }
  }

  // Vercel serverless fallback (always works)
  const res = await fetch('/api/sovereign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'mylalla-research',
      query: req.query,
      sessionId: req.sessionId,
      orgProfile: req.orgProfile,
      documentText: req.documentText,
    }),
  });

  const data = await res.json();
  return {
    response: data.response || data.error || 'Unable to generate response.',
    sources: data.sources || [],
    followUps: data.followUps || [],
    modelTier: data.modelTier || 'Gemini 2.0 Flash',
    sessionId: data.sessionId || `session-${Date.now()}`,
    queryType: data.queryType || 'general',
    backend: 'vercel',
  };
}

/**
 * Document analysis — sends full document text for Nemotron analysis.
 * Uses Gemini 1.5 Pro's 1M token context when available.
 */
export async function analyzeDocument(
  documentText: string,
  question: string,
  orgProfile?: Record<string, any> | null
): Promise<MyLallaResponse> {
  return myLallaQuery({
    query: question,
    documentText,
    orgProfile,
    mode: 'document',
  });
}

/**
 * Read CivicPath profile from localStorage for auto-injection.
 */
export function getCivicPathProfile(): Record<string, any> | null {
  try {
    const raw = localStorage.getItem('civicpath_profile');
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!p.companyName) return null;
    return {
      name: p.companyName,
      type: p.orgType,
      focus_area: p.focusArea,
      location: p.location,
      mission: p.missionStatement || p.backgroundInfo,
      annual_budget: p.annualBudget,
      team_size: p.teamSize,
      ein: p.ein,
      target_population: p.targetPopulation,
    };
  } catch {
    return null;
  }
}
