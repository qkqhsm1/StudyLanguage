import { allCategories, allSentences } from '../data/all-sentences';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, describeReviewStatus, reviewEntry, toggleBookmark } from '../srs';
import { categoryLabel, renderIconLinkList } from '../data/category-icons';
import { paintBookmark } from '../icons';
import { createReadingToggles } from '../practice/furigana';
import { NAV_HTML } from '../nav';
import type { SentenceEntry, SrsGrade, SrsState, SrsStore } from '../types';

const SENTENCE_SRS_KEY = 'srs-store-sentences';

export function loadSentenceSrsStore(): SrsStore {
  return loadJSON<SrsStore>(SENTENCE_SRS_KEY, {});
}

export function saveSentenceSrsStore(store: SrsStore): void {
  saveJSON(SENTENCE_SRS_KEY, store);
}

/** 문장 하나짜리 북마크 토글. 문장 연습(해석·작문)처럼 카드 목록이 아니라 문장
 *  한 개만 보이는 화면에서 쓴다. 카드 목록의 위임 리스너와 달리, 여기서는 화면을
 *  다시 그리지 않고(그러면 다음 문제로 넘어가 버린다) 버튼 표시만 그 자리에서 바꾼다. */
export function renderSentenceBookmarkToggle(entryId: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bookmark-toggle';

  function paint(): void {
    paintBookmark(btn, loadSentenceSrsStore()[entryId]?.bookmarked ?? false);
  }
  paint();

  btn.addEventListener('click', () => {
    const store = loadSentenceSrsStore();
    store[entryId] = toggleBookmark(store[entryId]);
    saveSentenceSrsStore(store);
    paint();
  });

  return btn;
}

export function renderSentenceCard(entry: SentenceEntry, srsState: SrsState | undefined, today: Date = new Date()): HTMLElement {
  const card = document.createElement('div');
  card.className = 'sentence-card card';
  card.dataset.grade = srsState?.grade ?? 'new';

  // 문장과 발음을 한 줄에 — 발음은 문장 오른쪽에 붙는다.
  const sentenceGroup = document.createElement('div');
  sentenceGroup.className = 'practice-sentence-group';

  const jp = document.createElement('div');
  jp.className = 'sentence-japanese';
  jp.lang = 'ja';
  jp.textContent = entry.japanese;
  sentenceGroup.appendChild(jp);
  card.appendChild(sentenceGroup);

  // 후리가나·발음 토글 (해석 연습과 동일한 동작).
  if (entry.reading) {
    card.appendChild(createReadingToggles(jp, sentenceGroup, entry.japanese, entry.reading, entry.spoken));
  }

  const translation = document.createElement('div');
  translation.className = 'sentence-translation hidden';
  translation.textContent = [entry.korean, entry.english].filter(Boolean).join(' / ');
  card.appendChild(translation);

  const badges = document.createElement('div');
  badges.className = 'word-badges';

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'badge badge-category';
  categoryBadge.textContent = categoryLabel(entry.category);
  badges.appendChild(categoryBadge);

  const reviewBadge = describeReviewStatus(srsState, today);
  if (reviewBadge) {
    const badge = document.createElement('span');
    badge.className = `badge ${reviewBadge.urgent ? 'badge-urgent' : 'badge-ok'}`;
    badge.textContent = reviewBadge.label;
    badges.appendChild(badge);
  }
  card.appendChild(badges);

  const actions = document.createElement('div');
  actions.className = 'sentence-actions';

  const revealBtn = document.createElement('button');
  revealBtn.className = 'sentence-reveal btn btn-secondary';
  revealBtn.textContent = '뜻 보기';
  revealBtn.addEventListener('click', () => {
    const shown = translation.classList.toggle('hidden') === false;
    revealBtn.textContent = shown ? '뜻 숨기기' : '뜻 보기';
  });
  actions.appendChild(revealBtn);

  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'bookmark-toggle';
  paintBookmark(bookmarkBtn, srsState?.bookmarked ?? false);
  bookmarkBtn.dataset.entryId = entry.id;
  actions.appendChild(bookmarkBtn);

  card.appendChild(actions);

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'srs-grades';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '모름', confusing: '헷갈림', known: '암기됨' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
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

export function renderCategoryList(categories: string[]): HTMLElement {
  return renderIconLinkList(categories, '#/sentences/category/');
}

export function attachSentenceCardActions(list: HTMLElement, container: HTMLElement, refreshEvent: string): void {
  list.addEventListener('click', (event) => {
    // 아이콘(svg)을 눌러도 버튼으로 잡히도록 위로 올라가 찾는다.
    const target = (event.target as Element).closest<HTMLElement>('button');
    const entryId = target?.dataset.entryId;
    if (!target || !entryId) return;

    const store = loadSentenceSrsStore();

    if (target.classList.contains('bookmark-toggle')) {
      store[entryId] = toggleBookmark(store[entryId]);
      saveSentenceSrsStore(store);
      container.dispatchEvent(new Event(refreshEvent));
      return;
    }

    const grade = target.dataset.grade as SrsGrade | undefined;
    if (grade) {
      store[entryId] = reviewEntry(store[entryId], grade);
      saveSentenceSrsStore(store);
      container.dispatchEvent(new Event(refreshEvent));
    }
  });
}

export function renderSentenceList(entries: SentenceEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
  const list = document.createElement('div');
  list.className = 'sentence-list card-list';
  for (const entry of entries) {
    list.appendChild(renderSentenceCard(entry, srsStore[entry.id]));
  }

  attachSentenceCardActions(list, container, 'sentence:refresh');

  return list;
}

export function renderSentenceBookHome(hash: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'sentence-book-home';

  const nav = document.createElement('nav');
  nav.innerHTML = NAV_HTML;
  container.appendChild(nav);

  const srsStore = loadSentenceSrsStore();

  if (hash === '#/sentences/today') {
    const queue = buildTodayQueue(allSentences(), srsStore);
    const heading = document.createElement('h2');
    heading.textContent = `오늘 복습할 문장 (${queue.length})`;
    container.appendChild(heading);
    if (queue.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = '오늘 복습할 문장을 모두 끝냈어요. 문장 연습으로 새 문장을 풀어보세요.';
      container.appendChild(empty);
    }
    container.appendChild(renderSentenceList(queue, srsStore, container));
  } else if (hash.startsWith('#/sentences/category/')) {
    const categoryName = decodeURIComponent(hash.replace('#/sentences/category/', ''));
    const entries = allSentences().filter((e) => e.category === categoryName);
    const heading = document.createElement('h2');
    heading.textContent = categoryLabel(categoryName);
    container.appendChild(heading);
    container.appendChild(renderSentenceList(entries, srsStore, container));
  } else {
    const heading = document.createElement('h2');
    heading.textContent = '문어장';
    container.appendChild(heading);
    container.appendChild(renderCategoryList(allCategories()));
  }

  return container;
}
