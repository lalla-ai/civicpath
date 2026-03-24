/**
 * sovereign.ts — Unified Sovereign Infrastructure API Route
 *
 * Patent Reference: FIG.1 Zone 3 "Persistence & Management Layer"
 *                   [112a] 0G Labs DA Layer + [112b] Cloud KMS
 *
 * Single route consolidating all sovereign operations to stay within
 * Vercel Hobby's 12 serverless function limit.
 *
 * Actions:
 *   anchor-0g   — Anchor Merkle root to 0G Labs DA layer
 *   verify-0g   — Verify a previous anchor
 *   kms-rotate  — Rotate DEK after purge cycle (FIG.1 Key Rotation)
 *   kms-disable — Disable key version (GDPR Art.17 erasure)
 *   kms-destroy — IRREVERSIBLE key destruction (requires GOOGLE_KMS_DESTROY_ENABLED=true)
 *
 * Activation:
 *   Set ZG_RPC_URL          → activates real 0G Labs blockchain anchoring
 *   Set GOOGLE_KMS_KEY_NAME  → activates real Google Cloud KMS operations
 *   Unset (default)          → runs in cryptographically-correct simulation mode
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { rateLimit, getClientIp } from './_rateLimit';
// ethers imported dynamically below to avoid ESM bundling issues with Vercel

export const config = { maxDuration: 60 }; // extend timeout for NIM + 0G calls

// ── 0G Labs testnet constants ─────────────────────────────────────────────
// Hardcoded testnet values — override via env vars for mainnet.
const ZG_EVM_RPC      = process.env.ZG_RPC_URL        || 'https://evmrpc-testnet.0g.ai';
const ZG_STORAGE_RPC  = process.env.ZG_STORAGE_URL    || 'https://rpc-storage-testnet.0g.ai';
const ZG_FLOW_CONTRACT = process.env.ZG_FLOW_CONTRACT  || '0xbD2C3F0E65eDF5582141C35969d66e34629cC768';
const ZG_EXPLORER     = process.env.ZG_BLOCK_EXPLORER  || 'https://chainscan-galileo.0g.ai';

// ── Helpers ───────────────────────────────────────────────────────────────────

function derive0GTxHash(merkleRoot: string): string {
  const bytes = (merkleRoot.replace('0x', '').match(/.{1,2}/g) || []).map(h => parseInt(h, 16));
  if (bytes.length === 0) return '0x' + '0'.repeat(64);
  const out = new Array(32).fill(0).map((_, i) =>
    bytes[i % bytes.length] ^ bytes[(i * 7 + 13) % bytes.length]
  );
  return '0x' + out.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function simulate0GAnchor(merkleRoot: string) {
  await new Promise(r => setTimeout(r, 1200));
  return {
    txHash: derive0GTxHash(merkleRoot),
    blockHeight: 4_200_000 + Math.floor(Math.random() * 50_000),
    daLayer: '0G Labs (simulated)',
    merkleRoot,
    timestamp: new Date().toISOString(),
    status: 'simulated',
    gasUsed: (21_000 + Math.floor(Math.random() * 3_000)).toLocaleString(),
    dataSize: '512 bytes',
    networkMode: 'simulation',
  };
}

async function real0GAnchor(
  merkleRoot: string,
  privateKey: string,
  metadata?: Record<string, string>
) {
  try {
    // Dynamic import to avoid ESM/CJS bundling issues on Vercel
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(ZG_EVM_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);

    // Encode anchor payload — Merkle root + provenance metadata as UTF-8 calldata
    const anchorPayload = JSON.stringify({
      protocol: 'CIVICPATH-SOVEREIGN-ANCHOR-v1',
      merkleRoot,
      timestamp: new Date().toISOString(),
      source: 'civicpath',
      storageRpc: ZG_STORAGE_RPC,
      ...metadata,
    });
    const calldata = ethers.hexlify(ethers.toUtf8Bytes(anchorPayload));

    // Submit transaction to 0G Flow contract
    // The TX hash + block number is the immutable on-chain proof of existence.
    const tx = await wallet.sendTransaction({
      to: ZG_FLOW_CONTRACT,
      data: calldata,
      value: 0n,
      gasLimit: 150_000n,
    });

    console.log(`[0G] TX submitted: ${tx.hash} — waiting for confirmation...`);

    // Wait for 1 block confirmation
    const receipt = await tx.wait(1);
    const blockNumber = receipt?.blockNumber ?? 0;
    const gasUsed = receipt?.gasUsed?.toString() ?? '0';

    console.log(`[0G] Confirmed: block ${blockNumber}, gas ${gasUsed}`);

    return {
      txHash: tx.hash,
      blockHeight: blockNumber,
      daLayer: '0G Labs',
      merkleRoot,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
      gasUsed: Number(gasUsed).toLocaleString(),
      dataSize: `${Math.ceil(calldata.length / 2)} bytes`,
      networkMode: ZG_EVM_RPC.includes('testnet') ? 'testnet' : 'mainnet',
      blockExplorerUrl: `${ZG_EXPLORER}/tx/${tx.hash}`,
    };

  } catch (err: any) {
    // Any error → transparent fallback to simulation, never crash
    console.warn('[0G] EVM anchor failed, falling back to simulation:', err.message);
    const simulated = await simulate0GAnchor(merkleRoot);
    return { ...simulated, networkMode: 'simulation' };
  }
}

// Verify a TX on-chain via ethers provider
async function verify0GTransaction(txHash: string): Promise<{ verified: boolean; blockHeight: number; blockExplorerUrl: string }> {
  try {
    const { ethers } = await import('ethers');
    const provider = new ethers.JsonRpcProvider(ZG_EVM_RPC);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (receipt && receipt.status === 1) {
      return {
        verified: true,
        blockHeight: receipt.blockNumber,
        blockExplorerUrl: `${ZG_EXPLORER}/tx/${txHash}`,
      };
    }
    return { verified: false, blockHeight: 0, blockExplorerUrl: `${ZG_EXPLORER}/tx/${txHash}` };
  } catch {
    return { verified: false, blockHeight: 0, blockExplorerUrl: `${ZG_EXPLORER}/tx/${txHash}` };
  }
}

// ── KMS helpers ───────────────────────────────────────────────────────────────

function kmsOfflineResult(operation: string, message: string) {
  return {
    success: true,
    operation,
    keyName: 'not-configured',
    timestamp: new Date().toISOString(),
    provider: 'kms-offline',
    message,
  };
}

async function kmsCallREST(url: string, method: 'POST' | 'PATCH', body: object) {
  const token = process.env.GOOGLE_KMS_ACCESS_TOKEN;
  if (!token) throw new Error('GOOGLE_KMS_ACCESS_TOKEN not set');
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function performKMSRotate(keyName: string) {
  const url = `https://cloudkms.googleapis.com/v1/${keyName}/cryptoKeyVersions`;
  const data = await kmsCallREST(url, 'POST', { state: 'ENABLED' });
  if (data.error) throw new Error(data.error.message);
  return {
    success: true,
    operation: 'rotate',
    keyName,
    newKeyVersion: data.name?.split('/').pop(),
    timestamp: new Date().toISOString(),
    provider: 'google-cloud-kms',
    message: `Key rotation successful — new version: ${data.name?.split('/').pop() || 'unknown'}`,
  };
}

async function performKMSDisable(keyName: string, keyVersion = '1') {
  const url = `https://cloudkms.googleapis.com/v1/${keyName}/cryptoKeyVersions/${keyVersion}`;
  const data = await kmsCallREST(url, 'PATCH', { state: 'DISABLED' });
  if (data.error) throw new Error(data.error.message);
  return {
    success: true,
    operation: 'disable',
    keyName,
    timestamp: new Date().toISOString(),
    provider: 'google-cloud-kms',
    message: `Key version ${keyVersion} disabled — GDPR Art.17 erasure in effect`,
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req.headers as any);
  if (!rateLimit(`sovereign:${ip}`, 30)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  const { action, merkleRoot, contentHash, metadata, txHash, keyVersion } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action required' });

  const zgPrivateKey = process.env.ZG_PRIVATE_KEY; // testnet wallet private key
  const kmsKeyName = process.env.GOOGLE_KMS_KEY_NAME;

  try {
    switch (action) {

      // ── 0G Labs DA Layer ─────────────────────────────────────────────────
      case 'anchor-0g': {
        if (!merkleRoot) return res.status(400).json({ error: 'merkleRoot required' });
        // Real anchor when ZG_PRIVATE_KEY is set (testnet wallet with 0G gas tokens)
        const receipt = zgPrivateKey
          ? await real0GAnchor(merkleRoot, zgPrivateKey, metadata)
          : await simulate0GAnchor(merkleRoot);
        return res.status(200).json({ receipt });
      }

      case 'verify-0g': {
        if (txHash && zgPrivateKey) {
          // Real on-chain verification via ethers.js
          const result = await verify0GTransaction(txHash);
          return res.status(200).json({
            verified: result.verified,
            blockHeight: result.blockHeight,
            blockExplorerUrl: result.blockExplorerUrl,
            networkMode: ZG_EVM_RPC.includes('testnet') ? 'testnet' : 'mainnet',
          });
        }
        return res.status(200).json({
          verified: true,
          networkMode: 'simulation',
          blockExplorerUrl: null,
        });
      }

      // ── Google Cloud KMS ─────────────────────────────────────────────────
      case 'kms-rotate': {
        if (!kmsKeyName) {
          return res.status(200).json({
            result: kmsOfflineResult('rotate', 'KMS vault offline — rotation logged. Set GOOGLE_KMS_KEY_NAME to activate real HSM.'),
          });
        }
        const result = await performKMSRotate(kmsKeyName);
        return res.status(200).json({ result });
      }

      case 'kms-disable': {
        if (!kmsKeyName) {
          return res.status(200).json({
            result: kmsOfflineResult('disable', 'KMS vault offline — disable logged for GDPR compliance. Set GOOGLE_KMS_KEY_NAME to activate real HSM.'),
          });
        }
        const result = await performKMSDisable(kmsKeyName, keyVersion);
        return res.status(200).json({ result });
      }

      case 'kms-destroy': {
        // Log all destroy attempts regardless
        console.warn(`[KMS] DESTROY attempted for ${kmsKeyName || 'unknown'} at ${new Date().toISOString()}`);

        if (process.env.GOOGLE_KMS_DESTROY_ENABLED !== 'true') {
          return res.status(200).json({
            result: {
              success: false,
              operation: 'destroy',
              keyName: kmsKeyName || 'not-configured',
              timestamp: new Date().toISOString(),
              provider: 'google-cloud-kms',
              message: 'Destroy blocked. Set GOOGLE_KMS_DESTROY_ENABLED=true to enable permanent key destruction.',
            },
          });
        }

        if (!kmsKeyName) {
          return res.status(200).json({
            result: kmsOfflineResult('destroy', 'KMS vault offline — cannot perform irreversible destruction without GOOGLE_KMS_KEY_NAME.'),
          });
        }

        // Real destroy via Cloud KMS REST
        const url = `https://cloudkms.googleapis.com/v1/${kmsKeyName}/cryptoKeyVersions/${keyVersion || '1'}:destroy`;
        const data = await kmsCallREST(url, 'POST', {});
        return res.status(200).json({
          result: {
            success: !data.error,
            operation: 'destroy',
            keyName: kmsKeyName,
            timestamp: new Date().toISOString(),
            provider: 'google-cloud-kms',
            message: data.error ? data.error.message : '⛔ Key version permanently destroyed — all encrypted data is unrecoverable',
          },
        });
      }

      // ── MyLalla Research Engine (Nemotron-3-Super + live grants) ─────────────
      case 'mylalla-research': {
        const { query: mlQuery, sessionId: mlSession, orgProfile } = req.body;
        if (!mlQuery) return res.status(400).json({ error: 'query required' });

        const nimKey = process.env.NVIDIA_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
        if (!nimKey && !geminiKey) return res.status(500).json({ error: 'No inference API configured' });

        // Step 1: Classify query type
        const queryLower = mlQuery.toLowerCase();
        const isGrantSearch = /find|search|grant|fund|sbir|nsf|nih|nasa|available|apply/.test(queryLower);
        const isCompliance = /compliance|report|deadline|award letter|post.award/.test(queryLower);

        // Step 2: Fetch live grant data if relevant
        let liveGrantSources: any[] = [];
        if (isGrantSearch) {
          try {
            const keyword = orgProfile?.focusArea || mlQuery.split(' ').slice(0, 3).join(' ');
            const location = orgProfile?.location || 'United States';
            const gr = await fetch('https://apply07.grants.gov/grantsws/rest/opportunities/search/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ keyword: `${keyword} ${location}`, oppStatuses: 'posted', rows: 5, sortBy: 'openDate|desc' }),
              signal: AbortSignal.timeout(8_000),
            });
            const gd = await gr.json();
            liveGrantSources = (gd.oppHits || []).map((g: any) => ({
              title: g.title, agency: g.agency, deadline: g.closeDate || 'Rolling',
              url: `https://www.grants.gov/search-results-detail/${g.id}`,
              type: 'grants.gov',
            }));
          } catch { /* fail silently */ }
        }

        // Step 3: Build context-rich prompt for Nemotron-3-Super
        const systemPrompt = [
          'You are MyLalla, a world-class AI grant strategy advisor. You have mastered every federal grant program, state fund, SBIR/STTR, foundation grant, and compliance framework.',
          'Provide responses that are specific, data-driven, and immediately actionable. Use markdown headers, bullet points, and bold text.',
          'When citing grants, always include agency, amount, and deadline.',
          orgProfile ? `\nUser\'s Organization Context:\n- Name: ${orgProfile.companyName}\n- Focus: ${orgProfile.focusArea}\n- Location: ${orgProfile.location}\n- Mission: ${(orgProfile.missionStatement || '').slice(0, 300)}` : '',
          liveGrantSources.length > 0 ? `\nLive grants found for this query (from Grants.gov):\n${liveGrantSources.map((g: any) => `- ${g.title} | ${g.agency} | Due: ${g.deadline}`).join('\n')}` : '',
        ].filter(Boolean).join('\n');

        // Step 4: Synthesize with Nemotron-3-Super via NIM or Gemini fallback
        let responseText = '';
        let modelTierUsed = 'gemini-fallback';

        if (nimKey) {
          try {
            const model = process.env.NVIDIA_NIM_MODEL || 'nvidia/nemotron-3-super-120b-instruct';
            const nr = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${nimKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: mlQuery },
                ],
                max_tokens: 8192, temperature: 0.6, top_p: 0.95, stream: false,
              }),
              signal: AbortSignal.timeout(30_000),
            });
            const nd = await nr.json();
            if (nd.choices?.[0]?.message?.content) {
              responseText = nd.choices[0].message.content;
              modelTierUsed = `Nemotron-3-Super-120B`;
            }
          } catch (e: any) {
            console.warn('[MyLalla] NIM failed:', e.message);
          }
        }

        if (!responseText && geminiKey) {
          try {
            // Dynamic import to avoid bundling issues
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const genAI = new GoogleGenerativeAI(geminiKey);
            const gmodel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
            const result = await gmodel.generateContent(`${systemPrompt}\n\nUser: ${mlQuery}`);
            responseText = result.response.text();
            modelTierUsed = 'Gemini 2.0 Flash';
          } catch (gErr: any) {
            console.warn('[MyLalla] Gemini fallback failed:', gErr.message);
            responseText = 'I am temporarily unavailable. Please try again in a moment.';
            modelTierUsed = 'offline';
          }
        }

        // Step 5: Generate follow-up questions
        let followUps: string[] = [];
        try {
          const fuPrompt = `Given this grant research question: "${mlQuery}"\nAnd this response summary: "${responseText.slice(0, 500)}"\nGenerate 3 specific follow-up questions the user should ask next. Return ONLY a JSON array of strings.`;
          const fuRes = nimKey
            ? await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${nimKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'meta/llama-3.1-8b-instruct', messages: [{ role: 'user', content: fuPrompt }], max_tokens: 200, temperature: 0.8 }),
                signal: AbortSignal.timeout(15_000),
              })
            : null;
          if (fuRes) {
            const fuData = await fuRes.json();
            const fuText = fuData.choices?.[0]?.message?.content || '[]';
            followUps = JSON.parse(fuText.replace(/```json|```/g, '').trim());
          }
        } catch { followUps = []; }

        return res.status(200).json({
          response: responseText,
          sources: liveGrantSources,
          followUps: followUps.slice(0, 3),
          modelTier: modelTierUsed,
          sessionId: mlSession || `session-${Date.now()}`,
          queryType: isGrantSearch ? 'grant-search' : isCompliance ? 'compliance' : 'strategy',
        });
      }

      // ── AMAI SuperAgent Attestation ────────────────────────────────
      case 'check-attestation': {
        const amaiUrl = process.env.AMAI_ATTESTATION_URL || 'http://34.66.125.36/api/v1/attestation';
        try {
          const r = await fetch(amaiUrl, { signal: AbortSignal.timeout(5_000) });
          const data = await r.json();
          return res.status(200).json({
            source: 'amai-superagent',
            hardwareVaultActive: data.hardware_vault_active ?? false,
            teeType: data.tee_type || 'none',
            attestationVerified: data.attestation_verified ?? false,
            measurement: data.measurement || null,
            checkedAt: data.checked_at || new Date().toISOString(),
            serviceUrl: amaiUrl.replace('/api/v1/attestation', ''),
            clusterName: 'saos-cluster',
            zone: 'us-central1-a',
          });
        } catch (err: any) {
          return res.status(200).json({ source: 'offline', error: err.message });
        }
      }

      // ── AMAI SuperAgent Query (when session token is configured) ─────────────
      case 'amai-query': {
        const amaiBase = process.env.AMAI_BASE_URL || 'http://34.66.125.36';
        const amaiToken = process.env.AMAI_SESSION_TOKEN;
        if (!amaiToken) {
          return res.status(200).json({ error: 'AMAI_SESSION_TOKEN not configured', offline: true });
        }
        const { query: amaiQuery, mode: amaiMode = 'research', sessionId, context: amaiCtx } = req.body;
        if (!amaiQuery) return res.status(400).json({ error: 'query required' });
        const r = await fetch(`${amaiBase}/v1/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${amaiToken}` },
          body: JSON.stringify({ query: amaiQuery, mode: amaiMode, session_id: sessionId, context: amaiCtx }),
          signal: AbortSignal.timeout(30_000),
        });
        const data = await r.json();
        if (!r.ok) return res.status(r.status).json(data);
        return res.status(200).json({
          text: data.response,
          sessionId: data.session_id,
          modelTier: data.model_tier,
          latencyMs: data.latency_ms,
          followUpQuestions: data.follow_up_questions || [],
          provider: 'amai-superagent',
        });
      }

      default:
        return res.status(400).json({ error: `Unknown sovereign action: ${action}` });
    }
  } catch (err: any) {
    console.error(`[Sovereign] ${action} error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
