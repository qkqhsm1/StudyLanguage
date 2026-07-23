import { allSentences } from '../data/all-sentences';
import { buildTodayQueue, reviewEntry } from '../srs';
import {
  loadSentenceSrsStore,
  renderSentenceBookmarkToggle,
  saveSentenceSrsStore,
} from '../sentence-book/sentence-view';
import { buildFurigana, type FuriganaSegment } from './furigana';
import { NAV_HTML } from '../nav';
import type { SentenceEntry, SrsGrade } from '../types';

/** 세그먼트 목록을 ruby DOM으로. 한자 구간은 <ruby>한자<rt>읽기</rt></ruby>,
 *  가나 구간은 그냥 텍스트로 붙인다. */
function renderFurigana(segments: FuriganaSegment[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const seg of segments) {
    if (seg.ruby === null) {
      frag.appendChild(document.createTextNode(seg.base));
    } else {
      const ruby = document.createElement('ruby');
      ruby.appendChild(document.createTextNode(seg.base));
      const rt = document.createElement('rt');
      rt.textContent = seg.ruby;
      ruby.appendChild(rt);
      frag.appendChild(ruby);
    }
  }
  return frag;
}

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

  // 한자가 있어 표기와 읽기가 다를 때만 "읽기 보기"를 준다. 한자를 못 읽어 막히는
  // 경우의 대비책 — 뜻(정답)과는 별개라 여기서 읽기를 봐도 채점에는 영향이 없다.
  if (current.reading && current.reading !== current.japanese) {
    const readingReveal = document.createElement('button');
    readingReveal.type = 'button';
    readingReveal.className = 'interpret-reading-reveal';
    readingReveal.textContent = '읽기 보기';
    questionCard.appendChild(readingReveal);

    const segments = buildFurigana(current.japanese, current.reading);

    readingReveal.addEventListener('click', () => {
      readingReveal.classList.add('hidden');
      if (segments) {
        // 한자 위에 후리가나를 올린다 — 문장을 그 자리에서 ruby 버전으로 교체.
        question.classList.add('interpret-question-furigana');
        question.textContent = '';
        question.appendChild(renderFurigana(segments));
      } else {
        // 정렬 실패(드묾) 시엔 전체 읽기를 한 줄로 대신 보여준다.
        const line = document.createElement('div');
        line.className = 'interpret-reading';
        line.textContent = current.reading;
        questionCard.appendChild(line);
      }
    });
  }

  container.appendChild(questionCard);

  const revealBtn = document.createElement('button');
  revealBtn.className = 'interpret-reveal btn btn-secondary';
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
    btn.className = `interpret-grade interpret-grade-${grade} btn ${grade === 'known' ? 'btn-primary' : 'btn-secondary'}`;
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
