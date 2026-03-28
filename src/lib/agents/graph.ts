/**
 * graph.ts — State Graph Orchestrator (LangChain-lite / LangGraph-lite)
 *
 * Implements a Mixture of Agents (MoA) architecture.
 * A central State object flows through independent Agent Nodes.
 * Handles pause-and-resume (Human-in-the-Loop) for proposal approval.
 */

import { orchestratedInference } from './orchestrator';

// ── 1. The Shared State (Memory) ──────────────────────────────────────────────
export interface GrantState {
  // Inputs
  profile: {
    companyName?: string;
    location?: string;
    focusArea?: string;
    missionStatement?: string;
    ein?: string;
    dunsNumber?: string;
    [key: string]: any;
  };
  
  // Pipeline Data
  discoveredGrants: any[];
  targetGrant: any | null;
  matchScores: Record<string, number>;
  draftedProposal: string | null;
  complianceAudit: any | null;
  
  // Flags & Human-in-the-Loop
  isApproved: boolean;
  isSubmitted: boolean;
  status: 'idle' | 'running' | 'paused_for_approval' | 'completed' | 'error';
  currentAgent: string | null;
  error?: string;
}

// ── 2. The Nodes (Agents) ─────────────────────────────────────────────────────
// Each Node takes the current State and returns a Partial State to merge.
export type AgentNode = (state: GrantState, emitLog: (msg: string) => void) => Promise<Partial<GrantState>>;

// Example Agent 1: The Hunter
export const hunterNode: AgentNode = async (state, emitLog) => {
  emitLog(`[🔍 The Hunter] Scanning Grants.gov + SBA for profile: ${state.profile.focusArea}`);
  // In reality, this calls /api/grants. We mock it for the orchestrator example.
  const grants = [
    { id: '1', title: 'State Innovation Match Fund', agency: 'Commerce', amount: '$150k' }
  ];
  emitLog(`[🔍 The Hunter] Found ${grants.length} live matching opportunities ✓`);
  return { discoveredGrants: grants };
};

// Example Agent 2: The Matchmaker
export const matchmakerNode: AgentNode = async (state, emitLog) => {
  if (!state.discoveredGrants.length) throw new Error("No grants found to match.");
  emitLog(`[🎯 The Matchmaker] Scoring ${state.discoveredGrants.length} grants using Gemini 2.0 Flash...`);
  
  // Simulated Gemini API Call (orchestratedInference)
  await new Promise(r => setTimeout(r, 1000));
  
  const target = state.discoveredGrants[0];
  emitLog(`[🎯 The Matchmaker] Top match selected: ${target.title} (94% score) ✓`);
  
  return { 
    targetGrant: target,
    matchScores: { [target.id]: 94 }
  };
};

// Example Agent 3: The Drafter
export const drafterNode: AgentNode = async (state, emitLog) => {
  if (!state.targetGrant) throw new Error("No target grant selected for drafting.");
  emitLog(`[✍️ The Drafter] Writing personalized proposal for ${state.targetGrant.title}...`);
  
  // Use orchestrated inference to call Gemini
  const prompt = `Write a 200 word proposal for ${state.profile.companyName} applying for ${state.targetGrant.title}.`;
  const result = await orchestratedInference(prompt, { useNIM: true });
  
  emitLog(`[✍️ The Drafter] Draft complete ✓`);
  return { draftedProposal: result.text };
};

// Example Agent 4: The Controller (Compliance)
export const controllerNode: AgentNode = async (state, emitLog) => {
  emitLog(`[🛡️ The Controller] Running AI compliance audit on drafted proposal...`);
  const passed = !!state.profile.ein; // Simple check for example
  
  if (!passed) {
    emitLog(`[🛡️ The Controller] WARNING: Missing EIN. Proceeding with caution.`);
  } else {
    emitLog(`[🛡️ The Controller] Audit Passed: Cleared for submission ✓`);
  }
  
  return { complianceAudit: { passed, checks: 5 } };
};

