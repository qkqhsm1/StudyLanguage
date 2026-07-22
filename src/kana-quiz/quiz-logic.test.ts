import { describe, expect, it } from 'vitest';
import { buildKanaTable } from '../data/kana-data';
import { checkReadingAnswer, filterKana, pickMultipleChoice } from './quiz-logic';

const TABLE = buildKanaTable();
const A = TABLE.find((k) => k.script === 'hiragana' && k.char === 'あ')!;

describe('filterKana', () => {
  it('filters by script and group', () => {
    const result = filterKana(TABLE, { scripts: ['hiragana'], groups: ['basic'] });
    expect(result).toHaveLength(46);
    expect(result.every((k) => k.script === 'hiragana' && k.group === 'basic')).toBe(true);
  });

  it('supports combining multiple scripts and groups', () => {
    const result = filterKana(TABLE, { scripts: ['hiragana', 'katakana'], groups: ['dakuten', 'handakuten'] });
    expect(result).toHaveLength((20 + 5) * 2);
  });
});

describe('checkReadingAnswer', () => {
  it('accepts a correct romaji answer, case-insensitively', () => {
    expect(checkReadingAnswer(A, 'A')).toBe(true);
    expect(checkReadingAnswer(A, ' a ')).toBe(true);
  });

  it('accepts a correct hangul answer', () => {
    expect(checkReadingAnswer(A, '아')).toBe(true);
  });

  it('rejects a wrong answer', () => {
    expect(checkReadingAnswer(A, 'i')).toBe(false);
  });
});

describe('pickMultipleChoice', () => {
  it('returns exactly `count` options including the correct one, no duplicates', () => {
    const options = pickMultipleChoice(TABLE, A, 4, () => 0.42);
    expect(options).toHaveLength(4);
    expect(options).toContainEqual(A);
    const uniqueChars = new Set(options.map((o) => `${o.script}:${o.char}`));
    expect(uniqueChars.size).toBe(4);
  });
});
