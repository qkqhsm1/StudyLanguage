import { buildKanaTable } from '../data/kana-data';
import type { KanaGroup, KanaScript } from '../types';

export interface KeyboardHandlers {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

export interface KanaKeyboardHandle {
  element: HTMLElement;
  setHighlight: (char: string | null) => void;
  /** 실제 키보드로 친 로마자를 가타카나로 바꿀지. 글자판의 カタカナ 전환을 따른다. */
  isKatakana: () => boolean;
}

const TABLE = buildKanaTable();
const SOKUON_OR_CHOONPU = 'っッー。';

const GROUP_TABS: Array<[KanaGroup, string]> = [
  ['basic', '청음'],
  ['dakuten', '탁음'],
  ['handakuten', '반탁음'],
  ['youon', '요음'],
];

export function renderKanaKeyboard(handlers: KeyboardHandlers): KanaKeyboardHandle {
  const wrap = document.createElement('div');
  wrap.className = 'kana-keyboard';

  let script: KanaScript = 'hiragana';
  let group: KanaGroup = 'basic';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'keyboard-toggle';
  toggleBtn.textContent = 'カタカナ';

  const toolbar = document.createElement('div');
  toolbar.className = 'keyboard-toolbar';

  // 104개를 한 화면에 늘어놓으면 폰에서 스크롤만 하게 된다. 전부 DOM에 두되
  // 고른 묶음만 보여준다.
  const tabs = document.createElement('div');
  tabs.className = 'keyboard-tabs';
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', '가나 묶음');
  const tabButtons = GROUP_TABS.map(([value, label]) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'keyboard-tab';
    btn.textContent = label;
    btn.addEventListener('click', () => showGroup(value));
    tabs.appendChild(btn);
    return { value, btn };
  });

  function showGroup(next: KanaGroup): void {
    group = next;
    wrap.dataset.group = group;
    for (const { value, btn } of tabButtons) btn.setAttribute('aria-pressed', String(value === group));
  }
  showGroup('basic');

  toolbar.appendChild(tabs);
  toolbar.appendChild(toggleBtn);

  const grid = document.createElement('div');
  grid.className = 'keyboard-grid';

  function renderGrid(): void {
    grid.innerHTML = '';
    const chars = TABLE.filter((k) => k.script === script);
    for (const kana of chars) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'keyboard-key';
      key.dataset.group = kana.group;
      key.lang = 'ja';
      key.textContent = kana.char;
      key.addEventListener('click', () => handlers.onChar(kana.char));
      grid.appendChild(key);
    }
  }

  function showScript(next: KanaScript): void {
    script = next;
    toggleBtn.textContent = script === 'hiragana' ? 'カタカナ' : 'ひらがな';
    renderGrid();
    renderSokuonLabel();
  }

  toggleBtn.addEventListener('click', () => showScript(script === 'hiragana' ? 'katakana' : 'hiragana'));

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

  const sokuonBtn = document.createElement('button');
  sokuonBtn.type = 'button';
  sokuonBtn.className = 'keyboard-sokuon';
  sokuonBtn.addEventListener('click', () => handlers.onChar(script === 'hiragana' ? 'っ' : 'ッ'));

  const choonpuBtn = document.createElement('button');
  choonpuBtn.type = 'button';
  choonpuBtn.className = 'keyboard-choonpu';
  choonpuBtn.textContent = 'ー';
  choonpuBtn.addEventListener('click', () => handlers.onChar('ー'));

  function renderSokuonLabel(): void {
    sokuonBtn.textContent = script === 'hiragana' ? 'っ' : 'ッ';
  }
  renderSokuonLabel();

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
  controls.appendChild(sokuonBtn);
  controls.appendChild(choonpuBtn);
  controls.appendChild(backspaceBtn);
  controls.appendChild(clearBtn);

  wrap.appendChild(toolbar);
  wrap.appendChild(grid);
  wrap.appendChild(controls);

  function setHighlight(char: string | null): void {
    wrap.querySelectorAll('.hint-highlight').forEach((el) => el.classList.remove('hint-highlight'));
    if (!char) return;

    // 힌트 글자가 지금 안 보이는 글자판에 있으면 그쪽으로 옮겨준다. コーヒー의 힌트를
    // 히라가나 글자판에서 받았을 때 아무 키도 안 빛나면 힌트가 없는 것과 같다.
    if (/[ァ-ヺッ]/.test(char) && script !== 'katakana') showScript('katakana');
    if (/[ぁ-ゖっ]/.test(char) && script !== 'hiragana') showScript('hiragana');
    const kana = TABLE.find((k) => k.char === char) ?? TABLE.find((k) => k.char.includes(char));
    if (kana && SOKUON_OR_CHOONPU.indexOf(char) === -1) showGroup(kana.group);

    const gridMatch = Array.from(grid.querySelectorAll<HTMLButtonElement>('.keyboard-key')).find(
      (key) => key.textContent === char || key.textContent?.includes(char),
    );
    if (gridMatch) {
      gridMatch.classList.add('hint-highlight');
      return;
    }

    const controlMatch = [sokuonBtn, choonpuBtn, periodBtn].find((btn) => btn.textContent === char);
    controlMatch?.classList.add('hint-highlight');
  }

  return { element: wrap, setHighlight, isKatakana: () => script === 'katakana' };
}
