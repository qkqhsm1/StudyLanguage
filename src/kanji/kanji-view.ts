import { formatPronunciation } from '../data/kana-romanize';
import { NAV_HTML } from '../nav';
import { renderWord } from '../practice/furigana';
import { pronunciationOf, renderAudioButton } from '../vocab/vocab-view';
import type { SrsStore } from '../types';
import {
  buildKanjiQuiz, currentSet, dueKanji, findKanji, formatKun, isMastered, KANJI, KANJI_PER_SET, kanjiInSet, loadKanjiStore,
  missedKanji, recordKanji, readingsLabel, setsIn, skillGrade, wordsWith, type KanjiEntry, type KanjiQuizMode, type KanjiSkill,
} from './kanji-data';
import { gradeWriting } from './stroke-check';
import { renderStrokes, renderWritingPad } from './writing-pad';

const TRACE_KEY = 'kanji-trace';

type WriteStep = 'trace' | 'copy' | 'recall';
const WRITE_STEPS: Record<WriteStep, { label: string; help: string }> = {
  trace: { label: '따라 쓰기', help: '회색 밑글씨 위로 획순대로 따라 쓰세요' },
  copy: { label: '보고 쓰기', help: '옆의 글자를 보면서 써 보세요' },
  recall: { label: '안 보고 쓰기', help: '이 칸지를 기억해서 써 보세요' },
};
/** 급수 전체 테스트의 문제 수. */
const LEVEL_TEST_QUESTIONS = 30;

/** 같은 화면을 칸지 탭과 JLPT 급수에서 함께 쓴다. 글자 목록과 주소만 다르다. */
export interface KanjiContext {
  list: KanjiEntry[];
  base: string;
  title: string;
  /** 목록 위 설명. 비어 있으면 단어장 칸지 탭이다. */
  level?: string;
}

const DEFAULT_CONTEXT: KanjiContext = { list: KANJI, base: '#/kanji', title: '칸지' };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function link(href: string, className: string, text: string): HTMLAnchorElement {
  const a = el('a', className, text);
  a.href = href;
  return a;
}

/** 필순 자료는 1MB 가까이 되어 칸지 쓰기·상세 화면에 들어갈 때 처음 한 번만 받는다. */
async function loadStrokes(char: string): Promise<string[]> {
  const data = (await import('../data/kanji-strokes.json')).default as Record<string, string[]>;
  return data[char] ?? [];
}

function pageHead(title: string, extra: HTMLElement[] = []): HTMLElement {
  const head = el('div', 'page-head');
  head.append(el('h2', '', title), ...extra);
  return head;
}

function shortcut(href: string, glyph: string, name: string, sub: string): HTMLElement {
  const a = link(href, 'skill-list-item', '');
  const icon = el('span', 'skill-list-icon', glyph);
  icon.lang = 'ja';
  icon.setAttribute('aria-hidden', 'true');
  const body = el('span', 'skill-list-body');
  body.append(el('span', 'skill-list-name', name), el('span', 'skill-list-sub', sub));
  a.append(icon, body);
  return a;
}

function kanjiTile(entry: KanjiEntry, store: SrsStore, base: string): HTMLElement {
  const tile = link(`${base}/char/${encodeURIComponent(entry.id)}`, 'kanji-tile', '');
  const char = el('span', 'kanji-tile-char', entry.id);
  char.lang = 'ja';
  const dots = el('span', 'kanji-tile-skills');
  for (const [skill, label] of [['read', '읽기'], ['write', '쓰기']] as Array<[KanjiSkill, string]>) {
    const dot = el('span', 'kanji-skill-dot');
    dot.dataset.grade = skillGrade(store, skill, entry.id) ?? 'new';
    dot.textContent = label;
    dots.appendChild(dot);
  }
  const reading = el('span', 'kanji-tile-reading', readingsLabel(entry).split(' · ').slice(0, 2).join(' · '));
  reading.lang = 'ja';
  tile.append(char, reading, el('span', 'kanji-tile-hun', entry.hun), dots);
  return tile;
}

