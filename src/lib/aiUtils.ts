export function safeParseAIJSON(text: string) {
  const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(cleanText);
  } catch (err) {
    const match = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerErr) {
        throw new Error('Failed to recover valid JSON from AI response.');
      }
    }
    throw new Error('No valid JSON found in AI response.');
  }
}
