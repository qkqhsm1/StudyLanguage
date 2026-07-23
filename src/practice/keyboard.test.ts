import { describe, expect, it, vi } from 'vitest';
import { renderKanaKeyboard } from './keyboard';
import { SENTENCES } from '../data/sentences-data';

function findKey(root: HTMLElement, text: string): HTMLButtonElement {
  const btn = Array.from(root.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
    (b) => b.textContent === text,
  );
  if (!btn) throw new Error(`key not found: ${text}`);
  return btn;
}

describe('renderKanaKeyboard', () => {
  it('calls onChar with the clicked hiragana character by default', () => {
    const onChar = vi.fn();
    const el = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    findKey(el, 'あ').click();
    expect(onChar).toHaveBeenCalledWith('あ');
  });

  it('switches to katakana after clicking the toggle button', () => {
    const onChar = vi.fn();
    const el = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    el.querySelector<HTMLButtonElement>('.keyboard-toggle')!.click();
    findKey(el, 'ア').click();
    expect(onChar).toHaveBeenCalledWith('ア');
  });

  it('includes dakuten characters (needed to type most real sentences)', () => {
    const onChar = vi.fn();
    const el = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    findKey(el, 'ご').click();
    expect(onChar).toHaveBeenCalledWith('ご');
  });

  it('wires backspace, clear, space, and period controls', () => {
    const onChar = vi.fn();
    const onBackspace = vi.fn();
    const onClear = vi.fn();
    const el = renderKanaKeyboard({ onChar, onBackspace, onClear });

    el.querySelector<HTMLButtonElement>('.keyboard-backspace')!.click();
    expect(onBackspace).toHaveBeenCalledTimes(1);

    el.querySelector<HTMLButtonElement>('.keyboard-clear')!.click();
    expect(onClear).toHaveBeenCalledTimes(1);

    el.querySelector<HTMLButtonElement>('.keyboard-space')!.click();
    expect(onChar).toHaveBeenCalledWith('　');

    el.querySelector<HTMLButtonElement>('.keyboard-period')!.click();
    expect(onChar).toHaveBeenCalledWith('。');
  });

  it('has dedicated keys for sokuon and choonpu', () => {
    const onChar = vi.fn();
    const el = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });

    el.querySelector<HTMLButtonElement>('.keyboard-sokuon')!.click();
    expect(onChar).toHaveBeenCalledWith('っ');

    el.querySelector<HTMLButtonElement>('.keyboard-choonpu')!.click();
    expect(onChar).toHaveBeenCalledWith('ー');
  });

  it('covers every character needed to type all sentence readings (hiragana)', () => {
    // Regression test: every character appearing in SENTENCES.entries[].reading must be
    // producible on the hiragana keyboard, either as an exact .keyboard-key (basic/dakuten/
    // handakuten/youon kana) or as one of the actual extra keys rendered on the keyboard
    // (space, period, sokuon, choonpu — verified by class+char, not assumed). Youon keys emit
    // two characters per click (e.g. "きゃ"), so a reading character that is only ever part of
    // such a combo (e.g. small "ゃ") is still coverable without needing its own key — hence the
    // "included in some key's text" check below.
    const el = renderKanaKeyboard({ onChar: vi.fn(), onBackspace: vi.fn(), onClear: vi.fn() });
    const keyTexts = Array.from(el.querySelectorAll<HTMLButtonElement>('.keyboard-key')).map(
      (b) => b.textContent ?? '',
    );
    const sokuonChar = el.querySelector<HTMLButtonElement>('.keyboard-sokuon')!.textContent;
    const choonpuChar = el.querySelector<HTMLButtonElement>('.keyboard-choonpu')!.textContent;
    const extraKeyChars = ['　', '。', sokuonChar, choonpuChar];

    const readingChars = new Set<string>();
    for (const entry of SENTENCES.entries) {
      for (const ch of entry.reading) readingChars.add(ch);
    }

    const uncovered = [...readingChars].filter(
      (ch) => !extraKeyChars.includes(ch) && !keyTexts.some((text) => text.includes(ch)),
    );

    expect(uncovered).toEqual([]);
  });
});
