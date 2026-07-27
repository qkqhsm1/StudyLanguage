import { renderVocabHome } from './vocab/vocab-view';
import { renderKanaQuizView } from './kana-quiz/kana-quiz-view';
import { renderKanaChartView } from './kana-quiz/kana-chart-view';
import { isUnlocked, renderGate, renderPersonalGate } from './gate';
import { getSyncKey, openProgress, schedulePush, syncNow } from './sync';
import { isSyncConfigured } from './sync-config';
import { onStorageSave } from './storage';
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
  app.innerHTML = '';

  // 잠겨 있으면 어떤 주소로 들어와도 비밀번호 화면부터. (진짜 보안은 아니다 —
  // gate.ts의 설명 참고. 우연히 들어온 사람을 돌려보내는 용도.)
  if (!isUnlocked()) {
    app.appendChild(renderGate(route));
    return;
  }

  // 공용 암호 다음: 내 기록을 여는 개인 비밀번호. 연동을 설정하기 전(sync-config가
  // 비어 있을 때)에는 물어볼 이유가 없으니 이 화면 자체를 건너뛴다.
  if (isSyncConfigured() && getSyncKey() === null) {
    app.appendChild(
      renderPersonalGate(async (password) => {
        await openProgress(password);
        await syncNow();
        route();
      }),
    );
    return;
  }

  const hash = window.location.hash || '#/home';

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
// 채점·북마크 등 무엇이든 저장되면 잠시 뒤 서버로 올린다.
onStorageSave(schedulePush);
route();

// 다른 기기에서 한 공부를 받아온다. 화면은 이 기기 기록으로 먼저 그리고, 받아온
// 뒤에 달라졌으면 다시 그린다 — 네트워크를 기다리며 빈 화면을 보여주지 않는다.
void syncNow().then((synced) => {
  if (synced) route();
});
