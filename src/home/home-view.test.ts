import { beforeEach, describe, expect, it } from 'vitest';
import { renderHomeView } from './home-view';
import { loadJSON, saveJSON } from '../storage';
import { savePhrases } from '../phrases/phrase-store';
import { SENTENCES } from '../data/sentences-data';
import type { CapturedPhrase, SrsStore } from '../types';

const TODAY = new Date(2026, 0, 10, 9, 30);

function dueState(dueDate: string) {
  return { grade: 'unknown' as const, intervalDays: 1, easeFactor: 2.3, dueDate, bookmarked: false };
}

describe('renderHomeView', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows today-due counts for both vocab and sentences, and a fresh streak of 1', () => {
    saveJSON('srs-store', { '1-おちゃ': dueState('2026-01-10') } satisfies SrsStore);
    saveJSON('srs-store-sentences', {
      [SENTENCES.entries[0].id]: dueState('2026-01-10'),
      [SENTENCES.entries[1].id]: dueState('2026-01-09'),
    } satisfies SrsStore);

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

  it('previews due word cards with working grade buttons', () => {
    saveJSON('srs-store', { '1-おちゃ': dueState('2026-01-10') } satisfies SrsStore);

    const view = renderHomeView(TODAY);
    const gradeBtn = view.querySelector<HTMLButtonElement>('.home-vocab-column .srs-grade-known');
    expect(gradeBtn).not.toBeNull();

    gradeBtn!.click();
    const stored = JSON.parse(localStorage.getItem('srs-store') ?? '{}');
    expect(stored['1-おちゃ'].grade).toBe('known');
  });

  it('previews due sentence cards', () => {
    saveJSON('srs-store-sentences', { [SENTENCES.entries[0].id]: dueState('2026-01-10') } satisfies SrsStore);

    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-sentence-column .sentence-card')).not.toBeNull();
  });

  it('shows an empty-state message in each column when nothing is due', () => {
    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-vocab-column .home-column-empty')).not.toBeNull();
    expect(view.querySelector('.home-sentence-column .home-column-empty')).not.toBeNull();
  });

  it('caps the preview at three cards and says how many more there are', () => {
    const store: SrsStore = {};
    for (const entry of SENTENCES.entries.slice(0, 5)) {
      store[entry.id] = dueState('2026-01-10');
    }
    saveJSON('srs-store-sentences', store);

    const view = renderHomeView(TODAY);
    expect(view.querySelectorAll('.home-sentence-column .sentence-card')).toHaveLength(3);
    expect(view.querySelector('.home-sentence-column .home-column-more')?.textContent).toContain('2');
  });

  it('captures a phrase typed into the home capture box', () => {
    const view = renderHomeView(TODAY);
    const input = view.querySelector<HTMLInputElement>('.phrase-capture-input')!;
    input.value = '물 좀 주세요';
    view.querySelector<HTMLButtonElement>('.phrase-capture-submit')!.click();

    expect(loadJSON<CapturedPhrase[]>('captured-phrases', []).map((p) => p.korean)).toEqual(['물 좀 주세요']);
  });

  it('refuses to capture a whitespace-only phrase from home', () => {
    // addPhrase itself does not validate, so this guard lives in the capture box.
    const view = renderHomeView(TODAY);
    view.querySelector<HTMLInputElement>('.phrase-capture-input')!.value = '   ';
    view.querySelector<HTMLButtonElement>('.phrase-capture-submit')!.click();

    expect(loadJSON<CapturedPhrase[]>('captured-phrases', [])).toEqual([]);
  });

  it('lists pending phrases in the capture box', () => {
    savePhrases([{ id: 'my-1', korean: '아직 안 채운 문장', japanese: '', reading: '', createdAt: '2026-01-10' }]);
    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-pending-list')?.textContent).toContain('아직 안 채운 문장');
  });

  it('counts a completed captured phrase toward the sentence review total', () => {
    const phrase: CapturedPhrase = { id: 'my-1', korean: 'ㄱ', japanese: '家', reading: 'いえ', createdAt: '2026-01-10' };
    savePhrases([phrase]);
    saveJSON('srs-store-sentences', { 'my-1': dueState('2026-01-10') } satisfies SrsStore);

    const view = renderHomeView(TODAY);
    expect(view.querySelector('.home-stat-sentence .home-stat-value')?.textContent).toBe('1');
  });
});