function renderHome(container: HTMLElement, store: SrsStore, ctx: KanjiContext): void {
  const { list, base } = ctx;
  const set = currentSet(store, list);
  const totalSets = setsIn(list);
  if (ctx.level) container.appendChild(link(`#/jlpt/${ctx.level.toLowerCase()}`, 'back-link', `‹ ${ctx.level}`));
  container.appendChild(pageHead(ctx.title));
  const shortcuts = el('div', 'shortcut-grid');
  shortcuts.append(
    shortcut(`${base}/read?set=${set}`, '読', '읽기 퀴즈', `지금 묶음 ${set}의 칸지를 일본어로 읽기`),
    shortcut(`${base}/write?set=${set}`, '書', '쓰기 연습', `묶음 ${set}을 따라 쓰기, 보고 쓰기, 안 보고 쓰기로 세 번씩`),
    shortcut(`${base}/today`, '復', '오늘 복습', `읽기 ${dueKanji(store, 'read', undefined, list).length}자, 쓰기 ${dueKanji(store, 'write', undefined, list).length}자`),
    shortcut(`${base}/wrong`, '誤', '오답노트', `틀린 읽기 ${missedKanji(store, 'read', list).length}자, 쓰기 ${missedKanji(store, 'write', list).length}자`),
  );
  if (ctx.level) shortcuts.prepend(shortcut(`${base}/read?scope=all`, '試', `${ctx.level} 칸지 테스트`, `전체 ${list.length}자에서 ${Math.min(LEVEL_TEST_QUESTIONS, list.length)}문제`));
  container.appendChild(shortcuts);
  container.appendChild(el('h3', 'section-title', ctx.level ? `${ctx.level} 칸지 ${list.length}자, ${totalSets}묶음` : `단어장에 나오는 ${list.length}자, ${totalSets}묶음`));

  const grid = el('div', 'day-grid');
  for (let n = 1; n <= totalSets; n++) {
    const entries = kanjiInSet(n, list);
    const mastered = entries.filter((entry) => isMastered(store, entry.id)).length;
    const tile = link(`${base}/set/${n}`, 'skill-list-item day-tile', '');
    tile.style.setProperty('--known-share', `${(mastered / entries.length) * 100}%`);
    if (mastered === entries.length) tile.classList.add('is-done');
    if (n === set && mastered < entries.length) {
      tile.classList.add('is-current');
      tile.setAttribute('aria-current', 'step');
    }
    const body = el('span', 'skill-list-body');
    const preview = el('span', 'skill-list-name', `묶음 ${n}`);
    const sub = el('span', 'skill-list-sub', `${mastered} / ${entries.length}`);
    sub.setAttribute('aria-label', `${entries.length}자 중 ${mastered}자 익힘`);
    body.append(preview, sub);
    tile.appendChild(body);
    grid.appendChild(tile);
  }
  container.appendChild(grid);
  container.appendChild(el('p', 'kanji-credit', '필순: KanjiVG (CC BY-SA 3.0). 읽기: KANJIDIC2 (CC BY-SA 4.0). 훈음: 위키낱말사전 (CC BY-SA), jmdict-ko (CC BY-SA 4.0), libhangul.'));
}

function renderSet(container: HTMLElement, set: number, store: SrsStore, ctx: KanjiContext): void {
  const { list, base } = ctx;
  container.appendChild(link(base, 'back-link', '‹ 묶음 목록'));
  container.appendChild(pageHead(`${ctx.title} 묶음 ${set}`, [
    link(`${base}/read?set=${set}`, 'btn btn-plain', '읽기 퀴즈'),
    link(`${base}/write?set=${set}`, 'btn btn-primary', '쓰기 연습'),
  ]));
  const grid = el('div', 'kanji-grid');
  for (const entry of kanjiInSet(set, list)) grid.appendChild(kanjiTile(entry, store, base));
  container.appendChild(grid);
  const pager = el('div', 'pager');
  if (set > 1) pager.appendChild(link(`${base}/set/${set - 1}`, 'btn btn-plain pager-prev', `‹ 묶음 ${set - 1}`));
  if (set < setsIn(list)) pager.appendChild(link(`${base}/set/${set + 1}`, 'btn btn-plain pager-next', `묶음 ${set + 1} ›`));
  container.appendChild(pager);
}

function renderToday(container: HTMLElement, store: SrsStore, ctx: KanjiContext): void {
  const { list, base } = ctx;
  const read = dueKanji(store, 'read', undefined, list);
  const write = dueKanji(store, 'write', undefined, list);
  container.appendChild(pageHead(`오늘 복습할 ${ctx.title}`));
  if (read.length + write.length === 0) {
    container.appendChild(el('p', 'empty-state', '오늘 복습할 칸지가 없어요. 읽기 퀴즈나 쓰기 연습을 풀면 복습일이 잡힙니다.'));
    return;
  }
  const shortcuts = el('div', 'shortcut-grid');
  if (read.length) shortcuts.appendChild(shortcut(`${base}/read?scope=today`, '読', `읽기 복습 ${read.length}자`, '한 번에 최대 10문제'));
  if (write.length) shortcuts.appendChild(shortcut(`${base}/write?scope=today`, '書', `쓰기 복습 ${write.length}자`, '한 번에 최대 10자'));
  container.appendChild(shortcuts);
  const grid = el('div', 'kanji-grid kanji-grid-spaced');
  for (const entry of list.filter((k) => read.includes(k) || write.includes(k))) grid.appendChild(kanjiTile(entry, store, base));
  container.appendChild(grid);
}

