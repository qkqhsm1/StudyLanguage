import { beforeEach, describe, expect, it } from 'vitest';
import { renderCategoryList, renderSentenceBookHome, renderSentenceCard } from './sentence-view';
import type { SentenceEntry } from '../types';

const ENTRY: SentenceEntry = {
  id: 'greetings-1',
  japanese: 'おはようございます。',
  reading: 'おはようございます。',
  korean: '안녕하세요. (아침 인사)',
  english: 'Good morning.',
  category: 'Greetings',
};

describe('renderSentenceCard', () => {
  it('hides the translation until the reveal button is clicked', () => {
    const card = renderSentenceCard(ENTRY, undefined);
    const translation = card.querySelector<HTMLElement>('.sentence-translation')!;
    expect(translation.classList.contains('hidden')).toBe(true);

    card.querySelector<HTMLButtonElement>('.sentence-reveal')!.click();
    expect(translation.classList.contains('hidden')).toBe(false);
    expect(translation.textContent).toContain('Good morning.');
  });

  it('shows a category badge with the mapped icon', () => {
    const card = renderSentenceCard(ENTRY, undefined);
    expect(card.querySelector('.badge-category')?.textContent).toBe('👋 Greetings');
  });

  it('shows korean / english for a built-in entry with both fields', () => {
    const card = renderSentenceCard(ENTRY, undefined);
    expect(card.querySelector('.sentence-translation')?.textContent).toBe('안녕하세요. (아침 인사) / Good morning.');
  });

  it('shows only korean, with no trailing separator, for a captured phrase with no english', () => {
    const captured: SentenceEntry = { ...ENTRY, english: '' };
    const card = renderSentenceCard(captured, undefined);
    expect(card.querySelector('.sentence-translation')?.textContent).toBe('안녕하세요. (아침 인사)');
  });
});

describe('renderCategoryList', () => {
  it('renders one item per category with an icon and link to the category route', () => {
    const list = renderCategoryList(['Greetings', 'Cafe']);
    const links = list.querySelectorAll('a.skill-list-item');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/sentences/category/Cafe');
    expect(links[1].querySelector('.skill-list-icon')?.textContent).toBe('☕');
  });
});

describe('renderSentenceBookHome integration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('grading a sentence card persists SRS state under the sentence-specific storage key', () => {
    const view = renderSentenceBookHome('#/sentences/category/Greetings');
    const knownButton = view.querySelector<HTMLButtonElement>('.srs-grade-known');
    expect(knownButton).not.toBeNull();
    knownButton!.click();

    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    const gradedId = knownButton!.dataset.entryId!;
    expect(stored[gradedId].grade).toBe('known');
    expect(localStorage.getItem('srs-store')).toBeNull();
  });
});
