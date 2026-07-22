import { buildKanaTable } from '../data/kana-data';
import { checkReadingAnswer, filterKana, type KanaQuizFilter } from './quiz-logic';
import type { KanaChar } from '../types';

const TABLE = buildKanaTable();

const DEFAULT_FILTER: KanaQuizFilter = {
  scripts: ['hiragana', 'katakana'],
  groups: ['basic', 'dakuten', 'handakuten', 'youon'],
};

function pickRandom(pool: KanaChar[], rng: () => number): KanaChar {
  return pool[Math.floor(rng() * pool.length)];
}

export function renderKanaQuizView(rng: () => number = Math.random): HTMLElement {
  const container = document.createElement('div');
  container.className = 'kana-quiz';

  const nav = document.createElement('nav');
  nav.innerHTML = `<a href="#/vocab">단어장</a><a href="#/vocab/today">오늘 복습</a><a href="#/kana">가나 퀴즈</a>`;
  container.appendChild(nav);

  const questionArea = document.createElement('div');
  questionArea.className = 'kana-question-area';
  container.appendChild(questionArea);

  const pool = filterKana(TABLE, DEFAULT_FILTER);

  function renderQuestion(): void {
    questionArea.textContent = '';
    const current = pickRandom(pool, rng);
    container.dataset.currentRomaji = current.romaji;
    container.dataset.currentHangul = current.hangul;

    const question = document.createElement('div');
    question.className = 'kana-question';
    question.textContent = current.char;
    questionArea.appendChild(question);

    const form = document.createElement('form');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'kana-answer-input';
    input.placeholder = '로마자 또는 한글 발음';
    form.appendChild(input);

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = '확인';
    form.appendChild(submit);

    const feedback = document.createElement('div');
    feedback.className = 'kana-feedback';

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'kana-next';
    nextBtn.textContent = '다음 문제';
    nextBtn.addEventListener('click', renderQuestion);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const isCorrect = checkReadingAnswer(current, input.value);
      feedback.textContent = isCorrect ? '정답!' : `오답. 정답: ${current.romaji} / ${current.hangul}`;
    });

    questionArea.appendChild(form);
    questionArea.appendChild(feedback);
    questionArea.appendChild(nextBtn);
  }

  renderQuestion();

  return container;
}
