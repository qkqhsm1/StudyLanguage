import { describe, expect, it } from 'vitest';
import { romanizeKana } from './kana-romanize';

describe('romanizeKana', () => {
  it('converts plain kana to romaji and hangul', () => {
    expect(romanizeKana('ください')).toEqual({ romaji: 'kudasai', hangul: '쿠다사이' });
  });

  it('handles youon (two-kana sounds) as one syllable', () => {
    // きょ is one sound (kyo), not ki + yo
    expect(romanizeKana('きょう')).toEqual({ romaji: 'kyou', hangul: '쿄우' });
  });

  it('doubles the following consonant for sokuon, and adds a final ㅅ in hangul', () => {
    const { romaji, hangul } = romanizeKana('まって');
    expect(romaji).toBe('matte');
    expect(hangul).toBe('맛테');
  });

  it('lengthens the previous vowel for a choonpu', () => {
    // こーひー -> koohii; hangul convention drops the mark
    expect(romanizeKana('こーひー')).toEqual({ romaji: 'koohii', hangul: '코히' });
  });

  it('writes ん as a ㄴ final consonant inside a word, not a standalone 응', () => {
    // なんじ -> 난지, not 나응지
    expect(romanizeKana('なんじ')).toEqual({ romaji: 'nanji', hangul: '난지' });
    expect(romanizeKana('せんせい')).toEqual({ romaji: 'sensei', hangul: '센세이' });
  });

  it('keeps 응 for a ん that has no syllable to attach to', () => {
    expect(romanizeKana('ん').hangul).toBe('응');
  });

  it('passes punctuation through unchanged', () => {
    const { romaji, hangul } = romanizeKana('はい。');
    expect(romaji).toBe('hai。');
    expect(hangul).toBe('하이。');
  });

  it('romanizes a full sentence reading', () => {
    expect(romanizeKana('えきはどこですか。')).toEqual({
      romaji: 'ekihadokodesuka。',
      hangul: '에키하도코데스카。',
    });
  });

  it('handles katakana readings too', () => {
    expect(romanizeKana('スシ')).toEqual({ romaji: 'sushi', hangul: '스시' });
  });
});
