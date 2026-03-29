export interface AgentOutput {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'completed' | 'error';
  logs: string[];
  output?: string;
  score?: number;
}

export interface MasterIntegrityReport {
  proposalId: string;
  overallScore: number;
  verdict: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW';
  gatekeeperStatus: string;
  auditorStatus: string;
  notaryStatus: string;
  forecasterStatus: string;
  liaisonStatus: string;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function runSupervisor(
  proposalId: string, 
  updateUI: (agentId: string, status: AgentOutput['status'], log: string, output?: string, score?: number) => void
): Promise<MasterIntegrityReport> {
  
  // 1. The Gatekeeper (Hard Eligibility)
  updateUI('gatekeeper', 'working', 'Initializing Protocol 3...', undefined, undefined);
  await delay(800);
  updateUI('gatekeeper', 'working', 'Checking IRS 501(c)(3) status and geographic bounds...', undefined, undefined);
  await delay(1200);
  updateUI('gatekeeper', 'completed', 'Passed Hard Eligibility.', 'Entity is in good standing. Geography matches National requirements.', 100);

  // 2. The Auditor & The Notary (Parallel)
  updateUI('auditor', 'working', 'Fetching past 3 years of Form 990s...', undefined, undefined);
  updateUI('notary', 'working', 'Querying 0G DA Layer for Integrity Hash...', undefined, undefined);
  
  await Promise.all([
    (async () => {
      await delay(1500);
      updateUI('auditor', 'working', `Analyzing spend-down ratios via Gemini 1.5 Pro 2M Context...`, undefined, undefined);
      await delay(2000);
      updateUI('auditor', 'completed', 'Audit Complete.', 'Financial health is strong. Program ratio is 85% (Excellent). No anomalies detected.', 95);
    })(),
    (async () => {
      await delay(1200);
      updateUI('notary', 'working', 'Verifying signature 0x7F...3B against CivicPath Trust Registry...', undefined, undefined);
      await delay(1000);
      updateUI('notary', 'completed', 'Hash Verified.', 'Protocol 2 match. Data has not been tampered with since Seeker submission.', 100);
    })()
  ]);

  // 3. The Forecaster
  updateUI('forecaster', 'working', 'Running predictive ROI model...', undefined, undefined);
  await delay(1500);
  updateUI('forecaster', 'working', 'Comparing with historical funder success data...', undefined, undefined);
  await delay(1500);
  updateUI('forecaster', 'completed', 'Forecast Ready.', 'Predicted Impact: 300+ community members served per $10k disbursed. 92% confidence interval.', 92);

  // 4. Master Integrity Report Calculation
  const overallScore = 94; // Mocked high score for demo
  
  const report: MasterIntegrityReport = {
    proposalId,
    overallScore,
    verdict: overallScore >= 90 ? 'APPROVED' : 'MANUAL_REVIEW',
    gatekeeperStatus: 'PASS',
    auditorStatus: 'PASS',
    notaryStatus: 'PASS',
    forecasterStatus: '92% CONFIDENCE',
    liaisonStatus: 'IDLE'
  };

  return report;
}

export async function runLiaison(updateUI: (agentId: string, status: AgentOutput['status'], log: string) => void) {
  updateUI('liaison', 'working', 'Drafting approval notification...');
  await delay(1000);
  updateUI('liaison', 'working', 'Dispatching via GrantClaw Telegram/WhatsApp channels...');
  await delay(1200);
  updateUI('liaison', 'completed', 'Notification Sent. Onboarding flow initiated.');
}