// Example Agent 5: The Submitter
export const submitterNode: AgentNode = async (state, emitLog) => {
  if (!state.isApproved) throw new Error("Cannot submit without Human approval.");
  emitLog(`[✉️ The Submitter] Authenticating with Gmail API...`);
  await new Promise(r => setTimeout(r, 1000));
  emitLog(`[✉️ The Submitter] Application package queued and sent ✓`);
  
  return { isSubmitted: true };
};

// ── 3. The Orchestrator Graph Engine ──────────────────────────────────────────

type LogCallback = (agentId: string, log: string) => void;
type StateCallback = (state: GrantState) => void;

export class AgentGraph {
  private state: GrantState;
  private onLog?: LogCallback;
  private onStateUpdate?: StateCallback;

  constructor(initialState: Partial<GrantState> = {}) {
    this.state = {
      profile: {},
      discoveredGrants: [],
      targetGrant: null,
      matchScores: {},
      draftedProposal: null,
      complianceAudit: null,
      isApproved: false,
      isSubmitted: false,
      status: 'idle',
      currentAgent: null,
      ...initialState
    };
  }

  public setCallbacks(onLog: LogCallback, onStateUpdate: StateCallback) {
    this.onLog = onLog;
    this.onStateUpdate = onStateUpdate;
  }

  public updateState(partial: Partial<GrantState>) {
    this.state = { ...this.state, ...partial };
    if (this.onStateUpdate) this.onStateUpdate(this.state);
  }

  private log(agentId: string, msg: string) {
    if (this.onLog) this.onLog(agentId, msg);
  }

  /**
   * Run the pipeline up to the Drafter, then pause for human review.
   */
  public async runDiscoveryPhase() {
    this.updateState({ status: 'running' });

    try {
      // 1. Hunter
      this.updateState({ currentAgent: 'hunter' });
      const hunterResult = await hunterNode(this.state, (m) => this.log('hunter', m));
      this.updateState(hunterResult);

      // 2. Matchmaker
      this.updateState({ currentAgent: 'matchmaker' });
      const matchmakerResult = await matchmakerNode(this.state, (m) => this.log('matchmaker', m));
      this.updateState(matchmakerResult);

      // 3. Drafter
      this.updateState({ currentAgent: 'drafter' });
      const drafterResult = await drafterNode(this.state, (m) => this.log('drafter', m));
      this.updateState(drafterResult);

      // Pause for human!
      this.updateState({ status: 'paused_for_approval', currentAgent: null });
      this.log('system', '[🤖 ACTIVITY] Pipeline paused. Waiting for human approval of the drafted proposal.');

    } catch (err: any) {
      this.updateState({ status: 'error', error: err.message, currentAgent: null });
      this.log('system', `[ERROR] Pipeline failed: ${err.message}`);
    }
  }

  /**
   * Resume pipeline after human approval.
   */
  public async resumeSubmissionPhase() {
    if (this.state.status !== 'paused_for_approval') {
      throw new Error("Pipeline is not paused for approval.");
    }
    this.updateState({ status: 'running', isApproved: true });

    try {
      // 4. Controller
      this.updateState({ currentAgent: 'controller' });
      const controllerResult = await controllerNode(this.state, (m) => this.log('controller', m));
      this.updateState(controllerResult);

      // 5. Submitter
      this.updateState({ currentAgent: 'submitter' });
      const submitterResult = await submitterNode(this.state, (m) => this.log('submitter', m));
      this.updateState(submitterResult);

      this.updateState({ status: 'completed', currentAgent: null });
      this.log('system', '[🤖 ACTIVITY] Full pipeline completed successfully.');

    } catch (err: any) {
      this.updateState({ status: 'error', error: err.message, currentAgent: null });
      this.log('system', `[ERROR] Pipeline failed during submission: ${err.message}`);
    }
  }
  
  public getState() {
    return this.state;
  }
}

export const globalGraph = new AgentGraph();

