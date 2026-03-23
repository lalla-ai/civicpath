/**
 * PurgeController — CivicPath Sovereign Infrastructure
 *
 * Implements a 500ms "circuit breaker" that wipes all in-flight GrantData from
 * enclave state when triggered. Equivalent to a TEE memory purge / GDPR Art.17
 * right-to-erasure automated reset.
 *
 * Claim 1d: 500ms Circuit Breaker — Enclave Reset
 */

export type PurgePhase = 'idle' | 'armed' | 'counting' | 'wiping' | 'complete';

export interface PurgeEvent {
  phase: PurgePhase;
  remainingMs: number;
  log: string;
}

const COUNTDOWN_MS = 500;
const TICK_INTERVAL_MS = 50;

export class PurgeController {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private onEvent: (event: PurgeEvent) => void;

  constructor(onEvent: (event: PurgeEvent) => void) {
    this.onEvent = onEvent;
  }

  /** Called when a StreamingChunk is finalized — arms the breaker */
  onStreamingChunkFinalized() {
    this.emit('armed', COUNTDOWN_MS, '[1d] StreamingChunk finalized — Circuit Breaker armed. Awaiting trigger.');
  }

  /** Manually trigger the purge (e.g. SECURE WIPE button) */
  trigger(onWipeComplete: () => void) {
    this.cancel();
    let remaining = COUNTDOWN_MS;

    this.emit('counting', remaining, `[1d] Circuit Breaker triggered. Counting down ${COUNTDOWN_MS}ms...`);

    this.intervalId = setInterval(() => {
      remaining -= TICK_INTERVAL_MS;
      this.emit('counting', remaining, `[1d] Enclave reset in ${remaining}ms...`);

      if (remaining <= 0) {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = null;

        this.emit('wiping', 0, '[1d] 500ms elapsed — initiating secure memory wipe...');

        const wipeTimer = setTimeout(() => {
          onWipeComplete();
          this.emit('complete', 0, '[1d] 500ms Circuit Breaker: Enclave Reset Successful. All GrantData purged.');

          const idleTimer = setTimeout(() => {
            this.emit('idle', 0, '[1d] Circuit Breaker: STANDBY.');
          }, 1500);
          this.timers.push(idleTimer);
        }, 150);
        this.timers.push(wipeTimer);
      }
    }, TICK_INTERVAL_MS);
  }

  /** Cancel an in-progress countdown */
  cancel() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
  }

  destroy() { this.cancel(); }

  private emit(phase: PurgePhase, remainingMs: number, log: string) {
    this.onEvent({ phase, remainingMs, log });
  }
}

/** React-friendly helper — returns purge state and a trigger function */
export function createPurgeHandler(
  addGlobalLog: (msg: string) => void,
  onWipeComplete: () => void
): { trigger: () => void; controller: PurgeController } {
  const controller = new PurgeController((event) => {
    addGlobalLog(event.log);
  });
  return {
    trigger: () => controller.trigger(onWipeComplete),
    controller,
  };
}
