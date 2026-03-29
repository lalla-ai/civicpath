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
        console.error('AI JSON Recover Error:', innerErr, '\nRecovered text:', match[0]);
        throw new Error('Failed to recover valid JSON from AI response.');
      }
    }
    console.error('AI JSON Parse Error:', err, '\nRaw text:', text);
    throw new Error('No valid JSON found in AI response.');
  }
}
