import { beforeEach, describe, expect, it } from 'vitest';
import { renderVocabQuizHome } from './vocab-quiz-view';
import { renderVocabHome } from './vocab-view';
import vocab from '../data/vocabulary.json';
import type { VocabEntry } from '../types';

const entries = vocab.entries as VocabEntry[];
const render = (hash = '#/vocab/quiz/all') => renderVocabQuizHome(hash, () => 0.31);
function answer(view: HTMLElement, correct: boolean): HTMLButtonElement {
  const entry = entries.find(e => e.id === view.dataset.currentId)!;
  const choices = [...view.querySelectorAll<HTMLButtonElement>('.vocab-quiz-option')];
  return choices.find(b => (b.dataset.entryId === entry.id) === correct)!;
}

describe('vocabulary quiz', () => {
  beforeEach(() => localStorage.clear());

  it('has discoverable global and notebook-scoped entry points', () => {
    const home = renderVocabHome('#/vocab');
    expect(home.querySelector('nav a[href="#/vocab/quiz"]')).not.toBeNull();
    expect(home.querySelector('a.skill-list-item[href="#/vocab/quiz"]')).not.toBeNull();
    expect(renderVocabHome('#/vocab/day/1').querySelector('a[href="#/vocab/quiz/day/1"]')).not.toBeNull();
    expect(renderVocabHome('#/vocab/groups').querySelector('a[href="#/vocab/quiz"]')).not.toBeNull();
    expect(renderVocabHome('#/vocab/group/noun').querySelector('a[href="#/vocab/quiz/group/noun"]')).not.toBeNull();
    expect(renderVocabHome('#/vocab/group/predicate/2').querySelector('a[href="#/vocab/quiz/group/predicate/2"]')).not.toBeNull();
    const picker = render('#/vocab/quiz');
    for (const scope of ['all', 'group/noun', 'group/predicate', 'group/expression']) expect(picker.querySelector(`a[href="#/vocab/quiz/${scope}"]`)).not.toBeNull();
  });

  it('shows a hiragana-only question and five choices without revealing the answer', () => {
    const view = render();
    expect(view.querySelector('.vocab-quiz-question')?.textContent).toMatch(/^[ぁ-ゖー・、。！？「」『』（）\s]+$/u);
    expect(view.querySelectorAll('.vocab-quiz-option')).toHaveLength(5);
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toBe('');
    expect(view.querySelector<HTMLButtonElement>('.vocab-quiz-next')?.hidden).toBe(true);
    expect(localStorage.getItem('srs-store')).toBeNull();
  });

  it('records first answer once, preserves bookmarks/unrelated state and exposes wrong notes', () => {
    const view = render();
    const id = view.dataset.currentId!;
    const bookmarked = { grade: 'known', easeFactor: 2.5, intervalDays: 3, dueDate: '2099-01-01', bookmarked: true };
    localStorage.setItem('srs-store', JSON.stringify({ [id]: bookmarked, unrelated: bookmarked }));
    answer(view, false).click();
    const saved = localStorage.getItem('srs-store');
    const store = JSON.parse(saved!);
    expect(store[id].grade).toBe('unknown');
    expect(store[id].bookmarked).toBe(true);
    expect(store.unrelated).toEqual(bookmarked);
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toContain('정답:');
    expect([...view.querySelectorAll<HTMLButtonElement>('.vocab-quiz-option')].every(b => b.disabled)).toBe(true);
    answer(view, true).click();
    expect(localStorage.getItem('srs-store')).toBe(saved);
    expect(renderVocabHome('#/vocab/wrong').querySelector(`[data-entry-id="${id}"]`)).not.toBeNull();
  });

  it('supports number keys, records a correct answer, and advances only on next', () => {
    const view = render();
    const id = view.dataset.currentId;
    const correct = answer(view, true);
    view.dispatchEvent(new KeyboardEvent('keydown', { key: String(Number(correct.dataset.index) + 1), bubbles: true }));
    expect(JSON.parse(localStorage.getItem('srs-store')!)[id!].grade).toBe('known');
    expect(view.dataset.currentId).toBe(id);
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toContain('정답!');
    view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    expect(view.dataset.currentId).not.toBe(id);
    expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toBe('');
  });

  it('completes ten distinct questions and retries only wrong entries', () => {
    const view = render();
    const ids = new Set<string>();
    let wrongId = '';
    for (let i = 0; i < 10; i++) {
      ids.add(view.dataset.currentId!);
      if (i === 0) wrongId = view.dataset.currentId!;
      answer(view, i !== 0).click();
      view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    }
    expect(ids.size).toBe(10);
    expect(view.querySelector('.vocab-quiz-result')?.textContent).toContain('10문제 중 9개 정답');
    view.querySelector<HTMLButtonElement>('.vocab-quiz-retry')!.click();
    expect(view.dataset.currentId).toBe(wrongId);
    answer(view, true).click();
    view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    expect(view.querySelector('.vocab-quiz-result')?.textContent).toContain('1문제 중 1개 정답');
  });

  it('limits questions to the requested Day or part-of-speech batch', () => {
    for (const [hash, allowed] of [
      ['#/vocab/quiz/day/2', entries.slice(50, 100)],
      ['#/vocab/quiz/group/predicate/2', entries.filter(e => e.studyGroup === 'predicate').slice(50, 100)],
    ] as const) {
      const view = render(hash);
      for (let i = 0; i < 10; i++) {
        expect(allowed.some(e => e.id === view.dataset.currentId)).toBe(true);
        answer(view, true).click();
        view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
      }
      expect(view.querySelector('.vocab-quiz-retry')).toBeNull();
      view.querySelector<HTMLButtonElement>('.vocab-quiz-restart')!.click();
      expect(allowed.some(e => e.id === view.dataset.currentId)).toBe(true);
      expect(view.querySelector('.vocab-quiz-feedback')?.textContent).toBe('');
    }
  });

  it('falls back to the picker on invalid scopes and out-of-range batches', () => {
    for (const hash of ['#/vocab/quiz/day/0', '#/vocab/quiz/day/2x', '#/vocab/quiz/day/99999', '#/vocab/quiz/group/bad', '#/vocab/quiz/group/noun/99999']) {
      const view = render(hash);
      expect(view.querySelector('.vocab-quiz-question')).toBeNull();
      expect(view.querySelector('a[href="#/vocab/quiz/all"]')).not.toBeNull();
    }
  });

  it('preserves the selected direction in picker links and scoped direction switches', () => {
    const picker = render('#/vocab/quiz?direction=ko-ja');
    expect(picker.querySelector('a[href="#/vocab/quiz/all?direction=ko-ja"]')).not.toBeNull();
    expect(picker.querySelector('a[href="#/vocab/quiz/group/noun?direction=ko-ja"]')).not.toBeNull();
    const view = render('#/vocab/quiz/group/predicate/2?direction=ko-ja');
    expect(view.querySelector('a[aria-current="true"]')?.textContent).toBe('한국어 → 일본어');
    expect(view.querySelector('a[href="#/vocab/quiz/group/predicate/2"]')?.textContent).toBe('일본어 → 한국어');
    expect(view.querySelector('.vocab-quiz-question')?.textContent).toMatch(/[가-힣]/);
    expect([...view.querySelectorAll('.vocab-quiz-option')].every(b => !/[가-힣]/.test(b.textContent ?? ''))).toBe(true);
    const entry = entries.find(e => e.id === view.dataset.currentId)!;
    expect(entry.studyGroup).toBe('predicate');
    answer(view, true).click();
    expect(JSON.parse(localStorage.getItem('srs-store')!)[entry.id].grade).toBe('known');
  });

  it('keeps Korean-to-Japanese direction through wrong retry and restart', () => {
    const day = Math.ceil(entries.length / 50);
    const view = render(`#/vocab/quiz/day/${day}?direction=ko-ja`);
    let count = 0;
    let wrongId = '';
    while (!view.querySelector('.vocab-quiz-result')) {
      if (count === 0) wrongId = view.dataset.currentId!;
      answer(view, count !== 0).click();
      view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
      count += 1;
      expect(count).toBeLessThanOrEqual(10);
    }
    view.querySelector<HTMLButtonElement>('.vocab-quiz-retry')!.click();
    expect(view.dataset.currentId).toBe(wrongId);
    expect(view.querySelector('.vocab-quiz-question')?.textContent).toMatch(/[가-힣]/);
    answer(view, true).click();
    view.querySelector<HTMLButtonElement>('.vocab-quiz-next')!.click();
    view.querySelector<HTMLButtonElement>('.vocab-quiz-restart')!.click();
    expect(view.querySelector('.vocab-quiz-question')?.textContent).toMatch(/[가-힣]/);
  });
});
