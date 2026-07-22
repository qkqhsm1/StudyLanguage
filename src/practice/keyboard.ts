import { buildKanaTable } from '../data/kana-data';
import type { KanaScript } from '../types';

export interface KeyboardHandlers {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

const TABLE = buildKanaTable();

export function renderKanaKeyboard(handlers: KeyboardHandlers): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'kana-keyboard';

  let script: KanaScript = 'hiragana';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'keyboard-toggle';
  toggleBtn.textContent = 'カタカナ';

  const grid = document.createElement('div');
  grid.className = 'keyboard-grid';

  function renderGrid(): void {
    grid.innerHTML = '';
    const chars = TABLE.filter((k) => k.script === script);
    for (const kana of chars) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'keyboard-key';
      key.textContent = kana.char;
      key.addEventListener('click', () => handlers.onChar(kana.char));
      grid.appendChild(key);
    }
  }

  toggleBtn.addEventListener('click', () => {
    script = script === 'hiragana' ? 'katakana' : 'hiragana';
    toggleBtn.textContent = script === 'hiragana' ? 'カタカナ' : 'ひらがな';
    renderGrid();
  });

  renderGrid();

  const controls = document.createElement('div');
  controls.className = 'keyboard-controls';

  const spaceBtn = document.createElement('button');
  spaceBtn.type = 'button';
  spaceBtn.className = 'keyboard-space';
  spaceBtn.textContent = '스페이스';
  spaceBtn.addEventListener('click', () => handlers.onChar('　'));

  const periodBtn = document.createElement('button');
  periodBtn.type = 'button';
  periodBtn.className = 'keyboard-period';
  periodBtn.textContent = '。';
  periodBtn.addEventListener('click', () => handlers.onChar('。'));

  const backspaceBtn = document.createElement('button');
  backspaceBtn.type = 'button';
  backspaceBtn.className = 'keyboard-backspace';
  backspaceBtn.textContent = '⌫';
  backspaceBtn.addEventListener('click', () => handlers.onBackspace());

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'keyboard-clear';
  clearBtn.textContent = '전체지우기';
  clearBtn.addEventListener('click', () => handlers.onClear());

  controls.appendChild(spaceBtn);
  controls.appendChild(periodBtn);
  controls.appendChild(backspaceBtn);
  controls.appendChild(clearBtn);

  wrap.appendChild(toggleBtn);
  wrap.appendChild(grid);
  wrap.appendChild(controls);

  return wrap;
}
