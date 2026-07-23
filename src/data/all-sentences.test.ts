import { beforeEach, describe, expect, it } from 'vitest';
import { allCategories, allSentences, composableSentences, MY_PHRASES_CATEGORY, toSentenceEntry } from './all-sentences';
import { SENTENCES } from './sentences-data';
import { savePhrases } from '../phrases/phrase-store';
import type { CapturedPhrase } from '../types';

const COMPLETE_WITH_READING: CapturedPhrase = {
  id: 'my-1', korean: '집에 가고 싶어요', japanese: '家に帰りたいです', reading: 'いえにかえりたいです', createdAt: '2026-01-10',
};
const COMPLETE_NO_READING: CapturedPhrase = {
  id: 'my-2', korean: '지금 몇 시예요?', japanese: '今何時ですか', reading: '', createdAt: '2026-01-10',
};
const UNFILLED: CapturedPhrase = {
  id: 'my-3', korean: '아직 안 채운 문장', japanese: '', reading: '', createdAt: '2026-01-10',
};

describe('toSentenceEntry', () => {
  it('converts a captured phrase into a sentence entry under the my-phrases category', () => {
    expect(toSentenceEntry(COMPLETE_WITH_READING)).toEqual({
      id: 'my-1',
      japanese: '家に帰りたいです',
      reading: 'いえにかえりたいです',
      korean: '집에 가고 싶어요',
      english: '',
      category: MY_PHRASES_CATEGORY,
    });
  });
});

describe('allSentences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns only the built-in sentences when nothing has been captured', () => {
    expect(allSentences()).toEqual(SENTENCES.entries);
  });

  it('appends completed phrases and leaves unfilled ones out', () => {
    savePhrases([COMPLETE_WITH_READING, UNFILLED, COMPLETE_NO_READING]);

    const result = allSentences();
    expect(result).toHaveLength(SENTENCES.entries.length + 2);
    expect(result.map((e) => e.id)).toContain('my-1');
    expect(result.map((e) => e.id)).toContain('my-2');
    expect(result.map((e) => e.id)).not.toContain('my-3');
  });

  it('keeps every built-in sentence intact', () => {
    savePhrases([COMPLETE_WITH_READING]);
    for (const builtin of SENTENCES.entries) {
      expect(allSentences()).toContainEqual(builtin);
    }
  });
});

describe('composableSentences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('excludes completed phrases that have no kana reading', () => {
    savePhrases([COMPLETE_WITH_READING, COMPLETE_NO_READING]);

    const ids = composableSentences().map((e) => e.id);
    expect(ids).toContain('my-1');
    expect(ids).not.toContain('my-2');
  });

  it('never yields a sentence that cannot be typed on the kana keyboard', () => {
    savePhrases([COMPLETE_NO_READING]);
    expect(composableSentences().every((e) => e.reading !== '')).toBe(true);
  });
});

describe('allCategories', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists only the built-in categories when nothing is captured', () => {
    expect(allCategories()).toEqual(SENTENCES.categories);
  });

  it('adds the my-phrases category once at least one phrase is complete', () => {
    savePhrases([UNFILLED]);
    expect(allCategories()).not.toContain(MY_PHRASES_CATEGORY);

    savePhrases([COMPLETE_WITH_READING]);
    expect(allCategories()).toContain(MY_PHRASES_CATEGORY);
  });
});
