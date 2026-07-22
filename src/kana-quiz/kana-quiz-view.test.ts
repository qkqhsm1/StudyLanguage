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
});
