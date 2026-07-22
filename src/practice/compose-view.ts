import { SENTENCES } from '../data/sentences-data';
import { reviewEntry } from '../srs';
import { loadSentenceSrsStore, saveSentenceSrsStore } from '../sentence-book/sentence-view';
import { renderKanaKeyboard } from './keyboard';
import type { SentenceEntry, SrsGrade } from '../types';

const NAV_HTML =
  '<a href="#/vocab">단어장</a><a href="#/kana">가나 퀴즈</a><a href="#/sentences">문어장</a><a href="#/practice">문장 연습</a>';

function normalize(text: string): string {
  return text.replace(/\s+/g, '');
}

export function renderComposePractice(rng: () => number = Math.random): HTMLElement {
  const container = document.createElement('div');
  container.className = 'compose-practice';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const entries: SentenceEntry[] = SENTENCES.entries;
  const current = entries[Math.floor(rng() * entries.length)];
  container.dataset.currentId = current.id;

  const question = document.createElement('div');
  question.className = 'compose-question';
  question.textContent = current.korean;
  container.appendChild(question);

  const answerField = document.createElement('div');
  answerField.className = 'compose-answer-field';
  container.appendChild(answerField);

  let typed = '';

  function renderTyped(): void {
    answerField.textContent = typed;
  }
  renderTyped();

  const keyboard = renderKanaKeyboard({
    onChar: (char) => {
      typed += char;
      renderTyped();
    },
    onBackspace: () => {
      typed = typed.slice(0, -1);
      renderTyped();
    },
    onClear: () => {
      typed = '';
      renderTyped();
    },
  });
  container.appendChild(keyboard);

  const submitBtn = document.createElement('button');
  submitBtn.className = 'compose-submit';
  submitBtn.textContent = '제출';
  container.appendChild(submitBtn);

  const feedback = document.createElement('div');
  feedback.className = 'compose-feedback';
  container.appendChild(feedback);

  const correctAnswer = document.createElement('div');
  correctAnswer.className = 'compose-correct-answer hidden';
  correctAnswer.textContent =
    current.japanese === current.reading
      ? `정답: ${current.japanese}`
      : `정답: ${current.japanese} (${current.reading})`;
  container.appendChild(correctAnswer);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'compose-next hidden';
  nextBtn.textContent = '다음 문장';
  nextBtn.addEventListener('click', () => {
    container.dispatchEvent(new Event('sentence:refresh'));
  });
  container.appendChild(nextBtn);

  submitBtn.addEventListener('click', () => {
    const isCorrect = normalize(typed) === normalize(current.reading);
    feedback.textContent = isCorrect ? '정답!' : '오답';
    correctAnswer.classList.remove('hidden');
    nextBtn.classList.remove('hidden');

    const store = loadSentenceSrsStore();
    const grade: SrsGrade = isCorrect ? 'known' : 'unknown';
    store[current.id] = reviewEntry(store[current.id], grade);
    saveSentenceSrsStore(store);
  });

  return container;
}
