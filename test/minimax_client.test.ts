import { describe, expect, it } from 'vitest';
import { extractJsonObject, parseArticleJson } from '../src/services/minimax_client.js';

describe('MiniMax response parsing', () => {
  it('extracts fenced JSON', () => {
    expect(extractJsonObject('```json\n{"title":"A"}\n```')).toBe('{"title":"A"}');
  });

  it('strips think blocks and parses the draft', () => {
    const draft = parseArticleJson(
      '<think>hidden</think>\n{"title":"Headline","dek":"Summary","body":["One","Two"],"tags":["Polymarket"]}',
    );
    expect(draft.title).toBe('Headline');
    expect(draft.body).toHaveLength(2);
  });
});

