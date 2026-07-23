export interface StreakState {
  lastDate: string;
  streak: number;
}

function toDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function yesterdayOf(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return toDateStr(d);
}

export function updateStreak(prev: StreakState | undefined, today: Date = new Date()): StreakState {
  const todayStr = toDateStr(today);

  if (prev?.lastDate === todayStr) {
    return { ...prev };
  }
  if (prev?.lastDate === yesterdayOf(today)) {
    return { lastDate: todayStr, streak: prev.streak + 1 };
  }
  return { lastDate: todayStr, streak: 1 };
}
