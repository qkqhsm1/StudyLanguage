import { SENTENCES } from '../data/sentences-data';
import { buildTodayQueue, reviewEntry } from '../srs';
import { loadSentenceSrsStore, saveSentenceSrsStore } from '../sentence-book/sentence-view';
import type { SentenceEntry, SrsGrade } from '../types';

const NAV_HTML =
  '<a href="#/vocab">단어장</a><a href="#/kana">가나 퀴즈</a><a href="#/sentences">문어장</a><a href="#/practice">문장 연습</a>';

function pickQueue(): SentenceEntry[] {
  const srsStore = loadSentenceSrsStore();
  const due = buildTodayQueue(SENTENCES.entries, srsStore);
  return due.length > 0 ? due : SENTENCES.entries;
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

  const question = document.createElement('div');
  question.className = 'interpret-question';
  question.textContent = current.japanese;
  container.appendChild(question);

  const revealBtn = document.createElement('button');
  revealBtn.className = 'interpret-reveal';
  revealBtn.textContent = '정답 보기';
  container.appendChild(revealBtn);

  const answer = document.createElement('div');
  answer.className = 'interpret-answer hidden';
  answer.textContent = `${current.korean} / ${current.english}`;
  container.appendChild(answer);

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'interpret-grades hidden';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '몰랐음', confusing: '헷갈렸음', known: '맞았음' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
    const btn = document.createElement('button');
    btn.className = `interpret-grade interpret-grade-${grade}`;
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