/** 기록 없이 몇 번이든 쓰는 칸. 다 쓰면 잠깐 보여준 뒤 비워서 바로 다시 쓰게 한다. */
function renderFreePad(paths: string[]): HTMLElement {
  const wrap = el('section', 'kanji-free-pad');
  wrap.appendChild(el('h3', 'section-title', '자유롭게 쓰기'));
  const status = el('div', 'kanji-write-status');
  status.setAttribute('role', 'status');
  const count = el('span', 'kanji-free-count', '몇 번이든 써 보세요');
  const message = el('span', 'kanji-stroke-message', '첫 획부터 차례대로');
  status.append(count, message);
  let written = 0;
  const pad = renderWritingPad(paths, {
    onStroke: (result, done) => {
      message.textContent = result === 'correct' ? `${done} / ${paths.length}획` : result === 'out-of-order' ? `획순이 달라요. ${done + 1}번째 획부터` : '다시 써 보세요';
      message.className = `kanji-stroke-message ${result === 'correct' ? 'is-correct' : 'is-wrong'}`;
    },
    onComplete: () => {
      written += 1;
      count.textContent = `${written}번 썼어요`;
      message.textContent = '좋아요! 한 번 더';
      window.setTimeout(() => pad.reset(), 600);
    },
  });
  let trace = localStorage.getItem(TRACE_KEY) === 'on';
  pad.setTrace(trace);
  const controls = el('div', 'kanji-write-controls');
  const traceBtn = el('button', 'btn btn-plain', '따라 쓰기');
  traceBtn.type = 'button';
  traceBtn.setAttribute('aria-pressed', String(trace));
  traceBtn.addEventListener('click', () => {
    trace = !trace;
    localStorage.setItem(TRACE_KEY, trace ? 'on' : 'off');
    traceBtn.setAttribute('aria-pressed', String(trace));
    pad.setTrace(trace);
  });
  const order = el('button', 'btn btn-plain', '필순 보기');
  order.type = 'button';
  order.addEventListener('click', () => pad.playOrder());
  const clear = el('button', 'btn btn-plain', '지우기');
  clear.type = 'button';
  clear.addEventListener('click', () => pad.reset());
  controls.append(order, traceBtn, clear);
  wrap.append(status, pad.element, controls);
  return wrap;
}

/** 퀴즈에서 못 읽었거나 혼자 못 쓴 칸지. 다시 맞히면 빠진다. */
function renderWrong(container: HTMLElement, store: SrsStore, ctx: KanjiContext): void {
  const { list, base } = ctx;
  const read = missedKanji(store, 'read', list);
  const write = missedKanji(store, 'write', list);
  container.appendChild(link(base, 'back-link', `‹ ${ctx.title}`));
  container.appendChild(pageHead(`${ctx.title} 오답노트`));
  if (read.length + write.length === 0) {
    container.appendChild(el('p', 'empty-state', '틀린 칸지가 없어요. 읽기 퀴즈에서 틀리거나 쓰기에서 도움을 많이 받은 글자가 여기에 모입니다.'));
    return;
  }
  const shortcuts = el('div', 'shortcut-grid');
  if (read.length) shortcuts.appendChild(shortcut(`${base}/read?scope=missed`, '読', `틀린 읽기 ${read.length}자 다시 풀기`, '한 번에 최대 10문제'));
  if (write.length) shortcuts.appendChild(shortcut(`${base}/write?scope=missed`, '書', `틀린 쓰기 ${write.length}자 다시 쓰기`, '기억해서 쓰기, 한 번에 최대 10자'));
  container.appendChild(shortcuts);
  for (const [title, entries] of [['읽기에서 틀린 칸지', read], ['쓰기에서 틀린 칸지', write]] as const) {
    if (entries.length === 0) continue;
    container.appendChild(el('h3', 'section-title', `${title} ${entries.length}자`));
    const grid = el('div', 'kanji-grid kanji-grid-spaced');
    for (const entry of entries) grid.appendChild(kanjiTile(entry, store, base));
    container.appendChild(grid);
  }
}

