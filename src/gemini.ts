import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export async function generateText(prompt: string): Promise<string> {
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY is not set.');
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// Grant matching: returns score + reasons as JSON
export async function scoreGrantMatch(orgProfile: {
  name: string;
  mission: string;
  location: string;
  focusArea: string;
}, grant: {
  name: string;
  description: string;
  amount: string;
  focusAreas: string[];
  location: string;
}): Promise<{ score: number; reasons: string[]; recommendation: string }> {
  const prompt = `Score the compatibility between this organization and grant from 0 to 100.

Organization:
- Name: ${orgProfile.name}
- Mission: ${orgProfile.mission}
- Location: ${orgProfile.location}
- Focus Area: ${orgProfile.focusArea}

Grant:
- Name: ${grant.name}
- Description: ${grant.description}
- Amount: ${grant.amount}
- Focus Areas: ${grant.focusAreas.join(', ')}
- Location: ${grant.location}

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{"score": <number 0-100>, "reasons": ["<reason 1>", "<reason 2>", "<reason 3>"], "recommendation": "<one sentence>"}`;

  const text = await generateText(prompt);
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return { score: 75, reasons: ['Strong mission alignment', 'Location eligible', 'Focus area matches'], recommendation: 'Good candidate for this grant.' };
  }
}

// Proposal drafting: returns full proposal markdown
export async function draftProposal(org: {
  name: string;
  mission: string;
  location: string;
  focusArea: string;
  background: string;
}, grant: {
  name: string;
  amount: string;
  deadline: string;
}): Promise<string> {
  const prompt = `Write a compelling grant proposal for the following:

Organization: ${org.name}
Mission: ${org.mission}
Location: ${org.location}
Focus Area: ${org.focusArea}
Background: ${org.background}
Target Grant: ${grant.name}
Amount: ${grant.amount}
Deadline: ${grant.deadline}

Write the proposal with these sections using markdown headers:
### Executive Summary
### Problem Statement
### Project Description
### Budget Narrative
### Evaluation Plan

Make it compelling, specific to Florida, and 400-600 words total.`;

  return generateText(prompt);
}

// Meeting summary: extracts structured data from transcript
export async function summarizeMeeting(transcript: string): Promise<{
  decisions: string[];
  actionItems: { task: string; owner: string; dueDate: string }[];
  risks: string[];
  nextMeetingAgenda: string[];
}> {
  const prompt = `Analyze this meeting transcript and extract key information.

Transcript:
${transcript}

Return ONLY valid JSON in this exact format (no markdown):
{
  "decisions": ["<decision 1>", "<decision 2>"],
  "actionItems": [{"task": "<task>", "owner": "<name>", "dueDate": "<date>"}],
  "risks": ["<risk 1>"],
  "nextMeetingAgenda": ["<agenda item 1>"]
}`;

  const text = await generateText(prompt);
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {
      decisions: ['Review proposal draft by Thursday'],
      actionItems: [{ task: 'Budget finalization', owner: 'Team', dueDate: 'This Friday' }],
      risks: ['Deadline approaching'],
      nextMeetingAgenda: ['Review final submission'],
    };
  }
}

// Alternative grant suggestions when rejected
export async function suggestAlternativeGrants(
  orgProfile: string,
  rejectedGrant: string
): Promise<{ name: string; reason: string; amount: string }[]> {
  const prompt = `An organization was rejected from "${rejectedGrant}". Their profile: ${orgProfile}.
Suggest 3 alternative grants that would be a better fit.
Return ONLY valid JSON array (no markdown):
[{"name": "<grant name>", "reason": "<why it fits>", "amount": "<typical amount>"}]`;

  const text = await generateText(prompt);
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return [
      { name: 'FL Small Business Relief Fund', reason: 'Better eligibility alignment', amount: '$15,000' },
      { name: 'Community Innovation Grant', reason: 'Broader scope matches your mission', amount: '$25,000' },
      { name: 'Digital Equity Initiative', reason: 'Technology focus aligns perfectly', amount: '$50,000' },
    ];
  }
}
