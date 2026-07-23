import { describe, expect, it } from 'vitest';
import { updateStreak } from './streak';

const TODAY = new Date('2026-01-10T00:00:00Z');

describe('updateStreak', () => {
  it('starts a streak of 1 when there is no prior record', () => {
    expect(updateStreak(undefined, TODAY)).toEqual({ lastDate: '2026-01-10', streak: 1 });
  });

  it('leaves the streak unchanged when already recorded today', () => {
    const prev = { lastDate: '2026-01-10', streak: 5 };
    expect(updateStreak(prev, TODAY)).toEqual({ lastDate: '2026-01-10', streak: 5 });
  });

  it('increments the streak when the last visit was yesterday', () => {
    const prev = { lastDate: '2026-01-09', streak: 5 };
    expect(updateStreak(prev, TODAY)).toEqual({ lastDate: '2026-01-10', streak: 6 });
  });

  it('resets the streak to 1 when there is a gap of more than one day', () => {
    const prev = { lastDate: '2026-01-01', streak: 5 };
    expect(updateStreak(prev, TODAY)).toEqual({ lastDate: '2026-01-10', streak: 1 });
  });

  it('treats the previous day as yesterday across a year boundary', () => {
    const prev = { lastDate: '2025-12-31', streak: 5 };
    const newYear = new Date('2026-01-01T00:00:00Z');
    expect(updateStreak(prev, newYear)).toEqual({ lastDate: '2026-01-01', streak: 6 });
  });

  it('treats the previous day as yesterday across a month boundary', () => {
    const prev = { lastDate: '2026-02-28', streak: 3 };
    const marchFirst = new Date('2026-03-01T00:00:00Z');
    expect(updateStreak(prev, marchFirst)).toEqual({ lastDate: '2026-03-01', streak: 4 });
  });

  it('does not double-increment across a UTC day boundary within the same local day (KST)', () => {
    const morning = new Date(2026, 0, 10, 8, 0); // local 08:00
    const night = new Date(2026, 0, 10, 22, 0); // local 22:00, same local day
    const first = updateStreak(undefined, morning);
    expect(first).toEqual({ lastDate: '2026-01-10', streak: 1 });
    const second = updateStreak(first, night);
    expect(second).toEqual({ lastDate: '2026-01-10', streak: 1 });
  });
});
