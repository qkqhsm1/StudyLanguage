import { beforeEach, describe, expect, it } from 'vitest';
import { renderComposePractice } from './compose-view';
import { SENTENCES } from '../data/sentences-data';
import { savePhrases } from '../phrases/phrase-store';

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

  it('does not error the field for a whitespace-only divergence, since grading normalizes whitespace', () => {
    // rng -> 0 picks "greetings-1": おはようございます。
    const view = renderComposePractice(() => 0);
    const field = view.querySelector<HTMLElement>('.compose-answer-field')!;

    clickKey(view, 'お');
    expect(field.classList.contains('compose-answer-field-error')).toBe(false);

    view.querySelector<HTMLButtonElement>('.keyboard-space')!.click(); // emits the ideographic space
    expect(field.classList.contains('compose-answer-field-error')).toBe(false);
  });

  it('clears the highlighted key and hides the hint message as soon as the user types, but keeps hintUsed', () => {
    // rng -> 0 picks "greetings-1": おはようございます。
    const view = renderComposePractice(() => 0);
    view.querySelector<HTMLButtonElement>('.compose-hint')!.click();
    expect(view.querySelector('.keyboard-key.hint-highlight')).not.toBeNull();
    expect(view.querySelector('.compose-hint-message')!.classList.contains('hidden')).toBe(false);

    clickKey(view, 'お'); // press the hinted key itself
    expect(view.querySelector('.keyboard-key.hint-highlight')).toBeNull();
    expect(view.querySelector('.compose-hint-message')!.classList.contains('hidden')).toBe(true);

    // hintUsed must still apply the SRS downgrade even though the highlight is gone
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;
    for (const char of current.japanese.replace('。', '').slice(1)) {
      clickKey(view, char);
    }
    view.querySelector<HTMLButtonElement>('.keyboard-period')!.click();
    view.querySelector<HTMLButtonElement>('.compose-submit')!.click();

    const stored = JSON.parse(localStorage.getItem('srs-store-sentences') ?? '{}');
    expect(stored[currentId].grade).toBe('confusing');
  });

  it('highlights the combo key and explains deleting the last char when the hint is a small youon kana', () => {
    // Find a sentence whose reading has a youon (small ゃゅょ) combo somewhere after its first char.
    const smallKana = ['ゃ', 'ゅ', 'ょ', 'ャ', 'ュ', 'ョ'];
    const entryIndex = SENTENCES.entries.findIndex((e) =>
      smallKana.some((k) => {
        const i = e.reading.indexOf(k);
        return i > 0;
      }),
    );
    expect(entryIndex).toBeGreaterThanOrEqual(0);
    const rng = () => entryIndex / SENTENCES.entries.length;
    const view = renderComposePractice(rng);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;

    const smallIndex = current.reading
      .split('')
      .findIndex((ch, i) => i > 0 && smallKana.includes(ch));
    const combo = current.reading[smallIndex - 1] + current.reading[smallIndex];

    // Type up through the base character right before the combo.
    for (const char of current.reading.slice(0, smallIndex)) {
      clickKey(view, char);
    }

    view.querySelector<HTMLButtonElement>('.compose-hint')!.click();

    expect(view.querySelector('.compose-hint-message')?.textContent).toContain(combo);
    expect(view.querySelector('.compose-hint-message')?.textContent).toContain('⌫');
    expect(view.querySelector('.keyboard-key.hint-highlight')?.textContent).toBe(combo);
  });

  it('hints the whole combo up front with no deletion wording when the base char has not been typed yet', () => {
    const smallKana = ['ゃ', 'ゅ', 'ょ', 'ャ', 'ュ', 'ョ'];
    const entryIndex = SENTENCES.entries.findIndex((e) =>
      smallKana.some((k) => {
        const i = e.reading.indexOf(k);
        return i > 0;
      }),
    );
    const rng = () => entryIndex / SENTENCES.entries.length;
    const view = renderComposePractice(rng);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;

    const smallIndex = current.reading
      .split('')
      .findIndex((ch, i) => i > 0 && smallKana.includes(ch));
    const combo = current.reading[smallIndex - 1] + current.reading[smallIndex];

    // Type up to (but not including) the base char right before the combo.
    for (const char of current.reading.slice(0, smallIndex - 1)) {
      clickKey(view, char);
    }

    view.querySelector<HTMLButtonElement>('.compose-hint')!.click();

    const message = view.querySelector('.compose-hint-message')!.textContent!;
    expect(message).toContain(combo);
    expect(message).not.toContain('⌫');
    expect(view.querySelector('.keyboard-key.hint-highlight')?.textContent).toBe(combo);
  });

  it('keeps the highlight and hint message visible after backspace, since that is how a combo hint is followed', () => {
    // Regression test: Fix A (clear hint on any typing) used to fire on backspace too,
    // wiping the very hint that told the user to press backspace.
    const smallKana = ['ゃ', 'ゅ', 'ょ', 'ャ', 'ュ', 'ョ'];
    const entryIndex = SENTENCES.entries.findIndex((e) =>
      smallKana.some((k) => {
        const i = e.reading.indexOf(k);
        return i > 0;
      }),
    );
    const rng = () => entryIndex / SENTENCES.entries.length;
    const view = renderComposePractice(rng);
    const currentId = view.dataset.currentId!;
    const current = SENTENCES.entries.find((e) => e.id === currentId)!;

    const smallIndex = current.reading
      .split('')
      .findIndex((ch, i) => i > 0 && smallKana.includes(ch));

    // Type up through the base char, so the hint fires the Case B (deletion) flow.
    for (const char of current.reading.slice(0, smallIndex)) {
      clickKey(view, char);
    }

    view.querySelector<HTMLButtonElement>('.compose-hint')!.click();
    expect(view.querySelector('.keyboard-key.hint-highlight')).not.toBeNull();
    expect(view.querySelector('.compose-hint-message')!.classList.contains('hidden')).toBe(false);

    view.querySelector<HTMLButtonElement>('.keyboard-backspace')!.click();

    expect(view.querySelector('.keyboard-key.hint-highlight')).not.toBeNull();
    expect(view.querySelector('.compose-hint-message')!.classList.contains('hidden')).toBe(false);
  });

  it('never asks a captured phrase that has no kana reading', () => {
    // Composition practice is graded by exact match against `reading`, typed on a
    // kana-only keyboard. A phrase filled in with kanji but no reading is therefore
    // unanswerable, and must not be selectable. Captured phrases are appended after
    // the built-ins, so an rng near 1 picks the last entry — which is exactly the
    // reading-less phrase if the view were reading the unfiltered pool.
    savePhrases([
      { id: 'my-no-reading', korean: '지금 몇 시예요?', japanese: '今何時ですか', reading: '', createdAt: '2026-01-10' },
    ]);

    const view = renderComposePractice(() => 0.999999);
    expect(view.dataset.currentId).not.toBe('my-no-reading');
  });

  it('can ask a captured phrase that does have a kana reading', () => {
    savePhrases([
      { id: 'my-with-reading', korean: '집에 가고 싶어요', japanese: '家に帰りたいです', reading: 'いえにかえりたいです', createdAt: '2026-01-10' },
    ]);

    const view = renderComposePractice(() => 0.999999);
    expect(view.dataset.currentId).toBe('my-with-reading');
  });
});
