import { renderVocabHome } from './vocab/vocab-view';
import { renderKanaQuizView } from './kana-quiz/kana-quiz-view';
import { renderKanaChartView } from './kana-quiz/kana-chart-view';
import { renderSentenceBookHome } from './sentence-book/sentence-view';
import { renderInterpretPractice } from './practice/interpret-view';
import { renderComposePractice } from './practice/compose-view';
import { renderHomeView } from './home/home-view';
import { renderPhraseView } from './phrases/phrase-view';
import { NAV_HTML } from './nav';

const app = document.querySelector<HTMLDivElement>('#app')!;

function renderPracticePicker(): HTMLElement {
  const container = document.createElement('div');
  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const list = document.createElement('div');
  list.className = 'skill-list';

  const items: Array<{ href: string; icon: string; name: string }> = [
    { href: '#/practice/interpret', icon: '📖', name: '일본어 → 한국어 해석 연습' },
    { href: '#/practice/compose', icon: '✍️', name: '한국어 → 일본어 작문 연습' },
  ];

  for (const item of items) {
    const link = document.createElement('a');
    link.className = 'skill-list-item';
    link.href = item.href;

    const icon = document.createElement('span');
    icon.className = 'skill-list-icon';
    icon.textContent = item.icon;
    link.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'skill-list-name';
    name.textContent = item.name;
    link.appendChild(name);

    const chevron = document.createElement('span');
    chevron.className = 'skill-list-chevron';
    chevron.textContent = '›';
    link.appendChild(chevron);

    list.appendChild(link);
  }

  container.appendChild(list);
  return container;
}

function route(): void {
  const hash = window.location.hash || '#/home';
  app.innerHTML = '';

  let view: HTMLElement;
  if (hash === '#/home') {
    view = renderHomeView();
  } else if (hash === '#/phrases') {
    view = renderPhraseView();
  } else if (hash === '#/kana/chart') {
    // '#/kana' 로 시작하는 prefix 분기보다 먼저 와야 가나표가 퀴즈에 가려지지 않는다.
    view = renderKanaChartView();
  } else if (hash.startsWith('#/kana')) {
    view = renderKanaQuizView();
  } else if (hash === '#/practice') {
    view = renderPracticePicker();
  } else if (hash === '#/practice/interpret') {
    view = renderInterpretPractice();
  } else if (hash === '#/practice/compose') {
    view = renderComposePractice();
  } else if (hash.startsWith('#/sentences')) {
    view = renderSentenceBookHome(hash);
  } else {
    view = renderVocabHome(hash);
  }

  view.addEventListener('vocab:refresh', route);
  view.addEventListener('sentence:refresh', route);
  view.addEventListener('phrase:refresh', route);
  app.appendChild(view);
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', route);
route();
