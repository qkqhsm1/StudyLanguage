import vocabData from '../data/vocabulary.json';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, describeReviewStatus, reviewEntry, toggleBookmark } from '../srs';
import { formatPronunciation, spokenReading } from '../data/kana-romanize';
import { ICONS, paintBookmark } from '../icons';
import { renderWord } from '../practice/furigana';
import { entriesForDay, totalDays } from '../data/vocab-days';
import { NAV_HTML } from '../nav';
import type { SrsGrade, SrsState, SrsStore, VocabData, VocabEntry, VocabStudyGroup } from '../types';

const SRS_STORAGE_KEY = 'srs-store';
const TYPED_VOCAB_DATA = vocabData as VocabData;
export const STUDY_GROUPS: Record<VocabStudyGroup, { label: string; icon: string; description: string }> = {
  noun: { label: '명사', icon: '名', description: '사람·사물·장소·시간을 나타내는 말' },
  predicate: { label: '동사·형용사', icon: '動', description: '동작·상태·성질을 나타내는 말과 활용 표현' },
  expression: { label: '기타 표현', icon: '言', description: '부사·조사·인사말과 자주 쓰는 표현' },
};

export function loadSrsStore(): SrsStore {
  return loadJSON<SrsStore>(SRS_STORAGE_KEY, {});
}

export function saveSrsStore(store: SrsStore): void {
  saveJSON(SRS_STORAGE_KEY, store);
}

/** 한글·로마자 발음. 조사 は는 저장된 로마자에 맞춰 わ로 읽는다. */
export function pronunciationOf(entry: VocabEntry): string {
  return formatPronunciation(spokenReading(entry.reading, entry.romaji));
}

// 동시에 하나만 재생한다. 연달아 누르면 앞 소리를 끊고 새 소리를 낸다.
let playing: { audio: HTMLAudioElement; button: HTMLElement } | null = null;

function playWordAudio(button: HTMLElement, url: string): void {
  if (playing) {
    playing.audio.pause();
    playing.button.classList.remove('is-playing');
  }
  const audio = new Audio(url);
  playing = { audio, button };
  button.classList.remove('has-error');
  button.classList.add('is-playing');
  const finish = () => button.classList.remove('is-playing');
  audio.addEventListener('ended', finish);
  audio.play().catch(() => {
    // 네트워크 끊김 등으로 재생하지 못하면 버튼 색과 설명으로 알린다.
    finish();
    button.classList.add('has-error');
    button.setAttribute('aria-label', '발음을 불러오지 못했어요. 다시 누르면 재시도합니다.');
  });
}

export function renderAudioButton(url: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'audio-play';
  button.innerHTML = ICONS.play;
  button.setAttribute('aria-label', '발음 듣기');
  button.dataset.audioUrl = url;
  button.addEventListener('click', () => playWordAudio(button, url));
  return button;
}

const VISIBLE_MEANINGS = 4;

