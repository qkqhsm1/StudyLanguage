import { toLocalDateStr } from './date-utils';

export interface StreakState {
  lastDate: string;
  streak: number;
}

function yesterdayOf(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return toLocalDateStr(d);
}

export function updateStreak(prev: StreakState | undefined, today: Date = new Date()): StreakState {
  const todayStr = toLocalDateStr(today);

  if (prev?.lastDate === todayStr) {
    return { ...prev };
  }
  if (prev?.lastDate === yesterdayOf(today)) {
    return { lastDate: todayStr, streak: prev.streak + 1 };
  }
  return { lastDate: todayStr, streak: 1 };
}