function renderChar(container: HTMLElement, entry: KanjiEntry, ctx: KanjiContext): void {
  const { base } = ctx;
  const set = Math.floor(ctx.list.indexOf(entry) / KANJI_PER_SET) + 1;
  container.appendChild(link(`${base}/set/${set}`, 'back-link', `‹ 묶음 ${set}`));
  const board = el('div', 'practice-board kanji-detail');

  const stage = el('div', 'practice-stage kanji-demo-stage');
  const demo = el('div', 'kanji-demo');
  const char = el('div', 'kanji-demo-char', entry.id);
  char.lang = 'ja';
  demo.appendChild(char);
  stage.appendChild(demo);
  const replay = el('button', 'btn kanji-replay hidden', '필순 다시 보기');
  replay.type = 'button';
  stage.appendChild(replay);
  board.appendChild(stage);

  const panel = el('div', 'practice-panel kanji-info');
  const heading = el('h2', 'kanji-info-title', entry.id);
  heading.lang = 'ja';
  panel.appendChild(heading);
  const readings = el('dl', 'kanji-readings');
  for (const [label, list] of [['음독', entry.on], ['훈독', entry.kun.map(formatKun)]] as const) {
    if (list.length === 0) continue;
    readings.appendChild(el('dt', '', label));
    const dd = el('dd');
    for (const reading of list) {
      const item = el('span', 'kanji-reading');
      const kana = el('span', '', reading);
      kana.lang = 'ja';
      item.append(kana, el('small', '', formatPronunciation(reading.replace(/[()]/g, '')).split(' · ')[0]));
      dd.appendChild(item);
    }
    readings.appendChild(dd);
  }
  readings.appendChild(el('dt', '', '뜻'));
  const meaning = el('dd', 'kanji-info-hun');
  meaning.textContent = entry.hun;
  readings.appendChild(meaning);
  panel.appendChild(readings);

  const actions = el('div', 'kanji-actions');
  actions.append(
    link(`${base}/read?char=${encodeURIComponent(entry.id)}`, 'btn btn-plain', '읽기 퀴즈'),
    link(`${base}/write?char=${encodeURIComponent(entry.id)}`, 'btn btn-primary', '이 글자 쓰기'),
  );
  panel.appendChild(actions);

  const steps = el('div', 'kanji-steps');
  panel.appendChild(steps);

  const words = wordsWith(entry.id);
  if (words.length) {
    panel.appendChild(el('h3', 'section-title', '이 칸지가 들어간 단어'));
    const list = el('ul', 'kanji-words');
    for (const word of words) {
      const item = el('li');
      const jp = el('span', 'quiz-word has-furigana');
      jp.lang = 'ja';
      jp.appendChild(renderWord(word.japanese, word.reading));
      const wordMeaning = el('span', 'kanji-word-meaning');
      wordMeaning.append(el('strong', '', word.korean.split(', ').slice(0, 2).join(', ')), el('span', '', pronunciationOf(word)));
      item.append(jp, wordMeaning);
      if (word.audioUrl) item.appendChild(renderAudioButton(word.audioUrl));
      list.appendChild(item);
    }
    panel.appendChild(list);
  }
  board.appendChild(panel);
  container.appendChild(board);

  void loadStrokes(entry.id).then((paths) => {
    if (paths.length === 0) return;
    const play = () => demo.replaceChildren(renderStrokes(paths, 'stroke-anim'));
    play();
    replay.classList.remove('hidden');
    replay.addEventListener('click', play);
    steps.before(renderFreePad(paths));
    steps.appendChild(el('h3', 'section-title', `필순 ${paths.length}획`));
    const strip = el('div', 'kanji-step-strip');
    paths.forEach((_, i) => {
      const step = renderStrokes(paths.slice(0, i + 1), 'kanji-step');
      strip.appendChild(step);
    });
    steps.appendChild(strip);
  }).catch(() => {
    steps.appendChild(el('p', 'page-help', '필순을 불러오지 못했어요. 인터넷 연결을 확인하고 다시 열어 주세요.'));
  });
}

interface Scope {
  entries: KanjiEntry[];
  label: string;
  back: string;
  query: string;
  limit?: number;
}