export function renderWordCard(entry: VocabEntry, srsState: SrsState | undefined, today: Date = new Date()): HTMLElement {
  const card = document.createElement('div');
  card.className = 'word-card card';
  card.dataset.grade = srsState?.grade ?? 'new';

  const top = document.createElement('div');
  top.className = 'word-card-top';

  const headword = document.createElement('div');
  headword.className = 'word-card-headword';
  const jp = document.createElement('span');
  jp.className = `word-japanese has-furigana${[...entry.japanese].length > 7 ? ' is-long' : ''}`;
  jp.lang = 'ja';
  jp.dataset.japanese = entry.japanese;
  jp.appendChild(renderWord(entry.japanese, entry.reading, 'word-reading'));
  headword.appendChild(jp);
  top.appendChild(headword);

  const tools = document.createElement('div');
  tools.className = 'word-card-tools';
  if (entry.audioUrl) tools.appendChild(renderAudioButton(entry.audioUrl));
  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.type = 'button';
  bookmarkBtn.className = 'bookmark-toggle';
  paintBookmark(bookmarkBtn, srsState?.bookmarked ?? false);
  bookmarkBtn.dataset.entryId = entry.id;
  tools.appendChild(bookmarkBtn);
  top.appendChild(tools);

  card.appendChild(top);

  // 역 표지판의 노선 띠. 색이 곧 이 단어의 암기 상태다.
  const line = document.createElement('div');
  line.className = 'station-line';
  line.setAttribute('aria-hidden', 'true');
  card.appendChild(line);

  const meta = document.createElement('div');
  meta.className = 'word-meta';
  const meanings = entry.korean.split(', ');
  const meaning = document.createElement('div');
  meaning.className = 'word-meaning';
  meaning.textContent = meanings.slice(0, VISIBLE_MEANINGS).join(', ');
  meta.appendChild(meaning);
  if (meanings.length > VISIBLE_MEANINGS) {
    // 문법 조각은 활용형 뜻이 20개를 넘기도 한다. 카드 높이를 지키려 접어 둔다.
    const more = document.createElement('details');
    more.className = 'word-more';
    const summary = document.createElement('summary');
    summary.textContent = `뜻 ${meanings.length - VISIBLE_MEANINGS}개 더 보기`;
    more.appendChild(summary);
    more.appendChild(document.createTextNode(meanings.slice(VISIBLE_MEANINGS).join(', ')));
    meta.appendChild(more);
  }
  const sound = document.createElement('div');
  sound.className = 'word-sound';
  sound.textContent = pronunciationOf(entry);
  meta.appendChild(sound);
  card.appendChild(meta);

  const badges = document.createElement('div');
  badges.className = 'word-badges';

  if (entry.studyGroup) {
    const posBadge = document.createElement('span');
    posBadge.className = 'badge badge-category';
    posBadge.textContent = STUDY_GROUPS[entry.studyGroup].label;
    badges.appendChild(posBadge);
  }

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'badge badge-skill';
  categoryBadge.textContent = entry.skillName;
  badges.appendChild(categoryBadge);

  const reviewBadge = describeReviewStatus(srsState, today);
  if (reviewBadge) {
    const badge = document.createElement('span');
    badge.className = `badge ${reviewBadge.urgent ? 'badge-urgent' : 'badge-ok'}`;
    badge.textContent = reviewBadge.label;
    badges.appendChild(badge);
  }

  card.appendChild(badges);

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'srs-grades';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '모름', confusing: '헷갈림', known: '암기됨' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
    // 현재 이 카드의 등급인 버튼만 칠한다. 아직 채점 안 한 카드는 셋 다 회색이다.
    const selected = srsState?.grade === grade;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `srs-grade srs-grade-${grade} btn ${selected ? 'btn-primary' : 'btn-secondary'}`;
    btn.setAttribute('aria-pressed', String(selected));
    btn.textContent = gradeLabels[grade];
    btn.dataset.entryId = entry.id;
    btn.dataset.grade = grade;
    gradeWrap.appendChild(btn);
  });
  card.appendChild(gradeWrap);

  return card;
}

/** Day 목록. 306개 스킬 대신 Day 1..N을 보여주고, 각 Day에 그 50단어 중 몇 개를
 *  "암기됨"으로 표시했는지 진척도를 함께 보여준다(워드마스터식 점증 느낌). */
