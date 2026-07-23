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

  it('offers a reading reveal for a sentence whose kanji reads differently', () => {
    const captured: CapturedPhrase = {
      id: 'my-kanji',
      korean: '집에 가고 싶어요',
      japanese: '家に帰りたいです',
      reading: 'いえにかえりたいです',
      createdAt: '2026-01-10',
    };
    savePhrases([captured]);
    const view = renderInterpretPractice(() => 0.999999);
    expect(view.dataset.currentId).toBe('my-kanji');

    const reveal = view.querySelector<HTMLButtonElement>('.interpret-reading-reveal')!;
    expect(reveal).not.toBeNull();

    const reading = view.querySelector('.interpret-reading')!;
    expect(reading.classList.contains('hidden')).toBe(true);

    reveal.click();
    expect(reading.classList.contains('hidden')).toBe(false);
    expect(reading.textContent).toBe('いえにかえりたいです');
    expect(reveal.classList.contains('hidden')).toBe(true);
  });

  it('omits the reading reveal for a kana-only sentence', () => {
    // rng 0 -> entries[0], greetings-1 (おはようございます。), whose reading equals
    // its japanese, so there is no kanji to look up.
    const view = renderInterpretPractice(() => 0);
    const current = SENTENCES.entries.find((e) => e.id === view.dataset.currentId)!;
    expect(current.japanese).toBe(current.reading);
    expect(view.querySelector('.interpret-reading-reveal')).toBeNull();
  });
});
