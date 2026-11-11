import { allSentences, pickUnseenSentence } from '../data/all-sentences';
import { buildTodayQueue, reviewEntry } from '../srs';
import {
  loadSentenceSrsStore,
  renderSentenceBookmarkToggle,
  saveSentenceSrsStore,
} from '../sentence-book/sentence-view';
import { createReadingToggles } from './furigana';
import { NAV_HTML } from '../nav';
import type { SrsGrade } from '../types';


export function renderInterpretPractice(rng: () => number = Math.random): HTMLElement {
  const container = document.createElement('div');
  container.className = 'interpret-practice';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  // 오늘 복습할 문장을 먼저 내되, 북마크 문장처럼 늘 복습 대상인 것도 한 바퀴에 한 번만 낸다.
  const entries = allSentences();
  const current = pickUnseenSentence('interpret', buildTodayQueue(entries, loadSentenceSrsStore()), entries, rng);
  container.dataset.currentId = current.id;

  const heading = document.createElement('h2');
  heading.textContent = '해석 연습';
  container.appendChild(heading);

  // 넓은 화면에서는 왼쪽에 문장, 오른쪽에 정답과 채점을 나란히 둔다.
  const board = document.createElement('div');
  board.className = 'practice-board';
  container.appendChild(board);
  const panel = document.createElement('div');
  panel.className = 'practice-panel';

  const help = document.createElement('p');
  help.className = 'page-help';
  help.textContent = '문장을 먼저 머릿속으로 해석한 뒤 정답을 확인하세요.';
  panel.appendChild(help);

  const questionCard = document.createElement('div');
  questionCard.className = 'practice-stage';

  // 문제 + 북마크를 한 줄에: 연습 중 "이건 나중에 복습하자" 싶으면 바로 담아
  // 문장 오늘 복습 큐에 넣을 수 있게 한다.
  const questionRow = document.createElement('div');
  questionRow.className = 'practice-question-row';

  // 문장과 발음을 한 그룹으로 묶어서, 발음이 문장 오른쪽에 붙고 북마크는 맨 끝에 오게.
  const sentenceGroup = document.createElement('div');
  sentenceGroup.className = 'practice-sentence-group';

  const question = document.createElement('div');
  question.className = 'interpret-question compose-question';
  question.lang = 'ja';
  question.textContent = current.japanese;
  sentenceGroup.appendChild(question);

  questionRow.appendChild(sentenceGroup);
  questionRow.appendChild(renderSentenceBookmarkToggle(current.id));
  questionCard.appendChild(questionRow);

  // 읽는 법을 모를 때의 대비책: 후리가나·발음 토글. 뜻(정답)과는 별개라 채점에
  // 영향이 없다.
  if (current.reading) {
    questionCard.appendChild(
      createReadingToggles(question, sentenceGroup, current.japanese, current.reading, current.spoken),
    );
  }

  board.append(questionCard, panel);

  const revealBtn = document.createElement('button');
  revealBtn.className = 'interpret-reveal btn btn-plain';
  revealBtn.innerHTML = '정답 보기<kbd>Space</kbd>';
  panel.appendChild(revealBtn);

  const answer = document.createElement('div');
  answer.className = 'interpret-answer hidden';
  answer.textContent = [current.korean, current.english].filter(Boolean).join(' / ');
  panel.appendChild(answer);

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'interpret-grades srs-grades hidden';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '몰랐음', confusing: '헷갈렸음', known: '맞았음' };
  const grades = Object.keys(gradeLabels) as SrsGrade[];
  grades.forEach((grade) => {
    const btn = document.createElement('button');
    // 셋 다 대등한 선택지다(누르면 곧장 다음 문제로 넘어가므로 "선택된 상태"가
    // 없다). 하나만 파랗게 두면 이미 맞힌 것처럼 보여서, 회색 배경 위 흰 버튼으로 통일.
    btn.className = `interpret-grade interpret-grade-${grade} btn btn-plain`;
    btn.dataset.grade = grade;
    btn.innerHTML = `${gradeLabels[grade]}<kbd>${grades.indexOf(grade) + 1}</kbd>`;
    btn.addEventListener('click', () => {
      const store = loadSentenceSrsStore();
      store[current.id] = reviewEntry(store[current.id], grade);
      saveSentenceSrsStore(store);
      container.dispatchEvent(new Event('sentence:refresh'));
    });
    gradeWrap.appendChild(btn);
  });
  panel.appendChild(gradeWrap);

  // 키보드만으로 빠르게 넘긴다. 화면이 바뀌면 리스너도 함께 치워지도록 스스로 떼어낸다.
  function onKey(event: KeyboardEvent): void {
    if (!container.isConnected) {
      document.removeEventListener('keydown', onKey);
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
    // 포커스된 버튼 위의 Space는 그 버튼의 동작이다. 정답까지 같이 열지 않는다.
    if (event.key === ' ' && !(event.target instanceof HTMLButtonElement) && !revealBtn.classList.contains('hidden')) {
      event.preventDefault();
      revealBtn.click();
    } else if (/^[1-3]$/.test(event.key) && revealBtn.classList.contains('hidden')) {
      gradeWrap.querySelectorAll<HTMLButtonElement>('button')[Number(event.key) - 1]?.click();
    }
  }
  document.addEventListener('keydown', onKey);

  revealBtn.addEventListener('click', () => {
    answer.classList.remove('hidden');
    gradeWrap.classList.remove('hidden');
    revealBtn.classList.add('hidden');
  });

  return container;
}