export function renderDayList(entries: VocabEntry[], srsStore: SrsStore, group?: VocabStudyGroup): HTMLElement {
  const list = document.createElement('div');
  list.className = 'skill-list route-map';

  const days = totalDays(entries.length);
  let currentMarked = false;
  for (let day = 1; day <= days; day++) {
    const dayEntries = entriesForDay(entries, day);
    const known = dayEntries.filter((e) => srsStore[e.id]?.grade === 'known').length;
    const done = known === dayEntries.length;

    const link = document.createElement('a');
    link.className = 'skill-list-item route-stop';
    link.href = group ? `#/vocab/group/${group}/${day}` : `#/vocab/day/${day}`;
    link.style.setProperty('--known', `${(known / dayEntries.length) * 360}deg`);
    if (done) link.classList.add('is-done');
    // 다 외우지 않은 첫 역이 지금 있는 곳이다.
    if (!done && !currentMarked) {
      link.classList.add('is-current');
      link.setAttribute('aria-current', 'step');
      currentMarked = true;
    }

    const icon = document.createElement('span');
    icon.className = 'skill-list-icon';
    icon.textContent = String(day);
    link.appendChild(icon);

    const body = document.createElement('span');
    body.className = 'skill-list-body';

    const name = document.createElement('span');
    name.className = 'skill-list-name';
    name.textContent = group ? `묶음 ${day}` : `Day ${day}`;
    body.appendChild(name);

    const sub = document.createElement('span');
    sub.className = 'skill-list-sub';
    sub.textContent = `${known} / ${dayEntries.length}`;
    sub.setAttribute('aria-label', `${dayEntries.length}단어 중 ${known}개 암기`);
    body.appendChild(sub);

    link.appendChild(body);

    list.appendChild(link);
  }

  return list;
}

/** 카드 안의 발음 재생·북마크·채점 버튼을 위임으로 처리한다. 카드 목록이 여러
 *  개로 나뉜 화면(Day의 등급별 하위 섹션)에서는 바깥 컨테이너에 한 번만 붙인다. */
function attachVocabCardActions(root: HTMLElement, container: HTMLElement): void {
  root.addEventListener('click', (event) => {
    // 아이콘(svg)을 눌러도 버튼으로 잡히도록 위로 올라가 찾는다.
    const target = (event.target as Element).closest<HTMLElement>('button');
    const entryId = target?.dataset.entryId;
    if (!target || !entryId) return;

    const store = loadSrsStore();

    if (target.classList.contains('bookmark-toggle')) {
      store[entryId] = toggleBookmark(store[entryId]);
      saveSrsStore(store);
      container.dispatchEvent(new Event('vocab:refresh'));
      return;
    }

    const grade = target.dataset.grade as SrsGrade | undefined;
    if (grade) {
      store[entryId] = reviewEntry(store[entryId], grade);
      saveSrsStore(store);
      container.dispatchEvent(new Event('vocab:refresh'));
    }
  });
}

export function renderCardList(entries: VocabEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
  const list = document.createElement('div');
  list.className = 'card-list';
  for (const entry of entries) {
    list.appendChild(renderWordCard(entry, srsStore[entry.id]));
  }
  attachVocabCardActions(list, container);
  return list;
}

/** 한 화면 안에서 단어를 나눠 담는 접이식 섹션. 앞쪽 조건이 먼저 가져가므로
 *  한 단어가 두 섹션에 겹쳐 나오지 않는다. */
interface CardGroup {
  label: string;
  match: (state: SrsState | undefined) => boolean;
}

// Day 화면: 채점 전 단어가 맨 위, 다 외운 단어가 맨 아래.
// 라벨은 채점 버튼(모름/헷갈림/암기됨)보다 부드럽게.
const DAY_GROUPS: CardGroup[] = [
  { label: '아직 안 본 단어', match: (state) => state === undefined },
  { label: '잘 모르는 단어', match: (state) => state?.grade === 'unknown' },
  { label: '헷갈리는 단어', match: (state) => state?.grade === 'confusing' },
  { label: '외운 단어', match: (state) => state?.grade === 'known' },
];

// 오답노트: 틀린 순서대로. 북마크는 맨 뒤 — 외웠는데 표시만 해둔 단어가 여기 온다.
// (모르는데 북마크까지 한 단어는 앞의 '모르는 단어'가 먼저 가져간다.)
export const WRONG_GROUPS: CardGroup[] = [
  { label: '모르는 단어', match: (state) => state?.grade === 'unknown' },
  { label: '헷갈리는 단어', match: (state) => state?.grade === 'confusing' },
  { label: '북마크한 단어', match: (state) => state?.bookmarked === true },
];

/** 오답노트에 담을 단어 — 모름·헷갈림으로 채점했거나 북마크해둔 것. 복습일과
 *  무관하다는 점이 '오늘 복습'과 다르다. 오늘이 아니어도 틀린 건 틀린 거다. */
