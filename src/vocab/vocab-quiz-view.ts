import vocabulary from '../data/vocabulary.json';
import { entriesForDay } from '../data/vocab-days';
import { renderWord } from '../practice/furigana';
import { NAV_HTML } from '../nav';
import { reviewEntry } from '../srs';
import type { VocabEntry, VocabStudyGroup } from '../types';
import { loadSrsStore, pronunciationOf, renderAudioButton, renderVocabLink, saveSrsStore, STUDY_GROUPS } from './vocab-view';
import { buildVocabQuiz, type VocabQuizQuestion } from './vocab-quiz-logic';

const ENTRIES = vocabulary.entries as VocabEntry[];

function renderJapaneseLine(entry: VocabEntry): HTMLElement {
  const line = document.createElement('span');
  line.className = 'quiz-word has-furigana';
  line.lang = 'ja';
  line.appendChild(renderWord(entry.japanese, entry.reading));
  return line;
}

export function renderVocabQuizHome(hash: string, rng: () => number = Math.random): HTMLElement {
  const [path, query = ''] = hash.split('?');
  const direction = new URLSearchParams(query).get('direction') === 'ko-ja' ? 'ko-ja' : 'ja-ko';
  const reverse = direction === 'ko-ja';
  const suffix = reverse ? '?direction=ko-ja' : '';
  const container = document.createElement('div');
  container.className = 'vocab-quiz';
  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);
  const heading = document.createElement('h2');
  heading.textContent = '단어 퀴즈';
  container.appendChild(heading);
  const directions = document.createElement('div');
  directions.className = 'vocab-quiz-directions';
  directions.setAttribute('role', 'group');
  directions.setAttribute('aria-label', '출제 방향');
  for (const [value, label] of [['ja-ko', '일본어 → 한국어'], ['ko-ja', '한국어 → 일본어']] as const) {
    const link = document.createElement('a');
    link.href = path + (value === 'ko-ja' ? '?direction=ko-ja' : '');
    link.className = 'segment';
    link.textContent = label;
    if (value === direction) link.setAttribute('aria-current', 'true');
    directions.appendChild(link);
  }
  container.appendChild(directions);

  let scope: VocabEntry[] = [];
  let label = '';
  let backHref = '#/vocab/quiz' + suffix;
  const dayMatch = /^#\/vocab\/quiz\/day\/([1-9]\d*)$/.exec(path);
  const groupMatch = /^#\/vocab\/quiz\/group\/(noun|predicate|expression)(?:\/([1-9]\d*))?$/.exec(path);
  if (path === '#/vocab/quiz/all') {
    scope = ENTRIES;
    label = '전체 단어';
  } else if (dayMatch) {
    scope = entriesForDay(ENTRIES, Number(dayMatch[1]));
    label = `Day ${dayMatch[1]}`;
    backHref = `#/vocab/day/${dayMatch[1]}`;
  } else if (groupMatch) {
    const group = groupMatch[1] as VocabStudyGroup;
    scope = ENTRIES.filter(e => e.studyGroup === group);
    label = STUDY_GROUPS[group].label;
    backHref = `#/vocab/group/${group}`;
    if (groupMatch[2]) {
      scope = entriesForDay(scope, Number(groupMatch[2]));
      label += ` · 묶음 ${groupMatch[2]}`;
      backHref += `/${groupMatch[2]}`;
    }
  }

  if (scope.length === 0) {
    const help = document.createElement('p');
    help.className = 'page-help';
    help.textContent = `${reverse ? '한국어 뜻을 보고 일본어 읽기를 고르세요.' : '일본어 단어를 보고 한국어 뜻을 고르세요.'} 한 번에 최대 10문제이고, 맞히면 암기됨, 틀리면 모름으로 기록됩니다.`;
    container.appendChild(help);
    container.appendChild(renderVocabLink('#/vocab/quiz/all' + suffix, '全', '전체 단어 퀴즈', '단어장 전체에서 무작위로 출제'));
    for (const group of Object.keys(STUDY_GROUPS) as VocabStudyGroup[]) {
      const { icon, label: groupLabel } = STUDY_GROUPS[group];
      container.appendChild(renderVocabLink(`#/vocab/quiz/group/${group}${suffix}`, icon, `${groupLabel} 퀴즈`, '이 품사만 모아서 무작위로 출제'));
    }
    return container;
  }

  const back = document.createElement('a');
  back.className = 'back-link';
  back.href = backHref;
  back.textContent = '‹ 목록으로';
  container.appendChild(back);
  const session = document.createElement('section');
  session.className = 'vocab-quiz-session';
  session.setAttribute('aria-label', `${label} 퀴즈`);
  container.appendChild(session);

  let deck: VocabQuizQuestion[] = [];
  let index = 0;
  let correctCount = 0;
  let wrong: VocabEntry[] = [];
  let answered = false;
  let choiceButtons: HTMLButtonElement[] = [];

  function startRound(entries: VocabEntry[]): void {
    deck = buildVocabQuiz(entries, ENTRIES, rng, direction);
    index = 0;
    correctCount = 0;
    wrong = [];
    renderQuestion();
  }

  function renderResult(): void {
    session.replaceChildren();
    delete container.dataset.currentId;
    choiceButtons = [];

    const card = document.createElement('div');
    card.className = 'card quiz-result-card';
    const result = document.createElement('h3');
    result.className = 'vocab-quiz-result';
    result.textContent = deck.length ? `${deck.length}문제 중 ${correctCount}개 정답` : '이 범위에는 보기 5개를 만들 수 있는 단어가 없어요. 다른 범위를 골라보세요.';
    result.setAttribute('role', 'status');
    card.appendChild(result);

    if (deck.length) {
      const note = document.createElement('p');
      note.className = 'quiz-result-note';
      note.textContent = wrong.length === 0 ? '모두 맞혔어요. 복습일까지 기록해 두었습니다.' : '틀린 단어는 오답노트에도 담아 두었습니다.';
      card.appendChild(note);
    }

    if (wrong.length > 0) {
      const list = document.createElement('ul');
      list.className = 'quiz-wrong-list';
      for (const entry of wrong) {
        const item = document.createElement('li');
        item.appendChild(renderJapaneseLine(entry));
        const meaning = document.createElement('span');
        meaning.className = 'quiz-wrong-meaning';
        meaning.textContent = entry.korean.split(/[,;\n]/)[0];
        item.appendChild(meaning);
        list.appendChild(item);
      }
      card.appendChild(list);
    }

    const actions = document.createElement('div');
    actions.className = 'quiz-result-actions';
    if (wrong.length > 0) {
      const retryEntries = [...wrong];
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'vocab-quiz-retry btn btn-primary';
      retry.textContent = `틀린 단어 ${wrong.length}개 다시 풀기`;
      retry.addEventListener('click', () => startRound(retryEntries));
      actions.appendChild(retry);
    }
    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = `vocab-quiz-restart btn ${wrong.length > 0 ? 'btn-secondary' : 'btn-primary'}`;
    restart.textContent = '새 문제로 다시 시작';
    restart.addEventListener('click', () => startRound(scope));
    actions.appendChild(restart);
    card.appendChild(actions);
    session.appendChild(card);
  }

  function renderQuestion(): void {
    if (index >= deck.length) { renderResult(); return; }
    const current = deck[index];
    answered = false;
    container.dataset.currentId = current.entry.id;
    session.replaceChildren();

    const progress = document.createElement('div');
    progress.className = 'quiz-progress';
    const progressText = document.createElement('p');
    progressText.textContent = `${label}, ${index + 1} / ${deck.length}문제`;
    const progressScore = document.createElement('p');
    progressScore.textContent = `정답 ${correctCount}개`;
    const bar = document.createElement('div');
    bar.className = 'quiz-progress-bar';
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(deck.length));
    bar.setAttribute('aria-valuenow', String(index));
    bar.style.setProperty('--progress', `${(index / deck.length) * 100}%`);
    progress.append(progressText, progressScore, bar);
    session.appendChild(progress);

    const card = document.createElement('div');
    card.className = 'card kana-question-area quiz-card';
    const question = document.createElement('div');
    question.className = 'vocab-quiz-question';
    if (reverse) {
      question.textContent = current.prompt;
    } else {
      question.lang = 'ja';
      question.classList.add('has-furigana');
      question.appendChild(renderWord(current.entry.japanese, current.entry.reading));
    }
    card.appendChild(question);

    // 일본어를 보는 방향에서는 소리도 바로 들을 수 있게. 뜻을 묻는 문제라 정답이 새지 않는다.
    if (!reverse && current.entry.audioUrl) card.appendChild(renderAudioButton(current.entry.audioUrl));

    const choices = document.createElement('div');
    choices.className = 'vocab-quiz-options';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', reverse ? '일본어 읽기 보기' : '한국어 뜻 보기');
    const feedback = document.createElement('div');
    feedback.className = 'vocab-quiz-feedback kana-feedback';
    feedback.setAttribute('role', 'status');
    const detail = document.createElement('div');
    detail.className = 'vocab-quiz-detail';
    detail.hidden = true;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'vocab-quiz-next btn btn-primary';
    next.textContent = index + 1 === deck.length ? '결과 보기' : '다음 문제';
    next.hidden = true;
    next.addEventListener('click', () => { index += 1; renderQuestion(); });

    choiceButtons = current.options.map((option, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vocab-quiz-option btn btn-secondary';
      button.dataset.index = String(i);
      button.dataset.entryId = option.id;
      const key = document.createElement('kbd');
      key.textContent = String(i + 1);
      const text = document.createElement('span');
      text.textContent = option.label;
      if (reverse) text.lang = 'ja';
      button.append(key, text);
      button.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const correct = option.id === current.entry.id;
        const store = loadSrsStore();
        store[current.entry.id] = reviewEntry(store[current.entry.id], correct ? 'known' : 'unknown');
        saveSrsStore(store);
        if (correct) correctCount += 1;
        else wrong.push(current.entry);
        for (const choice of choiceButtons) {
          choice.disabled = true;
          if (choice.dataset.entryId === current.entry.id) choice.classList.add('vocab-quiz-correct');
        }
        if (!correct) button.classList.add('vocab-quiz-wrong');
        feedback.textContent = correct ? '정답!' : `오답, 정답은 ${current.options.find(o => o.id === current.entry.id)!.label}`;
        feedback.classList.add(correct ? 'is-correct' : 'is-wrong');
        card.classList.add(correct ? 'kana-correct' : 'kana-wrong');
        progressScore.textContent = `정답 ${correctCount}개`;
        bar.style.setProperty('--progress', `${((index + 1) / deck.length) * 100}%`);
        bar.setAttribute('aria-valuenow', String(index + 1));

        // 정답을 확인하는 순간 표기·읽기·소리·뜻을 한 번에 보여준다.
        const sound = document.createElement('span');
        sound.className = 'quiz-detail-sound';
        sound.textContent = pronunciationOf(current.entry);
        const meaning = document.createElement('span');
        meaning.className = 'quiz-detail-meaning';
        meaning.textContent = current.entry.korean;
        detail.replaceChildren(renderJapaneseLine(current.entry), sound, meaning);
        if (reverse && current.entry.audioUrl) detail.appendChild(renderAudioButton(current.entry.audioUrl));
        detail.hidden = false;
        next.hidden = false;
        next.focus();
      });
      choices.appendChild(button);
      return button;
    });
    card.append(choices, feedback, detail, next);
    session.appendChild(card);
  }

  container.addEventListener('keydown', event => {
    if (event.isComposing || event.repeat || event.ctrlKey || event.altKey || event.metaKey || answered || !/^[1-5]$/.test(event.key)) return;
    event.preventDefault();
    choiceButtons[Number(event.key) - 1]?.click();
  });
  // 포커스가 화면 밖에 있어도 숫자 키가 먹도록 문서에서 받아 넘긴다. 이 화면을 떠나면 스스로 떼어낸다.
  function forwardKey(event: KeyboardEvent): void {
    if (!container.isConnected) { document.removeEventListener('keydown', forwardKey); return; }
    if (container.contains(event.target as Node)) return;
    container.dispatchEvent(new KeyboardEvent('keydown', { key: event.key, repeat: event.repeat, ctrlKey: event.ctrlKey, altKey: event.altKey, metaKey: event.metaKey }));
  }
  document.addEventListener('keydown', forwardKey);
  startRound(scope);
  return container;
}
