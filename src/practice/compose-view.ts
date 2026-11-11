import { composableSentences, pickUnseenSentence } from '../data/all-sentences';
import { reviewEntry } from '../srs';
import {
  loadSentenceSrsStore,
  renderSentenceBookmarkToggle,
  saveSentenceSrsStore,
} from '../sentence-book/sentence-view';
import { renderKanaKeyboard } from './keyboard';
import { fillWithFurigana } from './furigana';
import { nextHintChar, nextHintCombo } from './hint';
import { convertRomaji, romajiToKana } from './romaji';
import { formatPronunciation } from '../data/kana-romanize';
import { NAV_HTML } from '../nav';
import type { SentenceEntry, SrsGrade } from '../types';

/** 채점 비교용. 띄어쓰기와 문장부호(。？)는 보지 않는다. */
function normalize(text: string): string {
  return text.replace(/[\s\p{P}]/gu, '');
}

export function renderComposePractice(rng: () => number = Math.random): HTMLElement {
  const container = document.createElement('div');
  container.className = 'compose-practice';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const entries: SentenceEntry[] = composableSentences();
  const current = pickUnseenSentence('compose', entries, entries, rng);
  container.dataset.currentId = current.id;

  const heading = document.createElement('h2');
  heading.textContent = '작문 연습';
  container.appendChild(heading);

  // 넓은 화면에서는 왼쪽에 문제와 답, 오른쪽에 키보드와 결과를 나란히 둔다.
  const board = document.createElement('div');
  board.className = 'practice-board';
  container.appendChild(board);
  const main = document.createElement('div');
  main.className = 'compose-main';
  const panel = document.createElement('div');
  panel.className = 'practice-panel';
  board.append(main, panel);

  const questionCard = document.createElement('div');
  questionCard.className = 'practice-stage';

  const label = document.createElement('div');
  label.className = 'compose-label';
  label.textContent = '다음 문장을 일본어로 써보세요';
  questionCard.appendChild(label);

  // 문제 + 북마크를 한 줄에: 연습 중 바로 담아 문장 오늘 복습 큐에 넣을 수 있게.
  const questionRow = document.createElement('div');
  questionRow.className = 'practice-question-row';

  const question = document.createElement('div');
  question.className = 'compose-question';
  question.textContent = current.korean;
  questionRow.appendChild(question);
  questionRow.appendChild(renderSentenceBookmarkToggle(current.id));
  questionCard.appendChild(questionRow);

  main.appendChild(questionCard);

  const answerRow = document.createElement('div');
  answerRow.className = 'compose-answer-row';

  const answerField = document.createElement('div');
  answerField.className = 'compose-answer-field';
  answerField.lang = 'ja';
  answerField.setAttribute('aria-live', 'polite');
  answerField.setAttribute('aria-label', '입력한 답');
  answerRow.appendChild(answerField);

  const hintBtn = document.createElement('button');
  hintBtn.className = 'compose-hint';
  hintBtn.type = 'button';
  hintBtn.textContent = '힌트';
  answerRow.appendChild(hintBtn);

  main.appendChild(answerRow);

  const hintMessage = document.createElement('div');
  hintMessage.className = 'compose-hint-message hidden';
  main.appendChild(hintMessage);

  let typed = '';
  // 실제 키보드로 치는 중인, 아직 가나가 되지 않은 로마자 꼬리(k, ky, sh, n).
  let pending = '';
  let hintUsed = false;
  // 조사 は를 소리대로 わ로 써도 맞다 (konnichiwa → こんにちわ). 정답 표기는 그대로 보여준다.
  const answers = [...new Set([current.reading, current.spoken ?? current.reading].map(normalize))];
  // renderTyped needs to clear any pulsing hint key/message on onChar/onClear, but the
  // keyboard (which owns setHighlight) isn't created until after the first renderTyped()
  // call below — so route through a mutable reference instead of reordering everything.
  let highlightSetter: ((char: string | null) => void) | null = null;

  function renderTyped(): void {
    answerField.textContent = typed;
    if (pending) {
      const tail = document.createElement('span');
      tail.className = 'compose-pending';
      tail.textContent = pending;
      answerField.appendChild(tail);
    }
    const isValidPrefix = answers.some((answer) => answer.startsWith(normalize(typed)));
    answerField.classList.toggle('compose-answer-field-error', !isValidPrefix);
  }
  renderTyped();

  // Only onChar/onClear consume the hint — onBackspace never types the hinted char, and
  // it's how the user follows a Case B (deletion) combo hint, so it must not wipe it.
  function clearHint(): void {
    highlightSetter?.(null);
    hintMessage.classList.add('hidden');
  }

  const keyboardHandlers = {
    onChar: (char: string) => {
      typed += char;
      renderTyped();
      clearHint();
    },
    onBackspace: () => {
      if (pending) pending = pending.slice(0, -1);
      else typed = [...typed].slice(0, -1).join('');
      renderTyped();
    },
    onClear: () => {
      typed = '';
      pending = '';
      renderTyped();
      clearHint();
    },
  };
  const { element: keyboard, setHighlight, isKatakana } = renderKanaKeyboard(keyboardHandlers);
  highlightSetter = setHighlight;
  panel.appendChild(keyboard);

  hintBtn.addEventListener('click', () => {
    const comboHint = nextHintCombo(current.reading, typed);
    if (comboHint) {
      hintUsed = true;
      hintMessage.textContent = comboHint.needsDelete
        ? `${comboHint.combo}는 한 키로 입력해요. ⌫로 앞 글자를 지우고 반짝이는 ${comboHint.combo} 키를 누르세요.`
        : `다음은 ${comboHint.combo}예요. 한 키로 입력되니 반짝이는 키를 누르세요.`;
      hintMessage.classList.remove('hidden');
      setHighlight(comboHint.combo);
      return;
    }

    const hintChar = nextHintChar(current.reading, typed);
    if (!hintChar) return;
    hintUsed = true;
    hintMessage.textContent = `다음 글자는 ${hintChar}예요. 아래에서 반짝이는 키를 누르세요.`;
    hintMessage.classList.remove('hidden');
    setHighlight(hintChar);
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'compose-submit btn btn-primary';
  submitBtn.textContent = '제출';
  panel.appendChild(submitBtn);

  const feedback = document.createElement('div');
  feedback.className = 'compose-feedback';
  panel.appendChild(feedback);

  const correctAnswer = document.createElement('div');
  correctAnswer.className = 'compose-correct-answer hidden';
  const correctSentence = document.createElement('div');
  correctSentence.className = 'compose-correct-sentence';
  correctSentence.lang = 'ja';
  fillWithFurigana(correctSentence, current.japanese, current.reading);
  const correctSound = document.createElement('div');
  correctSound.className = 'reading-pronunciation';
  correctSound.textContent = formatPronunciation(current.spoken ?? current.reading);
  correctAnswer.append(correctSentence, correctSound);
  panel.appendChild(correctAnswer);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'compose-next hidden btn btn-plain';
  nextBtn.textContent = '다음 문장';
  nextBtn.addEventListener('click', () => {
    container.dispatchEvent(new Event('sentence:refresh'));
  });
  panel.appendChild(nextBtn);

  // 실제 키보드: 로마자를 치면 가나로 바뀐다 (kasa → かさ, 대문자나 カタカナ 전환은 가타카나).
  // 입력창이 아니라 문서에서 받는다. 이 화면을 떠나면 스스로 떼어낸다.
  function onKey(event: KeyboardEvent): void {
    if (!container.isConnected) {
      document.removeEventListener('keydown', onKey);
      return;
    }
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'Enter') {
      if (event.target instanceof HTMLButtonElement) return;
      event.preventDefault();
      (submitBtn.disabled ? nextBtn : submitBtn).click();
      return;
    }
    if (submitBtn.disabled) return;
    if (event.key === 'Backspace') {
      event.preventDefault();
      keyboardHandlers.onBackspace();
      return;
    }
    if (event.key.length !== 1 || !/[a-zA-Z'.,?!-]/.test(event.key)) return;
    event.preventDefault();
    const { kana, rest } = convertRomaji(pending + event.key, isKatakana());
    pending = rest;
    if (kana) {
      typed += kana;
      clearHint();
    }
    renderTyped();
  }
  document.addEventListener('keydown', onKey);

  submitBtn.addEventListener('click', () => {
    if (pending) {
      typed += romajiToKana(pending, isKatakana(), true);
      pending = '';
      renderTyped();
    }
    // 아무것도 안 쓰고 누른 건 답이 아니다. 오답으로 기록하면 복습 일정만 망가진다.
    if (normalize(typed) === '') {
      hintMessage.textContent = '답을 입력한 뒤 제출하세요.';
      hintMessage.classList.remove('hidden');
      return;
    }
    const isCorrect = answers.includes(normalize(typed));
    feedback.textContent = isCorrect ? '정답!' : '오답';
    feedback.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
    correctAnswer.classList.remove('hidden');
    nextBtn.classList.remove('hidden');
    submitBtn.disabled = true;
    clearHint();
    // 다 풀었으면 키보드를 접어 정답이 바로 보이게 한다.
    container.classList.add('is-done');
    nextBtn.focus();

    const store = loadSentenceSrsStore();
    const grade: SrsGrade = isCorrect ? (hintUsed ? 'confusing' : 'known') : 'unknown';
    store[current.id] = reviewEntry(store[current.id], grade);
    saveSentenceSrsStore(store);
  });

  return container;
}