export function collectWrongNotes(entries: VocabEntry[], srsStore: SrsStore): VocabEntry[] {
  return entries.filter((entry) => {
    const state = srsStore[entry.id];
    if (!state) return false;
    return state.bookmarked || state.grade === 'unknown' || state.grade === 'confusing';
  });
}

/** 단어를 접이식 섹션으로 나눠 보여준다. 비어 있는 섹션은 건너뛰고,
 *  각 섹션 제목을 누르면 그 안의 카드가 접혔다 펼쳐진다. */
// 채점하면 화면을 다시 그리므로, 접어 둔 구역이 도로 펼쳐지지 않게 기억한다.
const collapsedGroups = new Set<string>();

export function renderCardGroups(
  entries: VocabEntry[],
  srsStore: SrsStore,
  container: HTMLElement,
  groups: CardGroup[] = DAY_GROUPS,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'vocab-day-groups';

  const taken = new Set<string>();
  for (const group of groups) {
    const groupEntries = entries.filter((e) => !taken.has(e.id) && group.match(srsStore[e.id]));
    for (const entry of groupEntries) taken.add(entry.id);
    if (groupEntries.length === 0) continue;

    const section = document.createElement('div');
    section.className = 'vocab-group';
    section.classList.toggle('collapsed', collapsedGroups.has(group.label));

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'vocab-group-title';
    header.setAttribute('aria-expanded', String(!collapsedGroups.has(group.label)));

    const arrow = document.createElement('span');
    arrow.className = 'vocab-group-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '▾';
    header.appendChild(arrow);

    const label = document.createElement('span');
    label.className = 'vocab-group-label';
    label.textContent = group.label;
    header.appendChild(label);

    const count = document.createElement('span');
    count.className = 'vocab-group-count';
    count.textContent = String(groupEntries.length);
    header.appendChild(count);

    header.addEventListener('click', () => {
      const collapsed = section.classList.toggle('collapsed');
      header.setAttribute('aria-expanded', String(!collapsed));
      if (collapsed) collapsedGroups.add(group.label);
      else collapsedGroups.delete(group.label);
    });
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'card-list';
    for (const entry of groupEntries) {
      list.appendChild(renderWordCard(entry, srsStore[entry.id]));
    }
    section.appendChild(list);

    wrap.appendChild(section);
  }

  attachVocabCardActions(wrap, container);
  return wrap;
}

/** Vocabulary shortcuts reuse the existing list layout. */
export function renderVocabLink(href: string, symbol: string, label: string, description: string): HTMLElement {
  const list = document.createElement('div');
  list.className = 'skill-list vocab-link';

  const link = document.createElement('a');
  link.className = 'skill-list-item';
  link.href = href;

  const icon = document.createElement('span');
  icon.className = 'skill-list-icon';
  icon.lang = 'ja';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = symbol;
  link.appendChild(icon);

  const body = document.createElement('span');
  body.className = 'skill-list-body';

  const name = document.createElement('span');
  name.className = 'skill-list-name';
  name.textContent = label;
  body.appendChild(name);

  const sub = document.createElement('span');
  sub.className = 'skill-list-sub';
  sub.textContent = description;
  body.appendChild(sub);

  link.appendChild(body);

  const chevron = document.createElement('span');
  chevron.className = 'skill-list-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '›';
  link.appendChild(chevron);

  list.appendChild(link);
  return list;
}

export function renderWrongNotesLink(entries: VocabEntry[], srsStore: SrsStore): HTMLElement {
  return renderVocabLink('#/vocab/wrong', '誤', '오답노트', `모름, 헷갈림, 북마크 ${collectWrongNotes(entries, srsStore).length}단어`);
}

