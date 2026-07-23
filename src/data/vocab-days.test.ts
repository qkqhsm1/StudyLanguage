import { describe, expect, it } from 'vitest';
import { entriesForDay, totalDays, WORDS_PER_DAY } from './vocab-days';
import type { VocabEntry } from '../types';

function makeEntries(n: number): VocabEntry[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    japanese: `語${i}`,
    reading: '',
    romaji: `go${i}`,
    korean: `뜻${i}`,
    audioUrl: null,
    skillName: 'X',
    skillIndex: 1,
  }));
}

describe('totalDays', () => {
  it('is one day per full block of WORDS_PER_DAY', () => {
    expect(totalDays(WORDS_PER_DAY * 3)).toBe(3);
  });

  it('rounds up for a partial final day', () => {
    expect(totalDays(WORDS_PER_DAY * 3 + 1)).toBe(4);
    expect(totalDays(2806)).toBe(57); // the real dataset: 56 full days + a day of 6
  });

  it('is 0 for no entries', () => {
    expect(totalDays(0)).toBe(0);
  });
});

describe('entriesForDay', () => {
  const entries = makeEntries(2806);

  it('returns the first WORDS_PER_DAY entries for day 1', () => {
    const day1 = entriesForDay(entries, 1);
    expect(day1).toHaveLength(WORDS_PER_DAY);
    expect(day1[0].id).toBe('e0');
    expect(day1[WORDS_PER_DAY - 1].id).toBe(`e${WORDS_PER_DAY - 1}`);
  });

  it('returns the next block for day 2, contiguous with day 1', () => {
    expect(entriesForDay(entries, 2)[0].id).toBe(`e${WORDS_PER_DAY}`);
  });

  it('returns the short remainder on the last day', () => {
    expect(entriesForDay(entries, 57)).toHaveLength(6);
  });

  it('returns an empty array for a day past the end or below 1', () => {
    expect(entriesForDay(entries, 58)).toEqual([]);
    expect(entriesForDay(entries, 0)).toEqual([]);
  });
});
