import vocabData from '../data/vocabulary.json';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, describeReviewStatus, reviewEntry, toggleBookmark } from '../srs';
import { categoryIcon } from '../data/category-icons';
import { entriesForDay, totalDays } from '../data/vocab-days';
import { NAV_HTML } from '../nav';
import type { SrsGrade, SrsState, SrsStore, VocabData, VocabEntry } from '../types';

const SRS_STORAGE_KEY = 'srs-store';
const TYPED_VOCAB_DATA = vocabData as VocabData;

function loadSrsStore(): SrsStore {
  return loadJSON<SrsStore>(SRS_STORAGE_KEY, {});
}

function saveSrsStore(store: SrsStore): void {
  saveJSON(SRS_STORAGE_KEY, store);
}

export function renderWordCard(entry: VocabEntry, srsState: SrsState | undefined, today: Date = new Date()): HTMLElement {
  const card = document.createElement('div');
  card.className = 'word-card card';

  const top = document.createElement('div');
  top.className = 'word-card-top';

  const headword = document.createElement('div');
  headword.className = 'word-card-headword';

  if (entry.audioUrl) {
    const playBtn = document.createElement('button');
    playBtn.className = 'audio-play';
    playBtn.textContent = '▶';
    playBtn.dataset.audioUrl = entry.audioUrl;
    headword.appendChild(playBtn);
  }

  if (entry.reading && entry.reading !== entry.japanese) {
    const ruby = document.createElement('ruby');
    ruby.className = 'word-japanese-ruby';
    const base = document.createElement('span');
    base.className = 'word-japanese';
    base.textContent = entry.japanese;
    const rt = document.createElement('rt');
    rt.className = 'word-reading';
    rt.textContent = entry.reading;
    ruby.appendChild(base);
    ruby.appendChild(rt);
    headword.appendChild(ruby);
  } else {
    const jp = document.createElement('span');
    jp.className = 'word-japanese';
    jp.textContent = entry.japanese;
    headword.appendChild(jp);
  }

  top.appendChild(headword);

  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'bookmark-toggle';
  bookmarkBtn.textContent = srsState?.bookmarked ? '🔖' : '📑';
  bookmarkBtn.dataset.entryId = entry.id;
  top.appendChild(bookmarkBtn);

  card.appendChild(top);

  const meta = document.createElement('div');
  meta.className = 'word-meta';
  meta.textContent = `${entry.romaji} · ${entry.korean}`;
  card.appendChild(meta);

  const badges = document.createElement('div');
  badges.className = 'word-badges';

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'badge badge-category';
  categoryBadge.textContent = `${categoryIcon(entry.skillName)} ${entry.skillName}`;
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
    // 현재 이 카드의 등급인 버튼만 파랗게. 아직 채점 안 한 카드는 셋 다 회색이고,
    // 누르면 그 버튼이 파래진다(누른 뒤 재렌더되며 반영).
    const selected = srsState?.grade === grade;
    const btn = document.createElement('button');
    btn.className = `srs-grade srs-grade-${grade} btn ${selected ? 'btn-primary' : 'btn-secondary'}`;
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
export function renderDayList(entries: VocabEntry[], srsStore: SrsStore): HTMLElement {
  const list = document.createElement('div');
  list.className = 'skill-list';

  const days = totalDays(entries.length);
  for (let day = 1; day <= days; day++) {
    const dayEntries = entriesForDay(entries, day);
    const known = dayEntries.filter((e) => srsStore[e.id]?.grade === 'known').length;

    const link = document.createElement('a');
    link.className = 'skill-list-item';
    link.href = `#/vocab/day/${day}`;

    const icon = document.createElement('span');
    icon.className = 'skill-list-icon';
    icon.textContent = String(day);
    link.appendChild(icon);

    const body = document.createElement('span');
    body.className = 'skill-list-body';

    const name = document.createElement('span');
    name.className = 'skill-list-name';
    name.textContent = `Day ${day}`;
    body.appendChild(name);

    const sub = document.createElement('span');
    sub.className = 'skill-list-sub';
    sub.textContent = `${dayEntries.length}단어 · ${known}개 암기`;
    body.appendChild(sub);

    link.appendChild(body);

    const chevron = document.createElement('span');
    chevron.className = 'skill-list-chevron';
    chevron.textContent = '›';
    link.appendChild(chevron);

    list.appendChild(link);
  }

  return list;
}

/** 카드 안의 발음 재생·북마크·채점 버튼을 위임으로 처리한다. 카드 목록이 여러
 *  개로 나뉜 화면(Day의 등급별 하위 섹션)에서는 바깥 컨테이너에 한 번만 붙인다. */
function attachVocabCardActions(root: HTMLElement, container: HTMLElement): void {
  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;

    if (target.classList.contains('audio-play')) {
      const audioUrl = target.dataset.audioUrl;
      if (audioUrl) {
        new Audio(audioUrl).play().catch(() => {
          // ponytail: playback can fail silently (autoplay policy, network) — no UI feedback needed for a manual click-to-play button
        });
      }
      return;
    }

    const entryId = target.dataset.entryId;
    if (!entryId) return;

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

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'vocab-group-title';

    const arrow = document.createElement('span');
    arrow.className = 'vocab-group-arrow';
    arrow.textContent = '▾';
    header.appendChild(arrow);

    const label = document.createElement('span');
    label.className = 'vocab-group-label';
    label.textContent = `${group.label} (${groupEntries.length})`;
    header.appendChild(label);

    header.addEventListener('click', () => section.classList.toggle('collapsed'));
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

/** Day 목록 맨 위에 두는 오답노트 입구. 몇 개 밀려 있는지 같이 보여준다. */
export function renderWrongNotesLink(entries: VocabEntry[], srsStore: SrsStore): HTMLElement {
  const list = document.createElement('div');
  list.className = 'skill-list vocab-wrong-link';

  const link = document.createElement('a');
  link.className = 'skill-list-item';
  link.href = '#/vocab/wrong';

  const icon = document.createElement('span');
  icon.className = 'skill-list-icon';
  icon.textContent = '📕';
  link.appendChild(icon);

  const body = document.createElement('span');
  body.className = 'skill-list-body';

  const name = document.createElement('span');
  name.className = 'skill-list-name';
  name.textContent = '오답노트';
  body.appendChild(name);

  const sub = document.createElement('span');
  sub.className = 'skill-list-sub';
  sub.textContent = `모름·헷갈림·북마크 ${collectWrongNotes(entries, srsStore).length}단어`;
  body.appendChild(sub);

  link.appendChild(body);

  const chevron = document.createElement('span');
  chevron.className = 'skill-list-chevron';
  chevron.textContent = '›';
  link.appendChild(chevron);

  list.appendChild(link);
  return list;
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

  if (hash === '#/vocab/today') {
    const queue = buildTodayQueue(TYPED_VOCAB_DATA.entries, srsStore);
    const heading = document.createElement('h2');
    heading.textContent = `오늘 복습할 단어 (${queue.length})`;
    container.appendChild(heading);
    container.appendChild(renderCardList(queue, srsStore, container));
  } else if (hash === '#/vocab/wrong') {
    const wrong = collectWrongNotes(TYPED_VOCAB_DATA.entries, srsStore);
    const heading = document.createElement('h2');
    heading.textContent = `오답노트 (${wrong.length})`;
    container.appendChild(heading);
    container.appendChild(renderCardGroups(wrong, srsStore, container, WRONG_GROUPS));
  } else if (day !== null) {
    const heading = document.createElement('h2');
    heading.textContent = `Day ${day}`;
    container.appendChild(heading);
    container.appendChild(renderCardGroups(dayEntries, srsStore, container));
  } else {
    container.appendChild(renderWrongNotesLink(TYPED_VOCAB_DATA.entries, srsStore));
    container.appendChild(renderDayList(TYPED_VOCAB_DATA.entries, srsStore));
  }

  return container;
}
