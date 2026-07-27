import { describe, expect, it } from 'vitest';
import { addFurigana, buildFuriganaIndex } from './furigana';
import type { ParsedVocabEntry } from './parse-duome';

describe('buildFuriganaIndex', () => {
  it('maps kanji text to its reading, keeping the first match on duplicates', () => {
    const index = buildFuriganaIndex([
      { text: '店', reading: 'みせ' },
      { text: '大人買い', reading: 'おとながい' },
      { text: '店', reading: 'たな' }, // duplicate text, should be ignored
    ]);

    expect(index.get('店')).toBe('みせ');
    expect(index.get('大人買い')).toBe('おとながい');
  });
});

describe('addFurigana', () => {
  const parsed: ParsedVocabEntry[] = [
    { japanese: '店', romaji: 'mise', korean: '가게', audioUrl: 'a.mp3', skillName: 'Cafe', skillIndex: 4 },
    { japanese: 'おちゃ', romaji: 'ocha', korean: '차', audioUrl: 'b.mp3', skillName: 'Basics', skillIndex: 1 },
    { japanese: '謎', romaji: 'nazo', korean: '수수께끼', audioUrl: null, skillName: 'Cafe', skillIndex: 4 },
    { japanese: '一', romaji: '', korean: '한', audioUrl: 'c.mp3', skillName: 'Time', skillIndex: 9 },
    { japanese: '中山', romaji: '', korean: '나카야마', audioUrl: null, skillName: 'Time', skillIndex: 9 },
    { japanese: 'あさごはん', romaji: 'asagohan', korean: '아침밥', audioUrl: null, skillName: 'Mealtime', skillIndex: 13 },
  ];
  const index = buildFuriganaIndex([
    { text: '店', reading: 'みせ' },
    { text: '一', reading: 'いち' },
  ]);
  const kanjiForms = new Map([['あさごはん', '朝ごはん']]);
  const result = addFurigana(parsed, index, kanjiForms);

  it('fills reading from the furigana index for kanji words found in it', () => {
    expect(result[0]).toMatchObject({ japanese: '店', reading: 'みせ', id: '4-店' });
  });

  it('uses the word itself as the reading when it has no kanji', () => {
    expect(result[1]).toMatchObject({ japanese: 'おちゃ', reading: 'おちゃ', id: '1-おちゃ' });
  });

  it('leaves reading empty for kanji words missing from the index', () => {
    expect(result[2]).toMatchObject({ japanese: '謎', reading: '', id: '4-謎' });
  });

  it('builds romaji from the reading when duome gave none', () => {
    expect(result[3]).toMatchObject({ japanese: '一', reading: 'いち', romaji: 'ichi' });
  });

  it('swaps a kana-only word for its kanji form, keeping the kana as the reading', () => {
    expect(result[5]).toMatchObject({ japanese: '朝ごはん', reading: 'あさごはん', romaji: 'asagohan', id: '13-朝ごはん' });
  });

  it('leaves romaji empty when there is no reading to romanize either', () => {
    expect(result[4]).toMatchObject({ japanese: '中山', reading: '', romaji: '' });
  });
});
