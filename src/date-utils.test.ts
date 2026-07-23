import { describe, expect, it } from 'vitest';
import { toLocalDateStr } from './date-utils';

describe('toLocalDateStr', () => {
  it('formats a date as YYYY-MM-DD using local components', () => {
    expect(toLocalDateStr(new Date(2026, 0, 10, 8, 0))).toBe('2026-01-10');
  });

  it('zero-pads single-digit months and days', () => {
    expect(toLocalDateStr(new Date(2026, 2, 5, 12, 0))).toBe('2026-03-05');
  });

  it('uses the local day even late at night, when UTC has already rolled over', () => {
    // 22:00 KST is 13:00 UTC the same day, but 00:30 KST would be 15:30 UTC the
    // *previous* day — the local components must win either way.
    expect(toLocalDateStr(new Date(2026, 0, 10, 22, 0))).toBe('2026-01-10');
    expect(toLocalDateStr(new Date(2026, 0, 10, 0, 30))).toBe('2026-01-10');
  });
});
