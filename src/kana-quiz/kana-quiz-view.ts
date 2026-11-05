import { buildKanaTable } from '../data/kana-data';
import { answerRound, checkReadingAnswer, filterKana, startRound, type KanaRound } from './quiz-logic';
import { NAV_HTML } from '../nav';
import type { KanaChar, KanaGroup, KanaScript } from '../types';

const TABLE = buildKanaTable();

export const SCRIPT_NAMES: Record<KanaScript, string> = { hiragana: '히라가나', katakana: '가타카나' };

const GROUP_LABELS: Array<[KanaGroup, string]> = [
  ['basic', '청음'],
  ['dakuten', '탁음'],
  ['handakuten', '반탁음'],
  ['youon', '요음'],
];

/** 정답 후 다음 문제로 넘어가기까지 두는 시간. 정답 모션을 볼 만큼은 되고,
 *  연속으로 풀 때 답답하지 않을 만큼은 짧아야 한다. */
export const ADVANCE_DELAY_MS = 700;

/** 이만큼 틀리면 정답을 보여주고 넘어갈 수 있게 한다 — 정말 모르는 글자에서
 *  영영 빠져나오지 못하는 상태를 막는 안전장치. */
export const REVEAL_AFTER_WRONG = 3;

/** 한 번씩 풀기에서 틀렸을 때 정답을 읽을 시간. */
export const ROUND_WRONG_DELAY_MS = 1400;

export type KanaQuizMode = 'random' | 'round';

const RECENT_LIMIT = 24;

function pickRandom(pool: KanaChar[], rng: () => number): KanaChar {
  return pool[Math.floor(rng() * pool.length)];
}

