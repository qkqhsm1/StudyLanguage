import { beforeEach, describe, expect, it } from 'vitest';
import { addPhrase, deletePhrase, isComplete, loadPhrases, mergePhrases, parsePhrasesFile, savePhrases, updatePhrase } from './phrase-store';
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
    // An imported phrase bypasses updatePhrase's trimming, so whitespace-only
    // japanese must not count as complete — it would render a blank card.
    expect(isComplete({ ...empty, japanese: '   ' })).toBe(false);
  });

  it('round-trips a list through savePhrases', () => {
    const phrases: CapturedPhrase[] = [
      { id: 'a', korean: 'ㄱ', japanese: '', reading: '', createdAt: '2026-01-10' },
    ];
    savePhrases(phrases);
    expect(loadPhrases()).toEqual(phrases);
  });
});

describe('parsePhrasesFile', () => {
  const VALID: CapturedPhrase = { id: 'my-1', korean: 'ㄱ', japanese: '家', reading: 'いえ', createdAt: '2026-01-10' };

  it('parses a valid exported array', () => {
    expect(parsePhrasesFile(JSON.stringify([VALID]))).toEqual([VALID]);
  });

  it('accepts an empty array', () => {
    expect(parsePhrasesFile('[]')).toEqual([]);
  });

  it('returns null for malformed JSON', () => {
    expect(parsePhrasesFile('{not json')).toBeNull();
  });

  it('returns null when the top level is not an array', () => {
    expect(parsePhrasesFile('{"korean":"ㄱ"}')).toBeNull();
  });

  it('returns null when an item is missing required fields', () => {
    expect(parsePhrasesFile('[{"id":"my-1","korean":"ㄱ"}]')).toBeNull();
  });

  it('rejects the whole file when only some items are malformed', () => {
    // Partial application is the dangerous case: importing the good half of a file
    // and silently dropping the rest would be indistinguishable from a full import.
    expect(parsePhrasesFile(JSON.stringify([VALID, VALID, { id: 1 }]))).toBeNull();
  });

  it('returns null when a field has the wrong type', () => {
    expect(parsePhrasesFile('[{"id":1,"korean":"ㄱ","japanese":"","reading":"","createdAt":"2026-01-10"}]')).toBeNull();
  });
});

describe('mergePhrases', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const EXISTING: CapturedPhrase = { id: 'my-1', korean: '기존', japanese: '既存', reading: 'きそん', createdAt: '2026-01-10' };
  const INCOMING_NEW: CapturedPhrase = { id: 'my-2', korean: '새로운', japanese: '', reading: '', createdAt: '2026-01-11' };
  const INCOMING_DUPLICATE: CapturedPhrase = { id: 'my-1', korean: '덮어쓰면 안 됨', japanese: '', reading: '', createdAt: '2026-01-11' };

  it('appends phrases whose ids are not present yet', () => {
    savePhrases([EXISTING]);
    expect(mergePhrases([INCOMING_NEW])).toBe(1);
    expect(loadPhrases().map((p) => p.id)).toEqual(['my-1', 'my-2']);
  });

  it('skips incoming phrases whose id already exists, without overwriting', () => {
    savePhrases([EXISTING]);
    expect(mergePhrases([INCOMING_DUPLICATE])).toBe(0);

    const stored = loadPhrases();
    expect(stored).toHaveLength(1);
    expect(stored[0].korean).toBe('기존');
  });

  it('merges into an empty store', () => {
    expect(mergePhrases([INCOMING_NEW])).toBe(1);
    expect(loadPhrases()).toEqual([INCOMING_NEW]);
  });
});
