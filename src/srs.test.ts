import { describe, expect, it } from 'vitest';
import { buildTodayQueue, reviewEntry, toggleBookmark } from './srs';
import type { SrsStore, VocabEntry } from './types';

const TODAY = new Date('2026-01-01T00:00:00Z');

describe('reviewEntry', () => {
  it('schedules a 1-day interval and lowers ease when grade is unknown', () => {
    const state = reviewEntry(undefined, 'unknown', TODAY);
    expect(state.intervalDays).toBe(1);
    expect(state.dueDate).toBe('2026-01-02');
    expect(state.easeFactor).toBeCloseTo(2.3);
    expect(state.bookmarked).toBe(false);
  });

  it('grows the interval using the ease factor when grade is known', () => {
    const first = reviewEntry(undefined, 'known', TODAY);
    expect(first.intervalDays).toBe(1);
    expect(first.easeFactor).toBeCloseTo(2.6);

    const second = reviewEntry(first, 'known', new Date('2026-01-02T00:00:00Z'));
    expect(second.easeFactor).toBeCloseTo(2.7);
    expect(second.intervalDays).toBe(3); // Math.round(prevInterval(1) * newEase(2.7))
  });

  it('preserves an existing bookmark across reviews', () => {
    const bookmarked = toggleBookmark(undefined, TODAY);
    const reviewed = reviewEntry(bookmarked, 'confusing', TODAY);
    expect(reviewed.bookmarked).toBe(true);
  });

  it('never lowers ease factor below 1.3', () => {
    let state: ReturnType<typeof reviewEntry> | undefined;
    for (let i = 0; i < 20; i++) {
      state = reviewEntry(state, 'unknown', TODAY);
    }
    expect(state!.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});

describe('toggleBookmark', () => {
  it('bookmarks an entry with no prior state', () => {
    const state = toggleBookmark(undefined, TODAY);
    expect(state.bookmarked).toBe(true);
    expect(state.grade).toBe('unknown');
  });

  it('un-bookmarks a previously bookmarked entry without touching its grade', () => {
    const bookmarked = toggleBookmark(undefined, TODAY);
    const reviewed = reviewEntry(bookmarked, 'known', TODAY);
    const unbookmarked = toggleBookmark(reviewed, TODAY);
    expect(unbookmarked.bookmarked).toBe(false);
    expect(unbookmarked.grade).toBe('known');
  });
});

describe('buildTodayQueue', () => {
  const entries: VocabEntry[] = [
    { id: 'a', japanese: 'あ', reading: 'あ', romaji: 'a', korean: 'a', audioUrl: null, skillName: 'X', skillIndex: 1 },
    { id: 'b', japanese: 'い', reading: 'い', romaji: 'i', korean: 'i', audioUrl: null, skillName: 'X', skillIndex: 1 },
    { id: 'c', japanese: 'う', reading: 'う', romaji: 'u', korean: 'u', audioUrl: null, skillName: 'X', skillIndex: 1 },
  ];

  it('includes entries due today or earlier, and bookmarked entries regardless of due date', () => {
    const store: SrsStore = {
      a: { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-01', bookmarked: false },
      b: { grade: 'known', intervalDays: 30, easeFactor: 2.6, dueDate: '2026-06-01', bookmarked: true },
    };
    const queue = buildTodayQueue(entries, store, TODAY);
    expect(queue.map((e) => e.id)).toEqual(['a', 'b']);
  });
});
