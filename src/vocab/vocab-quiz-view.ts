import vocabulary from '../data/vocabulary.json';
import { entriesForDay, totalDays } from '../data/vocab-days';
import { renderWord } from '../practice/furigana';
import { NAV_HTML } from '../nav';
import { recordQuizAnswer } from '../srs';
import type { VocabEntry, VocabStudyGroup } from '../types';
import { isMissed, isWeak, loadSrsStore, pronunciationOf, renderVocabLink, renderWordAudio, renderWrongQuizLinks, saveSrsStore, STUDY_GROUPS } from './vocab-view';
import { buildVocabQuiz, checkTypedAnswer, type VocabQuizQuestion } from './vocab-quiz-logic';
import { romajiToKana } from '../practice/romaji';

const ENTRIES = vocabulary.entries as VocabEntry[];

function renderJapaneseLine(entry: VocabEntry): HTMLElement {
  const line = document.createElement('span');
  line.className = 'quiz-word has-furigana';
  line.lang = 'ja';
  line.appendChild(renderWord(entry.japanese, entry.reading));
  return line;
}

/** JLPT처럼 다른 단어 목록으로 같은 퀴즈 화면을 쓸 때 범위를 넘겨준다. */
export interface VocabQuizSource {
  title: string;
  pool: VocabEntry[];
  scope: VocabEntry[];
  label: string;
  backHref: string;
  limit?: number;
  /** 결과 화면의 '다음 Day 퀴즈'. 마지막 Day면 없다. */
  next?: { href: string; label: string };
}

