import { buildKanaChart } from './kana-chart';
import { SCRIPT_NAMES } from './kana-quiz-view';
import { NAV_HTML } from '../nav';
import type { KanaScript } from '../types';

function renderChart(script: KanaScript): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'kana-chart';

  for (const section of buildKanaChart(script)) {
    const block = document.createElement('section');
    block.className = 'kana-chart-section';

    const heading = document.createElement('h3');
    heading.className = 'kana-chart-title';
    heading.textContent = section.title;
    block.appendChild(heading);

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

        cell.className = 'kana-chart-cell';

        const char = document.createElement('div');
        char.className = 'kana-chart-char';
        char.lang = 'ja';
        char.textContent = cellData.char;
        cell.appendChild(char);

        const reading = document.createElement('div');
        reading.className = 'kana-chart-reading';
        reading.innerHTML = `<span>${cellData.hangul}</span><span>${cellData.romaji}</span>`;
        cell.appendChild(reading);

        grid.appendChild(cell);
      }
    }

    block.appendChild(grid);
    wrap.appendChild(block);
  }

  return wrap;
}

export function renderKanaChartView(script: KanaScript): HTMLElement {
  const container = document.createElement('div');
  container.className = 'kana-chart-view';
  container.dataset.script = script;

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const head = document.createElement('div');
  head.className = 'page-head';
  const heading = document.createElement('h2');
  heading.textContent = `${SCRIPT_NAMES[script]}표`;
  const quizLink = document.createElement('a');
  quizLink.className = 'kana-chart-quiz btn btn-primary';
  quizLink.href = `#/kana/${script}`;
  quizLink.textContent = `${SCRIPT_NAMES[script]} 퀴즈 풀기`;
  head.append(heading, quizLink);
  container.appendChild(head);

  container.appendChild(renderChart(script));

  return container;
}
