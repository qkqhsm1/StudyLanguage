import { renderVocabHome } from './vocab/vocab-view';
import { renderVocabQuizHome } from './vocab/vocab-quiz-view';
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
import { markActiveNav, NAV_HTML } from './nav';

const app = document.querySelector<HTMLDivElement>('#app')!;

function renderPracticePicker(): HTMLElement {
  const container = document.createElement('div');
  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const heading = document.createElement('h2');
  heading.textContent = '문장 연습';
  container.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'skill-list';

  const items: Array<{ href: string; icon: string; name: string; sub: string }> = [
    { href: '#/practice/interpret', icon: '訳', name: '해석 연습', sub: '일본어 문장을 보고 뜻을 떠올려요' },
    { href: '#/practice/compose', icon: '作', name: '작문 연습', sub: '한국어 문장을 보고 가나로 직접 써요' },
  ];

  for (const item of items) {
    const link = document.createElement('a');
    link.className = 'skill-list-item';
    link.href = item.href;

    const icon = document.createElement('span');
    icon.className = 'skill-list-icon';
    icon.lang = 'ja';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon;
    link.appendChild(icon);

    const body = document.createElement('span');
    body.className = 'skill-list-body';
    const name = document.createElement('span');
    name.className = 'skill-list-name';
    name.textContent = item.name;
    const sub = document.createElement('span');
    sub.className = 'skill-list-sub';
    sub.textContent = item.sub;
    body.append(name, sub);
    link.appendChild(body);

    const chevron = document.createElement('span');
    chevron.className = 'skill-list-chevron';
    chevron.setAttribute('aria-hidden', 'true');
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
  } else if (hash.split('?')[0] === '#/vocab/quiz' || hash.startsWith('#/vocab/quiz/')) {
    view = renderVocabQuizHome(hash);
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

  // 채점·북마크로 같은 화면을 다시 그릴 때는 보던 자리를 지킨다. 긴 단어 목록에서
  // 카드 하나 채점할 때마다 맨 위로 튀면 쓸 수가 없다.
  for (const event of ['vocab:refresh', 'sentence:refresh', 'phrase:refresh']) {
    view.addEventListener(event, () => {
      const top = window.scrollY;
      route();
      window.scrollTo(0, top);
    });
  }
  markActiveNav(view, hash);
  app.appendChild(view);
  // 폰의 하위 탭은 가로로 스크롤되므로 현재 탭이 화면 안에 들어오게 한다.
  view.querySelector('.nav-sub-link[aria-current]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  document.title = `${view.querySelector('h2')?.textContent ?? '홈'} | 일본어 노선도`;
}

window.addEventListener('hashchange', () => {
  route();
  window.scrollTo(0, 0);
});
window.addEventListener('DOMContentLoaded', route);
// 채점·북마크 등 무엇이든 저장되면 잠시 뒤 서버로 올린다.
onStorageSave(schedulePush);
route();

// 다른 기기에서 한 공부를 받아온다. 화면은 이 기기 기록으로 먼저 그리고, 받아온
// 뒤에 달라졌으면 다시 그린다 — 네트워크를 기다리며 빈 화면을 보여주지 않는다.
void syncNow().then((synced) => {
  if (synced) route();
});
