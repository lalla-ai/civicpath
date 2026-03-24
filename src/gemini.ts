// All Gemini calls are routed through /api/gemini-proxy on the server.
// The API key is NEVER exposed to the browser bundle.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

