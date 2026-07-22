import { describe, expect, it, vi } from 'vitest';
import { renderKanaKeyboard } from './keyboard';

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
});
