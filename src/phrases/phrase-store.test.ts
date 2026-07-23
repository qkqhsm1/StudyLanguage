import { beforeEach, describe, expect, it } from 'vitest';
import { addPhrase, deletePhrase, isComplete, loadPhrases, savePhrases, updatePhrase } from './phrase-store';
import type { CapturedPhrase } from '../types';

const NOW = new Date(2026, 0, 10, 9, 30);

describe('phrase store', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns an empty list when nothing has been captured', () => {
    expect(loadPhrases()).toEqual([]);
  });

  it('captures a Korean phrase with empty japanese/reading and a local created date', () => {
    const phrase = addPhrase('집에 가고 싶어요', NOW);
    expect(phrase).toEqual({
      id: 'my-' + NOW.getTime(),
      korean: '집에 가고 싶어요',
      japanese: '',
      reading: '',
      createdAt: '2026-01-10',
    });
    expect(loadPhrases()).toEqual([phrase]);
  });

  it('trims surrounding whitespace from the captured Korean', () => {
    expect(addPhrase('  물 좀 주세요  ', NOW).korean).toBe('물 좀 주세요');
  });

  it('gives a distinct id when two phrases are captured in the same millisecond', () => {
    const first = addPhrase('첫 번째', NOW);
    const second = addPhrase('두 번째', NOW);
    expect(second.id).not.toBe(first.id);
    expect(loadPhrases()).toHaveLength(2);
  });

  it('fills in the japanese and reading of an existing phrase', () => {
    const phrase = addPhrase('집에 가고 싶어요', NOW);
    updatePhrase(phrase.id, '家に帰りたいです', 'いえにかえりたいです');

    const stored = loadPhrases()[0];
    expect(stored.japanese).toBe('家に帰りたいです');
    expect(stored.reading).toBe('いえにかえりたいです');
    expect(stored.korean).toBe('집에 가고 싶어요');
  });

  it('ignores an update for an id that does not exist', () => {
    addPhrase('집에 가고 싶어요', NOW);
    updatePhrase('my-nonexistent', 'X', 'Y');
    expect(loadPhrases()[0].japanese).toBe('');
  });

  it('deletes a phrase by id and leaves the others alone', () => {
    const first = addPhrase('첫 번째', NOW);
    const second = addPhrase('두 번째', NOW);
    deletePhrase(first.id);

    const remaining = loadPhrases();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(second.id);
  });

  it('treats a phrase as complete only once its japanese is filled in', () => {
    const empty: CapturedPhrase = { id: 'a', korean: 'ㄱ', japanese: '', reading: '', createdAt: '2026-01-10' };
    expect(isComplete(empty)).toBe(false);
    expect(isComplete({ ...empty, japanese: '家' })).toBe(true);
    // reading is optional — it must not affect completeness
    expect(isComplete({ ...empty, japanese: '家', reading: 'いえ' })).toBe(true);
    expect(isComplete({ ...empty, reading: 'いえ' })).toBe(false);
  });

  it('round-trips a list through savePhrases', () => {
    const phrases: CapturedPhrase[] = [
      { id: 'a', korean: 'ㄱ', japanese: '', reading: '', createdAt: '2026-01-10' },
    ];
    savePhrases(phrases);
    expect(loadPhrases()).toEqual(phrases);
  });
});
