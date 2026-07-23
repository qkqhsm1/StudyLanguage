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

  // Case A: the base char hasn't been typed yet -> hint the whole combo up front,
  // no deletion needed since the combo key covers both characters in one press.
  it('looks ahead and returns the combo (no deletion needed) before the base char is typed', () => {
    // "しゃしんをとってもいいですか。" nothing typed yet -> next is "し" then small "ゃ"
    expect(nextHintCombo('しゃしんをとってもいいですか。', '')).toEqual({
      combo: 'しゃ',
      needsDelete: false,
    });
  });

  it('looks ahead for the katakana combo the same way', () => {
    expect(nextHintCombo('キョウです。', '')).toEqual({ combo: 'キョ', needsDelete: false });
  });

  // Case B: the base char was already typed on its own -> recovery flow, deletion needed.
  it('flags deletion needed when the base char was already typed separately', () => {
    // typed up to "し" -> next char is small "ゃ", which combos with "し" already typed
    expect(nextHintCombo('しゃしんをとってもいいですか。', 'し')).toEqual({
      combo: 'しゃ',
      needsDelete: true,
    });
  });

  it('does not offer the deletion combo when there is trailing garbage past the matched prefix', () => {
    // typed "しx" -> matched prefix is just "し", but typed.length is 2, so "delete one
    // char" advice would be wrong (it'd leave "し", not empty) -> fall back instead.
    expect(nextHintCombo('しゃしんをとってもいいですか。', 'しx')).toBeNull();
  });

  it('returns null when the small kana has no preceding character (start of reading)', () => {
    expect(nextHintCombo('ゃだめ', '')).toBeNull();
  });
});
