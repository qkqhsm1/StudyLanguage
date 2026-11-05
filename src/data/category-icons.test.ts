import { describe, expect, it } from 'vitest';
import { categoryIcon, renderIconLinkList } from './category-icons';

describe('categoryIcon', () => {
  it('returns the mapped icon for a known category', () => {
    expect(categoryIcon('Cafe')).toBe('茶');
    expect(categoryIcon('Greetings')).toBe('挨');
    expect(categoryIcon('Travel')).toBe('旅');
  });

  it('falls back to the default icon for an unmapped category', () => {
    expect(categoryIcon('Some Totally New Category')).toBe('文');
  });
});

describe('renderIconLinkList', () => {
  it('renders one item per entry with icon, name, and href built from the prefix', () => {
    const list = renderIconLinkList(['Basics', 'Cafe'], '#/vocab/skill/');
    const links = list.querySelectorAll<HTMLAnchorElement>('a.skill-list-item');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/vocab/skill/Cafe');
    expect(links[1].querySelector('.skill-list-icon')?.textContent).toBe('茶');
    expect(links[1].querySelector('.skill-list-name')?.textContent).toBe('카페');
  });
});