function renderStudyGroups(srsStore: SrsStore): HTMLElement {
  const wrap = document.createElement('div');
  const heading = document.createElement('h2');
  heading.textContent = '품사별 암기장';
  wrap.appendChild(heading);
  const help = document.createElement('p');
  help.className = 'page-help';
  help.textContent = '비슷한 역할의 말을 50개씩 모아 외워 보세요. Day 단어장과 암기·북마크 기록이 이어집니다.';
  wrap.appendChild(help);
  wrap.appendChild(renderVocabLink('#/vocab/quiz', '問', '단어 퀴즈', '일본어 단어를 보고 한국어 뜻 고르기'));
  for (const group of Object.keys(STUDY_GROUPS) as VocabStudyGroup[]) {
    const { label, icon, description } = STUDY_GROUPS[group];
    const entries = TYPED_VOCAB_DATA.entries.filter(e => e.studyGroup === group);
    const known = entries.filter(e => srsStore[e.id]?.grade === 'known').length;
    wrap.appendChild(renderVocabLink(`#/vocab/group/${group}`, icon, label, `${description}. ${entries.length}단어 중 ${known}개 암기`));
  }
  return wrap;
}

function renderEmptyState(message: string): HTMLElement {
  const empty = document.createElement('p');
  empty.className = 'empty-state';
  empty.textContent = message;
  return empty;
}

/** 이 Day를 얼마나 외웠는지 상태별 칸으로 보여준다. */
function renderDayProgress(entries: VocabEntry[], srsStore: SrsStore): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'day-progress';
  const known = entries.filter((e) => srsStore[e.id]?.grade === 'known').length;
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', `${entries.length}단어 중 ${known}개 암기`);
  const order: Array<SrsGrade | 'new'> = ['known', 'confusing', 'unknown', 'new'];
  const grades = entries.map((e) => srsStore[e.id]?.grade ?? 'new');
  const bar = document.createElement('div');
  bar.className = 'day-progress-bar';
  for (const grade of order) {
    const count = grades.filter((g) => g === grade).length;
    if (count === 0) continue;
    const part = document.createElement('span');
    part.dataset.grade = grade;
    part.style.flexGrow = String(count);
    bar.appendChild(part);
  }
  const text = document.createElement('span');
  text.className = 'day-progress-text';
  text.textContent = `${known} / ${entries.length} 암기`;
  wrap.append(bar, text);
  return wrap;
}

function renderPager(prev: { href: string; label: string } | null, next: { href: string; label: string } | null): HTMLElement {
  const pager = document.createElement('div');
  pager.className = 'pager';
  for (const [target, className, prefix, suffix] of [[prev, 'pager-prev', '‹ ', ''], [next, 'pager-next', '', ' ›']] as const) {
    if (!target) continue;
    const link = document.createElement('a');
    link.className = `btn btn-plain ${className}`;
    link.href = target.href;
    link.textContent = `${prefix}${target.label}${suffix}`;
    pager.appendChild(link);
  }
  return pager;
}

