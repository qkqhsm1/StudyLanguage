import { describe, expect, it } from 'vitest';
import { SENTENCES } from './sentences-data';

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

  it('every japanese sentence ends with the full-width period 。', () => {
    for (const entry of SENTENCES.entries) {
      expect(entry.japanese.endsWith('。')).toBe(true);
    }
  });
});
