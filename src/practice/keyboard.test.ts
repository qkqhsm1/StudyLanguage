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
    const { element } = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    findKey(element, 'あ').click();
    expect(onChar).toHaveBeenCalledWith('あ');
  });

  it('switches to katakana after clicking the toggle button', () => {
    const onChar = vi.fn();
    const { element } = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    element.querySelector<HTMLButtonElement>('.keyboard-toggle')!.click();
    findKey(element, 'ア').click();
    expect(onChar).toHaveBeenCalledWith('ア');
  });

  it('includes dakuten characters (needed to type most real sentences)', () => {
    const onChar = vi.fn();
    const { element } = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });
    findKey(element, 'ご').click();
    expect(onChar).toHaveBeenCalledWith('ご');
  });

  it('wires backspace, clear, space, and period controls', () => {
    const onChar = vi.fn();
    const onBackspace = vi.fn();
    const onClear = vi.fn();
    const { element } = renderKanaKeyboard({ onChar, onBackspace, onClear });

    element.querySelector<HTMLButtonElement>('.keyboard-backspace')!.click();
    expect(onBackspace).toHaveBeenCalledTimes(1);

    element.querySelector<HTMLButtonElement>('.keyboard-clear')!.click();
    expect(onClear).toHaveBeenCalledTimes(1);

    element.querySelector<HTMLButtonElement>('.keyboard-space')!.click();
    expect(onChar).toHaveBeenCalledWith('　');

    element.querySelector<HTMLButtonElement>('.keyboard-period')!.click();
    expect(onChar).toHaveBeenCalledWith('。');
  });

  it('has dedicated keys for sokuon and choonpu', () => {
    const onChar = vi.fn();
    const { element } = renderKanaKeyboard({ onChar, onBackspace: vi.fn(), onClear: vi.fn() });

    element.querySelector<HTMLButtonElement>('.keyboard-sokuon')!.click();
    expect(onChar).toHaveBeenCalledWith('っ');

    element.querySelector<HTMLButtonElement>('.keyboard-choonpu')!.click();
    expect(onChar).toHaveBeenCalledWith('ー');
  });

  it('covers every character needed to type all sentence readings (hiragana)', () => {
    const { element } = renderKanaKeyboard({ onChar: vi.fn(), onBackspace: vi.fn(), onClear: vi.fn() });
    const keyTexts = Array.from(element.querySelectorAll<HTMLButtonElement>('.keyboard-key')).map(
      (b) => b.textContent ?? '',
    );
    const sokuonChar = element.querySelector<HTMLButtonElement>('.keyboard-sokuon')!.textContent;
    const choonpuChar = element.querySelector<HTMLButtonElement>('.keyboard-choonpu')!.textContent;
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

  it('highlights the key matching the given character, and clears it when passed null', () => {
    const { element, setHighlight } = renderKanaKeyboard({ onChar: vi.fn(), onBackspace: vi.fn(), onClear: vi.fn() });

    setHighlight('ー');
    expect(element.querySelector('.keyboard-choonpu')?.classList.contains('hint-highlight')).toBe(true);

    setHighlight(null);
    expect(element.querySelector('.hint-highlight')).toBeNull();
  });
});
