import { allSentences } from '../data/all-sentences';
import { buildTodayQueue, reviewEntry } from '../srs';
import {
  loadSentenceSrsStore,
  renderSentenceBookmarkToggle,
  saveSentenceSrsStore,
} from '../sentence-book/sentence-view';
import { revealReading } from './furigana';
import { NAV_HTML } from '../nav';
import type { SentenceEntry, SrsGrade } from '../types';

function pickQueue(): SentenceEntry[] {
  const srsStore = loadSentenceSrsStore();
  const entries = allSentences();
  const due = buildTodayQueue(entries, srsStore);
  return due.length > 0 ? due : entries;
}

export function renderInterpretPractice(rng: () => number = Math.random): HTMLElement {
  const container = document.createElement('div');
  container.className = 'interpret-practice';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const queue = pickQueue();
  const current = queue[Math.floor(rng() * queue.length)];
  container.dataset.currentId = current.id;

  const questionCard = document.createElement('div');
  questionCard.className = 'card';

  // 문제 + 북마크를 한 줄에: 연습 중 "이건 나중에 복습하자" 싶으면 바로 담아
  // 문장 오늘 복습 큐에 넣을 수 있게 한다.
  const questionRow = document.createElement('div');
  questionRow.className = 'practice-question-row';

  const question = document.createElement('div');
  question.className = 'interpret-question compose-question';
  question.textContent = current.japanese;
  questionRow.appendChild(question);
  questionRow.appendChild(renderSentenceBookmarkToggle(current.id));
  questionCard.appendChild(questionRow);

  // 읽는 법을 모를 때의 대비책: 한자 위 후리가나 + 한글 발음·로마자. 가나뿐인
  // 문장도 발음은 도움이 되므로 읽기만 있으면 준다. 뜻(정답)과는 별개라 채점에
  // 영향이 없다.
  if (current.reading) {
    const readingReveal = document.createElement('button');
    readingReveal.type = 'button';
    readingReveal.className = 'interpret-reading-reveal';
    readingReveal.textContent = '읽기 보기';
    questionCard.appendChild(readingReveal);

    readingReveal.addEventListener('click', () => {
      readingReveal.classList.add('hidden');
      revealReading(question, current.japanese, current.reading);
    });
  }

  container.appendChild(questionCard);

  const revealBtn = document.createElement('button');
  revealBtn.className = 'interpret-reveal btn btn-plain';
  revealBtn.textContent = '정답 보기';
  container.appendChild(revealBtn);

  const answer = document.createElement('div');
  answer.className = 'interpret-answer hidden';
  answer.textContent = [current.korean, current.english].filter(Boolean).join(' / ');
  container.appendChild(answer);

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'interpret-grades srs-grades hidden';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '몰랐음', confusing: '헷갈렸음', known: '맞았음' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
    const btn = document.createElement('button');
    // 셋 다 대등한 선택지다(누르면 곧장 다음 문제로 넘어가므로 "선택된 상태"가
    // 없다). 하나만 파랗게 두면 이미 맞힌 것처럼 보여서, 회색 배경 위 흰 버튼으로 통일.
    btn.className = `interpret-grade interpret-grade-${grade} btn btn-plain`;
    btn.textContent = gradeLabels[grade];
    btn.addEventListener('click', () => {
      const store = loadSentenceSrsStore();
      store[current.id] = reviewEntry(store[current.id], grade);
      saveSentenceSrsStore(store);
      container.dispatchEvent(new Event('sentence:refresh'));
    });
    gradeWrap.appendChild(btn);
  });
  container.appendChild(gradeWrap);

  revealBtn.addEventListener('click', () => {
    answer.classList.remove('hidden');
    gradeWrap.classList.remove('hidden');
    revealBtn.classList.add('hidden');
  });

  return container;
}
