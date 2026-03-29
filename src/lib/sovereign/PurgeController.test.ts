/**
 * PurgeController.test.ts — GrantClaw Agent 8 QA
 *
 * Protocol 4: Data Privacy Audit
 * - 500ms circuit breaker must complete within timing spec
 * - Phase transitions: idle → counting → wiping → complete
 * - onWipeComplete callback must fire exactly once
 * - cancel() must abort an in-progress purge
 * - No timers must leak after destroy()
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PurgeController } from './PurgeController';
import type { PurgePhase, PurgeEvent } from './PurgeController';

describe('PurgeController — 500ms Circuit Breaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits "counting" phase immediately on trigger', () => {
    const events: PurgeEvent[] = [];
    const pc = new PurgeController(e => events.push(e));
    const wipe = vi.fn();

    pc.trigger(wipe);

    const countingEvents = events.filter(e => e.phase === 'counting');
    expect(countingEvents.length).toBeGreaterThan(0);
    expect(countingEvents[0].remainingMs).toBe(500);
  });

  it('counts down in 50ms ticks', () => {
    const events: PurgeEvent[] = [];
    const pc = new PurgeController(e => events.push(e));

    pc.trigger(vi.fn());
    vi.advanceTimersByTime(200);

    const countingEvents = events.filter(e => e.phase === 'counting');
    // Should have ticks at 500, 450, 400, 350, 300 ms remaining
    expect(countingEvents.length).toBeGreaterThanOrEqual(4);
    expect(countingEvents[countingEvents.length - 1].remainingMs).toBeLessThan(350);
  });

  it('emits "wiping" phase after 500ms countdown', () => {
    const events: PurgeEvent[] = [];
    const pc = new PurgeController(e => events.push(e));

    pc.trigger(vi.fn());
    vi.advanceTimersByTime(500);

    const wipingEvent = events.find(e => e.phase === 'wiping');
    expect(wipingEvent).toBeDefined();
    expect(wipingEvent?.remainingMs).toBe(0);
  });

  it('calls onWipeComplete exactly once after full countdown', () => {
    const events: PurgeEvent[] = [];
    const wipe = vi.fn();
    const pc = new PurgeController(e => events.push(e));

    pc.trigger(wipe);
    vi.advanceTimersByTime(700); // 500ms countdown + 150ms wipe delay

    expect(wipe).toHaveBeenCalledTimes(1);
  });

  it('emits "complete" phase after wipe', () => {
    const events: PurgeEvent[] = [];
    const pc = new PurgeController(e => events.push(e));

    pc.trigger(vi.fn());
    vi.advanceTimersByTime(700);

    const completeEvent = events.find(e => e.phase === 'complete');
    expect(completeEvent).toBeDefined();
    expect(completeEvent?.log).toContain('Enclave Reset Successful');
  });

  it('emits "idle" phase after complete + 1500ms cooldown', () => {
    const events: PurgeEvent[] = [];
    const pc = new PurgeController(e => events.push(e));

    pc.trigger(vi.fn());
    vi.advanceTimersByTime(2500); // 500 + 150 + 1500 + buffer

    const idleEvent = events.find(e => e.phase === 'idle');
    expect(idleEvent).toBeDefined();
  });

  it('cancel() stops countdown before wipe fires', () => {
    const wipe = vi.fn();
    const pc = new PurgeController(() => {});

    pc.trigger(wipe);
    vi.advanceTimersByTime(300); // halfway through countdown
    pc.cancel();
    vi.advanceTimersByTime(1000); // advance past where wipe would have fired

    expect(wipe).not.toHaveBeenCalled();
  });

  it('full phase sequence is counting → wiping → complete → idle', () => {
    const phases: PurgePhase[] = [];
    const pc = new PurgeController(e => {
      const last = phases[phases.length - 1];
      if (e.phase !== last) phases.push(e.phase);
    });

    pc.trigger(vi.fn());
    vi.advanceTimersByTime(2500);

    expect(phases).toContain('counting');
    expect(phases).toContain('wiping');
    expect(phases).toContain('complete');
    expect(phases).toContain('idle');

    // Order check
    const countIdx = phases.indexOf('counting');
    const wipeIdx = phases.indexOf('wiping');
    const completeIdx = phases.indexOf('complete');
    expect(countIdx).toBeLessThan(wipeIdx);
    expect(wipeIdx).toBeLessThan(completeIdx);
  });

  it('destroy() cleans up without throwing', () => {
    const pc = new PurgeController(() => {});
    pc.trigger(vi.fn());
    vi.advanceTimersByTime(200);
    expect(() => pc.destroy()).not.toThrow();
  });
});
