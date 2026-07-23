import { describe, expect, it } from 'vitest';
import { buildKanaChart } from './kana-chart';

describe('buildKanaChart', () => {
  const hira = buildKanaChart('hiragana');

  it('has the four standard sections in teaching order', () => {
    expect(hira.map((s) => s.title)).toEqual(['청음', '탁음', '반탁음', '요음']);
  });

  it('lays the basic kana out as あ-row first, five columns wide', () => {
    const basic = hira[0].rows;
    expect(basic[0].map((c) => c?.char)).toEqual(['あ', 'い', 'う', 'え', 'お']);
    expect(basic[1].map((c) => c?.char)).toEqual(['か', 'き', 'く', 'け', 'こ']);
  });

  it('leaves the gaps in the や and わ rows empty rather than shifting them left', () => {
    const basic = hira[0].rows;
    // や rows only fill the a/u/o columns
    expect(basic[7].map((c) => c?.char)).toEqual(['や', undefined, 'ゆ', undefined, 'よ']);
    // わ row holds only わ and を…
    expect(basic[9].map((c) => c?.char)).toEqual(['わ', undefined, undefined, undefined, 'を']);
    // …and ん gets its own row, since it belongs to no vowel column
    expect(basic[10].map((c) => c?.char)).toEqual(['ん', undefined, undefined, undefined, undefined]);
  });

  it('covers all 46 basic kana across the rows', () => {
    const chars = hira[0].rows.flat().filter((c) => c !== null);
    expect(chars).toHaveLength(46);
  });

  it('lays youon out three per row', () => {
    const youon = hira[3].rows;
    expect(youon[0].map((c) => c?.char)).toEqual(['きゃ', 'きゅ', 'きょ']);
    expect(youon.flat().filter((c) => c !== null)).toHaveLength(33);
  });

  it('carries the romaji and hangul for each cell', () => {
    const a = hira[0].rows[0][0]!;
    expect(a.romaji).toBe('a');
    expect(a.hangul).toBe('아');
  });

  it('builds the same shape for katakana', () => {
    const kata = buildKanaChart('katakana');
    expect(kata.map((s) => s.title)).toEqual(hira.map((s) => s.title));
    expect(kata[0].rows[0].map((c) => c?.char)).toEqual(['ア', 'イ', 'ウ', 'エ', 'オ']);
    // the same gaps apply
    expect(kata[0].rows[7].map((c) => c?.char)).toEqual(['ヤ', undefined, 'ユ', undefined, 'ヨ']);
    expect(kata[0].rows.flat().filter((c) => c !== null)).toHaveLength(46);
  });
});
