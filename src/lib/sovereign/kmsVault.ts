/**
 * kmsVault.ts — Google Cloud KMS HSM Vault Slot
 *
 * Patent Reference: FIG.1 [112b] Cloud KMS · HSM-Backed Key Management
 *                   FIG.2 [202] "Decrypt in TEE — Zone 2 · KMS DEK Retrieval"
 *                   FIG.1 Arrow: Ephemeral Purge Controller [110] → Cloud KMS [112b]
 *                                labeled "Key Rotation"
 *
 * Activation Slot Architecture:
 *   TODAY  → Vault-offline mode (logs events, continues without blocking)
 *   TOMORROW → Set GOOGLE_KMS_KEY_NAME env var → real HSM key management
 *
 * Key Operations (per patent architecture):
 *   rotateKey()         — Create new key version after every purge cycle (FIG.2 [210])
 *   disableKeyVersion() — Disable key for GDPR Art.17 erasure on grant closeout
 *   destroyKeyVersion() — IRREVERSIBLE permanent destruction (requires explicit opt-in)
 *
 * ⚠️  IMPORTANT: rotateKey() is the correct default per FIG.1 — the patent shows
 *     "Key Rotation" from the Purge Controller to KMS, NOT key destruction.
 *     destroyKeyVersion() is a separate, irreversible operation requiring a guard.
 *
 * Activation env vars:
 *   GOOGLE_KMS_KEY_NAME      — Full resource name:
 *                               projects/{proj}/locations/{loc}/keyRings/{ring}/cryptoKeys/{key}
 *   GOOGLE_KMS_ACCESS_TOKEN  — OAuth2 access token or service account token
 *   GOOGLE_KMS_DESTROY_ENABLED — Set to 'true' to enable permanent key destruction
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type KMSKeyOperation = 'rotate' | 'disable' | 'destroy' | 'status';
export type KMSProvider = 'google-cloud-kms' | 'kms-offline';

export interface KMSOperationResult {
  success: boolean;
  operation: KMSKeyOperation;
  keyName: string;
  newKeyVersion?: string;
  timestamp: string;
  provider: KMSProvider;
  message: string;
}

// ── Core operations ────────────────────────────────────────────────────────────

/**
 * Rotate the DEK (Data Encryption Key) after a purge cycle.
 *
 * FIG.1: Key Rotation arrow from Ephemeral Purge Controller [110] → Cloud KMS [112b]
 * FIG.2: Called at Step [210] Volatile Memory Purge to reset encryption state.
 *
 * This is the PRIMARY key operation — called automatically by Agent 8 after every purge.
 */
export async function rotateKey(): Promise<KMSOperationResult> {
  const res = await fetch('/api/sovereign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'kms-rotate' }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`[KMS] Rotate error: ${data.error}`);
  return data.result as KMSOperationResult;
}

/**
 * Disable a key version — GDPR Art.17 right-to-erasure on grant closeout.
 *
 * This is the CLOSEOUT operation — makes all data encrypted with this key
 * effectively inaccessible without permanently destroying the key.
 * Reversible by re-enabling the key version (admin action only).
 *
 * @param keyVersion — specific version to disable (e.g. '1', '2'). Defaults to current.
 */
export async function disableKeyVersion(keyVersion?: string): Promise<KMSOperationResult> {
  const res = await fetch('/api/sovereign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'kms-disable', keyVersion }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`[KMS] Disable error: ${data.error}`);
  return data.result as KMSOperationResult;
}

/**
 * IRREVERSIBLE key destruction. Permanently destroys a key version.
 *
 * ⛔ DANGER: Once a key version is destroyed, all data encrypted with it
 * is permanently unrecoverable. There is no undo.
 *
 * Requires:
 *   1. confirm === 'DESTROY-PERMANENTLY' (typo-safe guard)
 *   2. GOOGLE_KMS_DESTROY_ENABLED=true in server environment
 *
 * Use ONLY when permanent erasure is legally mandated beyond GDPR Art.17.
 * For standard closeout, use disableKeyVersion() instead.
 */
export async function destroyKeyVersion(
  keyVersion: string,
  confirm: 'DESTROY-PERMANENTLY'
): Promise<KMSOperationResult> {
  if (confirm !== 'DESTROY-PERMANENTLY') {
    return {
      success: false,
      operation: 'destroy',
      keyName: '',
      timestamp: new Date().toISOString(),
      provider: 'kms-offline',
      message: 'Safety check failed. Pass confirm="DESTROY-PERMANENTLY" explicitly.',
    };
  }

  const res = await fetch('/api/sovereign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'kms-destroy', keyVersion }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`[KMS] Destroy error: ${data.error}`);
  return data.result as KMSOperationResult;
}

// ── Logging helpers ────────────────────────────────────────────────────────────

/** Format a KMS result for Sovereign Terminal display */
export function formatKMSLog(result: KMSOperationResult): string[] {
  const providerTag = result.provider === 'google-cloud-kms' ? 'HSM' : 'OFFLINE';
  const statusTag = result.success ? '✓' : '✗';
  return [
    `[KMS] ${providerTag} ${result.operation.toUpperCase()}-${statusTag}`,
    `[KMS] ${result.message}`,
    ...(result.newKeyVersion ? [`[KMS] New key version: ${result.newKeyVersion}`] : []),
  ];
}