function resolveScope(params: URLSearchParams, skill: KanjiSkill, store: SrsStore, ctx: KanjiContext): Scope {
  const { list, base } = ctx;
  const char = params.get('char');
  const entry = char ? findKanji(char, list) : undefined;
  if (entry) return { entries: [entry], label: entry.id, back: `${base}/char/${encodeURIComponent(entry.id)}`, query: `char=${encodeURIComponent(entry.id)}` };
  if (params.get('scope') === 'today') return { entries: dueKanji(store, skill, undefined, list), label: '오늘 복습', back: `${base}/today`, query: 'scope=today' };
  if (params.get('scope') === 'missed') return { entries: missedKanji(store, skill, list), label: '오답노트', back: `${base}/wrong`, query: 'scope=missed' };
  if (ctx.level && params.get('scope') === 'all') return { entries: list, label: `${ctx.level} 테스트`, back: base, query: 'scope=all', limit: LEVEL_TEST_QUESTIONS };
  const asked = Number(params.get('set'));
  const set = Number.isInteger(asked) && asked >= 1 && asked <= setsIn(list) ? asked : currentSet(store, list);
  return { entries: kanjiInSet(set, list), label: `묶음 ${set}`, back: `${base}/set/${set}`, query: `set=${set}` };
}

function progressBar(label: string, index: number, total: number, right: string): { root: HTMLElement; score: HTMLElement; bar: HTMLElement } {
  const root = el('div', 'quiz-progress');
  const score = el('p', '', right);
  const bar = el('div', 'quiz-progress-bar');
  bar.setAttribute('role', 'progressbar');
  bar.setAttribute('aria-valuemin', '0');
  bar.setAttribute('aria-valuemax', String(total));
  bar.setAttribute('aria-valuenow', String(index));
  bar.style.setProperty('--progress', `${(index / total) * 100}%`);
  root.append(el('p', '', `${label}, ${index + 1} / ${total}`), score, bar);
  return { root, score, bar };
}

function renderResult(session: HTMLElement, total: number, correct: number, wrong: KanjiEntry[], restart: (entries?: KanjiEntry[]) => void, unit: string, base: string): void {
  const card = el('div', 'card quiz-result-card');
  const title = el('h3', 'vocab-quiz-result', `${total}${unit} 중 ${correct}개 정답`);
  title.setAttribute('role', 'status');
  card.appendChild(title);
  card.appendChild(el('p', 'quiz-result-note', wrong.length ? '틀린 칸지는 내일 다시 복습하게 기록해 두었습니다.' : '모두 맞혔어요. 복습일까지 기록해 두었습니다.'));
  if (wrong.length) {
    const grid = el('div', 'kanji-grid');
    const store = loadKanjiStore();
    for (const entry of wrong) grid.appendChild(kanjiTile(entry, store, base));
    card.appendChild(grid);
  }
  const actions = el('div', 'quiz-result-actions');
  if (wrong.length) {
    const retry = el('button', 'btn btn-primary', `틀린 ${wrong.length}자 다시 풀기`);
    retry.type = 'button';
    const again = [...wrong];
    retry.addEventListener('click', () => restart(again));
    actions.appendChild(retry);
  }
  const fresh = el('button', `btn ${wrong.length ? 'btn-secondary' : 'btn-primary'}`, '새로 시작');
  fresh.type = 'button';
  fresh.addEventListener('click', () => restart());
  actions.appendChild(fresh);
  card.appendChild(actions);
  session.replaceChildren(card);
}

