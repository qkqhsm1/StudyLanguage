import type { VocabEntry } from '../types';

/** 하루 학습 분량. 단어는 이미 스킬(난이도) 순서로 정렬돼 있으므로, 앞에서부터
 *  이만큼씩 잘라 Day 1, 2, 3… 으로 묶는다 — 워드마스터식 점증 구성. */
export const WORDS_PER_DAY = 50;

/** 전체 단어를 담는 데 필요한 Day 수. 마지막 Day는 덜 찰 수 있다. */
export function totalDays(entryCount: number): number {
  return Math.ceil(entryCount / WORDS_PER_DAY);
}

/** day는 1부터. 범위를 벗어나면 빈 배열. */
export function entriesForDay(entries: VocabEntry[], day: number): VocabEntry[] {
  if (day < 1) return [];
  const start = (day - 1) * WORDS_PER_DAY;
  return entries.slice(start, start + WORDS_PER_DAY);
}
