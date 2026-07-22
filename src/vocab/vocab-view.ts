import vocabData from '../data/vocabulary.json';
import { loadJSON, saveJSON } from '../storage';
import { buildTodayQueue, reviewEntry, toggleBookmark } from '../srs';
import type { SrsGrade, SrsState, SrsStore, VocabData, VocabEntry } from '../types';

const SRS_STORAGE_KEY = 'srs-store';
const TYPED_VOCAB_DATA = vocabData as VocabData;

function loadSrsStore(): SrsStore {
  return loadJSON<SrsStore>(SRS_STORAGE_KEY, {});
}

function saveSrsStore(store: SrsStore): void {
  saveJSON(SRS_STORAGE_KEY, store);
}

export function renderWordCard(entry: VocabEntry, srsState: SrsState | undefined): HTMLElement {
  const card = document.createElement('div');
  card.className = 'word-card';

  const jp = document.createElement('div');
  jp.className = 'word-japanese';
  jp.textContent = entry.japanese;
  card.appendChild(jp);

  if (entry.reading && entry.reading !== entry.japanese) {
    const reading = document.createElement('div');
    reading.className = 'word-reading';
    reading.textContent = entry.reading;
    card.appendChild(reading);
  }

  const romaji = document.createElement('div');
  romaji.className = 'word-romaji';
  romaji.textContent = entry.romaji;
  card.appendChild(romaji);

  const korean = document.createElement('div');
  korean.className = 'word-korean';
  korean.textContent = entry.korean;
  card.appendChild(korean);

  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.className = 'bookmark-toggle';
  bookmarkBtn.textContent = srsState?.bookmarked ? '🔖' : '📑';
  bookmarkBtn.dataset.entryId = entry.id;
  card.appendChild(bookmarkBtn);

  if (entry.audioUrl) {
    const playBtn = document.createElement('button');
    playBtn.className = 'audio-play';
    playBtn.textContent = '▶';
    playBtn.dataset.audioUrl = entry.audioUrl;
    card.appendChild(playBtn);
  }

  const gradeWrap = document.createElement('div');
  gradeWrap.className = 'srs-grades';
  const gradeLabels: Record<SrsGrade, string> = { unknown: '모름', confusing: '헷갈림', known: '암기됨' };
  (Object.keys(gradeLabels) as SrsGrade[]).forEach((grade) => {
    const btn = document.createElement('button');
    btn.className = `srs-grade srs-grade-${grade}`;
    btn.textContent = gradeLabels[grade];
    btn.dataset.entryId = entry.id;
    btn.dataset.grade = grade;
    gradeWrap.appendChild(btn);
  });
  card.appendChild(gradeWrap);

  return card;
}

export function renderSkillList(skills: string[]): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'skill-list';
  for (const skill of skills) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#/vocab/skill/${skill}`;
    link.textContent = skill;
    item.appendChild(link);
    list.appendChild(item);
  }
  return list;
}

function renderCardList(entries: VocabEntry[], srsStore: SrsStore, container: HTMLElement): HTMLElement {
  const list = document.createElement('div');
  list.className = 'card-list';
  for (const entry of entries) {
    list.appendChild(renderWordCard(entry, srsStore[entry.id]));
  }

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
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

  return list;
}

export function renderVocabHome(hash: string): HTMLElement {
  const container = document.createElement('div');
  container.className = 'vocab-home';

  const nav = document.createElement('nav');
  nav.innerHTML = `<a href="#/vocab">단어장</a><a href="#/vocab/today">오늘 복습</a><a href="#/kana">가나 퀴즈</a>`;
  container.appendChild(nav);

  const srsStore = loadSrsStore();

  if (hash === '#/vocab/today') {
    const queue = buildTodayQueue(TYPED_VOCAB_DATA.entries, srsStore);
    const heading = document.createElement('h2');
    heading.textContent = `오늘 복습할 단어 (${queue.length})`;
    container.appendChild(heading);
    container.appendChild(renderCardList(queue, srsStore, container));
  } else if (hash.startsWith('#/vocab/skill/')) {
    const skillName = decodeURIComponent(hash.replace('#/vocab/skill/', ''));
    const entries = TYPED_VOCAB_DATA.entries.filter((e) => e.skillName === skillName);
    const heading = document.createElement('h2');
    heading.textContent = skillName;
    container.appendChild(heading);
    container.appendChild(renderCardList(entries, srsStore, container));
  } else {
    container.appendChild(renderSkillList(TYPED_VOCAB_DATA.skills));
  }

  return container;
}