function renderReadQuiz(container: HTMLElement, params: URLSearchParams, store: SrsStore, rng: () => number, ctx: KanjiContext): void {
  const asked = params.get('mode');
  const mode: KanjiQuizMode = asked === 'reading' || asked === 'meaning' ? asked : 'word';
  const scope = resolveScope(params, 'read', store, ctx);
  const segments = el('div', 'vocab-quiz-directions');
  segments.setAttribute('role', 'group');
  segments.setAttribute('aria-label', '문제 종류');
  for (const [value, label] of [['word', '단어 읽기'], ['reading', '음독·훈독'], ['meaning', '뜻']] as const) {
    const a = link(`${ctx.base}/read?${scope.query}${value === 'word' ? '' : `&mode=${value}`}`, 'segment', label);
    if (value === mode) a.setAttribute('aria-current', 'true');
    segments.appendChild(a);
  }
  container.appendChild(pageHead(`${ctx.level ? `${ctx.level} ` : ''}칸지 읽기`, [segments, link(scope.back, 'back-link', '‹ 목록으로')]));
  if (scope.entries.length === 0) {
    container.appendChild(el('p', 'empty-state', scope.query === 'scope=missed' ? '읽기에서 틀린 칸지가 없어요.' : '오늘 읽기 복습할 칸지가 없어요.'));
    return;
  }
  const session = el('section', 'vocab-quiz-session');
  session.setAttribute('aria-label', `${scope.label} 칸지 읽기 퀴즈`);
  container.appendChild(session);

  let buttons: HTMLButtonElement[] = [];
  let answered = true;

  function start(entries: KanjiEntry[] = scope.entries): void {
    const deck = buildKanjiQuiz(entries, ctx.list, mode, rng, scope.limit);
    let index = 0;
    let correct = 0;
    const wrong: KanjiEntry[] = [];

    function show(): void {
      if (deck.length === 0) {
        // 칸지만 따로 쓰이는 단어가 없는 글자 등. 다른 문제 종류는 항상 만들 수 있다.
        session.replaceChildren(el('p', 'empty-state', '이 범위에는 단어 읽기 문제를 만들 단어가 없어요. 음독·훈독이나 뜻 문제를 풀어 보세요.'));
        return;
      }
      if (index >= deck.length) {
        buttons = [];
        answered = true;
        renderResult(session, deck.length, correct, wrong, start, '문제', ctx.base);
        return;
      }
      const { entry, options, word } = deck[index];
      answered = false;
      container.dataset.currentId = entry.id;
      const progress = progressBar(scope.label, index, deck.length, `정답 ${correct}개`);
      const card = el('div', 'kana-question-area quiz-card');
      const stage = el('div', 'quiz-stage');
      const prompt = el('div', word ? 'kanji-prompt-word-big' : 'kanji-prompt-char', word ? word.japanese : entry.id);
      prompt.lang = 'ja';
      if (word) prompt.style.setProperty('--chars', String([...word.japanese].length));
      stage.appendChild(prompt);
      const answers = el('div', 'quiz-answers');
      const choices = el('div', 'vocab-quiz-options');
      const feedback = el('div', 'kana-feedback');
      feedback.setAttribute('role', 'status');
      const detail = el('div', 'kanji-answer-detail');
      detail.hidden = true;
      const next = el('button', 'vocab-quiz-next btn btn-primary', index + 1 === deck.length ? '결과 보기' : '다음 문제');
      next.type = 'button';
      next.hidden = true;
      next.addEventListener('click', () => { index += 1; show(); });

      buttons = options.map((option, i) => {
        const button = el('button', 'vocab-quiz-option btn btn-secondary');
        button.type = 'button';
        button.dataset.id = option.id;
        const key = el('kbd', '', String(i + 1));
        const text = el('span', '', option.label);
        if (mode !== 'meaning') text.lang = 'ja';
        button.append(key, text);
        button.addEventListener('click', () => {
          if (answered) return;
          answered = true;
          const isRight = option.id === entry.id;
          recordKanji('read', entry.id, isRight ? 'known' : 'unknown');
          if (isRight) correct += 1;
          else wrong.push(entry);
          for (const b of buttons) {
            b.disabled = true;
            if (b.dataset.id === entry.id) b.classList.add('vocab-quiz-correct');
          }
          if (!isRight) button.classList.add('vocab-quiz-wrong');
          feedback.textContent = isRight ? '정답!' : '오답';
          feedback.classList.add(isRight ? 'is-correct' : 'is-wrong');
          card.classList.add(isRight ? 'kana-correct' : 'kana-wrong');
          progress.score.textContent = `정답 ${correct}개`;
          progress.bar.style.setProperty('--progress', `${((index + 1) / deck.length) * 100}%`);
          progress.bar.setAttribute('aria-valuenow', String(index + 1));
          const readingLine = el('div', '', readingsLabel(entry));
          readingLine.lang = 'ja';
          detail.replaceChildren(readingLine, el('strong', '', entry.hun));
          const example = word ?? wordsWith(entry.id, 1)[0];
          if (example) {
            const line = el('div', 'kanji-answer-word');
            const jp = el('span', 'has-furigana');
            jp.lang = 'ja';
            jp.appendChild(renderWord(example.japanese, example.reading));
            line.append(jp, el('span', '', example.korean.split(', ')[0]));
            if (example.audioUrl) line.appendChild(renderAudioButton(example.audioUrl));
            detail.appendChild(line);
          }
          detail.hidden = false;
          next.hidden = false;
          next.focus();
        });
        choices.appendChild(button);
        return button;
      });
      answers.append(choices, feedback, detail, next);
      card.append(stage, answers);
      session.replaceChildren(progress.root, card);
    }
    show();
  }

  function onKey(event: KeyboardEvent): void {
    if (!container.isConnected) {
      document.removeEventListener('keydown', onKey);
      return;
    }
    if (answered || event.repeat || event.ctrlKey || event.altKey || event.metaKey || !/^[1-5]$/.test(event.key)) return;
    buttons[Number(event.key) - 1]?.click();
  }
  document.addEventListener('keydown', onKey);
  start();
}

