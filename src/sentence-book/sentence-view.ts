import { allCategories, allSentences } from '../data/all-sentences';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, describeReviewStatus, reviewEntry, toggleBookmark } from '../srs';
import { categoryIcon, renderIconLinkList } from '../data/category-icons';
import { NAV_HTML } from '../nav';
import type { SentenceEntry, SrsGrade, SrsState, SrsStore } from '../types';

const SENTENCE_SRS_KEY = 'srs-store-sentences';

export function loadSentenceSrsStore(): SrsStore {
  return loadJSON<SrsStore>(SENTENCE_SRS_KEY, {});
}

export function saveSentenceSrsStore(store: SrsStore): void {
  saveJSON(SENTENCE_SRS_KEY, store);
}

export function renderSentenceCard(entry: SentenceEntry, srsState: SrsState | undefined, today: Date = new Date()): HTMLElement {
  const card = document.createElement('div');
  card.className = 'sentence-card card';

  const jp = document.createElement('div');
  jp.className = 'sentence-japanese';
  jp.textContent = entry.japanese;
  card.appendChild(jp);

  if (entry.reading && entry.reading !== entry.japanese) {
    const reading = document.createElement('div');
    reading.className = 'sentence-reading';
    reading.textContent = entry.reading;
    card.appendChild(reading);
  }

  const translation = document.createElement('div');
  translation.className = 'sentence-translation hidden';
  translation.textContent = `${entry.korean} / ${entry.english}`;
  card.appendChild(translation);

  const badges = document.createElement('div');
  badges.className = 'word-badges';

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'badge badge-category';
  categoryBadge.textContent = `${categoryIcon(entry.category)} ${entry.category}`;
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
    translation.classList.toggle('hidden');
  });
  actions.appendChild(revealBtn);

  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'bookmark-toggle';
  bookmarkBtn.textContent = srsState?.bookmarked ? '🔖' : '📑';
  bookmarkBtn.dataset.entryId = entry.id;
  actions.appendChild(bookmarkBtn);

  card.appendChild(actions);

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'srs-grades';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '모름', confusing: '헷갈림', known: '암기됨' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
    const btn = document.createElement('button');
    btn.className = `srs-grade srs-grade-${grade} btn ${grade === 'known' ? 'btn-primary' : 'btn-secondary'}`;
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

function renderSentenceList(entries: SentenceEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
  const list = document.createElement('div');
  list.className = 'sentence-list card-list';
  for (const entry of entries) {
    list.appendChild(renderSentenceCard(entry, srsStore[entry.id]));
  }

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const entryId = target.dataset.entryId;
    if (!entryId) return;

    const store = loadSentenceSrsStore();

    if (target.classList.contains('bookmark-toggle')) {
      store[entryId] = toggleBookmark(store[entryId]);
      saveSentenceSrsStore(store);
      container.dispatchEvent(new Event('sentence:refresh'));
      return;
    }

    const grade = target.dataset.grade as SrsGrade | undefined;
    if (grade) {
      store[entryId] = reviewEntry(store[entryId], grade);
      saveSentenceSrsStore(store);
      container.dispatchEvent(new Event('sentence:refresh'));
    }
  });

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
    container.appendChild(renderSentenceList(queue, srsStore, container));
  } else if (hash.startsWith('#/sentences/category/')) {
    const categoryName = decodeURIComponent(hash.replace('#/sentences/category/', ''));
    const entries = allSentences().filter((e) => e.category === categoryName);
    const heading = document.createElement('h2');
    heading.textContent = categoryName;
    container.appendChild(heading);
    container.appendChild(renderSentenceList(entries, srsStore, container));
  } else {
    container.appendChild(renderCategoryList(allCategories()));
  }

  return container;
}
