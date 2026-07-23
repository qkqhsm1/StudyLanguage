import type { SrsGrade, SrsState, SrsStore } from './types';

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function reviewEntry(prev: SrsState | undefined, grade: SrsGrade, today: Date = new Date()): SrsState {
  const bookmarked = prev?.bookmarked ?? false;
  const easeBefore = prev?.easeFactor ?? DEFAULT_EASE;
  const intervalBefore = prev?.intervalDays ?? 0;

  if (grade === 'unknown') {
    const easeFactor = Math.max(MIN_EASE, easeBefore - 0.2);
    return { grade, easeFactor, intervalDays: 1, dueDate: addDays(today, 1), bookmarked };
  }

  if (grade === 'confusing') {
    const easeFactor = Math.max(MIN_EASE, easeBefore - 0.05);
    const intervalDays = Math.max(1, Math.round(intervalBefore * 1.2));
    return { grade, easeFactor, intervalDays, dueDate: addDays(today, intervalDays), bookmarked };
  }

  const easeFactor = easeBefore + 0.1;
  const intervalDays = intervalBefore === 0 ? 1 : Math.round(intervalBefore * easeFactor);
  return { grade, easeFactor, intervalDays, dueDate: addDays(today, intervalDays), bookmarked };
}

export function toggleBookmark(prev: SrsState | undefined, today: Date = new Date()): SrsState {
  return {
    grade: prev?.grade ?? 'unknown',
    easeFactor: prev?.easeFactor ?? DEFAULT_EASE,
    intervalDays: prev?.intervalDays ?? 0,
    dueDate: prev?.dueDate ?? addDays(today, 0),
    bookmarked: !(prev?.bookmarked ?? false),
  };
}

export function buildTodayQueue<T extends { id: string }>(
  entries: T[],
  srsStore: SrsStore,
  today: Date = new Date(),
): T[] {
  const todayStr = addDays(today, 0);
  return entries.filter((entry) => {
    const state = srsStore[entry.id];
    if (!state) return false;
    return state.bookmarked || state.dueDate <= todayStr;
  });
}
