import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADVANCE_DELAY_MS, REVEAL_AFTER_WRONG, ROUND_WRONG_DELAY_MS, renderKanaQuizView } from './kana-quiz-view';

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

  describe('one pass through every kana', () => {
    const CLEAN = 46;
    const answerRight = (view: HTMLElement) => {
      submit(view, view.dataset.currentRomaji!);
      vi.advanceTimersByTime(ADVANCE_DELAY_MS);
    };

    it('asks each basic kana once, never repeating one answered correctly, then finishes', () => {
      const view = renderKanaQuizView('hiragana', Math.random, 'round');
      const seen = new Set<string>();
      for (let i = 0; i < CLEAN; i++) {
        const char = view.querySelector('.kana-question')!.textContent!;
        expect(seen.has(char), char).toBe(false);
        seen.add(char);
        answerRight(view);
      }
      expect(seen.size).toBe(CLEAN);
      expect(view.querySelector('.kana-round-title')?.textContent).toContain(`${CLEAN}자`);
      expect(view.querySelector('.kana-answer-input')).toBeNull();
    });

    it('brings a wrong kana back later and only removes it once answered correctly', () => {
      const view = renderKanaQuizView('hiragana', Math.random, 'round');
      const missed = view.querySelector('.kana-question')!.textContent!;

      submit(view, 'zzz-definitely-wrong');
      expect(view.querySelector('.kana-feedback')?.textContent).toContain('정답');
      vi.advanceTimersByTime(ROUND_WRONG_DELAY_MS);

      const order: string[] = [];
      for (let i = 0; i < CLEAN; i++) {
        order.push(view.querySelector('.kana-question')!.textContent!);
        answerRight(view);
      }
      // 나머지 45자를 먼저 풀고 맨 끝에 다시 나온다. 한 판에 정확히 두 번 묻는다.
      expect(order[order.length - 1]).toBe(missed);
      expect(order.filter((char) => char === missed)).toHaveLength(1);
      expect(view.querySelector('.kana-round-note')?.textContent).toContain('1번');
    });

    it('ignores input while waiting after a wrong answer', () => {
      const view = renderKanaQuizView('hiragana', Math.random, 'round');
      submit(view, 'wrong');
      submit(view, 'wrong');
      vi.advanceTimersByTime(ROUND_WRONG_DELAY_MS);
      expect(view.querySelector('.quiz-progress')?.textContent).toContain('틀린 횟수 1번');
    });

    it('restarts after finishing and when the range changes', () => {
      const view = renderKanaQuizView('katakana', Math.random, 'round');
      expect(view.querySelector('.quiz-progress')?.textContent).toContain(`0 / ${CLEAN}자`);
      view.querySelectorAll<HTMLButtonElement>('.kana-group-chip')[1].click();
      expect(view.querySelector('.quiz-progress')?.textContent).toContain(`0 / ${CLEAN + 20}자`);
      view.querySelectorAll<HTMLButtonElement>('.kana-group-chip')[1].click();
      for (let i = 0; i < CLEAN; i++) answerRight(view);
      view.querySelector<HTMLButtonElement>('.kana-round-restart')!.click();
      expect(view.querySelector('.kana-answer-input')).not.toBeNull();
      expect(view.querySelector('.quiz-progress')?.textContent).toContain(`0 / ${CLEAN}자`);
    });

    it('can still repeat kana in random mode', () => {
      const view = renderKanaQuizView('hiragana', () => 0);
      const first = view.querySelector('.kana-question')!.textContent;
      answerRight(view);
      expect(view.querySelector('.kana-question')!.textContent).toBe(first);
    });

    it('links both ways of solving', () => {
      const view = renderKanaQuizView('katakana', Math.random, 'round');
      const links = Array.from(view.querySelectorAll('.segment'));
      expect(links.map((a) => a.getAttribute('href'))).toEqual(['#/kana/katakana', '#/kana/katakana?mode=round']);
      expect(links[1].getAttribute('aria-current')).toBe('true');
    });
  });

  it('asks only the chosen script', () => {
    const scripts = { hiragana: /[ぁ-ゖ]/, katakana: /[ァ-ヺ]/ } as const;
    for (const script of ['hiragana', 'katakana'] as const) {
      for (const pick of [0, 0.5, 0.999]) {
        const view = renderKanaQuizView(script, () => pick);
        expect(view.querySelector('.kana-question')?.textContent).toMatch(scripts[script]);
      }
    }
  });

  it('limits questions to the selected groups and always keeps one on', () => {
    const view = renderKanaQuizView('hiragana', () => 0.999);
    const chips = Array.from(view.querySelectorAll<HTMLButtonElement>('.kana-group-chip'));
    expect(chips.map((c) => c.textContent)).toEqual(['청음', '탁음', '반탁음', '요음']);

    chips[0].click();
    chips[1].click();
    chips[2].click();
    expect(view.querySelector('.kana-question')?.textContent).toHaveLength(2);

    chips[3].click();
    expect(chips[3].getAttribute('aria-pressed')).toBe('true');
  });

  it('adds answered kana to the recent list', () => {
    const view = renderKanaQuizView('hiragana');
    const char = view.querySelector('.kana-question')!.textContent!;
    submit(view, view.dataset.currentRomaji!);
    expect(view.querySelector('.kana-recent')?.textContent).toContain(char);
  });

  it('renders a question and an answer input', () => {
    const view = renderKanaQuizView('hiragana');
    expect(view.querySelector<HTMLElement>('.kana-question')?.textContent).toBeTruthy();
    expect(view.querySelector('.kana-answer-input')).not.toBeNull();
  });

  it('marks a correct answer and flags the card as correct', () => {
    const view = renderKanaQuizView('hiragana');
    submit(view, view.dataset.currentRomaji!);

    expect(view.querySelector('.kana-feedback')?.textContent).toContain('정답');
    expect(view.querySelector('.kana-question-area')?.classList.contains('kana-correct')).toBe(true);
  });

  it('accepts the hangul reading as well as romaji', () => {
    const view = renderKanaQuizView('hiragana');
    submit(view, view.dataset.currentHangul!);
    expect(view.querySelector('.kana-question-area')?.classList.contains('kana-correct')).toBe(true);
  });

  it('switches cleanly from wrong to correct without leaving the wrong state', () => {
    const view = renderKanaQuizView('hiragana');
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
    const view = renderKanaQuizView('hiragana', alternatingRng());
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
    const view = renderKanaQuizView('hiragana', alternatingRng());
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
    const view = renderKanaQuizView('hiragana', alternatingRng());
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
    const view = renderKanaQuizView('hiragana');
    submit(view, 'wrong');

    const feedback = view.querySelector('.kana-feedback')?.textContent ?? '';
    expect(feedback).not.toContain(view.dataset.currentRomaji!);
    expect(view.querySelector('.kana-next')?.classList.contains('hidden')).toBe(true);
  });

  it('reveals the answer and offers a skip once the retry limit is reached', () => {
    const view = renderKanaQuizView('hiragana');
    const romaji = view.dataset.currentRomaji!;

    for (let i = 0; i < REVEAL_AFTER_WRONG; i++) {
      submit(view, 'wrong');
    }

    expect(view.querySelector('.kana-feedback')?.textContent).toContain(romaji);
    expect(view.querySelector('.kana-next')?.classList.contains('hidden')).toBe(false);
  });

  it('moves on when the revealed skip button is clicked', () => {
    const view = renderKanaQuizView('hiragana', alternatingRng());
    const firstRomaji = view.dataset.currentRomaji;

    for (let i = 0; i < REVEAL_AFTER_WRONG; i++) {
      submit(view, 'wrong');
    }
    view.querySelector<HTMLButtonElement>('.kana-next')!.click();

    expect(view.dataset.currentRomaji).not.toBe(firstRomaji);
    expect(view.querySelector('.kana-question-area')?.classList.contains('kana-wrong')).toBe(false);
  });

  it('ignores an empty submission', () => {
    const view = renderKanaQuizView('hiragana');
    submit(view, '   ');

    const area = view.querySelector('.kana-question-area')!;
    expect(area.classList.contains('kana-wrong')).toBe(false);
    expect(area.classList.contains('kana-correct')).toBe(false);
    expect(view.querySelector('.kana-feedback')?.textContent).toBe('');
  });
});
