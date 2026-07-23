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

  it('styles the three self-grade buttons alike, so none looks pre-selected', () => {
    const view = renderInterpretPractice(() => 0);
    view.querySelector<HTMLButtonElement>('.interpret-reveal')!.click();

    // Pressing any of them advances immediately, so there is no "selected" state —
    // highlighting 맞았음 in blue made it look like the answer was already right.
    const grades = view.querySelectorAll('.interpret-grade');
    expect(grades).toHaveLength(3);
    expect(view.querySelectorAll('.interpret-grade.btn-primary')).toHaveLength(0);
    for (const btn of grades) {
      expect(btn.classList.contains('btn-plain')).toBe(true);
    }
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

  it('toggles furigana over the kanji, and back off again', () => {
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

    const btn = view.querySelector<HTMLButtonElement>('.reading-toggle-furigana')!;
    const question = view.querySelector('.interpret-question')!;
    expect(question.querySelector('rt')).toBeNull(); // no furigana until revealed

    btn.click();

    // Reading sits only over the kanji runs, not over the kana.
    expect(Array.from(question.querySelectorAll('rt')).map((rt) => rt.textContent)).toEqual(['いえ', 'かえ']);
    expect(question.textContent).toContain('家');
    expect(question.textContent).toContain('りたいです');

    // Pressing again restores the plain sentence — it used to be a one-way reveal.
    btn.click();
    expect(question.querySelector('rt')).toBeNull();
    expect(question.textContent).toBe('家に帰りたいです');
  });

  it('toggles the pronunciation separately, beside the sentence', () => {
    savePhrases([{
      id: 'my-kanji', korean: '집에 가고 싶어요', japanese: '家に帰りたいです',
      reading: 'いえにかえりたいです', createdAt: '2026-01-10',
    }]);
    const view = renderInterpretPractice(() => 0.999999);

    const pron = view.querySelector('.reading-pronunciation')!;
    expect(pron.classList.contains('hidden')).toBe(true);
    // It lives next to the sentence, not tacked on after the bookmark.
    expect(view.querySelector('.practice-sentence-group .reading-pronunciation')).not.toBeNull();

    const btn = view.querySelector<HTMLButtonElement>('.reading-toggle-pronunciation')!;
    btn.click();
    expect(pron.classList.contains('hidden')).toBe(false);
    expect(pron.textContent).toBe('이에니카에리타이데스 · ienikaeritaidesu');
    expect(view.querySelector('.interpret-question rt')).toBeNull(); // furigana untouched

    btn.click();
    expect(pron.classList.contains('hidden')).toBe(true);
  });

  it('offers only the pronunciation toggle for a kana-only sentence', () => {
    // rng 0 -> entries[0], greetings-1 (おはようございます。): nothing to annotate.
    const view = renderInterpretPractice(() => 0);
    const current = SENTENCES.entries.find((e) => e.id === view.dataset.currentId)!;
    expect(current.japanese).toBe(current.reading);
    expect(view.querySelector('.reading-toggle-furigana')).toBeNull();

    view.querySelector<HTMLButtonElement>('.reading-toggle-pronunciation')!.click();
    expect(view.querySelector('.reading-pronunciation')?.textContent).toContain('오하요');
  });

  it('bookmarks the current sentence in place, without moving to a new question', () => {
    const view = renderInterpretPractice(() => 0);
    const currentId = view.dataset.currentId!;

    const bookmark = view.querySelector<HTMLButtonElement>('.bookmark-toggle')!;
    expect(bookmark.textContent).toBe('📑');

    bookmark.click();
    expect(bookmark.textContent).toBe('🔖');
    expect(view.dataset.currentId).toBe(currentId); // did not advance

    const store = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(store[currentId].bookmarked).toBe(true);

    bookmark.click();
    expect(bookmark.textContent).toBe('📑');
    expect(JSON.parse(localStorage.getItem('srs-store-sentences')!)[currentId].bookmarked).toBe(false);
  });
});
