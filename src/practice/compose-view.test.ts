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
});
