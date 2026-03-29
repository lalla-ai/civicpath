import { describe, it, expect, vi } from 'vitest';
import { safeParseAIJSON } from './_utils';

describe('safeParseAIJSON', () => {
  it('parses clean JSON', () => {
    const input = '{"key": "value"}';
    expect(safeParseAIJSON(input)).toEqual({ key: 'value' });
  });

  it('parses fenced JSON', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(safeParseAIJSON(input)).toEqual({ key: 'value' });
  });

  it('extracts JSON from wrapped text', () => {
    const input = 'Here is the JSON: {"key": "value"} Hope this helps!';
    expect(safeParseAIJSON(input)).toEqual({ key: 'value' });
  });

  it('extracts JSON array from wrapped text', () => {
    const input = 'Here is the list: [{"id": 1}, {"id": 2}]';
    expect(safeParseAIJSON(input)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('throws error for unrecoverable invalid output', () => {
    const input = 'This is just some text with no JSON.';
    expect(() => safeParseAIJSON(input)).toThrow('No valid JSON found in AI response.');
  });

  it('throws error for malformed JSON that looks like JSON', () => {
    const input = '{"key": "value"';
    expect(() => safeParseAIJSON(input)).toThrow('No valid JSON found in AI response.');
  });
});