export function renderVocabQuizHome(hash: string, rng: () => number = Math.random, source?: VocabQuizSource): HTMLElement {
  const [path, query = ''] = hash.split('?');
  const params = new URLSearchParams(query);
  const direction = params.get('direction') === 'ko-ja' ? 'ko-ja' : 'ja-ko';
  const reverse = direction === 'ko-ja';
  const suffix = reverse ? '?direction=ko-ja' : '';
  // ?count=all은 범위의 모든 단어를, ?only=weak는 내가 모름·헷갈림으로 표시한 단어만, ?only=missed는 퀴즈에서 틀린 단어만 낸다.
  const countAll = params.get('count') === 'all';
  const only = params.get('only');
  const keep = only === 'weak' ? isWeak : only === 'missed' ? isMissed : null;
  const container = document.createElement('div');
  container.className = 'vocab-quiz';
  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);
  const heading = document.createElement('h2');
  heading.textContent = source?.title ?? '단어 퀴즈';
  const head = document.createElement('div');
  head.className = 'page-head';
  head.appendChild(heading);
  container.appendChild(head);
  const directions = document.createElement('div');
  directions.className = 'vocab-quiz-directions';
  directions.setAttribute('role', 'group');
  directions.setAttribute('aria-label', '출제 방향');
  for (const [value, label] of [['ja-ko', '일본어 → 한국어'], ['ko-ja', '한국어 → 일본어']] as const) {
    const link = document.createElement('a');
    const linkParams = new URLSearchParams(params);
    if (value === 'ko-ja') linkParams.set('direction', 'ko-ja');
    else linkParams.delete('direction');
    const linkQuery = linkParams.toString();
    link.href = path + (linkQuery ? `?${linkQuery}` : '');
    link.className = 'segment';
    link.textContent = label;
    if (value === direction) link.setAttribute('aria-current', 'true');
    directions.appendChild(link);
  }
  head.appendChild(directions);

  let scope: VocabEntry[] = [];
  let label = '';
  let backHref = '#/vocab/quiz' + suffix;
  let nextQuiz: { href: string; label: string } | undefined;
  // 다음 Day로 넘어가도 출제 방향과 문제 수는 그대로, 모름·틀린 단어만 고르기는 그 Day 것이라 뺀다.
  const carried = new URLSearchParams(params);
  carried.delete('only');
  const carry = carried.toString() ? `?${carried}` : '';
  const dayMatch = /^#\/vocab\/quiz\/day\/([1-9]\d*)$/.exec(path);
  const groupMatch = /^#\/vocab\/quiz\/group\/(noun|predicate|expression)(?:\/([1-9]\d*))?$/.exec(path);
  if (source) {
    scope = source.scope;
    label = source.label;
    backHref = source.backHref;
    nextQuiz = source.next && { href: source.next.href + carry, label: source.next.label };
  } else if (path === '#/vocab/quiz/all') {
    scope = ENTRIES;
    label = '전체 단어';
  } else if (dayMatch) {
    scope = entriesForDay(ENTRIES, Number(dayMatch[1]));
    label = `Day ${dayMatch[1]}`;
    backHref = `#/vocab/day/${dayMatch[1]}`;
    const day = Number(dayMatch[1]);
    if (day < totalDays(ENTRIES.length)) nextQuiz = { href: `#/vocab/quiz/day/${day + 1}${carry}`, label: `Day ${day + 1}` };
  } else if (groupMatch) {
    const group = groupMatch[1] as VocabStudyGroup;
    scope = ENTRIES.filter(e => e.studyGroup === group);
    label = STUDY_GROUPS[group].label;
    backHref = `#/vocab/group/${group}`;
    if (groupMatch[2]) {
      scope = entriesForDay(scope, Number(groupMatch[2]));
      label += ` · 묶음 ${groupMatch[2]}`;
      backHref += `/${groupMatch[2]}`;
      const batch = Number(groupMatch[2]);
      if (batch < totalDays(ENTRIES.filter(e => e.studyGroup === group).length)) {
        nextQuiz = { href: `#/vocab/quiz/group/${group}/${batch + 1}${carry}`, label: `묶음 ${batch + 1}` };
      }
    }
  }

  if (scope.length === 0) {
    const help = document.createElement('p');
    help.className = 'page-help';
    help.textContent = `${reverse ? '한국어 뜻을 보고 일본어 읽기를 고르세요.' : '일본어 단어를 보고 한국어 뜻을 고르세요.'} 틀린 단어는 '틀린 단어'로 따로 모이고, 암기됨이라 해 둔 단어를 틀리면 헷갈림으로 바뀝니다. Day 화면에서는 그 Day의 전체 단어로도 풀 수 있어요.`;
    container.appendChild(help);
    const scopes = document.createElement('div');
    scopes.className = 'shortcut-grid';
    container.appendChild(scopes);
    scopes.appendChild(renderVocabLink('#/vocab/quiz/all' + suffix, '全', '전체 단어 퀴즈', '단어장 전체에서 무작위로 출제'));
    const store = loadSrsStore();
    const extra = reverse ? '&direction=ko-ja' : '';
    scopes.append(...renderWrongQuizLinks('#/vocab/quiz/all', ENTRIES, store, 10, extra).children);
    for (const group of Object.keys(STUDY_GROUPS) as VocabStudyGroup[]) {
      const { icon, label: groupLabel } = STUDY_GROUPS[group];
      scopes.appendChild(renderVocabLink(`#/vocab/quiz/group/${group}${suffix}`, icon, `${groupLabel} 퀴즈`, '이 품사만 모아서 무작위로 출제'));
    }
    return container;
  }

  if (keep) label += only === 'weak' ? ' · 모름·헷갈림' : ' · 틀린 단어';
  // 채점이 바뀌므로 다시 시작할 때마다 지금 모름·헷갈림인 단어를 새로 고른다.
  const roundScope = (): VocabEntry[] => {
    if (!keep) return scope;
    const store = loadSrsStore();
    return scope.filter(e => keep(store[e.id]));
  };

  const back = document.createElement('a');
  back.className = 'back-link';
  back.href = backHref;
  back.textContent = '‹ 목록으로';
  head.appendChild(back);
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
  const byId = new Map((source?.pool ?? ENTRIES).map(e => [e.id, e]));

  function startRound(entries: VocabEntry[]): void {
    deck = buildVocabQuiz(entries, source?.pool ?? ENTRIES, rng, direction, countAll ? Infinity : source?.limit);
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
    result.textContent = deck.length ? `${deck.length}문제 중 ${correctCount}개 정답` : keep && roundScope().length === 0 ? (only === 'weak' ? '모름·헷갈림으로 표시한 단어가 없어요.' : '퀴즈에서 틀린 단어가 없어요. 모두 다시 맞혔습니다.') : '이 범위에는 보기 5개를 만들 수 있는 단어가 없어요. 다른 범위를 골라보세요.';
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
    restart.textContent = `${label} 다시 풀기`;
    restart.addEventListener('click', () => startRound(roundScope()));
    actions.appendChild(restart);
    if (nextQuiz) {
      const nextLink = document.createElement('a');
      nextLink.className = 'vocab-quiz-next-scope btn btn-secondary';
      nextLink.href = nextQuiz.href;
      nextLink.textContent = `${nextQuiz.label} 퀴즈 ›`;
      actions.appendChild(nextLink);
    }
    const backLink = document.createElement('a');
    backLink.className = 'btn btn-plain';
    backLink.href = backHref;
    backLink.textContent = '‹ 단어 목록으로';
    actions.appendChild(backLink);
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
    card.className = 'kana-question-area quiz-card';
    // 넓은 화면에서는 왼쪽에 문제, 오른쪽에 보기를 나란히 둔다.
    const stage = document.createElement('div');
    stage.className = 'quiz-stage';
    const answers = document.createElement('div');
    answers.className = 'quiz-answers';
    const question = document.createElement('div');
    question.className = 'vocab-quiz-question';
    // 글자 수에 맞춰 크기를 정해 짧은 단어는 크게, 긴 문구는 줄바꿈 없이 보이게 한다.
    question.style.setProperty('--chars', String([...(reverse ? current.prompt : current.entry.japanese)].length));
    if (reverse) {
      question.textContent = current.prompt;
    } else {
      question.lang = 'ja';
      question.classList.add('has-furigana');
      question.appendChild(renderWord(current.entry.japanese, current.entry.reading));
    }
    stage.appendChild(question);

    // 독음(후리가나)은 가려 두고, 모르는 칸지가 있을 때만 눌러서 본다. 답을 고르면 저절로 보인다.
    card.classList.add('readings-hidden');
    const readingToggle = document.createElement('button');
    readingToggle.type = 'button';
    readingToggle.className = 'vocab-quiz-reading-toggle btn btn-plain';
    // 카드 모서리에 들어가도록 짧게 쓴다. 눌린 상태는 aria-pressed 색으로 보인다.
    readingToggle.textContent = '독음';
    readingToggle.setAttribute('aria-label', '독음 보기');
    readingToggle.setAttribute('aria-pressed', 'false');
    readingToggle.addEventListener('click', () => {
      const hidden = card.classList.toggle('readings-hidden');
      readingToggle.setAttribute('aria-pressed', String(!hidden));
    });

    // 일본어를 보는 방향에서는 소리도 바로 들을 수 있게. 뜻을 묻는 문제라 정답이 새지 않는다.
    const stageAudio = reverse ? null : renderWordAudio(current.entry);
    if (stageAudio) stage.appendChild(stageAudio);

    // 먼저 직접 써 본다. 막히면 '보기 보기'로 다섯 개 중에서 고른다.
    // 한국어→일본어는 로마자로 치면 가나로 바뀐다 (kasa → かさ, 대문자는 가타카나).
    let revealed = false;
    const typeForm = document.createElement('form');
    typeForm.className = 'vocab-quiz-type';
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'vocab-quiz-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocapitalize', 'off');
    input.placeholder = reverse ? '읽기를 로마자로 (kasa → かさ)' : '한국어 뜻을 써 보세요';
    input.setAttribute('aria-label', reverse ? '일본어 읽기 입력' : '한국어 뜻 입력');
    if (reverse) {
      input.lang = 'ja';
      input.addEventListener('input', event => {
        if ((event as InputEvent).isComposing) return;
        input.value = romajiToKana(input.value);
      });
    }
    const check = document.createElement('button');
    check.type = 'submit';
    check.className = 'vocab-quiz-check btn btn-primary';
    check.textContent = '확인';
    const reveal = document.createElement('button');
    reveal.type = 'button';
    reveal.className = 'vocab-quiz-reveal btn btn-plain';
    reveal.textContent = '보기 보기';
    typeForm.append(input, check, reveal);

    const choices = document.createElement('div');
    choices.className = 'vocab-quiz-options';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', reverse ? '일본어 읽기 보기' : '한국어 뜻 보기');
    choices.hidden = true;
    reveal.addEventListener('click', () => {
      revealed = true;
      choices.hidden = false;
      typeForm.remove();
      // 폰에서는 보기 다섯 개가 아래 탭에 가리지 않게 끝까지 보이도록 내린다.
      choices.scrollIntoView?.({ block: 'nearest' });
    });
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
      const optionEntry = byId.get(option.id);
      if (reverse && optionEntry) {
        text.lang = 'ja';
        text.className = 'has-furigana';
        text.appendChild(renderWord(optionEntry.japanese, optionEntry.reading));
      } else {
        text.textContent = option.label;
      }
      button.append(key, text);
      button.addEventListener('click', () => {
        if (answered) return;
        if (!correctChoice(option.id)) button.classList.add('vocab-quiz-wrong');
        finish(correctChoice(option.id));
      });
      choices.appendChild(button);
      return button;
    });

    function correctChoice(id: string): boolean {
      return id === current.entry.id;
    }

    /** 직접 쓴 답이든 보기에서 고른 답이든 여기서 한 번만 기록한다. */
    function finish(correct: boolean, typed?: string): void {
      answered = true;
      const store = loadSrsStore();
      const before = store[current.entry.id];
      // 보기 없이 직접 써서 맞혔을 때만 외운 것으로 본다.
      store[current.entry.id] = recordQuizAnswer(before, correct, new Date(), correct && !revealed);
      saveSrsStore(store);
      if (correct) correctCount += 1;
      else wrong.push(current.entry);
      for (const choice of choiceButtons) {
        choice.disabled = true;
        if (correctChoice(choice.dataset.entryId ?? '')) choice.classList.add('vocab-quiz-correct');
      }
      input.disabled = true;
      typeForm.remove();
      card.classList.remove('readings-hidden');
      readingToggle.remove();
      const answerLabel = reverse && current.entry.japanese !== current.entry.reading.trim() ? `${current.entry.japanese} (${current.entry.reading.trim()})` : current.options.find(o => o.id === current.entry.id)!.label;
      feedback.textContent = correct ? '정답!' : typed !== undefined ? `오답, 내 답 "${typed}" · 정답은 ${answerLabel}` : `오답, 정답은 ${answerLabel}`;
      feedback.classList.add(correct ? 'is-correct' : 'is-wrong');
      card.classList.add(correct ? 'kana-correct' : 'kana-wrong');
      updateProgress();

      // 뜻이 여러 개라 내 답이 사실상 맞는데 오답이 됐으면 직접 바로잡는다.
      if (!correct && typed !== undefined) {
        const accept = document.createElement('button');
        accept.type = 'button';
        accept.className = 'vocab-quiz-accept btn btn-plain';
        accept.textContent = '내 답도 맞아요';
        accept.addEventListener('click', () => {
          const fixed = loadSrsStore();
          fixed[current.entry.id] = recordQuizAnswer(before, true, new Date(), true);
          saveSrsStore(fixed);
          correctCount += 1;
          wrong = wrong.filter(entry => entry.id !== current.entry.id);
          feedback.textContent = `정답으로 고쳤어요. 정답은 ${answerLabel}`;
          feedback.classList.replace('is-wrong', 'is-correct');
          card.classList.replace('kana-wrong', 'kana-correct');
          accept.remove();
          updateProgress();
          next.focus({ preventScroll: true });
        });
        feedback.after(accept);
      }

      // 정답을 확인하는 순간 표기·읽기·소리·뜻을 한 번에 보여준다.
      const sound = document.createElement('span');
      sound.className = 'quiz-detail-sound';
      sound.textContent = pronunciationOf(current.entry);
      const meaning = document.createElement('span');
      meaning.className = 'quiz-detail-meaning';
      meaning.textContent = current.entry.korean;
      detail.replaceChildren(renderJapaneseLine(current.entry), sound, meaning);
      const detailAudio = reverse ? renderWordAudio(current.entry) : null;
      if (detailAudio) detail.appendChild(detailAudio);
      detail.hidden = false;
      next.hidden = false;
      next.focus({ preventScroll: true });
    }

    function updateProgress(): void {
      progressScore.textContent = `정답 ${correctCount}개`;
      bar.style.setProperty('--progress', `${((index + 1) / deck.length) * 100}%`);
      bar.setAttribute('aria-valuenow', String(index + 1));
    }

    typeForm.addEventListener('submit', event => {
      event.preventDefault();
      if (answered) return;
      const typed = (reverse ? romajiToKana(input.value, false, true) : input.value).trim();
      if (!typed) return;
      if (reverse) input.value = typed;
      finish(checkTypedAnswer(current, typed, direction), typed);
    });

    answers.append(typeForm, choices, feedback, detail, next);
    card.append(stage, answers);
    // 칸지가 있어 가릴 독음이 있을 때만 버튼을 둔다.
    if (card.querySelector('rt')) stage.appendChild(readingToggle);
    session.appendChild(card);
    // 마우스가 있는 PC에서만 입력칸으로 커서를 옮긴다. 폰에서는 키보드가 올라와 화면이 움직이고,
    // 독음 보기나 보기 보기를 먼저 누를 수도 있어서 직접 누를 때까지 둔다.
    if (window.matchMedia?.('(pointer: fine)').matches) {
      setTimeout(() => { if (input.isConnected && !answered) input.focus({ preventScroll: true }); }, 0);
    }
  }

  container.addEventListener('keydown', event => {
    // 입력칸에서 친 숫자는 답이다(10분 등). 보기 단축키는 보기를 열었을 때만.
    if (event.target instanceof HTMLInputElement || choiceButtons[0]?.closest<HTMLElement>('.vocab-quiz-options')?.hidden) return;
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
  startRound(roundScope());
  return container;
}
