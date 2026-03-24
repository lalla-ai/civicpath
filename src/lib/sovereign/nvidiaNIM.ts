/**
 * nvidiaNIM.ts — NVIDIA NIM Neural Inference Microservice Slot
 *
 * Patent Reference: FIG.1 [108] Neural Inference Microservice
 *                   "GPU-Accelerated · Inside TEE"
 *
 * Activation Slot Architecture:
 *   TODAY  → Routes through Gemini 2.0 Flash (simulation)
 *   TOMORROW → Set NVIDIA_API_KEY env var → instantly activates GPU inference
 *
 * The API key MUST remain server-side only. This module provides the
 * client-facing interface; actual NIM calls execute in /api/gemini-proxy
 * which checks for NVIDIA_API_KEY at runtime.
 *
 * Supported NIM Models (activate with NVIDIA_NIM_MODEL env var):
 *   - meta/llama-3.1-70b-instruct    (default — best for grant writing)
 *   - meta/llama-3.1-8b-instruct     (faster, lighter)
 *   - mistralai/mixtral-8x22b-instruct (extended context)
 *   - nvidia/nemotron-4-340b-instruct (NVIDIA flagship)
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface NIMConfig {
  baseUrl: 'https://integrate.api.nvidia.com/v1';
  defaultModel: string;
  /** true when NVIDIA_API_KEY is present in the server environment */
  isActive: boolean;
}

export interface NIMInferenceRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  useSearch?: boolean;
}

export interface NIMInferenceResponse {
  text: string;
  model: string;
  /** 'nvidia-nim' = real GPU inference inside TEE-bound NIM microservice */
  provider: 'nvidia-nim' | 'gemini-fallback';
  /** true when running through real NVIDIA NIM */
  enclave: boolean;
  latencyMs?: number;
}

// ── Client config (read-only; key lives server-side only) ─────────────────────

export const NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';
export const NIM_DEFAULT_MODEL = 'meta/llama-3.1-70b-instruct';

// ── Inference ─────────────────────────────────────────────────────────────────

/**
 * Execute inference through the NIM slot.
 * Automatically uses NVIDIA NIM when NVIDIA_API_KEY is configured server-side.
 * Falls back to Gemini 2.0 Flash transparently when key is absent.
 *
 * FIG.2 Step [206]: "Execute NIM Inference — GPU Microservice · Inside TEE"
 */
export async function nimInference(request: NIMInferenceRequest): Promise<NIMInferenceResponse> {
  const start = Date.now();

  const res = await fetch('/api/gemini-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: request.prompt,
      systemContext: request.systemPrompt,
      useSearch: request.useSearch ?? false,
      useNIM: true,            // signal: use NIM if NVIDIA_API_KEY is set
      nimModel: request.model, // optional model override
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`[NIM] Inference error: ${data.error}`);

  return {
    text: data.text || '',
    model: data.nimModel || NIM_DEFAULT_MODEL,
    provider: (data.provider as NIMInferenceResponse['provider']) || 'gemini-fallback',
    enclave: data.provider === 'nvidia-nim',
    latencyMs: Date.now() - start,
  };
}

// ── Status check ──────────────────────────────────────────────────────────────

/** Returns whether NIM is active (NVIDIA_API_KEY is configured server-side). */
export async function checkNIMStatus(): Promise<{ active: boolean; model: string; provider: string }> {
  try {
    const res = await fetch('/api/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'ping', useNIM: true }),
    });
    const data = await res.json();
    return {
      active: data.provider === 'nvidia-nim',
      model: data.nimModel || NIM_DEFAULT_MODEL,
      provider: data.provider || 'gemini-fallback',
    };
  } catch {
    return { active: false, model: NIM_DEFAULT_MODEL, provider: 'gemini-fallback' };
  }
}
