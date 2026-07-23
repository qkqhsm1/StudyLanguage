import { buildKanaTable } from '../data/kana-data';
import { checkReadingAnswer, filterKana, type KanaQuizFilter } from './quiz-logic';
import { NAV_HTML } from '../nav';
import type { KanaChar } from '../types';

const TABLE = buildKanaTable();

const DEFAULT_FILTER: KanaQuizFilter = {
  scripts: ['hiragana', 'katakana'],
  groups: ['basic', 'dakuten', 'handakuten', 'youon'],
};

/** 정답 후 다음 문제로 넘어가기까지 두는 시간. 파란 모션을 볼 만큼은 되고,
 *  연속으로 풀 때 답답하지 않을 만큼은 짧아야 한다. */
export const ADVANCE_DELAY_MS = 700;

/** 이만큼 틀리면 정답을 보여주고 넘어갈 수 있게 한다 — 정말 모르는 글자에서
 *  영영 빠져나오지 못하는 상태를 막는 안전장치. */
export const REVEAL_AFTER_WRONG = 3;

function pickRandom(pool: KanaChar[], rng: () => number): KanaChar {
  return pool[Math.floor(rng() * pool.length)];
}

export function renderKanaQuizView(rng: () => number = Math.random): HTMLElement {
  const container = document.createElement('div');
  container.className = 'kana-quiz';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const questionArea = document.createElement('div');
  questionArea.className = 'kana-question-area card';
  container.appendChild(questionArea);

  const pool = filterKana(TABLE, DEFAULT_FILTER);

  function renderQuestion(): void {
    questionArea.textContent = '';
    questionArea.classList.remove('kana-correct', 'kana-wrong');

    const current = pickRandom(pool, rng);
    container.dataset.currentRomaji = current.romaji;
    container.dataset.currentHangul = current.hangul;

    let wrongCount = 0;

    const question = document.createElement('div');
    question.className = 'kana-question';
    question.textContent = current.char;
    questionArea.appendChild(question);

    // 버튼 없이 엔터만으로 진행한다. form의 submit이 엔터를 그대로 받아준다.
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'kana-answer-input';
    input.placeholder = '발음을 입력하고 엔터';
    input.autofocus = true;
    form.appendChild(input);
    questionArea.appendChild(form);

    const feedback = document.createElement('div');
    feedback.className = 'kana-feedback';
    questionArea.appendChild(feedback);

    // 여러 번 틀린 뒤에만 나타난다. 그 전까지는 스스로 다시 입력하는 게 이 화면의 흐름.
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'kana-next btn btn-secondary hidden';
    nextBtn.textContent = '다음 문제';
    nextBtn.addEventListener('click', renderQuestion);
    questionArea.appendChild(nextBtn);

    function handleCorrect(): void {
      questionArea.classList.add('kana-correct');
      feedback.textContent = '정답!';
      // 넘어가는 사이에 또 입력해서 다음 문제까지 채점되는 걸 막는다.
      input.disabled = true;
      window.setTimeout(renderQuestion, ADVANCE_DELAY_MS);
    }

    function handleWrong(): void {
      wrongCount += 1;
      input.value = '';
      input.focus();

      // 클래스를 뗐다 붙이지 않으면 같은 애니메이션이 두 번째부터 재생되지 않는다.
      questionArea.classList.remove('kana-wrong');
      void questionArea.offsetWidth;
      questionArea.classList.add('kana-wrong');

      if (wrongCount >= REVEAL_AFTER_WRONG) {
        feedback.textContent = `정답: ${current.romaji} / ${current.hangul}`;
        nextBtn.classList.remove('hidden');
      } else {
        feedback.textContent = '다시 입력해보세요';
      }
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (input.disabled) return;
      if (input.value.trim() === '') return;

      if (checkReadingAnswer(current, input.value)) {
        handleCorrect();
      } else {
        handleWrong();
      }
    });

    input.focus();
  }

  renderQuestion();

  return container;
}
