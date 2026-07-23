import { beforeEach, describe, expect, it } from 'vitest';
import { renderInterpretPractice } from './interpret-view';
import { SENTENCES } from '../data/sentences-data';
import { savePhrases } from '../phrases/phrase-store';
import type { CapturedPhrase } from '../types';

describe('renderInterpretPractice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hides the answer and grade buttons until reveal is clicked, then shows the correct translation', () => {
    const view = renderInterpretPractice(() => 0);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;

    expect(view.querySelector('.interpret-answer')!.classList.contains('hidden')).toBe(true);
    expect(view.querySelector('.interpret-grades')!.classList.contains('hidden')).toBe(true);

    view.querySelector<HTMLButtonElement>('.interpret-reveal')!.click();

    const answer = view.querySelector('.interpret-answer')!;
    expect(answer.classList.contains('hidden')).toBe(false);
    expect(answer.textContent).toContain(current.korean);
    expect(answer.textContent).toContain(current.english);
    expect(view.querySelector('.interpret-grades')!.classList.contains('hidden')).toBe(false);
  });

  it('persists the chosen grade under the sentence SRS store', () => {
    const view = renderInterpretPractice(() => 0);
    const currentId = view.dataset.currentId!;
    view.querySelector<HTMLButtonElement>('.interpret-reveal')!.click();
    view.querySelector<HTMLButtonElement>('.interpret-grade-known')!.click();

    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('known');
  });

  it('reveals a captured phrase (no english) with no trailing separator', () => {
    const captured: CapturedPhrase = {
      id: 'my-captured-1',
      korean: '집에 가고 싶어요',
      japanese: '家に帰りたいです',
      reading: 'いえにかえりたいです',
      createdAt: '2026-01-10',
    };
    savePhrases([captured]);

    // No SRS state exists yet, so the due queue is empty and pickQueue falls back
    // to all entries: built-ins first, then the captured phrase appended last.
    const view = renderInterpretPractice(() => 0.999999);
    expect(view.dataset.currentId).toBe(captured.id);

    view.querySelector<HTMLButtonElement>('.interpret-reveal')!.click();
    const answer = view.querySelector('.interpret-answer')!;
    expect(answer.textContent).toBe(captured.korean);
  });
});
