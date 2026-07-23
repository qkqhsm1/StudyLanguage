export interface StreakState {
  lastDate: string;
  streak: number;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function yesterdayOf(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  return toDateStr(d);
}

export function updateStreak(prev: StreakState | undefined, today: Date = new Date()): StreakState {
  const todayStr = toDateStr(today);

  if (prev?.lastDate === todayStr) {
    return prev;
  }
  if (prev?.lastDate === yesterdayOf(today)) {
    return { lastDate: todayStr, streak: prev.streak + 1 };
  }
  return { lastDate: todayStr, streak: 1 };
}
