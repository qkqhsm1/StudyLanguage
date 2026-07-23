import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADVANCE_DELAY_MS, REVEAL_AFTER_WRONG, renderKanaQuizView } from './kana-quiz-view';

/** Alternates so consecutive questions pick different kana — lets a test assert
 *  that the view actually moved on rather than re-rendering the same character. */
function alternatingRng(): () => number {
  let call = 0;
  return () => (call++ % 2 === 0 ? 0 : 0.999);
}

function submit(view: HTMLElement, answer: string): void {
  view.querySelector<HTMLInputElement>('.kana-answer-input')!.value = answer;
  view.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
}

describe('renderKanaQuizView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a question and an answer input', () => {
    const view = renderKanaQuizView();
    expect(view.querySelector<HTMLElement>('.kana-question')?.textContent).toBeTruthy();
    expect(view.querySelector('.kana-answer-input')).not.toBeNull();
  });

  it('marks a correct answer and flags the card as correct', () => {
    const view = renderKanaQuizView();
    submit(view, view.dataset.currentRomaji!);

    expect(view.querySelector('.kana-feedback')?.textContent).toContain('정답');
    expect(view.querySelector('.kana-question-area')?.classList.contains('kana-correct')).toBe(true);
  });

  it('accepts the hangul reading as well as romaji', () => {
    const view = renderKanaQuizView();
    submit(view, view.dataset.currentHangul!);
    expect(view.querySelector('.kana-question-area')?.classList.contains('kana-correct')).toBe(true);
  });

  it('switches cleanly from wrong to correct without leaving the wrong state', () => {
    const view = renderKanaQuizView();
    const area = view.querySelector('.kana-question-area')!;

    submit(view, 'zzz-definitely-wrong');
    expect(area.classList.contains('kana-wrong')).toBe(true);

    submit(view, view.dataset.currentRomaji!);
    // The blue correct state must win — the red wrong class can't linger, or the
    // correct-flash CSS gets overridden and the card stays red on a right answer.
    expect(area.classList.contains('kana-correct')).toBe(true);
    expect(area.classList.contains('kana-wrong')).toBe(false);
    expect(view.querySelector('.kana-feedback')?.textContent).toBe('정답!');
  });

  it('advances to the next question on its own after a correct answer', () => {
    const view = renderKanaQuizView(alternatingRng());
    const firstRomaji = view.dataset.currentRomaji;

    submit(view, firstRomaji!);
    // Still on the same question until the delay elapses — the flash needs to be seen.
    expect(view.dataset.currentRomaji).toBe(firstRomaji);

    vi.advanceTimersByTime(ADVANCE_DELAY_MS);

    expect(view.dataset.currentRomaji).not.toBe(firstRomaji);
    expect(view.querySelector('.kana-feedback')?.textContent).toBe('');
    expect(view.querySelector<HTMLInputElement>('.kana-answer-input')?.value).toBe('');
    expect(view.querySelector('.kana-question-area')?.classList.contains('kana-correct')).toBe(false);
  });

  it('ignores further input during the pause before advancing', () => {
    const view = renderKanaQuizView(alternatingRng());
    const firstRomaji = view.dataset.currentRomaji!;

    submit(view, firstRomaji);
    expect(view.querySelector<HTMLInputElement>('.kana-answer-input')!.disabled).toBe(true);

    // A stray second Enter must not queue a second advance.
    submit(view, firstRomaji);
    vi.advanceTimersByTime(ADVANCE_DELAY_MS);
    const afterOneAdvance = view.dataset.currentRomaji;

    vi.advanceTimersByTime(ADVANCE_DELAY_MS);
    expect(view.dataset.currentRomaji).toBe(afterOneAdvance);
  });

  it('flags a wrong answer, clears the input, and keeps the same question', () => {
    const view = renderKanaQuizView(alternatingRng());
    const firstRomaji = view.dataset.currentRomaji;

    submit(view, 'zzz-definitely-wrong');

    expect(view.querySelector('.kana-question-area')?.classList.contains('kana-wrong')).toBe(true);
    expect(view.querySelector<HTMLInputElement>('.kana-answer-input')?.value).toBe('');
    expect(view.dataset.currentRomaji).toBe(firstRomaji);

    // No auto-advance on a wrong answer, however long we wait.
    vi.advanceTimersByTime(ADVANCE_DELAY_MS * 5);
    expect(view.dataset.currentRomaji).toBe(firstRomaji);
  });

  it('does not reveal the answer before the retry limit', () => {
    const view = renderKanaQuizView();
    submit(view, 'wrong');

    const feedback = view.querySelector('.kana-feedback')?.textContent ?? '';
    expect(feedback).not.toContain(view.dataset.currentRomaji!);
    expect(view.querySelector('.kana-next')?.classList.contains('hidden')).toBe(true);
  });

  it('reveals the answer and offers a skip once the retry limit is reached', () => {
    const view = renderKanaQuizView();
    const romaji = view.dataset.currentRomaji!;

    for (let i = 0; i < REVEAL_AFTER_WRONG; i++) {
      submit(view, 'wrong');
    }

    expect(view.querySelector('.kana-feedback')?.textContent).toContain(romaji);
    expect(view.querySelector('.kana-next')?.classList.contains('hidden')).toBe(false);
  });

  it('moves on when the revealed skip button is clicked', () => {
    const view = renderKanaQuizView(alternatingRng());
    const firstRomaji = view.dataset.currentRomaji;

    for (let i = 0; i < REVEAL_AFTER_WRONG; i++) {
      submit(view, 'wrong');
    }
    view.querySelector<HTMLButtonElement>('.kana-next')!.click();

    expect(view.dataset.currentRomaji).not.toBe(firstRomaji);
    expect(view.querySelector('.kana-question-area')?.classList.contains('kana-wrong')).toBe(false);
  });

  it('ignores an empty submission', () => {
    const view = renderKanaQuizView();
    submit(view, '   ');

    const area = view.querySelector('.kana-question-area')!;
    expect(area.classList.contains('kana-wrong')).toBe(false);
    expect(area.classList.contains('kana-correct')).toBe(false);
    expect(view.querySelector('.kana-feedback')?.textContent).toBe('');
  });
});
