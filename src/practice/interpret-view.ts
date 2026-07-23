import { allSentences } from '../data/all-sentences';
import { buildTodayQueue, reviewEntry } from '../srs';
import { loadSentenceSrsStore, saveSentenceSrsStore } from '../sentence-book/sentence-view';
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

  const question = document.createElement('div');
  question.className = 'interpret-question compose-question';
  question.textContent = current.japanese;
  questionCard.appendChild(question);

  // 한자가 있어 표기와 읽기가 다를 때만 "읽기 보기"를 준다. 한자를 못 읽어 막히는
  // 경우의 대비책 — 뜻(정답)과는 별개라 여기서 읽기를 봐도 채점에는 영향이 없다.
  if (current.reading && current.reading !== current.japanese) {
    const readingReveal = document.createElement('button');
    readingReveal.type = 'button';
    readingReveal.className = 'interpret-reading-reveal';
    readingReveal.textContent = '읽기 보기';
    questionCard.appendChild(readingReveal);

    const reading = document.createElement('div');
    reading.className = 'interpret-reading hidden';
    reading.textContent = current.reading;
    questionCard.appendChild(reading);

    readingReveal.addEventListener('click', () => {
      reading.classList.remove('hidden');
      readingReveal.classList.add('hidden');
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
