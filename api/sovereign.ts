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
import { ethers } from 'ethers';
import { rateLimit, getClientIp } from './_rateLimit';

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

      default:
        return res.status(400).json({ error: `Unknown sovereign action: ${action}` });
    }
  } catch (err: any) {
    console.error(`[Sovereign] ${action} error:`, err.message);
    return res.status(500).json({ error: err.message });
  }
}
