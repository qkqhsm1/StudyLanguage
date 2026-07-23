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
});
