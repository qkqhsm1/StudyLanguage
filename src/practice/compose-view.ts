import { composableSentences } from '../data/all-sentences';
import { reviewEntry } from '../srs';
import { loadSentenceSrsStore, saveSentenceSrsStore } from '../sentence-book/sentence-view';
import { renderKanaKeyboard } from './keyboard';
import { nextHintChar, nextHintCombo } from './hint';
import { NAV_HTML } from '../nav';
import type { SentenceEntry, SrsGrade } from '../types';

function normalize(text: string): string {
  return text.replace(/\s+/g, '');
}

export function renderComposePractice(rng: () => number = Math.random): HTMLElement {
  const container = document.createElement('div');
  container.className = 'compose-practice';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const entries: SentenceEntry[] = composableSentences();
  const current = entries[Math.floor(rng() * entries.length)];
  container.dataset.currentId = current.id;

  const questionCard = document.createElement('div');
  questionCard.className = 'card';

  const label = document.createElement('div');
  label.className = 'compose-label';
  label.textContent = '다음 문장을 일본어로 써보세요';
  questionCard.appendChild(label);

  const question = document.createElement('div');
  question.className = 'compose-question';
  question.textContent = current.korean;
  questionCard.appendChild(question);

  container.appendChild(questionCard);

  const answerRow = document.createElement('div');
  answerRow.className = 'compose-answer-row';

  const answerField = document.createElement('div');
  answerField.className = 'compose-answer-field';
  answerRow.appendChild(answerField);

  const hintBtn = document.createElement('button');
  hintBtn.className = 'compose-hint';
  hintBtn.textContent = '💡 힌트';
  answerRow.appendChild(hintBtn);

  container.appendChild(answerRow);

  const hintMessage = document.createElement('div');
  hintMessage.className = 'compose-hint-message hidden';
  container.appendChild(hintMessage);

  let typed = '';
  let hintUsed = false;
  // renderTyped needs to clear any pulsing hint key/message on onChar/onClear, but the
  // keyboard (which owns setHighlight) isn't created until after the first renderTyped()
  // call below — so route through a mutable reference instead of reordering everything.
  let highlightSetter: ((char: string | null) => void) | null = null;

  function renderTyped(): void {
    answerField.textContent = typed;
    const isValidPrefix = normalize(current.reading).startsWith(normalize(typed));
    answerField.classList.toggle('compose-answer-field-error', !isValidPrefix);
  }
  renderTyped();

  // Only onChar/onClear consume the hint — onBackspace never types the hinted char, and
  // it's how the user follows a Case B (deletion) combo hint, so it must not wipe it.
  function clearHint(): void {
    highlightSetter?.(null);
    hintMessage.classList.add('hidden');
  }

  const { element: keyboard, setHighlight } = renderKanaKeyboard({
    onChar: (char) => {
      typed += char;
      renderTyped();
      clearHint();
    },
    onBackspace: () => {
      typed = typed.slice(0, -1);
      renderTyped();
    },
    onClear: () => {
      typed = '';
      renderTyped();
      clearHint();
    },
  });
  highlightSetter = setHighlight;
  container.appendChild(keyboard);

  hintBtn.addEventListener('click', () => {
    const comboHint = nextHintCombo(current.reading, typed);
    if (comboHint) {
      hintUsed = true;
      hintMessage.textContent = comboHint.needsDelete
        ? `💡 ${comboHint.combo}는 한 키로 입력해요 — ⌫로 앞 글자를 지우고 반짝이는 ${comboHint.combo} 키를 눌러주세요`
        : `💡 다음은 ${comboHint.combo}예요 — 한 키로 입력되니 반짝이는 키를 눌러주세요`;
      hintMessage.classList.remove('hidden');
      setHighlight(comboHint.combo);
      return;
    }

    const hintChar = nextHintChar(current.reading, typed);
    if (!hintChar) return;
    hintUsed = true;
    hintMessage.textContent = `💡 다음 글자는 ${hintChar}예요 — 아래에서 반짝이는 키를 눌러보세요`;
    hintMessage.classList.remove('hidden');
    setHighlight(hintChar);
  });

  const submitBtn = document.createElement('button');
  submitBtn.className = 'compose-submit btn btn-primary';
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
  nextBtn.className = 'compose-next hidden btn btn-secondary';
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
    submitBtn.disabled = true;
    clearHint();

    const store = loadSentenceSrsStore();
    const grade: SrsGrade = isCorrect ? (hintUsed ? 'confusing' : 'known') : 'unknown';
    store[current.id] = reviewEntry(store[current.id], grade);
    saveSentenceSrsStore(store);
  });

  return container;
}
