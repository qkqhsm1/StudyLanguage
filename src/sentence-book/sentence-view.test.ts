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
});

describe('renderCategoryList', () => {
  it('renders one link per category pointing at the category route', () => {
    const list = renderCategoryList(['Greetings', 'Cafe']);
    const links = list.querySelectorAll('a');
    expect(links).toHaveLength(2);
    expect(links[1].getAttribute('href')).toBe('#/sentences/category/Cafe');
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
