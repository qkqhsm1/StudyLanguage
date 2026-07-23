import { describe, expect, it } from 'vitest';
import { nextHintChar } from './hint';

describe('nextHintChar', () => {
  it('returns the first character when nothing has been typed yet', () => {
    expect(nextHintChar('こーひーをください', '')).toBe('こ');
  });

  it('returns the character right after the correctly-matched prefix', () => {
    expect(nextHintChar('こーひーをください', 'こ')).toBe('ー');
  });

  it('ignores characters typed after the first mismatch when finding the prefix', () => {
    // typed "こひ" (missing the choonpu) — prefix match stops after "こ", so the hint
    // is still "ー", not whatever comes after the wrongly-typed "ひ".
    expect(nextHintChar('こーひーをください', 'こひ')).toBe('ー');
  });

  it('returns null once the typed text fully matches the reading', () => {
    expect(nextHintChar('こんにちは。', 'こんにちは。')).toBeNull();
  });

  it('returns null when typed text is already longer than the reading', () => {
    expect(nextHintChar('こんにちは。', 'こんにちは。おはよう')).toBeNull();
  });
});