export function renderVocabHome(hash: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'vocab-home';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const srsStore = loadSrsStore();

  // #/vocab/day/N 에서 N을 뽑되, 정수가 아니거나 범위 밖(빈 Day)이면 null → Day 목록으로.
  const dayEntries = hash.startsWith('#/vocab/day/')
    ? entriesForDay(TYPED_VOCAB_DATA.entries, Number.parseInt(hash.slice('#/vocab/day/'.length), 10))
    : [];
  const day = dayEntries.length > 0 ? Number.parseInt(hash.slice('#/vocab/day/'.length), 10) : null;

  if (hash === '#/vocab/groups' || hash.startsWith('#/vocab/group/')) {
    const match = /^#\/vocab\/group\/(noun|predicate|expression)(?:\/([1-9]\d*))?$/.exec(hash);
    const group = match?.[1] as VocabStudyGroup | undefined;
    const batch = match?.[2] ? Number(match[2]) : null;
    const entries = group ? TYPED_VOCAB_DATA.entries.filter(e => e.studyGroup === group) : [];
    if (!group || (batch !== null && (!Number.isSafeInteger(batch) || batch > totalDays(entries.length)))) {
      container.appendChild(renderStudyGroups(srsStore));
    } else {
      const back = document.createElement('a');
      back.className = 'back-link';
      back.href = batch === null ? '#/vocab/groups' : `#/vocab/group/${group}`;
      back.textContent = batch === null ? '‹ 품사별 암기장' : `‹ ${STUDY_GROUPS[group].label} 묶음 목록`;
      container.appendChild(back);
      const heading = document.createElement('h2');
      heading.textContent = batch === null ? STUDY_GROUPS[group].label : `${STUDY_GROUPS[group].label} · 묶음 ${batch}`;
      container.appendChild(heading);
      container.appendChild(renderVocabLink(`#/vocab/quiz/group/${group}${batch === null ? '' : `/${batch}`}`, '問', '이 단어들로 퀴즈', '무작위 최대 10문제'));
      if (batch === null) {
        container.appendChild(renderDayList(entries, srsStore, group));
      } else {
        container.appendChild(renderCardGroups(entriesForDay(entries, batch), srsStore, container));
        container.appendChild(renderPager(
          batch > 1 ? { href: `#/vocab/group/${group}/${batch - 1}`, label: `묶음 ${batch - 1}` } : null,
          batch < totalDays(entries.length) ? { href: `#/vocab/group/${group}/${batch + 1}`, label: `묶음 ${batch + 1}` } : null,
        ));
      }
    }
  } else if (hash === '#/vocab/today') {
    const queue = buildTodayQueue(TYPED_VOCAB_DATA.entries, srsStore);
    const heading = document.createElement('h2');
    heading.textContent = `오늘 복습할 단어 (${queue.length})`;
    container.appendChild(heading);
    if (queue.length === 0) container.appendChild(renderEmptyState('오늘 복습할 단어를 모두 끝냈어요. 단어장에서 새 단어를 외워보세요.'));
    container.appendChild(renderCardList(queue, srsStore, container));
  } else if (hash === '#/vocab/wrong') {
    const wrong = collectWrongNotes(TYPED_VOCAB_DATA.entries, srsStore);
    const heading = document.createElement('h2');
    heading.textContent = `오답노트 (${wrong.length})`;
    container.appendChild(heading);
    if (wrong.length === 0) container.appendChild(renderEmptyState('아직 담긴 단어가 없어요. 모름이나 헷갈림으로 표시하거나 퀴즈에서 틀린 단어가 여기에 모입니다.'));
    container.appendChild(renderCardGroups(wrong, srsStore, container, WRONG_GROUPS));
  } else if (day !== null) {
    const heading = document.createElement('h2');
    heading.textContent = `Day ${day}`;
    container.appendChild(heading);
    container.appendChild(renderDayProgress(dayEntries, srsStore));
    container.appendChild(renderVocabLink(`#/vocab/quiz/day/${day}`, '問', '이 Day로 단어 퀴즈', '무작위 최대 10문제'));
    container.appendChild(renderCardGroups(dayEntries, srsStore, container));
    container.appendChild(renderPager(
      day > 1 ? { href: `#/vocab/day/${day - 1}`, label: `Day ${day - 1}` } : null,
      day < totalDays(TYPED_VOCAB_DATA.entries.length) ? { href: `#/vocab/day/${day + 1}`, label: `Day ${day + 1}` } : null,
    ));
  } else {
    const heading = document.createElement('h2');
    heading.textContent = '단어장';
    container.appendChild(heading);
    const shortcuts = document.createElement('div');
    shortcuts.className = 'shortcut-grid';
    shortcuts.appendChild(renderVocabLink('#/vocab/quiz', '問', '단어 퀴즈', '보기 5개 중에서 고르기'));
    shortcuts.appendChild(renderVocabLink('#/vocab/groups', '類', '품사별 암기장', '비슷한 말을 50개씩 모아 외우기'));
    shortcuts.appendChild(renderWrongNotesLink(TYPED_VOCAB_DATA.entries, srsStore));
    container.appendChild(shortcuts);
    const routeTitle = document.createElement('h3');
    routeTitle.className = 'section-title';
    routeTitle.textContent = `Day 1부터 ${totalDays(TYPED_VOCAB_DATA.entries.length)}까지, 하루 50단어`;
    container.appendChild(routeTitle);
    container.appendChild(renderDayList(TYPED_VOCAB_DATA.entries, srsStore));
  }

  return container;
}
