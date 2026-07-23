import { describe, expect, it } from 'vitest';
import { nextHintChar, nextHintCombo } from './hint';

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

describe('nextHintCombo', () => {
  it('returns null for a normal (non-combo) next character', () => {
    expect(nextHintCombo('こーひーをください', 'こ')).toBeNull();
  });

  it('returns the two-character combo when the next character is a small kana following its base character', () => {
    // "しゃしんをとってもいいですか。" typed up to "し" -> next char is small "ゃ", which combos with "し"
    expect(nextHintCombo('しゃしんをとってもいいですか。', 'し')).toBe('しゃ');
  });

  it('returns the katakana combo the same way', () => {
    // "きょうです。" typed up to "き" -> next char is small katakana "ョ", combos with "キ"
    expect(nextHintCombo('キョウです。', 'キ')).toBe('キョ');
  });

  it('returns null when the small kana has no preceding character (start of reading)', () => {
    expect(nextHintCombo('ゃだめ', '')).toBeNull();
  });
});
