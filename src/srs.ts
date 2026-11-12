import type { SrsGrade, SrsState, SrsStore } from './types';

const DEFAULT_EASE = 2.5;
const MIN_EASE = 1.3;

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 내가 직접 등급을 고른다. 퀴즈에서 틀린 기록(missed)은 퀴즈에서 다시 맞혀야 지워진다. */
export function reviewEntry(prev: SrsState | undefined, grade: SrsGrade, today: Date = new Date()): SrsState {
  const next = schedule(prev, grade, today);
  if (prev?.missed) next.missed = true;
  return carryReading(next, prev);
}

/** 읽기 표시: true = 읽기를 보고서야 알았다, false = 읽기 없이 알았다, 없으면 이전 표시를 그대로 둔다. */
function carryReading(next: SrsState, prev: SrsState | undefined, reading?: boolean): SrsState {
  if (reading ?? prev?.readingMissed) next.readingMissed = true;
  return next;
}

/** 퀴즈 결과. 틀리면 missed로 따로 담고, 내 표시는 이렇게만 바꾼다:
 *  암기됨이었으면 헷갈림, 아직 표시 안 한 단어면 모름. 모름·헷갈림은 그대로 둔다.
 *  표시 안 한 단어를 맞혔을 때는 보기 없이 직접 써서(recalled) 맞혔을 때만 암기됨으로 둔다 — 보기에서 찍어 맞힌 건 외운 게 아니다.
 *  맞히면 missed를 지운다. */
export function recordQuizAnswer(prev: SrsState | undefined, correct: boolean, today: Date = new Date(), recalled = false, reading?: boolean): SrsState {
  const next = schedule(prev, correct ? 'known' : 'unknown', today);
  const grade = correct ? prev?.grade ?? (recalled ? 'known' : undefined) : prev?.grade === 'known' ? 'confusing' : prev?.grade ?? 'unknown';
  if (grade) next.grade = grade;
  else delete next.grade;
  if (!correct) next.missed = true;
  return carryReading(next, prev, reading);
}

function schedule(prev: SrsState | undefined, grade: SrsGrade, today: Date): SrsState {
  const bookmarked = prev?.bookmarked ?? false;
  const easeBefore = prev?.easeFactor ?? DEFAULT_EASE;
  const intervalBefore = prev?.intervalDays ?? 0;
  // 폰과 PC의 기록을 합칠 때 어느 쪽이 최신인지 가리는 기준(sync.ts).
  const reviewedAt = today.toISOString();

  if (grade === 'unknown') {
    const easeFactor = Math.max(MIN_EASE, easeBefore - 0.2);
    return { grade, easeFactor, intervalDays: 1, dueDate: addDays(today, 1), bookmarked, reviewedAt };
  }

  if (grade === 'confusing') {
    const easeFactor = Math.max(MIN_EASE, easeBefore - 0.05);
    const intervalDays = Math.max(1, Math.round(intervalBefore * 1.2));
    return { grade, easeFactor, intervalDays, dueDate: addDays(today, intervalDays), bookmarked, reviewedAt };
  }

  const easeFactor = easeBefore + 0.1;
  const intervalDays = intervalBefore === 0 ? 1 : Math.round(intervalBefore * easeFactor);
  return { grade, easeFactor, intervalDays, dueDate: addDays(today, intervalDays), bookmarked, reviewedAt };
}

export function toggleBookmark(prev: SrsState | undefined, today: Date = new Date()): SrsState {
  return {
    // 북마크만 했다고 모름이 되지는 않는다.
    ...(prev?.grade ? { grade: prev.grade } : {}),
    ...(prev?.missed ? { missed: true } : {}),
    ...(prev?.readingMissed ? { readingMissed: true } : {}),
    easeFactor: prev?.easeFactor ?? DEFAULT_EASE,
    intervalDays: prev?.intervalDays ?? 0,
    dueDate: prev?.dueDate ?? addDays(today, 0),
    bookmarked: !(prev?.bookmarked ?? false),
    reviewedAt: today.toISOString(),
  };
}

/** 뜻 가리기에서 후리가나를 열면 바로 '읽기 모름'으로 담는다(잘못 눌러 바로 닫으면 off로 되돌린다). 등급·복습일은 그대로. */
export function setReadingMissed(prev: SrsState | undefined, on: boolean, today: Date = new Date()): SrsState {
  const next: SrsState = {
    ...prev,
    easeFactor: prev?.easeFactor ?? DEFAULT_EASE,
    intervalDays: prev?.intervalDays ?? 0,
    dueDate: prev?.dueDate ?? addDays(today, 0),
    bookmarked: prev?.bookmarked ?? false,
    reviewedAt: today.toISOString(),
  };
  if (on) next.readingMissed = true;
  else delete next.readingMissed;
  return next;
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

export interface ReviewBadge {
  label: string;
  urgent: boolean;
}

export function describeReviewStatus(state: SrsState | undefined, today: Date = new Date()): ReviewBadge | null {
  if (!state) return null;
  const todayStr = addDays(today, 0);
  if (state.dueDate <= todayStr) {
    return { label: '오늘 복습', urgent: true };
  }
  const daysUntilDue = Math.round(
    (new Date(`${state.dueDate}T00:00:00Z`).getTime() - new Date(`${todayStr}T00:00:00Z`).getTime()) / 86_400_000,
  );
  return { label: `복습까지 ${daysUntilDue}일`, urgent: false };
}
