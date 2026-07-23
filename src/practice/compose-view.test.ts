import { beforeEach, describe, expect, it } from 'vitest';
import { renderComposePractice } from './compose-view';
import { SENTENCES } from '../data/sentences-data';

function clickKey(root: HTMLElement, text: string): void {
  const btn = Array.from(root.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
    (b) => b.textContent === text,
  );
  if (!btn) throw new Error(`key not found: ${text}`);
  btn.click();
}

describe('renderComposePractice', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('marks the answer correct and grades "known" when typed via the keyboard matches exactly', () => {
    // rng always 0 -> picks SENTENCES.entries[0], which is "greetings-1": おはようございます。
    const view = renderComposePractice(() => 0);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;
    expect(current.id).toBe('greetings-1');

    for (const char of current.japanese.replace('。', '')) {
      clickKey(view, char);
    }
    view.querySelector<HTMLButtonElement>('.keyboard-period')!.click();

    view.querySelector<HTMLButtonElement>('.compose-submit')!.click();

    expect(view.querySelector('.compose-feedback')!.textContent).toBe('정답!');
    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('known');
  });

  it('marks the answer correct when typed reading matches a kanji-bearing sentence', () => {
    // rng -> 0.25 picks SENTENCES.entries[10], which is "directions-1": 駅はどこですか。 (reading: えきはどこですか。)
    const view = renderComposePractice(() => 0.25);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;
    expect(current.id).toBe('directions-1');

    for (const char of current.reading.replace('。', '')) {
      clickKey(view, char);
    }
    view.querySelector<HTMLButtonElement>('.keyboard-period')!.click();

    view.querySelector<HTMLButtonElement>('.compose-submit')!.click();

    expect(view.querySelector('.compose-feedback')!.textContent).toBe('정답!');
    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('known');
  });

  it('marks the answer incorrect and still reveals the correct sentence when typed text is wrong', () => {
    const view = renderComposePractice(() => 0);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;

    clickKey(view, 'あ');
    view.querySelector<HTMLButtonElement>('.compose-submit')!.click();

    expect(view.querySelector('.compose-feedback')!.textContent).toBe('오답');
    expect(view.querySelector('.compose-correct-answer')!.textContent).toContain(current.japanese);
    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('unknown');
  });

  it('shows the next expected character and highlights its key when hint is clicked', () => {
    // rng -> 0 picks entries[0] "greetings-1": おはようございます。 reading おはようございます。
    const view = renderComposePractice(() => 0);
    view.querySelector<HTMLButtonElement>('.compose-hint')!.click();

    expect(view.querySelector('.compose-hint-message')?.textContent).toContain('お');
    expect(view.querySelector('.keyboard-key.hint-highlight')?.textContent).toBe('お');
  });

  it('grades a correct answer as confusing instead of known when a hint was used', () => {
    const view = renderComposePractice(() => 0);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;

    view.querySelector<HTMLButtonElement>('.compose-hint')!.click();

    function clickKey(text: string): void {
      const btn = Array.from(view.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
        (b) => b.textContent === text,
      );
      btn!.click();
    }
    for (const char of current.japanese.replace('。', '')) {
      clickKey(char);
    }
    view.querySelector<HTMLButtonElement>('.keyboard-period')!.click();

    view.querySelector<HTMLButtonElement>('.compose-submit')!.click();

    expect(view.querySelector('.compose-feedback')!.textContent).toBe('정답!');
    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('confusing');
  });

  it('marks the answer field as errored once typed text diverges from the reading', () => {
    const view = renderComposePractice(() => 0);
    const field = view.querySelector<HTMLElement>('.compose-answer-field')!;
    expect(field.classList.contains('compose-answer-field-error')).toBe(false);

    const wrongKey = Array.from(view.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
      (b) => b.textContent === 'ん',
    )!;
    wrongKey.click(); // "greetings-1" reading starts with お, so ん is an immediate mismatch
    expect(field.classList.contains('compose-answer-field-error')).toBe(true);
  });
});