function renderWriteSession(container: HTMLElement, params: URLSearchParams, store: SrsStore, rng: () => number, ctx: KanjiContext): void {
  const scope = resolveScope(params, 'write', store, ctx);
  container.appendChild(pageHead(`${ctx.level ? `${ctx.level} ` : ''}칸지 쓰기`, [link(scope.back, 'back-link', '‹ 목록으로')]));
  if (scope.entries.length === 0) {
    container.appendChild(el('p', 'empty-state', scope.query === 'scope=missed' ? '쓰기에서 틀린 칸지가 없어요.' : '오늘 쓰기 복습할 칸지가 없어요.'));
    return;
  }
  const session = el('section', 'vocab-quiz-session');
  session.setAttribute('aria-label', `${scope.label} 쓰기 연습`);
  container.appendChild(session);

  let trace = localStorage.getItem(TRACE_KEY) === 'on';

  function start(entries: KanjiEntry[] = scope.entries): void {
    const deck = [...entries].sort(() => rng() - 0.5).slice(0, 10);
    let index = 0;
    let clean = 0;
    const wrong: KanjiEntry[] = [];

    async function show(): Promise<void> {
      if (index >= deck.length) {
        renderResult(session, deck.length, clean, wrong, start, '자', ctx.base);
        return;
      }
      const entry = deck[index];
      container.dataset.currentId = entry.id;
      session.replaceChildren(progressBar(scope.label, index, deck.length, `혼자 쓴 글자 ${clean}개`).root, el('p', 'page-help', '불러오는 중…'));
      let paths: string[];
      try {
        paths = await loadStrokes(entry.id);
      } catch {
        const retry = el('button', 'btn btn-primary', '다시 시도');
        retry.type = 'button';
        retry.addEventListener('click', () => void show());
        session.replaceChildren(el('p', 'empty-state', '필순을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'), retry);
        return;
      }
      if (deck[index] !== entry) return;

      // 배우는 범위에서는 한 글자를 세 번 쓴다: 따라 쓰기 → 보고 쓰기 → 안 보고 쓰기. 마지막 한 번만 기록한다.
      // 복습은 기억해서 쓰는지만 본다.
      const steps: WriteStep[] = scope.query === 'scope=today' || scope.query === 'scope=missed' ? ['recall'] : ['trace', 'copy', 'recall'];
      renderStep(0);

      function renderStep(stepIndex: number): void {
        const step = steps[stepIndex];
        const isLast = stepIndex === steps.length - 1;
        let misses = 0;
        let hints = 0;
        let watched = false;
        let traced = step === 'recall' && trace;
        let finished = false;

        const board = el('div', 'practice-board kanji-write-board');
        const stage = el('div', 'practice-stage kanji-prompt');
        const stepLabel = steps.length > 1 ? `${stepIndex + 1}/${steps.length} ${WRITE_STEPS[step].label}: ` : '';
        stage.appendChild(el('div', 'compose-label', stepLabel + WRITE_STEPS[step].help));
        const readings = el('div', 'kanji-prompt-readings', readingsLabel(entry));
        readings.lang = 'ja';
        stage.appendChild(readings);
        stage.appendChild(el('div', 'kanji-prompt-hun', entry.hun));
        const example = wordsWith(entry.id, 1)[0];
        const exampleLine = el('div', 'kanji-prompt-word');
        if (example) {
          // 답이 보이면 안 되므로 해당 글자만 가린다.
          const masked = el('span', '', step === 'recall' ? example.japanese.split(entry.id).join('○') : example.japanese);
          masked.lang = 'ja';
          const reading = el('span', '', example.reading);
          reading.lang = 'ja';
          exampleLine.append(masked, reading, el('span', '', example.korean.split(', ')[0]));
          stage.appendChild(exampleLine);
        }
        const revealed = el('div', 'kanji-prompt-answer');
        revealed.lang = 'ja';
        // 보고 쓰기는 글자를 옆에 둔 채로 쓴다.
        revealed.hidden = step !== 'copy';
        revealed.textContent = entry.id;
        stage.appendChild(revealed);

        const panel = el('div', 'practice-panel kanji-write-panel');
        const status = el('div', 'kanji-write-status');
        status.setAttribute('role', 'status');
        const count = el('span', 'kanji-stroke-count', `0 / ${paths.length}획`);
        const message = el('span', 'kanji-stroke-message', '첫 획부터 차례대로 쓰세요');
        status.append(count, message);

        const pad = renderWritingPad(paths, {
          onStroke: (result, done) => {
            count.textContent = `${done} / ${paths.length}획`;
            if (result === 'correct') {
              message.textContent = done === paths.length ? '' : '좋아요';
              message.className = 'kanji-stroke-message is-correct';
            } else {
              misses += 1;
              message.textContent = result === 'out-of-order' ? `획순이 달라요. ${done + 1}번째 획을 먼저 쓰세요` : '다시 써 보세요';
              message.className = 'kanji-stroke-message is-wrong';
            }
          },
          onHint: () => { hints += 1; },
          onComplete: () => {
            finished = true;
            controls.hidden = true;
            next.hidden = false;
            if (!isLast) {
              message.textContent = '좋아요! 다음 단계로 넘어가요';
              message.className = 'kanji-stroke-message is-correct';
              next.focus();
              return;
            }
            const grade = gradeWriting({ strokes: paths.length, misses, hints, watched, traced });
            recordKanji('write', entry.id, grade);
            if (grade === 'known') clean += 1;
            else wrong.push(entry);
            message.textContent = grade === 'known' ? '혼자서 잘 썼어요!' : grade === 'confusing' ? '완성! 도움 없이 한 번 더 써 보세요' : '완성! 내일 다시 복습해요';
            message.className = `kanji-stroke-message ${grade === 'known' ? 'is-correct' : 'is-wrong'}`;
            exampleLine.remove();
            revealed.hidden = false;
            next.focus();
          },
        });
        pad.setTrace(step === 'trace' || traced);

        const controls = el('div', 'kanji-write-controls');
        const button = (label: string, handler: () => void): HTMLButtonElement => {
          const b = el('button', 'btn btn-plain', label);
          b.type = 'button';
          b.addEventListener('click', handler);
          return b;
        };
        const traceBtn = button('따라 쓰기', () => {
          trace = !trace;
          localStorage.setItem(TRACE_KEY, trace ? 'on' : 'off');
          traceBtn.setAttribute('aria-pressed', String(trace));
          pad.setTrace(trace);
          if (trace) traced = true;
        });
        traceBtn.setAttribute('aria-pressed', String(trace));
        controls.append(
          button('다음 획 힌트', () => pad.showHint()),
          button('필순 보기', () => { watched = true; pad.playOrder(); }),
        );
        // 따라 쓰기 단계는 늘 밑글씨가 있고, 보고 쓰기는 글자가 옆에 있으니 이 버튼은 마지막 단계에만 둔다.
        if (step === 'recall') controls.appendChild(traceBtn);
        controls.appendChild(button('처음부터', () => {
          pad.reset();
          count.textContent = `0 / ${paths.length}획`;
          message.textContent = '첫 획부터 차례대로 쓰세요';
          message.className = 'kanji-stroke-message';
        }));

        const nextLabel = !isLast ? '다음 단계' : index + 1 === deck.length ? '결과 보기' : '다음 글자';
        const next = el('button', 'vocab-quiz-next btn btn-primary', nextLabel);
        next.type = 'button';
        next.hidden = true;
        next.addEventListener('click', () => {
          if (!finished) return;
          if (!isLast) {
            renderStep(stepIndex + 1);
            return;
          }
          index += 1;
          void show();
        });

        panel.append(status, pad.element, controls, next);
        board.append(stage, panel);
        session.replaceChildren(progressBar(scope.label, index, deck.length, `혼자 쓴 글자 ${clean}개`).root, board);
      }
    }
    void show();
  }
  start();
}

