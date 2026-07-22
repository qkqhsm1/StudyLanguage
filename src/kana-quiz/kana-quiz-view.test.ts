import { describe, expect, it } from 'vitest';
import { renderKanaQuizView } from './kana-quiz-view';

describe('renderKanaQuizView', () => {
  it('renders a question with a text answer input and shows correct feedback', () => {
    const view = renderKanaQuizView();
    const questionChar = view.querySelector<HTMLElement>('.kana-question')?.textContent;
    expect(questionChar).toBeTruthy();

    const input = view.querySelector<HTMLInputElement>('.kana-answer-input')!;
    const correctRomaji = view.dataset.currentRomaji!;
    input.value = correctRomaji;

    const form = view.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(view.querySelector('.kana-feedback')?.textContent).toContain('정답');
  });

  it('shows incorrect feedback for a wrong answer', () => {
    const view = renderKanaQuizView();
    const input = view.querySelector<HTMLInputElement>('.kana-answer-input')!;
    input.value = 'zzz-definitely-wrong';

    const form = view.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(view.querySelector('.kana-feedback')?.textContent).toContain('오답');
  });

  it('advances to a new question when clicking 다음 문제', () => {
    // Deterministic rng: alternates so the picked kana index differs between calls.
    let call = 0;
    const rng = () => (call++ % 2 === 0 ? 0 : 0.999);

    const view = renderKanaQuizView(rng);
    const firstRomaji = view.dataset.currentRomaji;

    const input = view.querySelector<HTMLInputElement>('.kana-answer-input')!;
    input.value = firstRomaji!;
    view.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

    const nextBtn = view.querySelector<HTMLButtonElement>('.kana-next');
    expect(nextBtn).not.toBeNull();
    nextBtn!.click();

    expect(view.dataset.currentRomaji).not.toBe(firstRomaji);
    expect(view.querySelector('.kana-feedback')?.textContent).toBe('');
    expect(view.querySelector<HTMLInputElement>('.kana-answer-input')?.value).toBe('');
  });
});
