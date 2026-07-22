import { beforeEach, describe, expect, it } from 'vitest';
import { loadJSON, saveJSON } from './storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the fallback when the key is missing', () => {
    expect(loadJSON('missing', { a: 1 })).toEqual({ a: 1 });
  });

  it('round-trips a saved value', () => {
    saveJSON('k', { a: 1, b: [1, 2, 3] });
    expect(loadJSON('k', {})).toEqual({ a: 1, b: [1, 2, 3] });
  });

  it('returns the fallback when stored JSON is corrupted', () => {
    localStorage.setItem('bad', '{not valid json');
    expect(loadJSON('bad', 'fallback')).toBe('fallback');
  });
});
