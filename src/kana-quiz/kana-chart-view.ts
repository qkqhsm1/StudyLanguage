import { buildKanaChart } from './kana-chart';
import { NAV_HTML } from '../nav';
import type { KanaScript } from '../types';

function renderChart(script: KanaScript): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'kana-chart';

  for (const section of buildKanaChart(script)) {
    const heading = document.createElement('h3');
    heading.className = 'kana-chart-title';
    heading.textContent = section.title;
    wrap.appendChild(heading);

    const grid = document.createElement('div');
    // 요음은 3열, 나머지는 5열. 열 수를 CSS 변수로 넘겨 한 규칙으로 처리한다.
    grid.className = 'kana-chart-grid';
    grid.style.setProperty('--cols', String(section.rows[0]?.length ?? 5));

    for (const row of section.rows) {
      for (const cellData of row) {
        const cell = document.createElement('div');
        if (!cellData) {
          // 빈 자리는 칸만 차지시켜 단(column)이 어긋나지 않게 한다.
          cell.className = 'kana-chart-cell kana-chart-cell-empty';
          grid.appendChild(cell);
          continue;
        }

        cell.className = 'kana-chart-cell card';

        const char = document.createElement('div');
        char.className = 'kana-chart-char';
        char.textContent = cellData.char;
        cell.appendChild(char);

        const reading = document.createElement('div');
        reading.className = 'kana-chart-reading';
        reading.textContent = `${cellData.hangul} · ${cellData.romaji}`;
        cell.appendChild(reading);

        grid.appendChild(cell);
      }
    }

    wrap.appendChild(grid);
  }

  return wrap;
}

export function renderKanaChartView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'kana-chart-view';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const heading = document.createElement('h2');
  heading.textContent = '가나표';
  container.appendChild(heading);

  let script: KanaScript = 'hiragana';

  // 히라가나 ↔ 가타카나 전환. 가상 키보드의 알약 토글과 같은 모양.
  const toggle = document.createElement('div');
  toggle.className = 'kana-chart-toggle';

  const hiraBtn = document.createElement('button');
  hiraBtn.type = 'button';
  hiraBtn.className = 'kana-chart-tab kana-chart-tab-hiragana selected';
  hiraBtn.textContent = 'ひらがな';

  const kataBtn = document.createElement('button');
  kataBtn.type = 'button';
  kataBtn.className = 'kana-chart-tab kana-chart-tab-katakana';
  kataBtn.textContent = 'カタカナ';

  toggle.appendChild(hiraBtn);
  toggle.appendChild(kataBtn);
  container.appendChild(toggle);

  let chart = renderChart(script);
  container.appendChild(chart);

  function show(next: KanaScript): void {
    script = next;
    hiraBtn.classList.toggle('selected', script === 'hiragana');
    kataBtn.classList.toggle('selected', script === 'katakana');

    const replacement = renderChart(script);
    chart.replaceWith(replacement);
    chart = replacement;
  }

  hiraBtn.addEventListener('click', () => show('hiragana'));
  kataBtn.addEventListener('click', () => show('katakana'));

  return container;
}
