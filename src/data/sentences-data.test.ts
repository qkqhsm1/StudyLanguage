import { describe, expect, it } from 'vitest';
import { SENTENCES } from './sentences-data';
import { buildFurigana } from '../practice/furigana';

describe('SENTENCES', () => {
  it('has 8 categories and 40 entries, 5 per category', () => {
    expect(SENTENCES.categories).toHaveLength(8);
    expect(SENTENCES.entries).toHaveLength(40);
    for (const category of SENTENCES.categories) {
      const count = SENTENCES.entries.filter((e) => e.category === category).length;
      expect(count).toBe(5);
    }
  });

  it('has unique, non-empty ids', () => {
    const ids = SENTENCES.entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it('every entry has non-empty japanese/reading/korean/english, and a category present in categories', () => {
    for (const entry of SENTENCES.entries) {
      expect(entry.japanese.length).toBeGreaterThan(0);
      expect(entry.reading.length).toBeGreaterThan(0);
      expect(entry.korean.length).toBeGreaterThan(0);
      expect(entry.english.length).toBeGreaterThan(0);
      expect(SENTENCES.categories).toContain(entry.category);
    }
  });

  it('keeps katakana words in katakana in the reading, aligns furigana, and voices は only where it is a particle', () => {
    for (const entry of SENTENCES.entries) {
      for (const run of entry.japanese.match(/[ァ-ヺー]{2,}/g) ?? []) expect(entry.reading, entry.id).toContain(run);
      expect(buildFurigana(entry.japanese, entry.reading), entry.id).not.toBeNull();
      if (entry.spoken) expect(entry.spoken.length, entry.id).toBe(entry.reading.length);
    }
    expect(SENTENCES.entries.find((e) => e.id === 'greetings-2')?.spoken).toBe('こんにちわ。');
  });

  it('every japanese sentence ends with the full-width period 。', () => {
    for (const entry of SENTENCES.entries) {
      expect(entry.japanese.endsWith('。')).toBe(true);
    }
  });
});