export function renderKanaQuizView(script: KanaScript, rng: () => number = Math.random, mode: KanaQuizMode = 'random'): HTMLElement {
  const container = document.createElement('div');
  container.className = 'kana-quiz';
  container.dataset.script = script;

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const head = document.createElement('div');
  head.className = 'page-head';
  const heading = document.createElement('h2');
  heading.textContent = `${SCRIPT_NAMES[script]} 퀴즈`;
  const modes = document.createElement('div');
  modes.className = 'vocab-quiz-directions';
  modes.setAttribute('role', 'group');
  modes.setAttribute('aria-label', '푸는 방식');
  for (const [value, label] of [['random', '무작위'], ['round', '한 번씩 풀기']] as const) {
    const link = document.createElement('a');
    link.className = 'segment';
    link.href = `#/kana/${script}${value === 'round' ? '?mode=round' : ''}`;
    link.textContent = label;
    if (value === mode) link.setAttribute('aria-current', 'true');
    modes.appendChild(link);
  }
  const chartLink = document.createElement('a');
  chartLink.className = 'btn btn-plain';
  chartLink.href = `#/kana/chart/${script}`;
  chartLink.textContent = `${SCRIPT_NAMES[script]}표 보기`;
  head.append(heading, modes, chartLink);
  container.appendChild(head);

  // 왼쪽 큰 글자, 오른쪽 입력·범위·기록. 폰에서는 위아래로 쌓인다.
  const board = document.createElement('div');
  board.className = 'kana-question-area';
  const stage = document.createElement('div');
  stage.className = 'kana-stage';
  const panel = document.createElement('div');
  panel.className = 'kana-panel';
  const answerSlot = document.createElement('div');
  answerSlot.className = 'kana-answer-slot';
  panel.appendChild(answerSlot);
  board.append(stage, panel);
  container.appendChild(board);

  const score = document.createElement('p');
  score.className = 'kana-score';
  let solved = 0;
  function paintScore(): void {
    score.textContent = solved === 0 ? '발음을 한글이나 로마자로 입력하세요.' : `이번에 ${solved}개 맞혔어요.`;
  }
  paintScore();
  answerSlot.before(score);

  // 한 번씩 풀기의 시작 범위는 기본 글자(청음)다. 처음부터 104자를 끝내라고 하면 너무 길다.
  const groups = new Set<KanaGroup>(mode === 'round' ? ['basic'] : GROUP_LABELS.map(([group]) => group));
  let pool = filterKana(TABLE, { scripts: [script], groups: [...groups] });
  let pendingAdvance = 0;
  let round: KanaRound | null = mode === 'round' ? startRound(pool, rng) : null;

  const roundProgress = document.createElement('div');
  roundProgress.className = 'quiz-progress';
  const roundText = document.createElement('p');
  const roundMisses = document.createElement('p');
  const roundBar = document.createElement('div');
  roundBar.className = 'quiz-progress-bar';
  roundBar.setAttribute('role', 'progressbar');
  roundBar.setAttribute('aria-valuemin', '0');
  roundProgress.append(roundText, roundMisses, roundBar);
  if (round) score.replaceWith(roundProgress);
  // replaceWith 뒤에도 안내 문구는 입력칸 위에 남긴다.
  if (round) roundProgress.after(score);

  function paintRound(): void {
    if (!round) return;
    const done = round.total - round.queue.length;
    roundText.textContent = `${done} / ${round.total}자 맞힘, ${round.queue.length}자 남음`;
    roundMisses.textContent = `틀린 횟수 ${round.misses}번`;
    roundBar.setAttribute('aria-valuemax', String(round.total));
    roundBar.setAttribute('aria-valuenow', String(done));
    roundBar.style.setProperty('--progress', `${(done / round.total) * 100}%`);
  }

  const chips = document.createElement('div');
  chips.className = 'kana-groups';
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', '출제 범위');
  for (const [group, label] of GROUP_LABELS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'kana-group-chip';
    chip.textContent = label;
    chip.setAttribute('aria-pressed', 'true');
    chip.addEventListener('click', () => {
      // 마지막 하나는 끌 수 없다. 범위가 비면 낼 문제가 없다.
      if (groups.has(group) && groups.size === 1) return;
      if (groups.has(group)) groups.delete(group);
      else groups.add(group);
      chip.setAttribute('aria-pressed', String(groups.has(group)));
      pool = filterKana(TABLE, { scripts: [script], groups: [...groups] });
      // 범위가 바뀌면 판을 새로 시작한다.
      if (round) {
        round = startRound(pool, rng);
        solved = 0;
        recent.replaceChildren();
        paintScore();
      }
      renderQuestion();
    });
    chips.appendChild(chip);
  }
  panel.appendChild(chips);

  const recent = document.createElement('ol');
  recent.className = 'kana-recent';
  recent.setAttribute('aria-label', '방금 푼 글자');
  panel.appendChild(recent);

  function addRecent(kana: KanaChar, clean: boolean): void {
    const item = document.createElement('li');
    item.classList.toggle('is-missed', !clean);
    const char = document.createElement('span');
    char.lang = 'ja';
    char.textContent = kana.char;
    const reading = document.createElement('span');
    reading.textContent = kana.hangul;
    item.append(char, reading);
    recent.prepend(item);
    recent.children[RECENT_LIMIT]?.remove();
  }

  function renderRoundResult(finished: KanaRound): void {
    delete container.dataset.currentRomaji;
    delete container.dataset.currentHangul;
    const mark = document.createElement('div');
    mark.className = 'kana-question';
    mark.lang = 'ja';
    mark.textContent = '完';
    stage.replaceChildren(mark);

    const title = document.createElement('h3');
    title.className = 'kana-round-title';
    title.setAttribute('role', 'status');
    title.textContent = `${finished.total}자를 모두 맞혔어요`;
    const note = document.createElement('p');
    note.className = 'kana-round-note';
    note.textContent = finished.misses === 0 ? '한 번도 틀리지 않았어요.' : `중간에 ${finished.misses}번 틀렸어요. 아래 빨간 글자를 다시 살펴보세요.`;
    const restart = document.createElement('button');
    restart.type = 'button';
    restart.className = 'kana-round-restart btn btn-primary';
    restart.textContent = '처음부터 다시 풀기';
    restart.addEventListener('click', () => {
      round = startRound(pool, rng);
      solved = 0;
      recent.replaceChildren();
      paintScore();
      renderQuestion();
    });
    answerSlot.replaceChildren(title, note, restart);
    score.textContent = '';
    restart.focus();
  }

  function renderQuestion(): void {
    window.clearTimeout(pendingAdvance);
    board.classList.remove('kana-correct', 'kana-wrong');
    paintRound();
    if (round && round.queue.length === 0) {
      renderRoundResult(round);
      return;
    }

    const current = round ? round.queue[0] : pickRandom(pool, rng);
    container.dataset.currentRomaji = current.romaji;
    container.dataset.currentHangul = current.hangul;

    let wrongCount = 0;

    const question = document.createElement('div');
    question.className = 'kana-question';
    question.lang = 'ja';
    question.textContent = current.char;
    stage.replaceChildren(question);

    // 버튼 없이 엔터만으로 진행한다. form의 submit이 엔터를 그대로 받아준다.
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'kana-answer-input';
    input.placeholder = '발음 입력 후 Enter';
    input.setAttribute('aria-label', '발음 입력');
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.autofocus = true;
    form.appendChild(input);

    const feedback = document.createElement('div');
    feedback.className = 'kana-feedback';

    // 여러 번 틀린 뒤에만 나타난다. 그 전까지는 스스로 다시 입력하는 게 이 화면의 흐름.
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'kana-next btn btn-secondary hidden';
    nextBtn.textContent = '다음 문제';
    nextBtn.addEventListener('click', () => {
      addRecent(current, false);
      renderQuestion();
    });
    answerSlot.replaceChildren(form, feedback, nextBtn);

    function handleCorrect(): void {
      // 틀렸다 맞힌 경우 kana-wrong을 반드시 떼야 한다. 두 클래스가 같이 붙으면
      // CSS 소스 순서상 kana-wrong의 규칙이 이겨서 정답 모션이 안 뜬다.
      // remove 후 리플로우를 강제해야 flash 애니메이션이 실제로 재생된다.
      board.classList.remove('kana-wrong');
      void board.offsetWidth;
      board.classList.add('kana-correct');

      feedback.textContent = '정답!';
      solved += 1;
      paintScore();
      addRecent(current, wrongCount === 0);
      if (round) answerRound(round, true);
      // 넘어가는 사이에 또 입력해서 다음 문제까지 채점되는 걸 막는다.
      input.disabled = true;
      pendingAdvance = window.setTimeout(renderQuestion, ADVANCE_DELAY_MS);
    }

    function handleWrong(): void {
      wrongCount += 1;
      input.value = '';
      input.focus();

      // 클래스를 뗐다 붙이지 않으면 같은 애니메이션이 두 번째부터 재생되지 않는다.
      // kana-correct도 함께 떼어 두 클래스가 겹치지 않게 한다(상호 배타).
      board.classList.remove('kana-wrong', 'kana-correct');
      void board.offsetWidth;
      board.classList.add('kana-wrong');

      // 한 번씩 풀기: 틀리면 정답을 보여 주고 맨 뒤로 보낸다. 나중에 다시 맞혀야 빠진다.
      if (round) {
        answerRound(round, false);
        addRecent(current, false);
        feedback.textContent = `정답: ${current.hangul} / ${current.romaji}. 뒤에 다시 나와요`;
        input.disabled = true;
        paintRound();
        pendingAdvance = window.setTimeout(renderQuestion, ROUND_WRONG_DELAY_MS);
        return;
      }

      if (wrongCount >= REVEAL_AFTER_WRONG) {
        feedback.textContent = `정답: ${current.hangul} / ${current.romaji}`;
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