export function renderKanjiView(hash: string, rng: () => number = Math.random, ctx: KanjiContext = DEFAULT_CONTEXT): HTMLElement {
  const container = el('div', 'kanji-view');
  const nav = el('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const [rawPath, query = ''] = hash.split('?');
  const path = decodeURIComponent(rawPath).slice(ctx.base.length);
  const params = new URLSearchParams(query);
  const store = loadKanjiStore();

  const setMatch = /^\/set\/([1-9]\d*)$/.exec(path);
  const charMatch = /^\/char\/(.+)$/.exec(path);
  const entry = charMatch ? findKanji(charMatch[1], ctx.list) : undefined;

  if (path === '/read') {
    container.classList.add('kanji-session');
    renderReadQuiz(container, params, store, rng, ctx);
  } else if (path === '/write') {
    container.classList.add('kanji-session');
    renderWriteSession(container, params, store, rng, ctx);
  } else if (path === '/today') {
    renderToday(container, store, ctx);
  } else if (path === '/wrong') {
    renderWrong(container, store, ctx);
  } else if (setMatch && Number(setMatch[1]) <= setsIn(ctx.list)) {
    renderSet(container, Number(setMatch[1]), store, ctx);
  } else if (entry) {
    renderChar(container, entry, ctx);
  } else {
    renderHome(container, store, ctx);
  }
  return container;
}
