import vocabulary from '../data/vocabulary.json';
import { entriesForDay } from '../data/vocab-days';
import { NAV_HTML } from '../nav';
import { reviewEntry } from '../srs';
import type { VocabEntry, VocabStudyGroup } from '../types';
import { loadSrsStore, renderVocabLink, saveSrsStore, STUDY_GROUPS } from './vocab-view';
import { buildVocabQuiz, type VocabQuizQuestion } from './vocab-quiz-logic';

const ENTRIES = vocabulary.entries as VocabEntry[];

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
    link.className = `btn ${value === direction ? 'btn-primary' : 'btn-plain'}`;
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

  const help = document.createElement('p');
  help.textContent = `${reverse ? '한국어 뜻을 보고 일본어 읽기를 고르세요.' : '일본어 읽기를 보고 한국어 뜻을 고르세요.'} 숫자 1~5 키로도 선택할 수 있어요. 한 번에 최대 10문제, 정답은 암기됨·오답은 모름으로 기록됩니다.`;
  container.appendChild(help);
  if (scope.length === 0) {
    container.appendChild(renderVocabLink('#/vocab/quiz/all' + suffix, '🎲', '전체 단어 퀴즈', '단어장 전체에서 무작위 출제'));
    for (const group of Object.keys(STUDY_GROUPS) as VocabStudyGroup[]) {
      const { icon, label } = STUDY_GROUPS[group];
      container.appendChild(renderVocabLink(`#/vocab/quiz/group/${group}${suffix}`, icon, `${label} 퀴즈`, '이 품사만 모아서 무작위 출제'));
    }
    return container;
  }

  const back = document.createElement('a');
  back.href = backHref;
  back.textContent = '← 목록으로';
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
    const result = document.createElement('h3');
    result.className = 'vocab-quiz-result';
    result.textContent = deck.length ? `${deck.length}문제 중 ${correctCount}개 정답` : '5개의 보기를 만들 수 있는 가나 읽기·뜻이 있는 단어가 없습니다.';
    result.setAttribute('role', 'status');
    session.appendChild(result);
    if (wrong.length > 0) {
      const retryEntries = [...wrong];
      const retry = document.createElement('button');
      retry.className = 'vocab-quiz-retry btn btn-primary';
      retry.textContent = `틀린 단어 ${wrong.length}개 다시 풀기`;
      retry.addEventListener('click', () => startRound(retryEntries));
      session.appendChild(retry);
    }
    const restart = document.createElement('button');
    restart.className = 'vocab-quiz-restart btn btn-plain';
    restart.textContent = '새 문제로 다시 시작';
    restart.addEventListener('click', () => startRound(scope));
    session.appendChild(restart);
  }

  function renderQuestion(): void {
    if (index >= deck.length) { renderResult(); return; }
    const current = deck[index];
    answered = false;
    container.dataset.currentId = current.entry.id;
    session.replaceChildren();
    const progress = document.createElement('p');
    progress.textContent = `${label} · ${index + 1} / ${deck.length} · 정답 ${correctCount}개`;
    session.appendChild(progress);
    const card = document.createElement('div');
    card.className = 'card kana-question-area';
    const question = document.createElement('div');
    question.className = 'vocab-quiz-question compose-question';
    question.textContent = current.prompt;
    card.appendChild(question);
    const choices = document.createElement('div');
    choices.className = 'vocab-quiz-options';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', reverse ? '일본어 읽기 보기' : '한국어 뜻 보기');
    const feedback = document.createElement('div');
    feedback.className = 'vocab-quiz-feedback kana-feedback';
    feedback.setAttribute('role', 'status');
    const detail = document.createElement('p');
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
      button.textContent = `${i + 1}. ${option.label}`;
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
        feedback.textContent = correct ? '정답!' : `오답 · 정답: ${current.options.find(o => o.id === current.entry.id)!.label}`;
        card.classList.add(correct ? 'kana-correct' : 'kana-wrong');
        detail.textContent = `${current.entry.japanese} · ${current.entry.korean}`;
        detail.hidden = false;
        next.hidden = false;
        next.focus();
      });
      choices.appendChild(button);
      return button;
    });
    card.append(choices, feedback, detail, next);
    session.appendChild(card);
    queueMicrotask(() => { if (container.isConnected) choiceButtons[0]?.focus(); });
  }

  container.addEventListener('keydown', event => {
    if (event.isComposing || event.repeat || event.ctrlKey || event.altKey || event.metaKey || answered || !/^[1-5]$/.test(event.key)) return;
    event.preventDefault();
    choiceButtons[Number(event.key) - 1]?.click();
  });
  startRound(scope);
  return container;
}
