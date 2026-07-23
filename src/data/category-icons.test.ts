import { describe, expect, it } from 'vitest';
import { categoryIcon } from './category-icons';

describe('categoryIcon', () => {
  it('returns the mapped icon for a known category', () => {
    expect(categoryIcon('Cafe')).toBe('☕');
    expect(categoryIcon('Basics')).toBe('🔤');
    expect(categoryIcon('Travel')).toBe('✈️');
  });

  it('falls back to the default icon for an unmapped category', () => {
    expect(categoryIcon('Some Totally New Category')).toBe('📘');
  });
});
