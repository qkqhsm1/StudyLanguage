import { beforeEach, describe, expect, it } from 'vitest';
import { renderHomeView } from './home-view';
import { loadJSON, saveJSON } from '../storage';
import { SENTENCES } from '../data/sentences-data';
import type { SrsStore } from '../types';

const TODAY = new Date('2026-01-10T00:00:00Z');

describe('renderHomeView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows today-due counts for both vocab and sentences, and a fresh streak of 1', () => {
    // Seed each store under its own key with a different number of due entries, so a
    // swapped or misspelled key shows up as a wrong count rather than passing silently.
    const vocabStore: SrsStore = {
      '1-おちゃ': { grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-10', bookmarked: false },
    };
    saveJSON('srs-store', vocabStore);

    const sentenceStore: SrsStore = {
      [SENTENCES.entries[0].id]: {
        grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-10', bookmarked: false,
      },
      [SENTENCES.entries[1].id]: {
        grade: 'unknown', intervalDays: 1, easeFactor: 2.3, dueDate: '2026-01-09', bookmarked: false,
      },
    };
    saveJSON('srs-store-sentences', sentenceStore);

    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-stat-vocab .home-stat-value')?.textContent).toBe('1');
    expect(view.querySelector('.home-stat-sentence .home-stat-value')?.textContent).toBe('2');
    expect(view.querySelector('.home-stat-streak .home-stat-value')?.textContent).toContain('1');
  });

  it('persists the streak across renders on the same day', () => {
    renderHomeView(TODAY);
    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-stat-streak .home-stat-value')?.textContent).toContain('1');
    expect(loadJSON('streak-state', { lastDate: '', streak: 0 }).streak).toBe(1);
  });

  it('renders one entry-point link per feature', () => {
    const view = renderHomeView(TODAY);
    const hrefs = Array.from(view.querySelectorAll<HTMLAnchorElement>('.home-link')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(['#/vocab', '#/kana', '#/sentences', '#/practice']);
  });
});
